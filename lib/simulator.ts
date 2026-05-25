// lib/simulator.ts

export class AxialCoord {
  constructor(public q: number, public r: number) {}

  key(): string { return `${this.q},${this.r}` }

  neighbors(): AxialCoord[] {
    return [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
      .map(([dq, dr]) => new AxialCoord(this.q + dq, this.r + dr))
  }

  ring(): number {
    return Math.max(Math.abs(this.q), Math.abs(this.r), Math.abs(this.q + this.r))
  }

  distanceTo(other: AxialCoord): number {
    const dq = this.q - other.q;
    const dr = this.r - other.r;
    const ds = -dq - dr;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
  }
}

export type CellStatus = 'temporary' | 'candidate' | 'citizen' | 'dead'
export type VoteType = 'yes' | 'no' | null

interface Vote {
  nodeKey: string;
  vote: VoteType;
  timestamp: number;
}

interface PendingSpread {
  fromKey: string;
  targetRing: number;
  targetKeys: string[];
  currentIndex: number;
  votes: Vote[];
  messageContent: string;
}

export class Cell {
  status: CellStatus = 'temporary'
  tickCount: number = 0
  hasTick: boolean = false
  hasMessage: boolean = false
  vote: VoteType = null
  hasVoted: boolean = false
  messageOriginKey: string | null = null
  showVoteUntil: number = 0
  isSender: boolean = false
  currentRing: number = 0
  receivedMessageFrom: string | null = null
  pendingVoteCount: number = 0

  constructor(public coord: AxialCoord, status: CellStatus = 'temporary') {
    this.status = status
  }

  isActive(): boolean {
    return this.status === 'temporary' || this.status === 'candidate' || this.status === 'citizen'
  }

  isAlive(): boolean {
    return this.status !== 'dead'
  }
  
  resetVote(): void {
    this.vote = null;
    this.hasVoted = false;
    this.messageOriginKey = null;
    this.showVoteUntil = 0;
    this.pendingVoteCount = 0;
  }
}

export class Network {
  cells = new Map<string, Cell>()
  day = 0
  birthsToday = 0
  deathsToday = 0
  maxRing = 100
  firstRingBuilt = false
  private pendingSpreads: PendingSpread[] = []
  private activeMessageSender: string | null = null
  private messageStatusCallback?: (status: string, ring: number, voteCount?: number) => void
  private isMessageActive: boolean = false
  private pendingApprovals: Map<string, { fromKey: string; yesCount: number; neighborKeys: string[] }> = new Map()

  constructor() {
    this.cells.set('0,0', new Cell(new AxialCoord(0, 0), 'citizen'))
  }

  setMessageStatusCallback(callback: (status: string, ring: number, voteCount?: number) => void) {
    this.messageStatusCallback = callback
  }

  getCell(coord: AxialCoord): Cell | undefined {
    return this.cells.get(coord.key())
  }

  getAllCellsInRing(centerCoord: AxialCoord, ring: number): string[] {
    const result: string[] = []
    for (const [key, cell] of this.cells) {
      if (cell.status === 'citizen') {
        const distance = centerCoord.distanceTo(cell.coord)
        if (distance === ring) {
          result.push(key)
        }
      }
    }
    return result
  }

  private getNeighborKeys(coord: AxialCoord): string[] {
    return coord.neighbors()
      .map(n => n.key())
      .filter(key => {
        const cell = this.cells.get(key)
        return cell && cell.status === 'citizen'
      })
  }

  private getNextRingCells(centerCoord: AxialCoord, currentRing: number): string[] {
    const currentRingCells = this.getAllCellsInRing(centerCoord, currentRing)
    const nextRingCellsSet = new Set<string>()
    
    for (const cellKey of currentRingCells) {
      const cell = this.cells.get(cellKey)
      if (cell && cell.hasMessage) {
        const neighbors = this.getNeighborKeys(cell.coord)
        for (const neighborKey of neighbors) {
          const neighbor = this.cells.get(neighborKey)
          if (neighbor && neighbor.coord.distanceTo(centerCoord) === currentRing + 1) {
            nextRingCellsSet.add(neighborKey)
          }
        }
      }
    }
    
    return Array.from(nextRingCellsSet)
  }

  allNeighborCells(coord: AxialCoord): Cell[] {
    return coord.neighbors()
      .map(n => this.getCell(n))
      .filter((c): c is Cell => c !== undefined)
  }

  isWithinBounds(coord: AxialCoord): boolean {
    return coord.ring() <= this.maxRing
  }

  private applyPromotions(): void {
    let changed = true
    while (changed) {
      changed = false

      for (const [, cell] of this.cells) {
        if (cell.status === 'temporary' && this.allNeighborCells(cell.coord).length === 6) {
          cell.status = 'candidate'
          changed = true
        }
      }

      for (const [, cell] of this.cells) {
        if (cell.status !== 'candidate') continue
        const neighbors = this.allNeighborCells(cell.coord)
        if (neighbors.length === 6 && neighbors.every(n => n.status === 'candidate' || n.status === 'citizen')) {
          cell.status = 'citizen'
          this.birthsToday++
          changed = true
        }
      }
    }
  }

  private fillDeadGaps(): void {
    for (const [, cell] of this.cells) {
      if (cell.status !== 'dead') continue
      
      const neighbors = cell.coord.neighbors()
        .map(n => this.getCell(n))
        .filter(c => c && c.isActive() && c.status !== 'temporary')
      
      if (neighbors.length >= 3) {
        cell.status = 'temporary'
      }
    }
  }

  private clearAllVotes(): void {
    for (const [, cell] of this.cells) {
      cell.resetVote();
      cell.hasMessage = false;
      cell.isSender = false;
      cell.hasTick = false;
      cell.receivedMessageFrom = null;
    }
    this.pendingApprovals.clear();
  }

  startMessagePropagation(): void {
    if (this.isMessageActive) return;
    this.isMessageActive = true;
    this.clearAllVotes();
    this.pendingSpreads = [];
    this.startRandomMessage();
  }

  processMessageTick(): void {
    if (this.isMessageActive) {
      this.processNextVote();
      this.clearOldVotes();
    }
  }

  stopMessagePropagation(): void {
    this.isMessageActive = false;
  }

  clearAllMessagesAndVotes(): void {
    for (const [, cell] of this.cells) {
      cell.hasMessage = false;
      cell.isSender = false;
      cell.vote = null;
      cell.hasVoted = false;
      cell.showVoteUntil = 0;
      cell.receivedMessageFrom = null;
      cell.messageOriginKey = null;
      cell.pendingVoteCount = 0;
    }
    this.pendingSpreads = [];
    this.pendingApprovals.clear();
    this.activeMessageSender = null;
    this.isMessageActive = false;
  }

  private startRandomMessage(): void {
    const eligibleCells: string[] = [];
    for (const [key, cell] of this.cells) {
      if (cell.status === 'citizen' && !cell.hasMessage) {
        const neighbors = this.getNeighborKeys(cell.coord);
        if (neighbors.length === 6) {
          eligibleCells.push(key);
        }
      }
    }
    
    if (eligibleCells.length === 0) {
      if (this.messageStatusCallback) {
        this.messageStatusCallback(`⚠️ No eligible cells with 6 neighbors found! Waiting for network to grow...`, 0);
      }
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * eligibleCells.length);
    const selectedKey = eligibleCells[randomIndex];
    const selectedCell = this.cells.get(selectedKey);
    
    if (!selectedCell) return;
    
    this.clearAllVotes();
    this.pendingSpreads = [];
    this.pendingApprovals.clear();
    
    this.activeMessageSender = selectedKey;
    selectedCell.hasMessage = true;
    selectedCell.isSender = true;
    
    const ring1Cells = this.getAllCellsInRing(selectedCell.coord, 1);
    
    for (const neighborKey of ring1Cells) {
      const neighbor = this.cells.get(neighborKey);
      if (neighbor) {
        neighbor.messageOriginKey = selectedKey;
      }
    }
    
    const pendingSpread: PendingSpread = {
      fromKey: selectedKey,
      targetRing: 1,
      targetKeys: ring1Cells,
      currentIndex: 0,
      votes: [],
      messageContent: `Message from ${selectedKey}`
    }
    
    this.pendingSpreads.push(pendingSpread);
    
    if (this.messageStatusCallback) {
      this.messageStatusCallback(`📨 NEW MESSAGE from cell ${selectedKey}!`, 1, 0);
    }
  }

  private processNextVote(): boolean {
    if (this.pendingSpreads.length === 0) {
      return false;
    }
    
    const currentSpread = this.pendingSpreads[0];

    if (currentSpread.currentIndex >= currentSpread.targetKeys.length) {
      const approvedInThisRing: string[] = [];
      
      for (const vote of currentSpread.votes) {
        if (vote.vote === 'yes') {
          approvedInThisRing.push(vote.nodeKey);
        }
      }
      
      const total = currentSpread.targetKeys.length;
      const approvedCount = approvedInThisRing.length;
      
      if (this.messageStatusCallback) {
        this.messageStatusCallback(`📊 Ring ${currentSpread.targetRing} results: ${approvedCount}/${total} cells approved`, currentSpread.targetRing, approvedCount);
      }
      
      const fromCell = this.cells.get(currentSpread.fromKey);
      
      if (fromCell && approvedCount >= 3) {
        for (const approvedKey of approvedInThisRing) {
          const approvedCell = this.cells.get(approvedKey);
          if (approvedCell && !approvedCell.hasMessage) {
            approvedCell.hasMessage = true;
            approvedCell.hasTick = true;
            approvedCell.tickCount++;
            approvedCell.receivedMessageFrom = currentSpread.fromKey;
            approvedCell.showVoteUntil = this.day + 10;
          }
        }
        
        const nextRing = currentSpread.targetRing + 1;
        const nextRingCells = this.getAllCellsInRing(fromCell.coord, nextRing);
        
        if (nextRingCells.length > 0) {
          const validNextCells = nextRingCells.filter(cellKey => {
            const cell = this.cells.get(cellKey);
            return cell && !cell.hasMessage;
          });
          
          if (validNextCells.length > 0) {
            for (const nextCellKey of validNextCells) {
              const nextCell = this.cells.get(nextCellKey);
              if (nextCell) {
                nextCell.messageOriginKey = currentSpread.fromKey;
                nextCell.hasVoted = false;
                nextCell.vote = null;
              }
            }
            
            const nextSpread: PendingSpread = {
              fromKey: currentSpread.fromKey,
              targetRing: nextRing,
              targetKeys: validNextCells,
              currentIndex: 0,
              votes: [],
              messageContent: currentSpread.messageContent
            };
            
            this.pendingSpreads.push(nextSpread);
            
            if (this.messageStatusCallback) {
              this.messageStatusCallback(`✨ Spreading to ring ${nextRing} (${validNextCells.length} cells)`, nextRing, approvedCount);
            }
          } else {
            if (this.messageStatusCallback) {
              this.messageStatusCallback(`🏁 No new cells in ring ${nextRing}`, currentSpread.targetRing, approvedCount);
            }
          }
        } else {
          if (this.messageStatusCallback) {
            this.messageStatusCallback(`🏆 Message reached all rings! (Final ring: ${currentSpread.targetRing})`, currentSpread.targetRing, approvedCount);
          }
        }
      } else {
        if (this.messageStatusCallback) {
          this.messageStatusCallback(`🛑 Message STOPPED at ring ${currentSpread.targetRing} - only ${approvedCount} cells approved (need ≥3)`, currentSpread.targetRing, approvedCount);
        }
        this.pendingSpreads = [];
        this.isMessageActive = false;
      }
      
      this.pendingSpreads.shift();
      return true;
    }
    
    const targetKey = currentSpread.targetKeys[currentSpread.currentIndex];
    const targetCell = this.cells.get(targetKey);
    
    if (targetCell && targetCell.status === 'citizen' && !targetCell.hasVoted) {
      const neighbors = this.getNeighborKeys(targetCell.coord);
      
      if (neighbors.length !== 6) {
        if (this.messageStatusCallback) {
          this.messageStatusCallback(`⚠️ Cell ${targetKey} does NOT have 6 neighbors → REJECTED`, currentSpread.targetRing, 0);
        }
        targetCell.vote = 'no';
        targetCell.hasVoted = true;
        targetCell.messageOriginKey = currentSpread.fromKey;
        targetCell.showVoteUntil = this.day + 10;
        currentSpread.votes.push({ nodeKey: targetKey, vote: 'no', timestamp: this.day });
      } else {
        let yesCount = 0;
        for (const nbKey of neighbors) {
          if (Math.random() < 0.5) yesCount++;
        }
        
        const finalVote: VoteType = yesCount >= 3 ? 'yes' : 'no';
        
        targetCell.vote = finalVote;
        targetCell.hasVoted = true;
        targetCell.messageOriginKey = currentSpread.fromKey;
        targetCell.showVoteUntil = this.day + 10;
        
        currentSpread.votes.push({ nodeKey: targetKey, vote: finalVote, timestamp: this.day });
        
        const voteIcon = finalVote === 'yes' ? '✅' : '❌';
        const yesSoFar = currentSpread.votes.filter(v => v.vote === 'yes').length;
        
        if (this.messageStatusCallback) {
          this.messageStatusCallback(`${voteIcon} Ring ${currentSpread.targetRing} - Cell ${targetKey} got ${yesCount}/6 YES → ${finalVote === 'yes' ? 'APPROVED' : 'REJECTED'} (${yesSoFar}/${currentSpread.targetKeys.length})`, currentSpread.targetRing, yesSoFar);
        }
      }
    }
    
    currentSpread.currentIndex++;
    return true;
  }

  private clearOldVotes(): void {
    for (const [, cell] of this.cells) {
      if (cell.showVoteUntil > 0 && cell.showVoteUntil < this.day) {
        cell.vote = null;
        cell.showVoteUntil = 0;
      }
    }
  }

  tick(): void {
    this.day++;
    this.birthsToday = 0;
    this.deathsToday = 0;

    if (!this.isMessageActive) {
      if (!this.firstRingBuilt) {
        const ring1 = [
          new AxialCoord(1, 0), new AxialCoord(1, -1), new AxialCoord(0, -1),
          new AxialCoord(-1, 0), new AxialCoord(-1, 1), new AxialCoord(0, 1)
        ];
        const built = ring1.filter(c => this.cells.has(c.key())).length;

        if (built < 6) {
          const empty = ring1.filter(c => !this.cells.has(c.key()));
          if (empty.length > 0) {
            const chosen = empty[Math.floor(Math.random() * empty.length)];
            this.cells.set(chosen.key(), new Cell(chosen, 'temporary'));
          }
        } else {
          this.firstRingBuilt = true;
        }
        this.applyPromotions();
        this.killReds();
        this.fillDeadGaps();
        this.clearOldVotes();
        return;
      }

      const redsWithEmpty = [...this.cells.values()].filter(cell => {
        if (cell.status !== 'temporary') return false;
        return this.allNeighborCells(cell.coord).length < 6;
      });

      if (redsWithEmpty.length > 0) {
        const chosen = redsWithEmpty[Math.floor(Math.random() * redsWithEmpty.length)];
        const empty = chosen.coord.neighbors().filter(n => !this.cells.has(n.key()) && this.isWithinBounds(n));
        if (empty.length > 0) {
          const target = empty[Math.floor(Math.random() * empty.length)];
          this.cells.set(target.key(), new Cell(target, 'temporary'));
        }
        this.applyPromotions();
        this.killReds();
        this.fillDeadGaps();
        this.clearOldVotes();
        return;
      }

      const activeCells = [...this.cells.values()].filter(c => c.isActive());
      const emptyNeighbors: AxialCoord[] = [];

      for (const cell of activeCells) {
        for (const nb of cell.coord.neighbors()) {
          if (!this.cells.has(nb.key()) && this.isWithinBounds(nb)) {
            if (!emptyNeighbors.some(c => c.key() === nb.key())) {
              emptyNeighbors.push(nb);
            }
          }
        }
      }

      if (emptyNeighbors.length > 0) {
        const chosen = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
        this.cells.set(chosen.key(), new Cell(chosen, 'temporary'));
      }

      this.applyPromotions();
      this.killReds();
      this.fillDeadGaps();
      this.reviveDead();
      this.clearOldVotes();
    }
  }

  private killReds(): void {
    const allCells = [...this.cells.values()];
    const currentDead = allCells.filter(c => c.status === 'dead').length;
    const maxDead = Math.floor(allCells.length * 0.05);

    if (currentDead >= maxDead) return;

    const temps = allCells.filter(c => c.status === 'temporary');
    if (temps.length === 0) return;

    const deathQuota = Math.max(1, Math.floor(temps.length / 30));

    const shuffled = [...temps].sort(() => Math.random() - 0.5);
    const killCount = Math.min(deathQuota, shuffled.length);

    for (let i = 0; i < killCount; i++) {
      shuffled[i].status = 'dead';
      this.deathsToday++;
    }
  }

  private reviveDead(): void {
    if (this.day % 2 !== 0) return;

    const deadCells = [...this.cells.values()].filter(c => c.status === 'dead');
    if (deadCells.length === 0) return;

    const toRevive = deadCells[Math.floor(Math.random() * deadCells.length)];
    toRevive.status = 'temporary';
  }

  stats() {
    const all = [...this.cells.values()];
    const alive = all.filter(c => c.isAlive());
    const citizens = alive.filter(c => c.status === 'citizen');
    const candidates = alive.filter(c => c.status === 'candidate');
    const temps = alive.filter(c => c.status === 'temporary');
    
    return {
      day: this.day,
      alive: alive.length,
      citizens: citizens.length,
      candidates: candidates.length,
      temporary: temps.length,
      dead: all.filter(c => c.status === 'dead').length,
      maxRing: alive.length > 0 ? Math.max(...alive.map(c => c.coord.ring())) : 0,
    };
  }
}