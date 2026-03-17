export type Team = {
  name:  string
  score: number
}

export type GamePhase = 'draft' | 'game' | 'ended'
export type CardResult = 'a' | 'b' | 'x'
export type Difficulty = 'easy' | 'medium' | 'hard'

export type GameState = {
  roomId:           string
  teamA:            Team
  teamB:            Team
  categories:       string[]
  questions:        Record<string, { q: string; a: string; difficulty: Difficulty }[]>
  answered:         Record<string, CardResult>
  turn:             'a' | 'b'
  activeCard:       string | null
  activeCardAnswer: string | null   // set when answer is revealed to all
  phase:            GamePhase
  usedLifelines:    { a: string[]; b: string[] }
  isPit:            boolean
  createdAt:        number
}

export type Question = {
  id?:        string
  q:          string
  a:          string
  difficulty: Difficulty
}

export type Category = {
  id:       string
  name:     string
  emoji:    string
  desc:     string
  custom?:  boolean
}
