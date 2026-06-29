export interface User {
  id: string
  _id?: string
  email: string
  firstName: string
  lastName: string
  role: 'admin' | 'player'
  status: 'active' | 'inactive'
  profilePicture: string | null
  paymentStatus?: 'pending' | 'reported' | 'confirmed'
  paymentNote?: string | null
}

export interface Team {
  _id: string
  name: string
  code: string
  flagUrl: string | null
  group: Group | null
}

export interface Group {
  _id: string
  name: string
  teams: Team[]
}

export interface Match {
  _id: string
  matchNumber: number
  round: string
  stage: string
  group: Group | null
  team1: Team | null
  team2: Team | null
  team1Placeholder: string | null
  team2Placeholder: string | null
  date: string
  venue: string
  score1: number | null
  score2: number | null
  status: 'scheduled' | 'finished'
  live?: boolean
}

export interface Prediction {
  _id: string
  user: string | User
  entry: string
  match: Match
  score1: number
  score2: number
  points: number | null
}

export interface Entry {
  _id: string
  user: string
  entryNumber: number
  paymentStatus: 'pending' | 'reported' | 'confirmed'
  paymentNote: string | null
  status: 'active' | 'completed'
  completedAt: string | null
  progress?: PredictionProgress
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  entryId: string
  entryNumber: number
  firstName: string
  lastName: string
  email: string
  profilePicture: string | null
  totalPoints: number
  matchesScored: number
  exactCount?: number
  correctCount?: number
}

export interface PredictionProgress {
  filled: number
  total: number
  percentage: number
}

export interface PaymentMethod {
  label: string
  value: string
  details?: string
}

export interface PaymentConfig {
  _id?: string
  price: number
  currency: string
  paymentMethods: PaymentMethod[]
  instructions: string
  contactEmail: string
  contactPhone: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface TeamStanding {
  teamId: string
  teamName: string
  teamCode: string
  flagUrl: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

export interface GroupStandings {
  groupId: string
  groupName: string
  standings: TeamStanding[]
}

export interface ReadFixture {
  date: string | null
  home: string
  away: string
  score: string
  status: string
  matched: boolean
  changed: boolean
}

export interface LiveSyncStatus {
  checkedAt: string | null
  polledAt: string | null
  enabled: boolean
  inWindow: boolean
  updated: number
  unmatchedFixtures: number
  unmatchedTeams: string[]
  fixtures: ReadFixture[]
  error: string | null
}

// --- Knockout (phase 2) ---

export interface KnockoutEntry {
  _id: string
  user: string
  entryNumber: number
  paymentStatus: 'pending' | 'reported' | 'confirmed'
  paymentNote: string | null
  status: 'active' | 'completed'
  completedAt: string | null
  progress?: PredictionProgress
}

export interface TeamLite {
  _id: string
  name: string
  code: string
  flagUrl: string | null
}

export interface KnockoutBracketMatch {
  matchId: string
  matchNumber: number
  stage: string
  round: string
  date: string
  venue: string
  placeholder1: string | null
  placeholder2: string | null
  actualTeam1: TeamLite | null
  actualTeam2: TeamLite | null
  status: 'scheduled' | 'finished'
  live: boolean
  score1: number | null
  score2: number | null
  decidedOnPenalties: boolean
  penaltyWinner: 'team1' | 'team2' | null
  myTeam1: TeamLite | null
  myTeam2: TeamLite | null
  prediction: {
    score1: number
    score2: number
    advances: 'team1' | 'team2'
    points: number | null
  } | null
}

export interface KnockoutBracket {
  entryId: string | null
  paymentStatus: 'pending' | 'reported' | 'confirmed' | null
  locked: boolean
  deadline: string
  matches: KnockoutBracketMatch[]
}

export interface KnockoutPublicMatch {
  matchId: string
  matchNumber: number
  stage: string
  round: string
  date: string
  venue: string
  placeholder1: string | null
  placeholder2: string | null
  team1: TeamLite | null
  team2: TeamLite | null
  status: 'scheduled' | 'finished'
  live: boolean
  score1: number | null
  score2: number | null
  decidedOnPenalties: boolean
  penaltyWinner: 'team1' | 'team2' | null
  community: { team1: number; team2: number; total: number }
}

export interface KnockoutMatchPick {
  _id: string
  score1: number
  score2: number
  advances: 'team1' | 'team2'
  advancesTeam: TeamLite | null
  points: number | null
  result: 'exact' | 'correct' | 'miss' | null
  entryNumber: number | null
  user: { firstName: string; lastName: string; profilePicture: string | null }
}

export interface KnockoutMatchDetail {
  match: Omit<KnockoutPublicMatch, 'community'> | null
  predictions: KnockoutMatchPick[]
}

export interface KnockoutEntryPredictionRow {
  matchNumber: number
  stage: string
  round: string
  team1: TeamLite | null
  team2: TeamLite | null
  placeholder1: string | null
  placeholder2: string | null
  actualScore1: number | null
  actualScore2: number | null
  status: string | null
  score1: number
  score2: number
  advances: 'team1' | 'team2'
  advancesTeam: TeamLite | null
  points: number | null
  result: 'exact' | 'correct' | 'miss' | null
}
