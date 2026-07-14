/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  createdAt: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  optionALabel: string;
  optionBLabel: string;
  optionCLabel: string;
  status: ElectionStatus;
  startsAt: string;
  endsAt: string;
  paillierPublicKeyJson: string; // JSON containing { n, g } as strings
  createdBy: string;
  createdAt: string;
  closedAt?: string;
  talliedAt?: string;
}

export interface VoterEligibility {
  id: string;
  electionId: string;
  userId: string;
  eligible: boolean;
  hasVoted: boolean;
  votedAt?: string;
}

export interface EncryptedBallot {
  id: string;
  electionId: string;
  ballotId: string; // UUID of the ballot
  encryptedA: string; // BigInt as string
  encryptedB: string; // BigInt as string
  encryptedC: string; // BigInt as string
  ballotHash: string; // SHA-256 of canonical ballot
  serverSignature: string; // RSA signature from server
  auditIndex: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  electionId: string;
  eventType: string; // 'VOTE_SUBMISSION', 'ELECTION_CREATION', 'ELECTION_CLOSED', 'TALLY_COMPLETED'
  canonicalPayload: string;
  previousHash: string;
  entryHash: string; // SHA-256(previousHash + canonicalPayload + timestamp)
  signature: string; // Server RSA signature on entryHash
  createdAt: string;
}

export interface Tally {
  id: string;
  electionId: string;
  aggregateA: string; // BigInt representation of aggregate cipher A
  aggregateB: string;
  aggregateC: string;
  decryptedTotalA: number;
  decryptedTotalB: number;
  decryptedTotalC: number;
  validBallotsCount: number;
  tallyReportHash: string;
  tallySignature: string; // RSA signature from Trustee/Server
  createdAt: string;
}

export interface CryptoKeyMetadata {
  id: string;
  electionId: string;
  keyType: 'PAILLIER' | 'RSA_SIGN' | 'RSA_ENC';
  publicKeyFingerprint: string;
  algorithm: string;
  keySize: number;
  createdAt: string;
}

// Math interfaces for RSA Big Numbers Lab
export interface RsaKeyPair {
  p: string; // Stringified BigInt for display
  q: string;
  n: string;
  phi: string;
  e: string;
  d: string;
  bitLength: number;
  isPedagogic: boolean;
}

export interface RsaSignResult {
  message: string;
  hash: string;
  signature: string;
  formattedSignature: string;
  durationMs: number;
}

export interface RsaEncryptResult {
  message: string;
  cipherText: string;
  formattedCipher: string;
  durationMs: number;
}

export interface HybridEncryptResult {
  encryptedKey: string; // RSA encrypted AES key
  iv: string; // hex
  tag: string; // hex
  cipherText: string; // hex representation of ciphertext
  originalSize: number;
  cipherSize: number;
  durationMs: number;
}
