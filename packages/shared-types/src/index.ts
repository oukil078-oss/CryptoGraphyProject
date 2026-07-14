export enum UserRole {
  ADMIN = 'ADMIN',
  VOTER = 'VOTER',
  AUDITOR = 'AUDITOR'
}

export enum ElectionStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  TALLIED = 'TALLIED'
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date | string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  status: ElectionStatus;
  optionALabel: string;
  optionBLabel: string;
  optionCLabel: string;
  startsAt: Date | string;
  endsAt: Date | string;
  paillierPublicKeyJson: string; // Paillier public key serialized
  createdBy: string;
  createdAt: Date | string;
  closedAt?: Date | string;
  talliedAt?: Date | string;
}

export interface VoterEligibility {
  id: string;
  electionId: string;
  userId: string;
  eligible: boolean;
  hasVoted: boolean;
  votedAt?: Date | string;
}

export interface RsaKeyPair {
  p?: string; // Stringified bigint, hidden/exposed based on pedagogical mode
  q?: string; // Stringified bigint, hidden/exposed based on pedagogical mode
  n: string; // Stringified bigint
  phi?: string; // Stringified bigint, hidden/exposed based on pedagogical mode
  e: string; // Stringified bigint
  d?: string; // Stringified bigint, hidden/exposed based on pedagogical mode
  bitLength: number;
  isPedagogic: boolean;
  durationMs?: number;
}

export interface PaillierKeyPair {
  publicKey: {
    n: string;
    g: string;
    n2: string;
  };
  privateKey?: {
    lambda: string;
    mu: string;
    n: string;
  };
  bitLength: number;
}

export interface EncryptedBallot {
  id: string;
  electionId: string;
  ballotId: string;
  encryptedA: string; // Paillier ciphertext of vote choice A (0 or 1)
  encryptedB: string; // Paillier ciphertext of vote choice B (0 or 1)
  encryptedC: string; // Paillier ciphertext of vote choice C (0 or 1)
  ballotHash: string; // SHA-256 canonical hash of the ballot payload
  serverSignature: string; // RSA signature of the ballot hash from the server
  auditIndex: number;
  createdAt: Date | string;
}

export interface AuditLog {
  id: string;
  electionId: string;
  eventType: 'VOTE_SUBMISSION' | 'TALLY_COMPLETED' | 'ELECTION_CREATION';
  canonicalPayload: string;
  previousHash: string;
  entryHash: string;
  signature: string;
  createdAt: Date | string;
}

export interface TallyResult {
  id: string;
  electionId: string;
  aggregateA: string; // Paillier sum ciphertext
  aggregateB: string; // Paillier sum ciphertext
  aggregateC: string; // Paillier sum ciphertext
  decryptedTotalA: number;
  decryptedTotalB: number;
  decryptedTotalC: number;
  validBallotsCount: number;
  tallyReportHash: string;
  tallySignature: string;
  createdAt: Date | string;
}
