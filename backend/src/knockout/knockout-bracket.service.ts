import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from '../matches/schemas/match.schema.js';
import { GroupsService } from '../groups/groups.service.js';
import {
  assignThirdsToSlots,
  parseFeeder,
  rankBestThirds,
  ThirdPlaceTeam,
} from './knockout-bracket.js';

const ROUND32_STAGE = 'round32';
const LATER_STAGES = ['round16', 'quarter', 'semi', 'third', 'final'];

/** Which structural slot actually advanced from a finished knockout match. */
export function actualAdvancingSlot(match: Match): 'team1' | 'team2' | null {
  // A still-in-progress (live) result is not yet decided, so it must not
  // advance the bracket prematurely.
  if (
    match.status !== 'finished' ||
    match.live ||
    match.score1 == null ||
    match.score2 == null
  ) {
    return null;
  }
  if (match.score1 > match.score2) return 'team1';
  if (match.score1 < match.score2) return 'team2';
  // Level after regulation/ET — needs the penalty winner.
  return match.decidedOnPenalties ? match.penaltyWinner ?? null : null;
}

@Injectable()
export class KnockoutBracketService {
  constructor(
    @InjectModel(Match.name) private matchModel: Model<Match>,
    private groupsService: GroupsService,
  ) {}

  private groupLetter(groupName: string): string {
    return groupName.replace(/group\s*/i, '').trim().toUpperCase();
  }

  /**
   * Resolve the Round of 32 from final group standings: group winners and
   * runners-up to their slots, and the eight best third-placed teams via the
   * Annexe C assignment. Requires all 72 group matches to be finished.
   */
  async resolveRound32(): Promise<{ resolved: number; thirds: string[] }> {
    const standings = await this.groupsService.getStandings();
    if (standings.length < 12) {
      throw new BadRequestException(
        'All 12 groups must exist before resolving the Round of 32.',
      );
    }

    // Every group must have all three matchdays played (each team played 3).
    for (const g of standings) {
      const played = g.standings.reduce((s, t) => s + t.played, 0);
      if (played < 12) {
        throw new BadRequestException(
          `Group ${g.groupName} is not complete yet — finish all group matches first.`,
        );
      }
    }

    const winnerByGroup = new Map<string, string>();
    const runnerUpByGroup = new Map<string, string>();
    const thirdByGroup = new Map<string, string>();
    const thirds: ThirdPlaceTeam[] = [];

    for (const g of standings) {
      const letter = this.groupLetter(g.groupName);
      const [first, second, third] = g.standings;
      if (first) winnerByGroup.set(letter, first.teamId);
      if (second) runnerUpByGroup.set(letter, second.teamId);
      if (third) {
        thirdByGroup.set(letter, third.teamId);
        thirds.push({
          group: letter,
          teamId: third.teamId,
          points: third.points,
          goalDifference: third.goalDifference,
          goalsFor: third.goalsFor,
        });
      }
    }

    const bestThirds = rankBestThirds(thirds);
    const qualifiedGroups = bestThirds.map((t) => t.group);

    // Gather the third-slot candidates from the R32 placeholders.
    const r32 = await this.matchModel.find({ stage: ROUND32_STAGE }).exec();
    const slotCandidates: Record<number, string[]> = {};
    for (const m of r32) {
      const f1 = parseFeeder(m.team1Placeholder);
      const f2 = parseFeeder(m.team2Placeholder);
      if (f1?.kind === 'groupThird') slotCandidates[m.matchNumber] = f1.thirdCandidates!;
      if (f2?.kind === 'groupThird') slotCandidates[m.matchNumber] = f2.thirdCandidates!;
    }

    const assignment = assignThirdsToSlots(qualifiedGroups, slotCandidates);
    if (!assignment) {
      throw new BadRequestException(
        'Could not assign the best third-placed teams to bracket slots automatically. Assign them manually.',
      );
    }

    const resolveFeederTeam = (
      feeder: ReturnType<typeof parseFeeder>,
      matchNumber: number,
    ): string | null => {
      if (!feeder) return null;
      if (feeder.kind === 'groupWinner') return winnerByGroup.get(feeder.group!) ?? null;
      if (feeder.kind === 'groupRunnerUp') return runnerUpByGroup.get(feeder.group!) ?? null;
      if (feeder.kind === 'groupThird') {
        const g = assignment[matchNumber];
        return g ? thirdByGroup.get(g) ?? null : null;
      }
      return null;
    };

    let resolved = 0;
    for (const m of r32) {
      const t1 = resolveFeederTeam(parseFeeder(m.team1Placeholder), m.matchNumber);
      const t2 = resolveFeederTeam(parseFeeder(m.team2Placeholder), m.matchNumber);
      m.team1 = t1 ? new Types.ObjectId(t1) : m.team1;
      m.team2 = t2 ? new Types.ObjectId(t2) : m.team2;
      await m.save();
      if (t1 && t2) resolved++;
    }

    return { resolved, thirds: qualifiedGroups };
  }

  /**
   * Propagate finished knockout results into later rounds: winners/losers fill
   * the W{n}/L{n} slots of subsequent matches. Safe to run repeatedly.
   */
  async progressBracket(): Promise<{ updated: number }> {
    const all = await this.matchModel
      .find({ stage: { $in: [ROUND32_STAGE, ...LATER_STAGES] } })
      .sort({ matchNumber: 1 })
      .exec();
    const byNumber = new Map<number, Match>();
    for (const m of all) byNumber.set(m.matchNumber, m);

    let updated = 0;
    // Iterate to a fixpoint so a batch of newly-entered results propagates
    // across multiple rounds in one call, regardless of entry order.
    for (let pass = 0; pass < LATER_STAGES.length + 1; pass++) {
      let changedThisPass = false;
      for (const m of all) {
        if (!LATER_STAGES.includes(m.stage)) continue;
        const sides: Array<['team1' | 'team2', string | null | undefined]> = [
          ['team1', m.team1Placeholder],
          ['team2', m.team2Placeholder],
        ];
        let changed = false;
        for (const [side, ph] of sides) {
          const feeder = parseFeeder(ph);
          if (!feeder || (feeder.kind !== 'matchWinner' && feeder.kind !== 'matchLoser')) {
            continue;
          }
          const src = byNumber.get(feeder.matchNumber!);
          if (!src) continue;
          const advSlot = actualAdvancingSlot(src);
          if (!advSlot) continue;
          const winnerId = src[advSlot] as Types.ObjectId | null;
          const loserId = (advSlot === 'team1' ? src.team2 : src.team1) as Types.ObjectId | null;
          const teamId = feeder.kind === 'matchWinner' ? winnerId : loserId;
          if (!teamId) continue;
          if (!m[side] || m[side]!.toString() !== teamId.toString()) {
            m[side] = teamId;
            changed = true;
          }
        }
        if (changed) {
          await m.save();
          updated++;
          changedThisPass = true;
        }
      }
      if (!changedThisPass) break;
    }
    return { updated };
  }

  /** Enter (or update) a knockout result, including the penalty decider. */
  async setResult(
    matchId: string,
    score1: number,
    score2: number,
    opts: { decidedOnPenalties?: boolean; penaltyWinner?: 'team1' | 'team2'; live?: boolean } = {},
  ): Promise<Match> {
    const m = await this.matchModel.findById(matchId).exec();
    if (!m) throw new NotFoundException('Match not found');
    if (![ROUND32_STAGE, ...LATER_STAGES].includes(m.stage)) {
      throw new BadRequestException('Not a knockout match');
    }
    const tie = score1 === score2;
    const live = opts.live ?? false;
    // Only a *final* tie must declare a penalty winner. A live (in-progress)
    // tie can be recorded without one, just like the group stage.
    if (tie && !live && !opts.penaltyWinner) {
      throw new BadRequestException(
        'A finished tied knockout match needs a penalty winner (team1 or team2).',
      );
    }
    m.score1 = score1;
    m.score2 = score2;
    m.status = 'finished';
    m.live = live;
    m.decidedOnPenalties = tie && !live;
    m.penaltyWinner = tie && !live ? opts.penaltyWinner ?? null : null;
    await m.save();
    return m;
  }

  /**
   * Apply a result coming from the live-results worker. Unlike the admin
   * `setResult`, this never throws on an undecided tie (the shootout may not
   * have happened yet) — it just records what's known so far. `live` marks an
   * in-progress score so the bracket won't advance until the match is final.
   */
  async applyLiveResult(
    matchId: string,
    score1: number,
    score2: number,
    opts: {
      live: boolean;
      decidedOnPenalties?: boolean;
      penaltyWinner?: 'team1' | 'team2' | null;
    },
  ): Promise<Match> {
    const m = await this.matchModel.findById(matchId).exec();
    if (!m) throw new NotFoundException('Match not found');
    m.score1 = score1;
    m.score2 = score2;
    m.status = 'finished';
    m.live = opts.live;
    m.decidedOnPenalties = !!opts.decidedOnPenalties;
    m.penaltyWinner = opts.decidedOnPenalties ? opts.penaltyWinner ?? null : null;
    await m.save();
    return m;
  }

  /** Clear a knockout result. */
  async clearResult(matchId: string): Promise<Match> {
    const m = await this.matchModel.findById(matchId).exec();
    if (!m) throw new NotFoundException('Match not found');
    m.score1 = null;
    m.score2 = null;
    m.status = 'scheduled';
    m.live = false;
    m.decidedOnPenalties = false;
    m.penaltyWinner = null;
    await m.save();
    return m;
  }

  /** Admin override: force the two teams of a knockout match. */
  async overrideTeams(
    matchId: string,
    team1Id: string | null,
    team2Id: string | null,
  ): Promise<Match> {
    const m = await this.matchModel.findById(matchId).exec();
    if (!m) throw new NotFoundException('Match not found');
    if (!LATER_STAGES.includes(m.stage) && m.stage !== ROUND32_STAGE) {
      throw new BadRequestException('Not a knockout match');
    }
    m.team1 = (team1Id ? new Types.ObjectId(team1Id) : null) as unknown as Types.ObjectId;
    m.team2 = (team2Id ? new Types.ObjectId(team2Id) : null) as unknown as Types.ObjectId;
    await m.save();
    return m;
  }
}
