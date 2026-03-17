// ─── Core game state stored in Firestore ─────────────────────────────────────

export type Team = {
  name:  string
  score: number
}

export type GamePhase = 'draft' | 'game' | 'ended'

export type CardResult = 'a' | 'b' | 'x'   // x = canceled (no one answered)

export type GameState = {
  roomId:        string
  teamA:         Team
  teamB:         Team
  categories:    string[]                        // 6 selected category IDs, in order
  answered:      Record<string, CardResult>      // key = "col-row"
  turn:          'a' | 'b'
  activeCard:    string | null                   // "col-row" of open question
  phase:         GamePhase
  usedLifelines: { a: string[]; b: string[] }
  isPit:         boolean                         // Pit lifeline armed
  createdAt:     number
}

// ─── A single question entry ──────────────────────────────────────────────────

export type Question = {
  id?: string
  q:   string    // question text (Arabic)
  a:   string    // answer text   (Arabic)
}

// ─── Category definition ──────────────────────────────────────────────────────

export type Category = {
  id:    string
  name:  string   // Arabic display name
  emoji: string
  desc:  string   // Arabic short description
}
