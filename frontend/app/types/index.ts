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
