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

let _db:   Firestore | null = null
let _rtdb: Database  | null = null
let _auth: Auth      | null = null

export function getDb(): Firestore {
  if (!_db) {
    const { getFirestore } = require('firebase/firestore')
    _db = getFirestore(getApp()) as Firestore
  }
  return _db!
}

export function getRtdb(): Database {
  if (!_rtdb) {
    const { getDatabase } = require('firebase/database')
    _rtdb = getDatabase(getApp()) as Database
  }
  return _rtdb!
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    const { getAuth } = require('firebase/auth')
    _auth = getAuth(getApp()) as Auth
  }
  return _auth!
}
