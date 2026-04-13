import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { TeamsService } from '../teams/teams.service.js';
import { GroupsService } from '../groups/groups.service.js';
import { MatchesService } from '../matches/matches.service.js';
import { UsersService } from '../users/users.service.js';
import { Role } from '../common/enums/role.enum.js';

interface SeedMatch {
  num: number;
  group: string | null;
  team1: string | null;
  team2: string | null;
  date: string;
  venue: string;
  round: string;
  stage?: string;
  placeholder1?: string;
  placeholder2?: string;
}

interface SeedData {
  groups: Record<string, string[]>;
  teamCodes: Record<string, string>;
  matches: SeedMatch[];
}

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private teamsService: TeamsService,
    private groupsService: GroupsService,
    private matchesService: MatchesService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Starting World Cup 2026 data seeding...');

    const dataPath = path.join(__dirname, 'data', 'worldcup2026.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data: SeedData = JSON.parse(rawData);

    // Create teams
    const teamMap = new Map<string, string>(); // name -> id
    for (const [name, code] of Object.entries(data.teamCodes)) {
      const team = await this.teamsService.upsert(name, code);
      teamMap.set(name, team._id.toString());
    }
    this.logger.log(`Seeded ${teamMap.size} teams`);

    // Create groups and assign teams
    const groupMap = new Map<string, string>(); // name -> id
    for (const [groupName, teamNames] of Object.entries(data.groups)) {
      const group = await this.groupsService.upsert(groupName);
      groupMap.set(groupName, group._id.toString());

      for (const teamName of teamNames) {
        const teamId = teamMap.get(teamName);
        if (teamId) {
          await this.groupsService.addTeam(group._id.toString(), teamId);
          await this.teamsService.setGroup(teamId, group._id.toString());
        }
      }
    }
    this.logger.log(`Seeded ${groupMap.size} groups`);

    // Create matches
    for (const match of data.matches) {
      const matchData: Record<string, unknown> = {
        matchNumber: match.num,
        round: match.round,
        stage: match.stage || 'group',
        date: new Date(match.date),
        venue: match.venue,
      };

      if (match.group) {
        matchData.group = groupMap.get(match.group) || null;
      }

      if (match.team1 && teamMap.has(match.team1)) {
        matchData.team1 = teamMap.get(match.team1);
      }
      if (match.team2 && teamMap.has(match.team2)) {
        matchData.team2 = teamMap.get(match.team2);
      }

      if (match.placeholder1) {
        matchData.team1Placeholder = match.placeholder1;
      }
      if (match.placeholder2) {
        matchData.team2Placeholder = match.placeholder2;
      }

      await this.matchesService.upsertByNumber(
        matchData as Parameters<typeof this.matchesService.upsertByNumber>[0],
      );
    }
    this.logger.log(`Seeded ${data.matches.length} matches`);

    // Create admin user
    await this.createAdminUser();

    this.logger.log('Seeding completed!');
  }

  private async createAdminUser(): Promise<void> {
    const adminEmail = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@quiniela2026.com',
    );
    const adminPassword = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'Admin123456!',
    );

    const existing = await this.usersService.findByEmail(adminEmail);
    if (existing) {
      this.logger.log('Admin user already exists, skipping...');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await this.usersService.create({
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'Quiniela',
      password: hashedPassword,
      role: Role.Admin,
      status: 'active',
    });
    this.logger.log(`Admin user created: ${adminEmail}`);
  }
}
