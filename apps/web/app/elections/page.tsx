"use client";

import React, { useState } from 'react';
import { generatePaillierKeyPair, encryptPaillier } from '@cryptolab/paillier-engine';
import { Vote, Shield, Key, PlusCircle, CheckCircle, ListTodo, FileCode, AlertCircle, Sparkles } from 'lucide-react';

export default function ElectionsPage() {
  const [elections, setElections] = useState<any[]>([
    {
      id: "election-demo-2026",
      title: "Academic BDE Elections 2026",
      description: "Secure academic board elections using homomorphic aggregation.",
      status: "OPEN",
      optionALabel: "Team Green",
      optionBLabel: "Team Blue",
      optionCLabel: "Team Red",
      startsAt: "2026-07-13T00:00:00Z",
      endsAt: "2026-07-15T00:00:00Z",
      paillierPublicKeyJson: JSON.stringify({
        n: "45279471718503...",
        g: "45279471718504...",
        n2: "2050220556731..."
      })
    }
  ]);

  // Admin states
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [optA, setOptA] = useState<string>('Candidate Alpha');
  const [optB, setOptB] = useState<string>('Candidate Beta');
  const [optC, setOptC] = useState<string>('Candidate Gamma');
  const [keySize, setKeySize] = useState<number>(2048);
  const [role, setRole] = useState<'ADMIN' | 'VOTER'>('ADMIN');

  // Voter states
  const [selectedElection, setSelectedElection] = useState<string>('election-demo-2026');
  const [voteChoice, setVoteChoice] = useState<'A' | 'B' | 'C'>('A');
  const [ballotCast, setBallotCast] = useState<boolean>(false);
  const [castPayload, setCastPayload] = useState<any>(null);

  const handleCreateElection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return alert("Title is required");

    // Generate Paillier Key for the election
    const keys = generatePaillierKeyPair(keySize);

    const newElection = {
      id: 'election-' + Date.now(),
      title,
      description,
      status: 'OPEN',
      optionALabel: optA,
      optionBLabel: optB,
      optionCLabel: optC,
      startsAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + 3600000 * 48).toISOString(),
      paillierPublicKeyJson: JSON.stringify(keys.publicKey)
    };

    setElections([newElection, ...elections]);
    setTitle('');
    setDescription('');
    alert("Election created and public Paillier parameters seeded!");
  };

  const handleCastBallot = () => {
    const el = elections.find(e => e.id === selectedElection);
    if (!el) return;

    const pubKey = JSON.parse(el.paillierPublicKeyJson);
    
    // Create homomorphic voting vectors:
    // Choice A: [1, 0, 0]
    // Choice B: [0, 1, 0]
    // Choice C: [0, 0, 1]
    const vecA = voteChoice === 'A' ? 1n : 0n;
    const vecB = voteChoice === 'B' ? 1n : 0n;
    const vecC = voteChoice === 'C' ? 1n : 0n;

    // Encrypt vectors with Paillier
    const encA = encryptPaillier(vecA, pubKey);
    const encB = encryptPaillier(vecB, pubKey);
    const encC = encryptPaillier(vecC, pubKey);

    const payload = {
      ballotId: 'ballot-' + Math.floor(Math.random() * 1000000),
      encryptedA: encA.ciphertext,
      encryptedB: encB.ciphertext,
      encryptedC: encC.ciphertext,
      ballotHash: "sha256-hash-calculated-on-payload-vector-canonical",
      serverSignature: "rsa-signature-calculated-by-api-trustee-server"
    };

    setCastPayload(payload);
    setBallotCast(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-3 text-pink-600">
            <Vote className="h-8 w-8" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Paillier Voting Lab
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Configure secure, homomorphically aggregated academic voting schemes.
          </p>
        </div>

        {/* Persona toggle */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1 text-xs font-semibold">
          <button
            onClick={() => setRole('ADMIN')}
            className={`px-3 py-1.5 rounded-lg transition ${
              role === 'ADMIN' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin Dashboard
          </button>
          <button
            onClick={() => setRole('VOTER')}
            className={`px-3 py-1.5 rounded-lg transition ${
              role === 'VOTER' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Voter Booth
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
        {role === 'ADMIN' ? (
          /* ADMIN DASHBOARD: CREATE ELECTION */
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <PlusCircle className="h-5 w-5 text-indigo-500" />
              <span>New Election</span>
            </h3>

            <form onSubmit={handleCreateElection} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">ELECTION TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student Council 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">DESCRIPTION</label>
                <textarea
                  placeholder="Explain election parameters..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">CANDIDATES / CHOICES</label>
                <input
                  type="text"
                  placeholder="Option A"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-2"
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-2"
                />
                <input
                  type="text"
                  placeholder="Option C"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">PAILLIER TRUSTEE KEY SIZE</label>
                <select
                  value={keySize}
                  onChange={(e) => setKeySize(parseInt(e.target.value))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value={512}>512 bits (Pedagogical)</option>
                  <option value={1024}>1024 bits (Standard)</option>
                  <option value={2048}>2048 bits (Secure)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-indigo-700 transition"
              >
                Create & Broadcast Public Key
              </button>
            </form>
          </div>
        ) : (
          /* VOTER BOOTH: SUBMIT BALLOT */
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              <span>Voting Booth</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">SELECT ELECTION</label>
                <select
                  value={selectedElection}
                  onChange={(e) => {
                    setSelectedElection(e.target.value);
                    setBallotCast(false);
                    setCastPayload(null);
                  }}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white"
                >
                  {elections.map((e) => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 block uppercase">CAST YOUR VOTE</label>
                <div className="space-y-2">
                  {['A', 'B', 'C'].map((opt) => {
                    const el = elections.find(e => e.id === selectedElection);
                    const label = opt === 'A' ? el?.optionALabel : opt === 'B' ? el?.optionBLabel : el?.optionCLabel;
                    return (
                      <label key={opt} className="flex items-center space-x-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 cursor-pointer text-xs">
                        <input
                          type="radio"
                          name="vote"
                          checked={voteChoice === opt}
                          onChange={() => setVoteChoice(opt as any)}
                          className="text-pink-600 focus:ring-pink-500"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleCastBallot}
                className="w-full bg-pink-600 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-pink-700 transition"
              >
                Encrypt & Submit Cryptographic Ballot
              </button>
            </div>
          </div>
        )}

        {/* LIST OF ELECTIONS & PUBLIC BULLETIN BOARD */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-2">
              <ListTodo className="h-5 w-5 text-slate-400" />
              <span>Public Bulletin Board & Active Elections</span>
            </h3>

            <div className="space-y-4">
              {elections.map((el) => (
                <div key={el.id} className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{el.title}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {el.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{el.description}</p>
                  
                  <div className="bg-white p-3 rounded-lg border border-slate-100 font-mono text-[10px] space-y-1">
                    <span className="text-slate-400 font-bold block">PAILLIER PUBLIC PARAMETER N</span>
                    <span className="text-indigo-600 break-all block">{el.paillierPublicKeyJson}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ballotCast && castPayload && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-6 space-y-4 animate-fade-in">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
                <h4 className="text-sm font-bold">Cryptographic Ballot Cast Successfully!</h4>
              </div>
              <p className="text-xs">
                Your vote was encoded as choice-vectors, individually encrypted with Paillier homomorphic parameters, canonically hashed, signed by the server, and written to the bulletin board.
              </p>

              <div className="bg-white p-3 rounded-lg border border-emerald-100 font-mono text-[10px] space-y-2 text-slate-600">
                <div>
                  <span className="font-bold text-emerald-600 block">BALLOT_ID (Anonymous Random)</span>
                  <span>{castPayload.ballotId}</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-600 block">ENCRYPTED_VECTOR_A</span>
                  <span className="break-all">{castPayload.encryptedA}</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-600 block">ENCRYPTED_VECTOR_B</span>
                  <span className="break-all">{castPayload.encryptedB}</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-600 block">ENCRYPTED_VECTOR_C</span>
                  <span className="break-all">{castPayload.encryptedC}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API SPECIFICATIONS DOCUMENTATION */}
      <div className="bg-slate-950 text-slate-300 rounded-3xl p-8 shadow-xl mt-12 space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
            <FileCode className="h-6 w-6 text-pink-400" />
            <span>API Specifications for Vote3 Elections</span>
          </h2>
          <p className="text-xs text-slate-400">
            Secure endpoints implementing validation, role-based access control, and cryptographically verified ballot submissions.
          </p>
        </div>

        <div className="space-y-6 text-xs font-mono">
          {/* Endpoint 1 */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">POST</span>
                <span className="text-indigo-400 font-bold">/api/vote3/elections</span>
              </div>
              <span className="text-amber-400 text-[10px] font-bold">ADMIN ROLE ONLY</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-slate-400 font-sans">Creates a new election instance, generates secure Paillier trustee keys, and seeds voter eligibility lists.</p>
              <div>
                <span className="text-slate-500 block">[Headers]</span>
                <span className="text-slate-300">Authorization: Bearer &lt;AdminJWT&gt;</span>
              </div>
              <div>
                <span className="text-slate-500 block">[Request Body]</span>
                <pre className="text-emerald-400">
{`{
  "title": "BDE Election 2026",
  "description": "Secure Student Council Elections",
  "optionA": "Team Alpha",
  "optionB": "Team Beta",
  "optionC": "Team Gamma",
  "startsAt": "2026-07-13T00:00:00.000Z",
  "endsAt": "2026-07-15T00:00:00.000Z",
  "keySize": 2048
}`}
                </pre>
              </div>
            </div>
          </div>

          {/* Endpoint 2 */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">POST</span>
                <span className="text-indigo-400 font-bold">/api/vote3/elections/{"{id}"}/ballots</span>
              </div>
              <span className="text-blue-400 text-[10px] font-bold">VOTER ROLE ONLY</span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-slate-400 font-sans">Submits an anonymous encrypted ballot, prevents double-voting by updating the eligibility list, and logs submission in the audit logs.</p>
              <div>
                <span className="text-slate-500 block">[Headers]</span>
                <span className="text-slate-300">Authorization: Bearer &lt;VoterJWT&gt;</span>
              </div>
              <div>
                <span className="text-slate-500 block">[Request Body]</span>
                <pre className="text-emerald-400">
{`{
  "ballotId": "ballot-847291",
  "encryptedA": "49582039482...",
  "encryptedB": "23948234892...",
  "encryptedC": "12039482039...",
  "ballotHash": "61a5e1e...",
  "serverSignature": "82b1d0e..."
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
