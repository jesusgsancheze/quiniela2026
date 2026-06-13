import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Match status as reported by football-data.org. */
export type ProviderStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED';

export interface ProviderTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
}

export interface ProviderMatch {
  id: number;
  utcDate: string;
  status: ProviderStatus;
  homeTeam: ProviderTeam;
  awayTeam: ProviderTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

/**
 * Thin client for the football-data.org v4 API.
 *
 * Free tier (https://www.football-data.org/pricing):
 *   - FIFA World Cup ("WC") competition is included
 *   - 10 requests / minute
 *   - Fixtures, results and in-play scores (slightly delayed)
 *
 * Requires a free API key from https://www.football-data.org/client/register
 * set as FOOTBALL_DATA_API_KEY.
 */
@Injectable()
export class FootballDataProvider {
  private readonly logger = new Logger(FootballDataProvider.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';
  private readonly competition: string;

  constructor(private readonly config: ConfigService) {
    this.competition = this.config.get<string>('FOOTBALL_DATA_COMPETITION') ?? 'WC';
  }

  get apiKey(): string | undefined {
    return this.config.get<string>('FOOTBALL_DATA_API_KEY');
  }

  /** Fetch every match in the configured competition. */
  async fetchMatches(): Promise<ProviderMatch[]> {
    const key = this.apiKey;
    if (!key) {
      this.logger.warn('FOOTBALL_DATA_API_KEY is not set; skipping fetch.');
      return [];
    }

    const url = `${this.baseUrl}/competitions/${this.competition}/matches`;
    const res = await fetch(url, { headers: { 'X-Auth-Token': key } });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `football-data.org responded ${res.status} ${res.statusText}: ${body.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as { matches?: ProviderMatch[] };
    return data.matches ?? [];
  }
}
