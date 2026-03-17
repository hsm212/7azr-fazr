import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  appId:       process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const db   = getFirestore(app)   // Firestore  — game docs + question bank
export const rtdb = getDatabase(app)    // Realtime DB — live timer sync
export const auth = getAuth(app)        // Auth       — anonymous room sessions
