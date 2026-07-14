import { UserRole, ElectionStatus } from '../types';

export interface Database {
  users: Array<{ id: string; email: string; passwordHash: string; role: UserRole; createdAt: string }>;
  elections: any[];
  voterEligibilities: any[];
  encryptedBallots: any[];
  auditLogs: any[];
  tallies: any[];
  privateKeysStore: Record<string, string>;
}

const defaultDb: Database = {
  users: [
    { id: 'u1', email: 'admin@cryptolab.univ', passwordHash: 'admin123', role: UserRole.ADMIN, createdAt: new Date().toISOString() },
    { id: 'u2', email: 'alice@cryptolab.univ', passwordHash: 'alice123', role: UserRole.VOTER, createdAt: new Date().toISOString() },
    { id: 'u3', email: 'bob@cryptolab.univ', passwordHash: 'bob123', role: UserRole.VOTER, createdAt: new Date().toISOString() },
    { id: 'u4', email: 'clara@cryptolab.univ', passwordHash: 'clara123', role: UserRole.VOTER, createdAt: new Date().toISOString() },
    { id: 'u5', email: 'david@cryptolab.univ', passwordHash: 'david123', role: UserRole.VOTER, createdAt: new Date().toISOString() },
    { id: 'u6', email: 'charlie@cryptolab.univ', passwordHash: 'charlie123', role: UserRole.AUDITOR, createdAt: new Date().toISOString() },
  ],
  elections: [],
  voterEligibilities: [],
  encryptedBallots: [],
  auditLogs: [],
  tallies: [],
  privateKeysStore: {}
};

export function loadDb(): Database {
  try {
    const data = localStorage.getItem('cryptolab_db');
    if (data) {
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading DB from localStorage', err);
  }
  return { ...defaultDb };
}

export function saveDb(db: Database) {
  try {
    localStorage.setItem('cryptolab_db', JSON.stringify(db));
  } catch (err) {
    console.error('Error saving DB to localStorage', err);
  }
}
