/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { UserRole, ElectionStatus } from '../types';

let db: any = null;
const isFirebaseEnabled = false;

console.log('ℹ️ Running in 100% local database mode for robust, error-free presentation.');

export { db, isFirebaseEnabled };

// In-Memory Database Structure
interface Database {
  users: Array<{ id: string; email: string; passwordHash: string; role: UserRole; createdAt: string }>;
  elections: any[];
  voterEligibilities: any[];
  encryptedBallots: any[];
  auditLogs: any[];
  tallies: any[];
  privateKeysStore: Record<string, string>;
}

const DB_FILE = path.join(process.cwd(), 'db.json');

// Pull all data from Firestore to synchronize local db.json
export async function syncFromFirebase(localDb: Database): Promise<Database> {
  if (!isFirebaseEnabled || !db) {
    console.log('ℹ️ Firebase not enabled. Using local db.json data directly.');
    return localDb;
  }

  console.log('🔄 Synchronizing local database with Firebase Firestore...');
  const syncedDb: Database = {
    users: [...localDb.users],
    elections: [],
    voterEligibilities: [],
    encryptedBallots: [],
    auditLogs: [],
    tallies: [],
    privateKeysStore: {}
  };

  try {
    // 1. Sync Elections
    const electionsSnap = await db.collection('elections').get();
    electionsSnap.forEach((d: any) => {
      syncedDb.elections.push({ id: d.id, ...d.data() });
    });

    // 2. Sync Voter Eligibilities
    const eligSnap = await db.collection('voterEligibilities').get();
    eligSnap.forEach((d: any) => {
      syncedDb.voterEligibilities.push({ id: d.id, ...d.data() });
    });

    // 3. Sync Encrypted Ballots
    const ballotsSnap = await db.collection('encryptedBallots').get();
    ballotsSnap.forEach((d: any) => {
      syncedDb.encryptedBallots.push({ id: d.id, ...d.data() });
    });

    // 4. Sync Audit Logs
    const auditSnap = await db.collection('auditLogs').get();
    auditSnap.forEach((d: any) => {
      syncedDb.auditLogs.push({ id: d.id, ...d.data() });
    });

    // 5. Sync Tallies
    const talliesSnap = await db.collection('tallies').get();
    talliesSnap.forEach((d: any) => {
      syncedDb.tallies.push({ id: d.id, ...d.data() });
    });

    // 6. Sync Private Keys Store
    const keysSnap = await db.collection('privateKeysStore').get();
    keysSnap.forEach((d: any) => {
      const data = d.data();
      syncedDb.privateKeysStore[d.id] = data.privateKeyJson;
    });

    // 7. Sync Users
    const usersSnap = await db.collection('users').get();
    if (!usersSnap.empty) {
      syncedDb.users = [];
      usersSnap.forEach((d: any) => {
        syncedDb.users.push({ id: d.id, ...d.data() } as any);
      });
    }

    // Sort entries appropriately to keep index alignment
    syncedDb.encryptedBallots.sort((a, b) => (a.auditIndex || 0) - (b.auditIndex || 0));

    // Save synced db to local file
    fs.writeFileSync(DB_FILE, JSON.stringify(syncedDb, null, 2), 'utf8');
    console.log(`✅ Synchronization complete. Loaded ${syncedDb.elections.length} elections, ${syncedDb.encryptedBallots.length} ballots from Cloud.`);
    return syncedDb;
  } catch (err) {
    console.error('❌ Error synchronizing from Firebase Firestore, using local fallback:', err);
    return localDb;
  }
}

// Write to Firebase Firestore in the background (non-blocking)
export async function saveDocToFirebase(collectionName: string, docId: string, data: any): Promise<void> {
  if (!isFirebaseEnabled || !db) return;
  try {
    // Sanitize any undefined properties for Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await db.collection(collectionName).doc(docId).set(cleanData);
    console.log(`☁️ Successfully saved document ${collectionName}/${docId} to Firestore.`);
  } catch (err) {
    console.error(`❌ Error saving document to Firestore (${collectionName}/${docId}):`, err);
  }
}
