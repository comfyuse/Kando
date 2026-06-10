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
  eagerForwarded: boolean = false   // parallel: this cell already opened its own next-side frontier

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
    this.eagerForwarded = false;
  }
}

export class Network {
  cells = new Map<string, Cell>()
  day = 0
  birthsToday = 0
  deathsToday = 0
  maxRing = 100
  firstRingBuilt = false
  // Probability that a fresh, undecided neighbour casts a NO (negative) vote.
  // Higher → more reds. Adjustable from 0.5 to 1.0 via the simulator slider.
  // At 1.0 no fresh YES ever occurs, so a community can never reach 3-of-7 and
  // the message stops propagating entirely.
  negativeVoteRate = 0.5
  // Parallel sides: at most this many EXTRA frontiers advance per tick (on top
  // of the original head frontier) — bounded so it stays watchable.
  private static readonly PARALLEL_CAP = 3
  private pendingSpreads: PendingSpread[] = []
  private activeMessageSender: string | null = null
  private messageStatusCallback?: (status: string, ring: number, voteCount?: number) => void
  private isMessageActive: boolean = false
  private pendingApprovals: Map<string, { fromKey: string; yesCount: number; neighborKeys: string[] }> = new Map()

  // Track historical data for churn rate and viral coefficient
  private historicalAliveCounts: number[] = []
  private historicalBirths: number[] = []
  private historicalDeaths: number[] = []

  constructor() {
    this.cells.set('0,0', new Cell(new AxialCoord(0, 0), 'citizen'))
  }

  setMessageStatusCallback(callback: (status: string, ring: number, voteCount?: number) => void) {
    this.messageStatusCallback = callback
  }

  /** Set the negative-vote (red) probability for fresh voters. Clamped 0.5–1.0. */
  setNegativeVoteRate(rate: number) {
    this.negativeVoteRate = Math.max(0.5, Math.min(1.0, rate))
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
    if (!this.isMessageActive) return;

    // 1) ORIGINAL behaviour — advance the head frontier by one cell.
    //    processNextVote() and the 3-of-7 voting rule are UNCHANGED.
    this.advanceHeadFrontier();

    // 2) ADDITIVE — open parallel "side" frontiers. A cell that already voted
    //    YES and whose nearer section has settled pushes the message onward to
    //    its OWN next ring, so a side that finished can keep going while another
    //    side is still voting. Gated to start only AFTER the first 7 voted.
    this.spawnParallelFrontiers();

    // 3) ADDITIVE — let a BOUNDED number of those side frontiers advance one
    //    cell each this tick (watchable). processNextVote() reused via rotation.
    this.advanceExtraFrontiers(Network.PARALLEL_CAP);

    this.clearOldVotes();
  }

  /**
   * Reuse processNextVote() UNCHANGED, but shield the other parallel frontiers
   * from its dead-end branch: the original stops the WHOLE message when one
   * frontier ends with zero approvals. With several sides alive at once, one
   * dead-end side must not kill the rest — so if that happens while other
   * frontiers are still queued, restore them and keep the message active.
   */
  private advanceHeadFrontier(): void {
    const survivors = this.pendingSpreads.slice(1);
    this.processNextVote();
    if (!this.isMessageActive && this.pendingSpreads.length === 0 && survivors.length > 0) {
      this.pendingSpreads = survivors;
      this.isMessageActive = true;
    }
  }

  /**
   * Counts the GREEN (message-holding) members of a cell's 7-member community —
   * the cell itself plus its 6 citizen neighbours. Green = hasMessage (an
   * approved YES cell, or the sender). Red cells and not-yet-reached cells count
   * 0. The news may pass onward from a community only when this reaches ≥3.
   */
  private communityGreenCount(cell: Cell): number {
    let green = cell.hasMessage ? 1 : 0;
    for (const nb of cell.coord.neighbors()) {
      const nc = this.cells.get(nb.key());
      if (nc && nc.status === 'citizen' && nc.hasMessage) green++;
    }
    return green;
  }

  /**
   * True if `cell` belongs to at least one APPROVED community — a 7-member
   * community (some news-holding centre + its 6 neighbours) that reached ≥3
   * greens. The centre may be the cell itself OR any of its neighbours that
   * already received the news. When a community passes 3-of-7, the news must
   * reach ALL of that community's members' neighbours; so every member (the
   * centre AND its 6 neighbours, red or green) is allowed to forward — not just
   * the cells whose own personal community happens to reach 3.
   */
  private inApprovedCommunity(cell: Cell): boolean {
    if (this.communityGreenCount(cell) >= 3) return true;
    for (const nb of cell.coord.neighbors()) {
      const m = this.cells.get(nb.key());
      if (m && m.status === 'citizen' && (m.hasVoted || m.isSender) &&
          this.communityGreenCount(m) >= 3) {
        return true;
      }
    }
    return false;
  }

  /**
   * ADDITIVE parallel side-frontiers (does NOT touch processNextVote or the
   * voting rule). For each cell that has voted YES, we let it forward to its
   * own outward neighbours — but only once it is SAFE to promote it to a
   * message holder, i.e. every nearer/same-ring neighbour has already voted.
   * That ordering guarantees promoting the cell can never inflate a
   * not-yet-voted same-ring neighbour's confirmation count, so the voting
   * outcome stays faithful to the original (no flooding the whole hive).
   */
  private spawnParallelFrontiers(): void {
    if (!this.isMessageActive || !this.activeMessageSender) return;
    const senderCell = this.cells.get(this.activeMessageSender);
    if (!senderCell) return;
    const senderCoord = senderCell.coord;

    // GATE: only after the first ring (the first 7) has fully voted.
    const ring1 = senderCoord.neighbors()
      .map(n => this.cells.get(n.key()))
      .filter((c): c is Cell => c !== undefined && c.status === 'citizen');
    // Wait for the first 7 to finish voting AND for the opening community
    // (sender + 6) to clear the 3-of-7 green threshold. If it didn't, no
    // parallel side may spawn — the message never started.
    if (ring1.length === 0 || !ring1.every(c => c.hasVoted)) return;
    if (this.communityGreenCount(senderCell) < 3) return;

    // Cells already claimed by some pending frontier — never enqueue twice.
    const queued = new Set<string>();
    for (const sp of this.pendingSpreads) {
      for (const k of sp.targetKeys) queued.add(k);
    }

    // Snapshot eligible sources first (anyone who has VOTED — yes OR no — and is
    // not the sender and hasn't forwarded yet). A red cell forwards (delivers)
    // too, so the message goes past it; only YES cells are promoted (below).
    const sources: Cell[] = [];
    for (const [, cell] of this.cells) {
      if (cell.eagerForwarded) continue;
      if (cell.isSender) continue;
      if (!cell.hasVoted) continue;
      sources.push(cell);
    }

    for (const cell of sources) {
      const d = senderCoord.distanceTo(cell.coord);
      const neighbourCells = cell.coord.neighbors()
        .map(n => this.cells.get(n.key()))
        .filter((c): c is Cell => c !== undefined && c.status === 'citizen');

      // ANTI-FLOOD GATE: every nearer/same-ring neighbour must have already
      // voted. Until then, promoting this cell could change a sibling's vote.
      const nearerSettled = neighbourCells.every(n =>
        senderCoord.distanceTo(n.coord) > d || n.hasVoted
      );
      if (!nearerSettled) continue; // try again next tick

      // COMMUNITY GATE: this cell may forward only if it belongs to an APPROVED
      // community (its own, or a neighbouring centre's, that reached 3-of-7).
      // Not yet → retry later as more neighbours turn green (don't mark it done).
      if (!this.inApprovedCommunity(cell)) continue;

      // Forward only OUTWARD (farther from sender) to still-untouched cells.
      const untouched: string[] = [];
      for (const n of neighbourCells) {
        if (senderCoord.distanceTo(n.coord) <= d) continue;
        const nk = n.coord.key();
        if (queued.has(nk) || n.hasMessage || n.hasVoted) continue;
        untouched.push(nk);
        queued.add(nk);
      }

      cell.eagerForwarded = true; // settled → mark once

      if (untouched.length === 0) continue;

      // Only YES cells are promoted to message holders (a red stays red and
      // contributes 0 to neighbours' counts). Promotion is safe here because
      // every nearer neighbour already voted, so it cannot change a sibling.
      if (cell.vote === 'yes' && !cell.hasMessage) {
        cell.hasMessage = true;
        cell.hasTick = true;
        cell.tickCount++;
        cell.receivedMessageFrom = this.activeMessageSender;
        cell.showVoteUntil = this.day + 10;
      }
      for (const nk of untouched) {
        const nc = this.cells.get(nk)!;
        nc.messageOriginKey = this.activeMessageSender;
        nc.hasVoted = false;
        nc.vote = null;
      }

      this.pendingSpreads.push({
        fromKey: cell.coord.key(),
        targetRing: d + 1,
        targetKeys: untouched,
        currentIndex: 0,
        votes: [],
        messageContent: `Parallel side from ${cell.coord.key()}`,
      });

      if (this.messageStatusCallback) {
        this.messageStatusCallback(
          `⚡ Parallel side from ${cell.coord.key()} → ${untouched.length} cell(s) (hop ${d + 1})`,
          d + 1, 0
        );
      }
    }
  }

  /**
   * Advance up to `cap` of the NON-head frontiers by one cell each this tick,
   * rotating the queue (head to back) and reusing advanceHeadFrontier() — so
   * a few sides move per tick (bounded / watchable).
   */
  private advanceExtraFrontiers(cap: number): void {
    let steps = Math.min(cap, this.pendingSpreads.length - 1);
    let guard = steps * 2 + 2; // safety against pathological queue churn
    while (steps > 0 && this.pendingSpreads.length > 1 && guard-- > 0) {
      const head = this.pendingSpreads.shift();
      if (head) this.pendingSpreads.push(head);
      this.advanceHeadFrontier();
      steps--;
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
      cell.eagerForwarded = false;
    }
    this.pendingSpreads = [];
    this.pendingApprovals.clear();
    this.activeMessageSender = null;
    this.isMessageActive = false;
  }

  private startRandomMessage(): void {
    const origin = new AxialCoord(0, 0);
    const allEligible: string[] = [];
    for (const [key, cell] of this.cells) {
      if (cell.status === 'citizen' && !cell.hasMessage) {
        const neighbors = this.getNeighborKeys(cell.coord);
        if (neighbors.length === 6) {
          allEligible.push(key);
        }
      }
    }

    if (allEligible.length === 0) {
      if (this.messageStatusCallback) {
        this.messageStatusCallback(`⚠️ No eligible cells with 6 neighbors found! Waiting for network to grow...`, 0);
      }
      return;
    }

    const weightedPool: string[] = [];
    for (const key of allEligible) {
      const cell = this.cells.get(key)!;
      const dist = cell.coord.distanceTo(origin);
      let weight: number;
      if (dist <= 1)       weight = 1;
      else if (dist <= 3)  weight = 8;
      else if (dist <= 5)  weight = 5;
      else                 weight = 1;
      for (let w = 0; w < weight; w++) weightedPool.push(key);
    }

    const selectedKey = weightedPool[Math.floor(Math.random() * weightedPool.length)];
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
      if (neighbor) neighbor.messageOriginKey = selectedKey;
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
    if (this.pendingSpreads.length === 0) return false;

    const currentSpread = this.pendingSpreads[0];

    // ── All votes collected for this ring ──────────────────────────
    if (currentSpread.currentIndex >= currentSpread.targetKeys.length) {

      // Build ring-vote lookup map
      const ringVoteMap = new Map<string, VoteType>();
      for (const v of currentSpread.votes) {
        ringVoteMap.set(v.nodeKey, v.vote);
      }

      // Separate approved / rejected
      const approvedInThisRing: string[] = [];
      const rejectedInThisRing: string[] = [];
      for (const vote of currentSpread.votes) {
        if (vote.vote === 'yes') approvedInThisRing.push(vote.nodeKey);
        else rejectedInThisRing.push(vote.nodeKey);
      }

      // RULE: cells that form a contiguous NO-block (self + 2 adjacent
      // NO-voters = block of 3) are marked dead immediately.
      for (const noKey of rejectedInThisRing) {
        const noCell = this.cells.get(noKey);
        if (!noCell) continue;
        const adjacentNoCount = noCell.coord.neighbors()
          .map(n => n.key())
          .filter(k => ringVoteMap.get(k) === 'no')
          .length;
        if (adjacentNoCount >= 2 && noCell.status === 'temporary') {
          // Part of a NO-block of ≥3 — mark dead (temporary cells only)
          noCell.status = 'dead';
          noCell.vote = 'no';
          noCell.showVoteUntil = this.day + 10;
          this.deathsToday++;
        }
      }

      const total = currentSpread.targetKeys.length;
      const approvedCount = approvedInThisRing.length;

      if (this.messageStatusCallback) {
        this.messageStatusCallback(
          `📊 Hop ${currentSpread.targetRing} results: ${approvedCount}/${total} cells approved`,
          currentSpread.targetRing, approvedCount
        );
      }

      // COMMUNITY VOTING GATE (3-of-7).
      // Treat every news-holding cell together with its 6 neighbours as a
      // 7-member community. First promote the cells that voted YES — they become
      // the GREEN (message-holding) members. The news then spreads to a
      // community's still-unreached OUTER neighbours ONLY IF that community has
      // ≥3 green members. It does not matter whether the forwarding cell itself
      // is red or green; what matters is the community's green count reaching 3.
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

      const queued = new Set<string>();
      for (const sp of this.pendingSpreads) {
        for (const k of sp.targetKeys) queued.add(k);
      }

      const nextFrontier: string[] = [];
      const seen = new Set<string>();
      for (const vote of currentSpread.votes) {
        const votedCell = this.cells.get(vote.nodeKey);
        if (!votedCell) continue;
        // Forward only if this cell belongs to an APPROVED community (its own,
        // or a neighbouring centre's, that reached 3-of-7 green). That way the
        // whole of an approved community delivers the news to ALL its neighbours.
        if (!this.inApprovedCommunity(votedCell)) continue;
        for (const nb of votedCell.coord.neighbors()) {
          const nk = nb.key();
          if (seen.has(nk) || queued.has(nk)) continue;
          const nc = this.cells.get(nk);
          if (!nc || nc.status !== 'citizen') continue;
          if (nc.hasMessage || nc.hasVoted) continue;
          seen.add(nk);
          nextFrontier.push(nk);
        }
      }

      const nextHop = currentSpread.targetRing + 1;

      if (nextFrontier.length > 0) {
        for (const nextCellKey of nextFrontier) {
          const nextCell = this.cells.get(nextCellKey);
          if (nextCell) {
            nextCell.messageOriginKey = currentSpread.fromKey;
            nextCell.hasVoted = false;
            nextCell.vote = null;
          }
        }

        const nextSpread: PendingSpread = {
          fromKey: currentSpread.fromKey,
          targetRing: nextHop,
          targetKeys: nextFrontier,
          currentIndex: 0,
          votes: [],
          messageContent: currentSpread.messageContent
        };

        this.pendingSpreads.push(nextSpread);

        if (this.messageStatusCallback) {
          this.messageStatusCallback(
            `✨ Communities reached 3-of-7 → spreading to ${nextFrontier.length} new cell(s) (hop ${nextHop})`,
            nextHop, approvedCount
          );
        }
      } else {
        const firstRing = currentSpread.targetRing === 1;
        if (this.messageStatusCallback) {
          this.messageStatusCallback(
            firstRing
              ? `🛑 STOPPED — the opening community did not reach 3-of-7 (only ${approvedCount} green)`
              : `🏆 Message fully propagated — no community cleared 3-of-7 onward (hop ${currentSpread.targetRing})`,
            currentSpread.targetRing, approvedCount
          );
        }
        if (firstRing) {
          this.pendingSpreads = [];
          this.isMessageActive = false;
        }
      }

      this.pendingSpreads.shift();
      return true;
    }

    // ── Still collecting votes for this ring ──────────────────────
    const targetKey = currentSpread.targetKeys[currentSpread.currentIndex];
    const targetCell = this.cells.get(targetKey);

    if (targetCell && targetCell.status === 'citizen' && !targetCell.hasVoted) {
      // Collect all citizen neighbors (the up-to-6 cells surrounding this one).
      const allNeighborCells = targetCell.coord.neighbors()
        .map(n => this.cells.get(n.key()))
        .filter((c): c is Cell => c !== undefined && c.status === 'citizen');

      // 3-of-6/7 CONFIRMATION RULE.
      //
      // We simply LOOK AT the surrounding members and count how many confirm:
      //   • a neighbour that has already approved (it holds the message — a
      //     relay center, INCLUDING any shared member that already said YES)
      //     is a standing confirmation, exactly as it shows on screen (green);
      //   • an undecided neighbour casts a fresh confirmation (60% YES);
      //   • a neighbour that already voted NO contributes nothing.
      // The cell confirms as soon as it holds ≥3 confirmations across its
      // surrounding hexagon. Shared members are NOT stripped from the tally —
      // a visible 3-of-7 must always count as 3. Looping cannot happen anyway,
      // because the BFS frontier never revisits a cell that has already voted
      // or already holds the message ("از همان سو" — forward only).
      let confirmations = 0;
      let standing = 0; // neighbours that already approved (green on screen)
      let fresh = 0;    // undecided neighbours that confirm now
      for (const neighbor of allNeighborCells) {
        if (neighbor.hasMessage) {
          standing++;
          confirmations++;
        } else if (!neighbor.hasVoted) {
          if (Math.random() >= this.negativeVoteRate) { fresh++; confirmations++; }
        }
        // a neighbour that already voted NO → no confirmation
      }

      const finalVote: VoteType = confirmations >= 3 ? 'yes' : 'no';

      targetCell.vote = finalVote;
      targetCell.hasVoted = true;
      targetCell.messageOriginKey = currentSpread.fromKey;
      targetCell.showVoteUntil = this.day + 10;

      currentSpread.votes.push({ nodeKey: targetKey, vote: finalVote, timestamp: this.day });

      const voteIcon = finalVote === 'yes' ? '✅' : '❌';
      const yesSoFar = currentSpread.votes.filter(v => v.vote === 'yes').length;

      if (this.messageStatusCallback) {
        this.messageStatusCallback(
          `${voteIcon} Hop ${currentSpread.targetRing} — Cell ${targetKey}: ${confirmations} conf (${standing} standing + ${fresh} fresh) → ${finalVote === 'yes' ? 'APPROVED' : 'REJECTED'} (${yesSoFar}/${currentSpread.targetKeys.length})`,
          currentSpread.targetRing, yesSoFar
        );
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
        this.updateHistoricalData();
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
        this.updateHistoricalData();
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
      this.updateHistoricalData();
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

  // ========== NEW METHODS FOR METRICS ==========

  /**
   * Calculates the churn rate (percentage of the population that left/joined)
   * Churn Rate = (Births + Deaths) / Average Population * 100
   * @param periodDays Optional number of days to look back (default: last 30 days)
   */
  getChurnRate(periodDays: number = 30): number {
    const stats = this.stats();
    const currentPopulation = stats.alive;
    
    if (currentPopulation === 0) return 0;
    
    // Calculate average births and deaths over the specified period
    const startDay = Math.max(0, this.day - periodDays);
    const birthsInPeriod = this.historicalBirths.slice(startDay, this.day);
    const deathsInPeriod = this.historicalDeaths.slice(startDay, this.day);
    
    const totalBirths = birthsInPeriod.reduce((sum, b) => sum + b, 0);
    const totalDeaths = deathsInPeriod.reduce((sum, d) => sum + d, 0);
    const totalChurn = totalBirths + totalDeaths;
    
    // Average population during the period
    const populationsInPeriod = this.historicalAliveCounts.slice(startDay, this.day);
    const avgPopulation = populationsInPeriod.length > 0 
      ? populationsInPeriod.reduce((sum, p) => sum + p, 0) / populationsInPeriod.length
      : currentPopulation;
    
    if (avgPopulation === 0) return 0;
    
    return (totalChurn / avgPopulation) * 100;
  }

  /**
   * Calculates the net growth rate
   * Net Growth Rate = (Births - Deaths) / Population * 100
   * @param periodDays Optional number of days to look back (default: last 30 days)
   */
  getNetGrowthRate(periodDays: number = 30): number {
    const stats = this.stats();
    const currentPopulation = stats.alive;
    
    if (currentPopulation === 0) return 0;
    
    // Calculate net growth over the specified period
    const startDay = Math.max(0, this.day - periodDays);
    const birthsInPeriod = this.historicalBirths.slice(startDay, this.day);
    const deathsInPeriod = this.historicalDeaths.slice(startDay, this.day);
    
    const totalBirths = birthsInPeriod.reduce((sum, b) => sum + b, 0);
    const totalDeaths = deathsInPeriod.reduce((sum, d) => sum + d, 0);
    const netGrowth = totalBirths - totalDeaths;
    
    // Average population during the period
    const populationsInPeriod = this.historicalAliveCounts.slice(startDay, this.day);
    const avgPopulation = populationsInPeriod.length > 0 
      ? populationsInPeriod.reduce((sum, p) => sum + p, 0) / populationsInPeriod.length
      : currentPopulation;
    
    if (avgPopulation === 0) return 0;
    
    return (netGrowth / avgPopulation) * 100;
  }

  /**
   * Calculates the viral coefficient (K-factor)
   * K-factor = Average number of new citizens created per existing citizen
   * This measures how many new "infections" (citizens) each existing citizen produces
   * @param periodDays Optional number of days to look back (default: last 30 days)
   */
  getViralCoefficient(periodDays: number = 30): number {
    const stats = this.stats();
    const currentPopulation = stats.alive;
    
    if (currentPopulation === 0) return 0;
    
    // Calculate new citizens created per day over the period
    const startDay = Math.max(0, this.day - periodDays);
    const birthsInPeriod = this.historicalBirths.slice(startDay, this.day);
    
    const totalNewCitizens = birthsInPeriod.reduce((sum, b) => sum + b, 0);
    
    // Average existing population during the period (excluding new births for that day)
    const populationsInPeriod = this.historicalAliveCounts.slice(startDay, this.day);
    const avgExistingPopulation = populationsInPeriod.length > 0
      ? populationsInPeriod.reduce((sum, p, idx) => {
          // Subtract same-day births to get existing population
          const existingPop = p - (this.historicalBirths[startDay + idx] || 0);
          return sum + existingPop;
        }, 0) / populationsInPeriod.length
      : currentPopulation;
    
    if (avgExistingPopulation === 0) return 0;
    
    // K-factor = total new citizens / total existing population over the period
    return totalNewCitizens / avgExistingPopulation;
  }

  /**
   * Updates historical tracking data - call this after each tick
   */
  private updateHistoricalData(): void {
    const stats = this.stats();
    this.historicalAliveCounts.push(stats.alive);
    this.historicalBirths.push(this.birthsToday);
    this.historicalDeaths.push(this.deathsToday);
    
    // Keep only last 1000 days of history to prevent memory issues
    const maxHistory = 1000;
    if (this.historicalAliveCounts.length > maxHistory) {
      this.historicalAliveCounts.shift();
      this.historicalBirths.shift();
      this.historicalDeaths.shift();
    }
  }

  /**
   * Gets complete metrics report
   */
  getMetrics(): {
    churnRate: number;
    netGrowthRate: number;
    viralCoefficient: number;
    currentPopulation: number;
    totalBirths: number;
    totalDeaths: number;
    day: number;
  } {
    return {
      churnRate: this.getChurnRate(),
      netGrowthRate: this.getNetGrowthRate(),
      viralCoefficient: this.getViralCoefficient(),
      currentPopulation: this.stats().alive,
      totalBirths: this.historicalBirths.reduce((sum, b) => sum + b, 0),
      totalDeaths: this.historicalDeaths.reduce((sum, d) => sum + d, 0),
      day: this.day
    };
  }

  /**
   * Reset the entire network with all historical data
   */
  reset(): void {
    this.cells.clear();
    this.cells.set('0,0', new Cell(new AxialCoord(0, 0), 'citizen'));
    this.day = 0;
    this.birthsToday = 0;
    this.deathsToday = 0;
    this.firstRingBuilt = false;
    this.pendingSpreads = [];
    this.activeMessageSender = null;
    this.isMessageActive = false;
    this.pendingApprovals.clear();
    this.historicalAliveCounts = [];
    this.historicalBirths = [];
    this.historicalDeaths = [];
  }
}