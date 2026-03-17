export type Team = {
  name:  string
  score: number
}

export type GamePhase = 'draft' | 'game' | 'ended'
export type CardResult = 'a' | 'b' | 'x'

export type GameState = {
  roomId:        string
  teamA:         Team
  teamB:         Team
  categories:    string[]
  // Questions stored in Firestore so all devices see identical order
  questions:     Record<string, { q: string; a: string }[]>
  answered:      Record<string, CardResult>
  turn:          'a' | 'b'
  activeCard:    string | null
  phase:         GamePhase
  usedLifelines: { a: string[]; b: string[] }
  isPit:         boolean
  createdAt:     number
}

export type Question = {
  id?: string
  q:   string
  a:   string
}

export type Category = {
  id:    string
  name:  string
  emoji: string
  desc:  string
}
