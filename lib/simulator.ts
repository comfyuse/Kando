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
  }
}

export class Network {
  cells = new Map<string, Cell>()
  day = 0
  birthsToday = 0
  deathsToday = 0
  maxRing = 8
  firstRingBuilt = false
  private pendingSpreads: PendingSpread[] = []
  private activeMessageSender: string | null = null
  private messageStatusCallback?: (status: string, ring: number, voteCount?: number) => void
  private isMessageActive: boolean = false

  constructor() {
    this.cells.set('0,0', new Cell(new AxialCoord(0, 0), 'citizen'))
  }

  setMessageStatusCallback(callback: (status: string, ring: number, voteCount?: number) => void) {
    this.messageStatusCallback = callback
  }

  getCell(coord: AxialCoord): Cell | undefined {
    return this.cells.get(coord.key())
  }

  // روش اصلاح‌شده: گرفتن سلول‌های یک حلقه خاص از یک مبدأ
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

  // گرفتن همسایه‌های یک سلول که شهروند هستند
  private getNeighborKeys(coord: AxialCoord): string[] {
    return coord.neighbors()
      .map(n => n.key())
      .filter(key => {
        const cell = this.cells.get(key)
        return cell && cell.status === 'citizen'
      })
  }

  // گرفتن حلقه بعدی (همسایه‌های همسایه‌ها)
  private getNextRingCells(centerCoord: AxialCoord, currentRing: number): string[] {
    const currentRingCells = this.getAllCellsInRing(centerCoord, currentRing)
    const nextRingCellsSet = new Set<string>()
    
    for (const cellKey of currentRingCells) {
      const cell = this.cells.get(cellKey)
      if (cell) {
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
    }
    this.pendingSpreads = [];
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
    
    this.activeMessageSender = selectedKey;
    selectedCell.hasMessage = true;
    selectedCell.isSender = true;
    
    // گرفتن 6 همسایه حلقه اول
    const ring1Cells = this.getAllCellsInRing(selectedCell.coord, 1);
    
    // تنظیم messageOriginKey برای حلقه اول
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
      this.messageStatusCallback(`📨 NEW MESSAGE from cell ${selectedKey}! Need 3 confirmations from ${ring1Cells.length} cells in ring 1 to spread to ring 2...`, 1, 0);
    }
  }

  private processNextVote(): boolean {
    if (this.pendingSpreads.length === 0) {
      return false;
    }
    
    const currentSpread = this.pendingSpreads[0];
    
    // اگر همه سلول‌های حلقه فعلی رأی داده‌اند
    if (currentSpread.currentIndex >= currentSpread.targetKeys.length) {
      const yesVotes = currentSpread.votes.filter(v => v.vote === 'yes').length;
      const noVotes = currentSpread.votes.filter(v => v.vote === 'no').length;
      
      if (this.messageStatusCallback) {
        this.messageStatusCallback(`📊 Ring ${currentSpread.targetRing} results: ${yesVotes} YES, ${noVotes} NO (need 3 YES to continue)`, currentSpread.targetRing, yesVotes);
      }
      
      // قانون ۳ تأیید: در این حلقه حداقل ۳ تأیید مستقل نیاز است
      if (yesVotes >= 3) {
        const fromCell = this.cells.get(currentSpread.fromKey);
        
        if (fromCell) {
          // علامت‌گذاری سلول‌های رأی‌دهنده مثبت
          for (const vote of currentSpread.votes) {
            if (vote.vote === 'yes') {
              const voterCell = this.cells.get(vote.nodeKey);
              if (voterCell) {
                voterCell.hasTick = true;
                voterCell.tickCount++;
                voterCell.receivedMessageFrom = currentSpread.fromKey;
                voterCell.showVoteUntil = this.day + 10;
              }
            }
          }
          
          // پیدا کردن حلقه بعدی (حلقه +1)
          const nextRing = currentSpread.targetRing + 1;
          const nextRingCells = this.getAllCellsInRing(fromCell.coord, nextRing);
          
          if (nextRingCells.length > 0) {
            // تنظیم messageOriginKey برای حلقه بعدی
            for (const nextCellKey of nextRingCells) {
              const nextCell = this.cells.get(nextCellKey);
              if (nextCell) {
                nextCell.messageOriginKey = currentSpread.fromKey;
                nextCell.hasVoted = false; // ریست وضعیت رأی برای حلقه بعدی
                nextCell.vote = null;
              }
            }
            
            const nextSpread: PendingSpread = {
              fromKey: currentSpread.fromKey,
              targetRing: nextRing,
              targetKeys: nextRingCells,
              currentIndex: 0,
              votes: [],
              messageContent: currentSpread.messageContent
            };
            
            this.pendingSpreads.push(nextSpread);
            
            if (this.messageStatusCallback) {
              this.messageStatusCallback(`✨ Message spread to ring ${nextRing}! ${yesVotes} confirmations received (≥3). Now need 3 confirmations from ${nextRingCells.length} cells in ring ${nextRing} to continue...`, nextRing, yesVotes);
            }
          } else {
            // پیام به تمام حلقه‌ها رسید
            if (this.messageStatusCallback) {
              this.messageStatusCallback(`🏆 Message successfully propagated through all rings! (Final ring: ${currentSpread.targetRing})`, currentSpread.targetRing, yesVotes);
            }
          }
        }
      } else {
        // قانون: اگر حداقل ۳ تأیید نشود، انتشار متوقف می‌شود
        if (this.messageStatusCallback) {
          this.messageStatusCallback(`🛑 Message STOPPED at ring ${currentSpread.targetRing} - only ${yesVotes} confirmations received (need ≥3). Propagation halted.`, currentSpread.targetRing, yesVotes);
        }
        // پیام را پاک می‌کنیم تا دیگر ادامه ندهد
        this.pendingSpreads = [];
        this.isMessageActive = false;
      }
      
      this.pendingSpreads.shift();
      return true;
    }
    
    // پردازش رأی بعدی از حلقه فعلی
    const targetKey = currentSpread.targetKeys[currentSpread.currentIndex];
    const targetCell = this.cells.get(targetKey);
    
    if (targetCell && targetCell.status === 'citizen' && !targetCell.hasVoted) {
      // هر سلول در انتشار باید عملکرد مستقل داشته باشد
      // شبیه‌سازی: 65% شانس تأیید، 35% شانس رد
      const voteValue: VoteType = Math.random() < 0.65 ? 'yes' : 'no';
      targetCell.vote = voteValue;
      targetCell.hasVoted = true;
      targetCell.messageOriginKey = currentSpread.fromKey;
      targetCell.showVoteUntil = this.day + 10;
      
      currentSpread.votes.push({
        nodeKey: targetKey,
        vote: voteValue,
        timestamp: this.day
      });
      
      const voteIcon = voteValue === 'yes' ? '✅' : '❌';
      const yesSoFar = currentSpread.votes.filter(v => v.vote === 'yes').length;
      
      if (this.messageStatusCallback) {
        this.messageStatusCallback(`${voteIcon} Ring ${currentSpread.targetRing} - Cell ${targetKey} ${voteValue === 'yes' ? 'APPROVED' : 'REJECTED'} (${currentSpread.currentIndex + 1}/${currentSpread.targetKeys.length} voted, ${yesSoFar} YES so far)`, currentSpread.targetRing, yesSoFar);
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
        // توجه: hasVoted را true نگه می‌داریم تا از رأی مجدد جلوگیری شود
      }
    }
  }

  tick(): void {
    this.day++;
    this.birthsToday = 0;
    this.deathsToday = 0;

    // فقط اگر در حالت پیام نباشیم، رشد شبکه انجام شود
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