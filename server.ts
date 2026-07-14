/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRequire } from 'module';
if (typeof globalThis.require === 'undefined') {
  (globalThis as any).require = createRequire(import.meta.url);
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ElectionStatus, UserRole } from './src/types';
import { generateRsaKeys, padPKCS1v15Encrypt, unpadPKCS1v15Encrypt, padPKCS1v15Sign, encryptHybrid, decryptHybrid, sha256, bytesToHex } from './src/lib/rsa';
import { generatePaillierKeys, encryptPaillier, decryptPaillier, addHomomorphic } from './src/lib/paillier';
import { modExp, modInverse } from './src/lib/math';
import { syncFromFirebase, saveDocToFirebase, isFirebaseEnabled } from './src/lib/firebaseServer';

const app = express();
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

app.use(express.json());

// Global Server-side RSA Signing Key (unique to this session/server)
// This key signs ballots, receipts, audit entries, and tallies.
const serverSignKey = generateRsaKeys(1024, true); // 1024 bits is fast for demo and perfect for signatures

// In-Memory Database Structure
interface Database {
  users: Array<{ id: string; email: string; passwordHash: string; role: UserRole; createdAt: string }>;
  elections: any[];
  voterEligibilities: any[];
  encryptedBallots: any[];
  auditLogs: any[];
  tallies: any[];
  privateKeysStore: Record<string, string>; // electionId -> privateKeyJson (Paillier)
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

// Helper to load DB
function loadDb(): Database {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading database, resetting...', err);
  }
  saveDb(defaultDb);
  return defaultDb;
}

// Helper to save DB
function saveDb(db: Database) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database', err);
  }
}

// Initialize and Seed Database if empty
async function initDb() {
  let dbObj = loadDb();
  
  // Try to sync with Firebase
  try {
    dbObj = await syncFromFirebase(dbObj);
  } catch (syncErr) {
    console.error('Failed to sync from Firebase on startup:', syncErr);
  }

  if (dbObj.elections.length === 0) {
    console.log('Seeding default academic election demo...');
    
    // Create an election
    const electionId = 'election-bde-2026';
    const keys = generatePaillierKeys(256); // 256 bits is highly pedagogical, extremely responsive for homomorphic multiplication
    
    const election = {
      id: electionId,
      title: 'Élection du Bureau des Étudiants (BDE) 2026',
      description: 'Scrutin académique de démonstration pour élire les représentants des étudiants. Propulsé par le cryptosystème de Paillier.',
      optionALabel: 'Liste Alpha (Innovation & Campus)',
      optionBLabel: 'Liste Bêta (Solidarité & Écologie)',
      optionCLabel: 'Liste Gamma (Culture & Festivités)',
      status: ElectionStatus.OPEN,
      startsAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      endsAt: new Date(Date.now() + 3600000 * 48).toISOString(), // 2 days from now
      paillierPublicKeyJson: JSON.stringify({
        n: keys.publicKey.n.toString(),
        g: keys.publicKey.g.toString(),
        n2: keys.publicKey.n2.toString()
      }),
      createdBy: 'u1',
      createdAt: new Date().toISOString()
    };
    
    dbObj.elections.push(election);
    await saveDocToFirebase('elections', election.id, election);

    const privKeyStr = JSON.stringify({
      lambda: keys.privateKey.lambda.toString(),
      mu: keys.privateKey.mu.toString(),
      n: keys.privateKey.n.toString()
    });
    dbObj.privateKeysStore[electionId] = privKeyStr;
    await saveDocToFirebase('privateKeysStore', electionId, { privateKeyJson: privKeyStr });

    // Seed default users to Firestore too
    for (const u of dbObj.users) {
      await saveDocToFirebase('users', u.id, u);
    }

    // Populate Eligibilities
    for (const u of dbObj.users) {
      const eligibility = {
        id: `el-${u.id}-${electionId}`,
        electionId,
        userId: u.id,
        eligible: u.role === UserRole.VOTER,
        hasVoted: false
      };
      dbObj.voterEligibilities.push(eligibility);
      await saveDocToFirebase('voterEligibilities', eligibility.id, eligibility);
    }

    // Add 15 pre-seeded anonymous encrypted ballots to the election
    const voteVectors = [
      ...Array(6).fill([1n, 0n, 0n]),
      ...Array(5).fill([0n, 1n, 0n]),
      ...Array(4).fill([0n, 0n, 1n])
    ];

    let previousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    let auditIndex = 0;

    for (let i = 0; i < voteVectors.length; i++) {
      const vector = voteVectors[i];
      const encA = encryptPaillier(vector[0], keys.publicKey).ciphertext;
      const encB = encryptPaillier(vector[1], keys.publicKey).ciphertext;
      const encC = encryptPaillier(vector[2], keys.publicKey).ciphertext;
      
      const ballotId = `ballot-seeded-${i + 1}`;
      const payload = `${electionId}|${ballotId}|${encA.toString()}|${encB.toString()}|${encC.toString()}`;
      const ballotHash = bytesToHex(await sha256(payload));
      
      // Sign with server private key
      const paddedHash = await padPKCS1v15Sign(ballotHash, 1024);
      const signature = modExp(paddedHash, serverSignKey.d, serverSignKey.n).toString(16);

      const ballot = {
        id: `eb-${ballotId}`,
        electionId,
        ballotId,
        encryptedA: encA.toString(),
        encryptedB: encB.toString(),
        encryptedC: encC.toString(),
        ballotHash,
        serverSignature: signature,
        auditIndex: auditIndex++,
        createdAt: new Date(Date.now() - 3600000 * (15 - i)).toISOString() // Staggered times
      };
      dbObj.encryptedBallots.push(ballot);
      await saveDocToFirebase('encryptedBallots', ballot.id, ballot);

      // Append to audit log
      const auditPayload = `${previousHash}|${payload}|${ballotHash}`;
      const entryHash = bytesToHex(await sha256(auditPayload));
      const paddedEntryHash = await padPKCS1v15Sign(entryHash, 1024);
      const auditSignature = modExp(paddedEntryHash, serverSignKey.d, serverSignKey.n).toString(16);

      const auditLog = {
        id: `al-${ballotId}`,
        electionId,
        eventType: 'VOTE_SUBMISSION',
        canonicalPayload: payload,
        previousHash,
        entryHash,
        signature: auditSignature,
        createdAt: new Date().toISOString()
      };
      dbObj.auditLogs.push(auditLog);
      await saveDocToFirebase('auditLogs', auditLog.id, auditLog);

      previousHash = entryHash;
    }

    saveDb(dbObj);
    console.log('Database seeded successfully with 15 encrypted ballots and synchronized to Cloud.');
  } else {
    // Save locally to keep it in sync
    saveDb(dbObj);
  }
}

// Run DB Initialization
initDb().catch(err => console.error('Error seeding database', err));


// ==========================================
// RSA LAB ENDPOINTS
// ==========================================

app.post('/api/rsa/keys/generate', (req, res) => {
  try {
    const { bitLength, isPedagogic } = req.body;
    const bits = parseInt(bitLength) || 1024;
    
    const start = Date.now();
    const keys = generateRsaKeys(bits, isPedagogic);
    const durationMs = Date.now() - start;
    
    res.json({
      p: keys.p.toString(),
      q: keys.q.toString(),
      n: keys.n.toString(),
      phi: keys.phi.toString(),
      e: keys.e.toString(),
      d: keys.d.toString(),
      bitLength: bits,
      isPedagogic,
      durationMs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/rsa/encrypt', (req, res) => {
  try {
    const { message, publicKey, bitLength } = req.body;
    const { e, n } = publicKey;
    const bits = parseInt(bitLength) || 1024;
    
    const start = Date.now();
    const padded = padPKCS1v15Encrypt(message, bits);
    const cipherBigInt = modExp(padded, BigInt(e), BigInt(n));
    const durationMs = Date.now() - start;

    res.json({
      message,
      cipherText: cipherBigInt.toString(16),
      formattedCipher: cipherBigInt.toString(),
      durationMs
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/rsa/decrypt', (req, res) => {
  try {
    const { cipherText, privateKey, bitLength } = req.body;
    const { d, n } = privateKey;
    const bits = parseInt(bitLength) || 1024;

    const start = Date.now();
    const cipherBigInt = BigInt('0x' + cipherText.replace(/[^0-9a-fA-F]/g, ''));
    const padded = modExp(cipherBigInt, BigInt(d), BigInt(n));
    const decryptedMessage = unpadPKCS1v15Encrypt(padded, bits);
    const durationMs = Date.now() - start;

    res.json({
      decrypted: decryptedMessage,
      durationMs
    });
  } catch (error: any) {
    res.status(400).json({ error: "Échec du déchiffrement. Vérifiez les paramètres de votre clé ou si le padding a été corrompu." });
  }
});

app.post('/api/rsa/sign', async (req, res) => {
  try {
    const { message, privateKey, bitLength } = req.body;
    const { d, n } = privateKey;
    const bits = parseInt(bitLength) || 1024;

    const start = Date.now();
    const padded = await padPKCS1v15Sign(message, bits);
    const signatureBigInt = modExp(padded, BigInt(d), BigInt(n));
    const hash = bytesToHex(await sha256(message));
    const durationMs = Date.now() - start;

    res.json({
      message,
      hash,
      signature: signatureBigInt.toString(16),
      formattedSignature: signatureBigInt.toString(),
      durationMs
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/rsa/verify', async (req, res) => {
  try {
    const { message, signature, publicKey, bitLength } = req.body;
    const { e, n } = publicKey;
    const bits = parseInt(bitLength) || 1024;

    const start = Date.now();
    const sigBigInt = BigInt('0x' + signature.replace(/[^0-9a-fA-F]/g, ''));
    const decryptedSig = modExp(sigBigInt, BigInt(e), BigInt(n));
    
    // Recréer le message rembourré attendu
    const expectedPadded = await padPKCS1v15Sign(message, bits);
    const durationMs = Date.now() - start;
    
    const isValid = decryptedSig === expectedPadded;
    
    res.json({
      isValid,
      durationMs
    });
  } catch (error: any) {
    res.json({ isValid: false, error: error.message });
  }
});

app.post('/api/rsa/hybrid/encrypt', async (req, res) => {
  try {
    const { message, publicKey, bitLength } = req.body;
    const { e, n } = publicKey;
    const bits = parseInt(bitLength) || 1024;

    const start = Date.now();
    const rsaPubKey = { e: BigInt(e), n: BigInt(n) };
    const result = await encryptHybrid(message, rsaPubKey, bits);
    const durationMs = Date.now() - start;

    res.json({
      ...result,
      originalSize: new TextEncoder().encode(message).length,
      cipherSize: result.cipherText.length / 2,
      durationMs
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/rsa/hybrid/decrypt', async (req, res) => {
  try {
    const { payload, privateKey, bitLength } = req.body;
    const { d, n } = privateKey;
    const bits = parseInt(bitLength) || 1024;

    const start = Date.now();
    const rsaPrivKey = { d: BigInt(d), n: BigInt(n) };
    const decrypted = await decryptHybrid(payload, rsaPrivKey, bits);
    const durationMs = Date.now() - start;

    res.json({
      decrypted,
      durationMs
    });
  } catch (error: any) {
    res.status(400).json({ error: "Échec du déchiffrement hybride. Les paramètres ou les tags d'authentification GCM sont invalides." });
  }
});

// Math lab assistants
app.post('/api/rsa/math/modexp', (req, res) => {
  try {
    const { base, exponent, modulo } = req.body;
    const start = Date.now();
    const result = modExp(BigInt(base), BigInt(exponent), BigInt(modulo));
    const durationMs = Date.now() - start;
    res.json({ result: result.toString(), durationMs });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/rsa/math/modinverse', (req, res) => {
  try {
    const { a, m } = req.body;
    const start = Date.now();
    const result = modInverse(BigInt(a), BigInt(m));
    const durationMs = Date.now() - start;
    res.json({ result: result.toString(), durationMs });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});


// ==========================================
// VOTE3 ENDPOINTS
// ==========================================

// Global Server Fingerprint Endpoint
app.get('/api/vote3/server-pubkey', (req, res) => {
  res.json({
    n: serverSignKey.n.toString(),
    e: serverSignKey.e.toString(),
    algorithm: 'RSA-1024'
  });
});

// Get Elections
app.get('/api/vote3/elections', (req, res) => {
  const db = loadDb();
  res.json(db.elections);
});

// Create Election (ADMIN only, simple authentication header)
app.post('/api/vote3/elections', (req, res) => {
  try {
    const { title, description, optionA, optionB, optionC, startsAt, endsAt, keySize, userEmail } = req.body;
    const db = loadDb();
    
    // Check role from simple email check
    const user = db.users.find(u => u.email === userEmail);
    if (!user || user.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Droits d'administration requis." });
    }

    const electionId = 'election-' + Date.now();
    const bits = parseInt(keySize) || 256;
    const keys = generatePaillierKeys(bits);

    const newElection = {
      id: electionId,
      title,
      description,
      optionALabel: optionA,
      optionBLabel: optionB,
      optionCLabel: optionC,
      status: ElectionStatus.OPEN,
      startsAt: startsAt || new Date().toISOString(),
      endsAt: endsAt || new Date(Date.now() + 3600000 * 24).toISOString(),
      paillierPublicKeyJson: JSON.stringify({
        n: keys.publicKey.n.toString(),
        g: keys.publicKey.g.toString(),
        n2: keys.publicKey.n2.toString()
      }),
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };

    db.elections.push(newElection);
    const privKeyStr = JSON.stringify({
      lambda: keys.privateKey.lambda.toString(),
      mu: keys.privateKey.mu.toString(),
      n: keys.privateKey.n.toString()
    });
    db.privateKeysStore[electionId] = privKeyStr;

    // Populate Eligibilities for everyone
    const newEligibilities: any[] = [];
    db.users.forEach(u => {
      const eligibility = {
        id: `el-${u.id}-${electionId}`,
        electionId,
        userId: u.id,
        eligible: u.role === UserRole.VOTER,
        hasVoted: false
      };
      db.voterEligibilities.push(eligibility);
      newEligibilities.push(eligibility);
    });

    saveDb(db);

    // Save to Firebase (async background task)
    saveDocToFirebase('elections', newElection.id, newElection);
    saveDocToFirebase('privateKeysStore', electionId, { privateKeyJson: privKeyStr });
    for (const el of newEligibilities) {
      saveDocToFirebase('voterEligibilities', el.id, el);
    }
    res.json(newElection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vote3/elections/:id/open', (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.body;
  const db = loadDb();
  
  const user = db.users.find(u => u.email === userEmail);
  if (!user || user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Droits requis." });
  }

  const el = db.elections.find(e => e.id === id);
  if (!el) return res.status(404).json({ error: "Scrutin introuvable." });
  
  el.status = ElectionStatus.OPEN;
  saveDb(db);
  saveDocToFirebase('elections', el.id, el);
  res.json(el);
});

app.post('/api/vote3/elections/:id/close', (req, res) => {
  const { id } = req.params;
  const { userEmail } = req.body;
  const db = loadDb();
  
  const user = db.users.find(u => u.email === userEmail);
  if (!user || user.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Droits requis." });
  }

  const el = db.elections.find(e => e.id === id);
  if (!el) return res.status(404).json({ error: "Scrutin introuvable." });
  
  el.status = ElectionStatus.CLOSED;
  el.closedAt = new Date().toISOString();
  saveDb(db);
  saveDocToFirebase('elections', el.id, el);
  res.json(el);
});

// Voter Eligibility check
app.get('/api/vote3/elections/:id/eligibility', (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  const db = loadDb();

  const user = db.users.find(u => u.email === email);
  if (!user) return res.json({ eligible: false, hasVoted: false, error: 'Utilisateur inconnu.' });

  const eligibility = db.voterEligibilities.find(v => v.electionId === id && v.userId === user.id);
  if (!eligibility) {
    return res.json({ eligible: user.role === UserRole.VOTER, hasVoted: false });
  }

  res.json({
    eligible: eligibility.eligible,
    hasVoted: eligibility.hasVoted,
    userId: user.id
  });
});

// Cast encrypted ballot
app.post('/api/vote3/elections/:id/ballots', async (req, res) => {
  try {
    const { id } = req.params;
    const { ballotId, encryptedA, encryptedB, encryptedC, userEmail } = req.body;
    const db = loadDb();

    const user = db.users.find(u => u.email === userEmail);
    if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });

    const el = db.elections.find(e => e.id === id);
    if (!el) return res.status(404).json({ error: "Élection introuvable." });
    if (el.status !== ElectionStatus.OPEN) return res.status(400).json({ error: "Le scrutin est fermé ou pas encore ouvert." });

    // Check double voting
    const eligibility = db.voterEligibilities.find(v => v.electionId === id && v.userId === user.id);
    if (!eligibility || !eligibility.eligible) {
      return res.status(403).json({ error: "Vous n'êtes pas inscrit sur la liste électorale." });
    }
    if (eligibility.hasVoted) {
      return res.status(400).json({ error: "Vous avez déjà transmis un bulletin pour cette élection." });
    }

    // Verify input structure
    if (!encryptedA || !encryptedB || !encryptedC) {
      return res.status(400).json({ error: "Structure de bulletin invalide (vecteurs homomorphes manquants)." });
    }

    // Calculate ballot cryptographic payload & hash
    const payload = `${id}|${ballotId}|${encryptedA}|${encryptedB}|${encryptedC}`;
    const ballotHash = bytesToHex(await sha256(payload));

    // Sign hash with server key
    const paddedHash = await padPKCS1v15Sign(ballotHash, 1024);
    const serverSignature = modExp(paddedHash, serverSignKey.d, serverSignKey.n).toString(16);

    // Append ballot (ANONYMOUS, separate table)
    const auditIndex = db.encryptedBallots.filter(b => b.electionId === id).length;
    const newBallot = {
      id: `eb-${ballotId}`,
      electionId: id,
      ballotId,
      encryptedA,
      encryptedB,
      encryptedC,
      ballotHash,
      serverSignature,
      auditIndex,
      createdAt: new Date().toISOString()
    };
    db.encryptedBallots.push(newBallot);

    // Mark as voted in the eligibilities (separating identité and bulletins)
    eligibility.hasVoted = true;
    eligibility.votedAt = new Date().toISOString();

    // Audit Chain calculation
    // Get last log hash
    const logs = db.auditLogs.filter(l => l.electionId === id);
    const lastLog = logs[logs.length - 1];
    const previousHash = lastLog ? lastLog.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const auditPayload = `${previousHash}|${payload}|${ballotHash}`;
    const entryHash = bytesToHex(await sha256(auditPayload));
    
    const paddedEntryHash = await padPKCS1v15Sign(entryHash, 1024);
    const auditSignature = modExp(paddedEntryHash, serverSignKey.d, serverSignKey.n).toString(16);

    const auditLog = {
      id: `al-${ballotId}`,
      electionId: id,
      eventType: 'VOTE_SUBMISSION',
      canonicalPayload: payload,
      previousHash,
      entryHash,
      signature: auditSignature,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.push(auditLog);

    saveDb(db);

    // Save to Firebase (async background task)
    saveDocToFirebase('encryptedBallots', newBallot.id, newBallot);
    saveDocToFirebase('voterEligibilities', eligibility.id, eligibility);
    saveDocToFirebase('auditLogs', auditLog.id, auditLog);

    res.json({
      success: true,
      ballotId,
      ballotHash,
      serverSignature,
      auditIndex,
      serverSignKeyFingerprint: 'RSA-1024-SHA256'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public board
app.get('/api/vote3/elections/:id/ballots/public', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  
  const ballots = db.encryptedBallots
    .filter(b => b.electionId === id)
    .map(b => ({
      ballotId: b.ballotId,
      encryptedA: b.encryptedA,
      encryptedB: b.encryptedB,
      encryptedC: b.encryptedC,
      ballotHash: b.ballotHash,
      serverSignature: b.serverSignature,
      auditIndex: b.auditIndex,
      createdAt: b.createdAt
    }));

  res.json(ballots);
});

// Audit log view
app.get('/api/vote3/elections/:id/audit', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const logs = db.auditLogs.filter(l => l.electionId === id);
  res.json(logs);
});

// Homomorphic Aggregation and Decryption (Dépouillement)
app.post('/api/vote3/elections/:id/tally', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;
    const db = loadDb();

    // Check Admin rights
    const user = db.users.find(u => u.email === userEmail);
    if (!user || user.role !== UserRole.ADMIN) {
      return res.status(403).json({ error: "Droits d'administration requis pour le dépouillement." });
    }

    const el = db.elections.find(e => e.id === id);
    if (!el) return res.status(404).json({ error: "Élection introuvable." });
    if (el.status === ElectionStatus.TALLIED) {
      return res.status(400).json({ error: "Le scrutin a déjà été dépouillé." });
    }

    const ballots = db.encryptedBallots.filter(b => b.electionId === id);
    if (ballots.length === 0) {
      return res.status(400).json({ error: "Aucun bulletin n'a été déposé dans l'urne. Impossible de dépouiller." });
    }

    const pubKeyObj = JSON.parse(el.paillierPublicKeyJson);
    const publicKey = {
      n: BigInt(pubKeyObj.n),
      g: BigInt(pubKeyObj.g),
      n2: BigInt(pubKeyObj.n2)
    };

    // Homomorphic Multiplication of ciphertexts modulo n2
    let aggregateA = BigInt(ballots[0].encryptedA);
    let aggregateB = BigInt(ballots[0].encryptedB);
    let aggregateC = BigInt(ballots[0].encryptedC);

    for (let i = 1; i < ballots.length; i++) {
      aggregateA = addHomomorphic(aggregateA, BigInt(ballots[i].encryptedA), publicKey);
      aggregateB = addHomomorphic(aggregateB, BigInt(ballots[i].encryptedB), publicKey);
      aggregateC = addHomomorphic(aggregateC, BigInt(ballots[i].encryptedC), publicKey);
    }

    // Load Trustee Private Key for decryption
    const privKeyStr = db.privateKeysStore[id];
    if (!privKeyStr) {
      return res.status(500).json({ error: "Clé privée du Trustee égarée. Impossible de déchiffrer." });
    }
    const privKeyObj = JSON.parse(privKeyStr);
    const privateKey = {
      lambda: BigInt(privKeyObj.lambda),
      mu: BigInt(privKeyObj.mu),
      n: BigInt(privKeyObj.n)
    };

    // Decrypt totals
    const decryptedTotalA = Number(decryptPaillier(aggregateA, privateKey));
    const decryptedTotalB = Number(decryptPaillier(aggregateB, privateKey));
    const decryptedTotalC = Number(decryptPaillier(aggregateC, privateKey));

    // Verify consistency sum = total ballots cast
    const expectedSum = ballots.length;
    const actualSum = decryptedTotalA + decryptedTotalB + decryptedTotalC;
    
    // Create cryptographic tally report
    const reportPayload = `${id}|${aggregateA.toString()}|${aggregateB.toString()}|${aggregateC.toString()}|${decryptedTotalA}|${decryptedTotalB}|${decryptedTotalC}|${expectedSum}`;
    const reportHash = bytesToHex(await sha256(reportPayload));
    
    const paddedReport = await padPKCS1v15Sign(reportHash, 1024);
    const tallySignature = modExp(paddedReport, serverSignKey.d, serverSignKey.n).toString(16);

    const newTally = {
      id: `tally-${id}`,
      electionId: id,
      aggregateA: aggregateA.toString(),
      aggregateB: aggregateB.toString(),
      aggregateC: aggregateC.toString(),
      decryptedTotalA,
      decryptedTotalB,
      decryptedTotalC,
      validBallotsCount: expectedSum,
      tallyReportHash: reportHash,
      tallySignature,
      createdAt: new Date().toISOString()
    };

    db.tallies.push(newTally);
    el.status = ElectionStatus.TALLIED;
    el.talliedAt = new Date().toISOString();

    // Log the event in audit chain
    const logs = db.auditLogs.filter(l => l.electionId === id);
    const lastLog = logs[logs.length - 1];
    const previousHash = lastLog ? lastLog.entryHash : '0000000000000000000000000000000000000000000000000000000000000000';
    
    const auditPayload = `${previousHash}|TALLY_REPORT|${reportHash}`;
    const entryHash = bytesToHex(await sha256(auditPayload));
    
    const paddedEntryHash = await padPKCS1v15Sign(entryHash, 1024);
    const auditSignature = modExp(paddedEntryHash, serverSignKey.d, serverSignKey.n).toString(16);

    const tallyAuditLog = {
      id: `al-tally-${id}`,
      electionId: id,
      eventType: 'TALLY_COMPLETED',
      canonicalPayload: reportPayload,
      previousHash,
      entryHash,
      signature: auditSignature,
      createdAt: new Date().toISOString()
    };
    db.auditLogs.push(tallyAuditLog);

    saveDb(db);

    // Save to Firebase (async background task)
    saveDocToFirebase('tallies', newTally.id, newTally);
    saveDocToFirebase('elections', el.id, el);
    saveDocToFirebase('auditLogs', tallyAuditLog.id, tallyAuditLog);

    res.json({
      success: true,
      tally: newTally,
      checksumValid: expectedSum === actualSum
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch tally results
app.get('/api/vote3/elections/:id/results', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  
  const tally = db.tallies.find(t => t.electionId === id);
  if (!tally) return res.status(404).json({ error: "Aucun résultat disponible (scrutin non dépouillé)." });
  
  res.json(tally);
});

// Export all ballots as verified signed JSON bundle
app.get('/api/vote3/elections/:id/export', (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  
  const election = db.elections.find(e => e.id === id);
  if (!election) return res.status(404).json({ error: "Scrutin introuvable." });
  
  const ballots = db.encryptedBallots.filter(b => b.electionId === id);
  const tally = db.tallies.find(t => t.electionId === id);
  const auditLogs = db.auditLogs.filter(l => l.electionId === id);
  
  res.json({
    election,
    ballotsCount: ballots.length,
    ballots,
    tally,
    auditLogs,
    serverSignPublicKey: {
      n: serverSignKey.n.toString(),
      e: serverSignKey.e.toString()
    },
    exportedAt: new Date().toISOString()
  });
});

// Verify single ballot receipt
app.get('/api/vote3/elections/:id/verify/:ballotId', (req, res) => {
  const { id, ballotId } = req.params;
  const db = loadDb();
  
  const ballot = db.encryptedBallots.find(b => b.electionId === id && b.ballotId === ballotId);
  if (!ballot) {
    return res.status(404).json({ error: "Bulletin introuvable dans le livre d'enregistrement public." });
  }
  
  res.json({
    found: true,
    ballotId: ballot.ballotId,
    ballotHash: ballot.ballotHash,
    serverSignature: ballot.serverSignature,
    auditIndex: ballot.auditIndex,
    createdAt: ballot.createdAt
  });
});


// ==========================================
// VITE SETUP & STATIC SERVER FOR PROD/DEV
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CryptoLab Platform server running on http://localhost:${PORT}`);
  });
}

startServer();
