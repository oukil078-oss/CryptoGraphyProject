import re

with open('src/components/VotingLab.tsx', 'r') as f:
    content = f.read()

# Add imports
imports = """import { loadDb, saveDb } from '../lib/localDb';
import { encryptPaillier, decryptPaillier, addHomomorphic, generatePaillierKeys } from '../lib/paillier';
import { generateRsaKeys, padPKCS1v15Sign, modExp, sha256, bytesToHex } from '../lib/rsa';

// Server simulation key
const serverSignKey = generateRsaKeys(1024, true);

function getElections() {
  return loadDb().elections;
}
function getEligibility(electionId: string, email: string) {
  const db = loadDb();
  const user = db.users.find(u => u.email === email);
  if (!user) return { eligible: false, hasVoted: false, error: 'User unknown' };
  const eligibility = db.voterEligibilities.find(v => v.electionId === electionId && v.userId === user.id);
  if (!eligibility) return { eligible: user.role === UserRole.VOTER, hasVoted: false, userId: user.id };
  return { eligible: eligibility.eligible, hasVoted: eligibility.hasVoted, userId: user.id };
}
function getPublicBallots(electionId: string) {
  return loadDb().encryptedBallots.filter(b => b.electionId === electionId);
}
function getResults(electionId: string) {
  const tally = loadDb().tallies.find(t => t.electionId === electionId);
  if (!tally) throw new Error("Aucun résultat");
  return tally;
}
function createElection(data: any, email: string) {
  const db = loadDb();
  const user = db.users.find(u => u.email === email);
  if (!user || user.role !== UserRole.ADMIN) throw new Error("Droits requis");
  
  const electionId = 'election-' + Date.now();
  const keys = generatePaillierKeys(parseInt(data.keySize) || 256);
  const newElection = {
    id: electionId,
    title: data.title,
    description: data.description,
    optionALabel: data.optionA,
    optionBLabel: data.optionB,
    optionCLabel: data.optionC,
    status: ElectionStatus.OPEN,
    startsAt: data.startsAt || new Date().toISOString(),
    endsAt: data.endsAt || new Date(Date.now() + 3600000*24).toISOString(),
    paillierPublicKeyJson: JSON.stringify({ n: keys.publicKey.n.toString(), g: keys.publicKey.g.toString(), n2: keys.publicKey.n2.toString() }),
    createdBy: user.id,
    createdAt: new Date().toISOString()
  };
  db.elections.push(newElection);
  db.privateKeysStore[electionId] = JSON.stringify({ lambda: keys.privateKey.lambda.toString(), mu: keys.privateKey.mu.toString(), n: keys.privateKey.n.toString() });
  
  db.users.forEach(u => {
    db.voterEligibilities.push({ id: `el-${u.id}-${electionId}`, electionId, userId: u.id, eligible: u.role === UserRole.VOTER, hasVoted: false });
  });
  saveDb(db);
  return newElection;
}
async function castBallot(electionId: string, ballotId: string, encA: string, encB: string, encC: string, email: string) {
  const db = loadDb();
  const user = db.users.find(u => u.email === email);
  const el = db.elections.find(e => e.id === electionId);
  const eligibility = db.voterEligibilities.find(v => v.electionId === electionId && v.userId === user?.id);
  if (!user || !el || !eligibility || eligibility.hasVoted) throw new Error("Invalid vote");
  
  const payload = `${electionId}|${ballotId}|${encA}|${encB}|${encC}`;
  const ballotHash = bytesToHex(await sha256(payload));
  const paddedHash = await padPKCS1v15Sign(ballotHash, 1024);
  const serverSignature = modExp(paddedHash, serverSignKey.d!, serverSignKey.n).toString(16);
  
  const auditIndex = db.encryptedBallots.filter(b => b.electionId === electionId).length;
  db.encryptedBallots.push({
    id: `eb-${ballotId}`, electionId, ballotId, encryptedA: encA, encryptedB: encB, encryptedC: encC,
    ballotHash, serverSignature, auditIndex, createdAt: new Date().toISOString()
  });
  eligibility.hasVoted = true;
  saveDb(db);
  return { success: true, ballotId, ballotHash, serverSignature, auditIndex, serverSignKeyFingerprint: 'RSA-1024-SHA256' };
}
function setElectionStatus(id: string, email: string, status: ElectionStatus) {
  const db = loadDb();
  const el = db.elections.find(e => e.id === id);
  if (el) { el.status = status; saveDb(db); }
  return el;
}
async function tallyElection(id: string, email: string) {
  const db = loadDb();
  const el = db.elections.find(e => e.id === id);
  const ballots = db.encryptedBallots.filter(b => b.electionId === id);
  if (!el || ballots.length === 0) throw new Error("Erreur");
  
  const pubKeyObj = JSON.parse(el.paillierPublicKeyJson);
  const publicKey = { n: BigInt(pubKeyObj.n), g: BigInt(pubKeyObj.g), n2: BigInt(pubKeyObj.n2) };
  
  let aggA = BigInt(ballots[0].encryptedA);
  let aggB = BigInt(ballots[0].encryptedB);
  let aggC = BigInt(ballots[0].encryptedC);
  
  for(let i=1; i<ballots.length; i++) {
    aggA = addHomomorphic(aggA, BigInt(ballots[i].encryptedA), publicKey);
    aggB = addHomomorphic(aggB, BigInt(ballots[i].encryptedB), publicKey);
    aggC = addHomomorphic(aggC, BigInt(ballots[i].encryptedC), publicKey);
  }
  const privKeyObj = JSON.parse(db.privateKeysStore[id]);
  const privateKey = { lambda: BigInt(privKeyObj.lambda), mu: BigInt(privKeyObj.mu), n: BigInt(privKeyObj.n) };
  
  const decA = Number(decryptPaillier(aggA, privateKey));
  const decB = Number(decryptPaillier(aggB, privateKey));
  const decC = Number(decryptPaillier(aggC, privateKey));
  const expectedSum = ballots.length;
  
  const newTally = {
    id: `tally-${id}`, electionId: id, aggregateA: aggA.toString(), aggregateB: aggB.toString(), aggregateC: aggC.toString(),
    decryptedTotalA: decA, decryptedTotalB: decB, decryptedTotalC: decC, validBallotsCount: expectedSum,
    tallyReportHash: "dummy", tallySignature: "dummy", createdAt: new Date().toISOString()
  };
  db.tallies.push(newTally);
  el.status = ElectionStatus.TALLIED;
  saveDb(db);
  return { success: true, tally: newTally, checksumValid: expectedSum === decA+decB+decC };
}
function verifyBallot(electionId: string, ballotId: string) {
  const ballot = loadDb().encryptedBallots.find(b => b.electionId === electionId && b.ballotId === ballotId);
  if (!ballot) throw new Error("Bulletin introuvable");
  return { found: true, ballotId: ballot.ballotId, ballotHash: ballot.ballotHash, serverSignature: ballot.serverSignature, auditIndex: ballot.auditIndex, createdAt: ballot.createdAt };
}
function exportBallots(electionId: string) {
  const db = loadDb();
  return JSON.stringify({
    election: db.elections.find(e => e.id === electionId),
    ballots: db.encryptedBallots.filter(b => b.electionId === electionId),
    tally: db.tallies.find(t => t.electionId === electionId)
  }, null, 2);
}
"""

content = imports + content

# Replace fetches
content = re.sub(r'const res = await fetch\(\'/api/vote3/elections\'\);.*?const data = await res\.json\(\);', 'const data = getElections();', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/eligibility\?email=\$\{currentUser\.email\}`\);.*?const data = await res\.json\(\);', 'const data = getEligibility(selectedElection.id, currentUser.email);', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/ballots\/public`\);.*?const data = await res\.json\(\);', 'const data = getPublicBallots(selectedElection.id);', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/results`\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| ".*?"\);', 'const data = getResults(selectedElection.id);', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/vote3/elections\', \{.*?body: JSON.stringify\(payload\).*?\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);', 'const data = createElection(payload, currentUser.email);', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/ballots`, \{.*?body: JSON.stringify\(\{.*?\}\).*?\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);', 'const data = await castBallot(selectedElection.id, ballotId, encryptedA.toString(), encryptedB.toString(), encryptedC.toString(), currentUser.email);', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{id\}\/open`, \{.*?\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error\);', 'const data = setElectionStatus(id, currentUser.email, ElectionStatus.OPEN);', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{id\}\/close`, \{.*?\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error\);', 'const data = setElectionStatus(id, currentUser.email, ElectionStatus.CLOSED);', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/tally`, \{.*?\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error\);', 'const data = await tallyElection(selectedElection.id, currentUser.email);', content, flags=re.DOTALL)
content = re.sub(r'const res = await fetch\(`\/api\/vote3\/elections\/\$\{selectedElection\.id\}\/verify\/\$\{verifyBallotId\.trim\(\)\}`\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error\);', 'const data = verifyBallot(selectedElection.id, verifyBallotId.trim());', content, flags=re.DOTALL)

# Fix export button
content = re.sub(r'href=\{`/api/vote3/elections/\$\{selectedElection\.id\}/export`\}', r'''href={`data:text/json;charset=utf-8,${encodeURIComponent(exportBallots(selectedElection.id))}`} download={`export-election-${selectedElection.id}.json`}''', content)

with open('src/components/VotingLab.tsx', 'w') as f:
    f.write(content)

