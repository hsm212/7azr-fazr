import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getDatabase, type Database } from 'firebase/database'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey:      process.env.NEXT_PUBLIC_FIREBASE_API_KEY      ?? '',
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  ?? '',
  projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID   ?? '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  appId:       process.env.NEXT_PUBLIC_FIREBASE_APP_ID       ?? '',
}

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
}

// Firestore and Auth are safe to init at module level
export const db: Firestore = getFirestore(getFirebaseApp())
export const auth: Auth    = getAuth(getFirebaseApp())

// Realtime Database MUST be lazy — getDatabase() crashes at build time
// when databaseURL is empty. Call getRtdb() instead of importing rtdb directly.
let _rtdb: Database | null = null
export function getRtdb(): Database {
  if (!_rtdb) {
    if (!firebaseConfig.databaseURL) {
      throw new Error('NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set')
    }
    _rtdb = getDatabase(getFirebaseApp())
  }
  return _rtdb
}
