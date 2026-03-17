import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import type { Firestore } from 'firebase/firestore'
import type { Database } from 'firebase/database'
import type { Auth } from 'firebase/auth'

const getConfig = () => ({
  apiKey:      process.env.NEXT_PUBLIC_FIREBASE_API_KEY      ?? '',
  authDomain:  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  ?? '',
  projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID   ?? '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? '',
  appId:       process.env.NEXT_PUBLIC_FIREBASE_APP_ID       ?? '',
})

function getApp(): FirebaseApp {
  return getApps().length ? getApps()[0] : initializeApp(getConfig())
}

// ── ALL services are lazy — nothing runs at import time ───────────────────────
// This prevents Next.js build-time crashes when env vars are not available.

let _db:   Firestore | null = null
let _rtdb: Database  | null = null
let _auth: Auth      | null = null

export function getDb(): Firestore {
  if (!_db) {
    const { getFirestore } = require('firebase/firestore')
    _db = getFirestore(getApp())
  }
  return _db!
}

export function getRtdb(): Database {
  if (!_rtdb) {
    const { getDatabase } = require('firebase/database')
    _rtdb = getDatabase(getApp())
  }
  return _rtdb!
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const { getAuth } = require('firebase/auth')
    _auth = getAuth(getApp())
  }
  return _auth!
}

// Legacy named exports so existing imports don't break
export const db   = new Proxy({} as Firestore, { get: (_, p) => (getDb() as any)[p] })
export const auth = new Proxy({} as Auth,      { get: (_, p) => (getFirebaseAuth() as any)[p] })
