import React from 'react';
import { Shield, Key, Vote, Cpu, FileCode } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
          Secure Academic Monorepo Voting Platform
        </h1>
        <p className="max-w-2xl mx-auto text-xl text-slate-500">
          An educational workspace built with Next.js 15, FastAPI, Prisma, Docker, and cutting-edge homomorphic Paillier & RSA cryptography modules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit">
            <Key className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-4">RSA Key Engine</h3>
          <p className="text-sm text-slate-500 mt-2">
            Generate pedagogical 512-bit keys or high-grade 2048/3072-bit keys. Highly interactive view of prime generation (p, q), modulus n, phi(n), and exponents (e, d).
          </p>
          <a href="/rsa" className="inline-block mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            Open RSA Generator →
          </a>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl w-fit">
            <Vote className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-4">Paillier Voting Lab</h3>
          <p className="text-sm text-slate-500 mt-2">
            Create decentralized ballots, verify zero-knowledge inputs, and run homomorphic tallies with private keys kept strictly on the Trustee server.
          </p>
          <a href="/elections" className="inline-block mt-4 text-xs font-semibold text-pink-600 hover:text-pink-700">
            Explore Elections →
          </a>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-4">Nx Monorepo Architecture</h3>
          <p className="text-sm text-slate-500 mt-2">
            Highly structured and decoupled with distinct packages for `@cryptolab/shared-types`, `@cryptolab/rsa-engine`, and `@cryptolab/paillier-engine`.
          </p>
          <span className="inline-block mt-4 text-xs font-semibold text-teal-600">
            Fully Scaffolded & Documented
          </span>
        </div>
      </div>

      <div className="mt-16 bg-slate-900 text-white rounded-3xl p-8 shadow-xl">
        <div className="flex items-center space-x-4">
          <FileCode className="h-8 w-8 text-indigo-400" />
          <h2 className="text-2xl font-bold tracking-tight">Dockerized Architecture Checklist</h2>
        </div>
        <p className="text-slate-400 mt-2 text-sm">
          Run your entire full-stack platform locally with a single terminal command.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm text-slate-300">
          <div className="flex items-center space-x-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span><strong>apps/web</strong>: Next.js 15+ App Router</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span><strong>apps/api</strong>: Fastify/Express + Prisma API</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span><strong>packages/rsa-engine</strong>: Discrete math & keygen</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span><strong>packages/paillier-engine</strong>: Homomorphic cryptography</span>
          </div>
        </div>
      </div>
    </div>
  );
}
