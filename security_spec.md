# Security Specification - CryptoLab Platform

This document describes the security requirements and threat vectors for the Firestore collections in the CryptoLab Platform.

## 1. Data Invariants

1. **Election Isolation**: No voter eligibility, encrypted ballot, or audit log can refer to a non-existent election.
2. **Double Voting Prevention**: A voter cannot submit more than one encrypted ballot per election. Once a voter has voted, their `VoterEligibility` is marked `hasVoted: true`, preventing further ballot registrations.
3. **Immutability of Ledger**: Once an `EncryptedBallot` or `AuditLog` is created, it cannot be modified or deleted.
4. **Authenticity of Ballots**: Every `EncryptedBallot` must have a valid server RSA signature verifying that it was processed and blind-signed by the authority.
5. **Role-Based Permissions**: Only `ADMIN` users can create, open, or close elections. Non-admin users are strictly forbidden from modifying election states.
6. **Key Protection**: The `privateKeysStore` collection contains the Paillier private key secret elements (`lambda`, `mu`). This is classified as a top-secret system-only key and is strictly private. Neither authenticated users nor external clients can read or write to this collection. Only the trusted server-side admin client can access it.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 payloads represent attacks that must be strictly blocked at the Firestore security layer:

### Attack 1: User Identity Spoofing
*   **Target Collection**: `users`
*   **Payload**: `{ "id": "attacker-id", "email": "admin@cryptolab.univ", "role": "ADMIN" }`
*   **Threat**: An attacker attempts to set their own role to `ADMIN` or register as another user.

### Attack 2: Spoofed Election Creator
*   **Target Collection**: `elections`
*   **Payload**: `{ "id": "elec-123", "title": "Attack Election", "createdBy": "victim-user-id" }`
*   **Threat**: An attacker attempts to create an election pretending to be a different administrator.

### Attack 3: Unauthorized Election Status Manipulation
*   **Target Collection**: `elections` (Update)
*   **Payload**: `{ "status": "OPEN" }`
*   **Threat**: A voter attempts to open a draft election or reopen a closed election.

### Attack 4: Self-Granted Voter Eligibility
*   **Target Collection**: `voterEligibilities`
*   **Payload**: `{ "id": "el-attacker-elec1", "userId": "attacker", "electionId": "elec1", "eligible": true, "hasVoted": false }`
*   **Threat**: A voter attempts to register themselves as eligible for an election without admin authorization.

### Attack 5: Bypass Double-Voting Prevention
*   **Target Collection**: `voterEligibilities` (Update)
*   **Payload**: `{ "hasVoted": false }`
*   **Threat**: A voter who has already voted attempts to reset their `hasVoted` flag to `false` in order to cast another ballot.

### Attack 6: Unsigned Ballot Injection
*   **Target Collection**: `encryptedBallots`
*   **Payload**: `{ "id": "eb-malicious", "electionId": "elec1", "ballotId": "b-mal", "encryptedA": "123", "encryptedB": "456", "encryptedC": "789", "ballotHash": "abc", "serverSignature": "", "auditIndex": 16 }`
*   **Threat**: Injecting a ballot that has not been blind-signed by the server.

### Attack 7: Modifying Existing Ballots (Ledger Poisoning)
*   **Target Collection**: `encryptedBallots` (Update)
*   **Payload**: `{ "encryptedA": "999" }`
*   **Threat**: Altering already cast ballots to manipulate election outcomes.

### Attack 8: Deleting Decryption/Audit Logs
*   **Target Collection**: `auditLogs` (Delete)
*   **Payload**: Delete request on `al-123`.
*   **Threat**: Deleting audit/consensus log entries to cover tracks of an attack.

### Attack 9: Self-Decryption of Results
*   **Target Collection**: `tallies` (Create)
*   **Payload**: Fake tally report with arbitrary votes `{ "decryptedTotalA": 100, "decryptedTotalB": 0 }` submitted by a voter.
*   **Threat**: Voter publishing spoofed tally reports.

### Attack 10: Private Key Exfiltration
*   **Target Collection**: `privateKeysStore` (Get/Read)
*   **Payload**: Requesting private key for election `elec1`.
*   **Threat**: Rogue voter trying to read the private key to decrypt other people's anonymous ballots.

### Attack 11: Mass Scraping / Query Dumping
*   **Target Collection**: `users` (List)
*   **Payload**: Requesting all user records.
*   **Threat**: Scraping email addresses and roles of all users in the system.

### Attack 12: Injection of Massive Payload Sizes (Denial of Wallet)
*   **Target Collection**: `elections` (Create)
*   **Payload**: `{ "title": "A" * 1000000, ... }`
*   **Threat**: Resource exhaustion by injecting strings of extreme size.

---

## 3. Test Runner Specification

The Security Rules will be verified against the rules engine to return `PERMISSION_DENIED` for all these malicious payloads.
Since all mutations are channeled through our trusted backend server (using the admin SDK credentials), client-side direct access is restricted to **READ-ONLY** or **WRITE-DENIED** by default for all collections, except where authorized. This strictly implements a Zero-Trust stance.
