"use client";

import React, { useState } from 'react';
import { generateRsaKeyPair } from '@cryptolab/rsa-engine';
import { Key, ShieldAlert, Shield, AlertTriangle, Cpu, HelpCircle } from 'lucide-react';

export default function RsaPage() {
  const [keySize, setKeySize] = useState<number>(512);
  const [isPedagogic, setIsPedagogic] = useState<boolean>(true);
  const [keys, setKeys] = useState<any>(null);
  const [generating, setGenerating] = useState<boolean>(false);

  const handleGenerate = () => {
    setGenerating(true);
    try {
      // Small simulation timer for natural UX
      setTimeout(() => {
        const generated = generateRsaKeyPair(keySize, isPedagogic);
        setKeys(generated);
        setGenerating(false);
      }, 300);
    } catch (e: any) {
      alert("Error: " + e.message);
      setGenerating(false);
    }
  };

  const isSecureSize = keySize === 2048 || keySize === 3072;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-3 text-indigo-600">
          <Key className="h-8 w-8" />
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            RSA Cryptosystem Key Generator
          </h1>
        </div>
        <p className="text-slate-500 text-sm">
          Part of the <code>@cryptolab/rsa-engine</code> package, this module demonstrates the complete mathematical workflow of prime searching, modular inversion, and key size segregation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
        {/* Key Generation Panel */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-indigo-500" />
            <span>Parameters</span>
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Key Size (Bits)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[512, 2048, 3072].map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setKeySize(size);
                    if (size > 512) setIsPedagogic(false); // Force secure mode
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-lg border transition ${
                    keySize === size
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Educational Mode
              </label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPedagogic ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {isPedagogic ? "ACTIVE" : "SECURE"}
              </span>
            </div>
            
            <p className="text-xs text-slate-400">
              Exposes p, q, phi, and d for educational inspection. Only allowed for small key sizes (512 bits) to prevent leakage of high-entropy keys.
            </p>

            <button
              disabled={isSecureSize}
              onClick={() => setIsPedagogic(!isPedagogic)}
              className={`w-full text-xs py-2 px-3 rounded-lg border font-medium transition ${
                isSecureSize
                  ? "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed"
                  : isPedagogic
                  ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {isSecureSize ? "Locked in Secure Mode" : isPedagogic ? "Deactivate Educational Mode" : "Activate Educational Mode"}
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-indigo-700 transition shadow-sm hover:shadow-md disabled:bg-slate-200 disabled:text-slate-400"
          >
            {generating ? "Generating Primes..." : "Generate Keypair"}
          </button>
        </div>

        {/* Output Panel */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Cryptographic Output
            </h3>
            {keys && (
              <span className="text-xs text-slate-400">
                Generated in {keys.durationMs}ms
              </span>
            )}
          </div>

          <div className="p-6 flex-1 space-y-6">
            {!keys ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-400 space-y-3">
                <HelpCircle className="h-12 w-12 text-slate-300" />
                <p className="text-sm">Select a key size and click "Generate Keypair" to see modular parameters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Warnings */}
                {isPedagogic ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-amber-900">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold">Pedagogical Mode Warnings:</p>
                      <p>Intermediate primes (p, q), private exponent (d), and Euler totient (phi) are fully exposed in plain text. This key size is easily factorable and is FOR DEMONSTRATION ONLY. Never use in production.</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 text-emerald-900">
                    <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold">Production-Grade Security Mode Active:</p>
                      <p>To avoid security vulnerabilities, private parameters p, q, and d are immediately blanked out and cleared from active memory. Only public variables e and n are shared.</p>
                    </div>
                  </div>
                )}

                {/* Display grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">PRIME P (Private)</span>
                    <p className="text-slate-700 break-all select-all font-mono leading-relaxed">
                      {keys.p}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">PRIME Q (Private)</span>
                    <p className="text-slate-700 break-all select-all font-mono leading-relaxed">
                      {keys.q}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 md:col-span-2 relative">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">MODULUS N (Public - p * q)</span>
                    <p className="text-indigo-700 break-all select-all font-mono leading-relaxed">
                      {keys.n}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 md:col-span-2 relative">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">EULER TOTIENT PHI(N) (Private - (p-1)*(q-1))</span>
                    <p className="text-slate-500 break-all select-all font-mono leading-relaxed">
                      {keys.phi}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative font-sans">
                    <span className="text-[10px] font-mono font-bold text-indigo-500 block mb-1">PUBLIC EXPONENT E</span>
                    <p className="text-indigo-600 text-sm font-semibold">
                      {keys.e}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative font-sans">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block mb-1">PRIVATE EXPONENT D</span>
                    <p className="text-slate-700 text-sm font-semibold break-all">
                      {keys.d}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="bg-slate-950 text-slate-300 rounded-3xl p-8 shadow-xl mt-12 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-white">API Reference for Key Generation</h2>
        <p className="text-xs text-slate-400">
          The following endpoint handles modular arithmetic operations and enforces Pedagogic warnings of private elements.
        </p>

        <div className="border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-indigo-400 font-bold">POST /api/rsa/keys/generate</span>
            <span className="text-slate-500">JSON API</span>
          </div>
          <div className="p-4 space-y-4 leading-relaxed">
            <div>
              <span className="text-slate-400 font-bold text-[10px] block mb-1">REQUEST BODY</span>
              <pre className="text-emerald-400">
{`{
  "bitLength": 512, // 512, 2048, or 3072
  "isPedagogic": true // true to expose primes, false for production
}`}
              </pre>
            </div>
            <div>
              <span className="text-slate-400 font-bold text-[10px] block mb-1">RESPONSE BODY (isPedagogic: true)</span>
              <pre className="text-sky-400">
{`{
  "p": "1355877461001...",
  "q": "1241950312513...",
  "n": "1683932454648...",
  "phi": "1683932454648...",
  "e": "65537",
  "d": "1504932014194...",
  "bitLength": 512,
  "isPedagogic": true,
  "durationMs": 42
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
