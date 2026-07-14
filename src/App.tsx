import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  Shield, Key, Vote, AlertTriangle, BookOpen
} from 'lucide-react';
import { RsaLab } from './components/RsaLab';
import { VotingLab } from './components/VotingLab';
import { CyclicAttackLab } from './components/CyclicAttackLab';
import { DocReport } from './components/DocReport';
import { UserRole } from './types';

const ADMIN_USER = {
  id: 'u1',
  email: 'admin@his-university.dz',
  name: 'Zakarya Oukil (Admin)',
  role: UserRole.ADMIN
};

export default function App() {
  const [activeModule, setActiveModule] = useState<'rsa' | 'cyclic' | 'vote3' | 'doc'>('rsa');
  const [loading, setLoading] = useState(true);

  const appRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Initial Loading Animation
    const tl = gsap.timeline({
      onComplete: () => setLoading(false)
    });

    if (loadingRef.current) {
      tl.to(loadingRef.current, {
        opacity: 0,
        duration: 0.8,
        delay: 1.5, // Fake loading time
        ease: "power2.inOut"
      });
    }

    if (headerRef.current && mainRef.current) {
      tl.fromTo(headerRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, "-=0.2")
        .fromTo(mainRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, "-=0.4");
    }
  }, []);

  return (
    <div ref={appRef} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden scanline">
      {/* Loading Screen */}
      {loading && (
        <div ref={loadingRef} className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center">
          <Shield size={64} className="text-emerald-500 animate-pulse mb-6" />
          <h1 className="text-2xl font-black tracking-widest uppercase text-white font-mono crt-glow mb-2">
            INITIALISATION CRYPTOLAB...
          </h1>
          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-emerald-500 w-full origin-left animate-[progress_1.5s_ease-in-out]" />
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.95),rgba(3,7,18,0.98))] z-0" />
      <div className="absolute inset-0 cyber-grid opacity-10 z-0" />
      
      {/* Primary Header styled as military-grade command interface */}
      <header ref={headerRef} className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500/10 p-2.5 border-2 border-emerald-500/40 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)] rounded-lg">
              <Shield size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-black tracking-widest uppercase text-white font-mono crt-glow">
                  CRYPTOLAB PORTAL
                </h1>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 uppercase tracking-wider rounded">
                  Syllabus 2026
                </span>
              </div>
              <p className="text-[10px] tracking-widest text-slate-400 font-mono mt-1">
                LEAD DEVELOPER: <span className="text-emerald-400 font-bold">ZAKARYA OUKIL</span> // HIS-UNIVERSITY (CRYPTOGRAPHIE AVANCÉE)
              </p>
            </div>
          </div>

          {/* Module Selector - Tab Deck */}
          <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg shadow-lg flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveModule('rsa')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                activeModule === 'rsa'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key size={14} />
              RSA & GRANDS NOMBRES
            </button>
            <button
              onClick={() => setActiveModule('cyclic')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                activeModule === 'cyclic'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle size={14} />
              ATTAQUE CYCLIQUE
            </button>
            <button
              onClick={() => setActiveModule('vote3')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                activeModule === 'vote3'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Vote size={14} />
              VOTE HOMOMORPHE
            </button>
            <button
              onClick={() => setActiveModule('doc')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 rounded cursor-pointer ${
                activeModule === 'doc'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen size={14} />
              GUIDE ACADÉMIQUE
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main ref={mainRef} className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6">
        {/* Workspace views */}
        <div className="w-full space-y-6">
          <div className={`${activeModule === 'rsa' ? 'block' : 'hidden'}`}>
             <RsaLab />
          </div>
          <div className={`${activeModule === 'cyclic' ? 'block' : 'hidden'}`}>
             <CyclicAttackLab />
          </div>
          <div className={`${activeModule === 'vote3' ? 'block' : 'hidden'}`}>
             <VotingLab currentUser={ADMIN_USER} />
          </div>
          <div className={`${activeModule === 'doc' ? 'block' : 'hidden'}`}>
             <DocReport />
          </div>
        </div>
      </main>

      {/* Primary Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-900/60 backdrop-blur py-4 px-6 text-center text-[10px] flex flex-col md:flex-row justify-between items-center max-w-7xl w-full mx-auto gap-2 font-mono mt-12 text-slate-500">
        <p>© 2026 CryptoLab Platform. Développé par <span className="text-slate-300 font-bold">Zakarya Oukil</span> pour le module <span className="text-slate-300">Cryptographie Avancée</span> — HIS-University.</p>
        <p className="text-emerald-500/80 font-bold uppercase tracking-wider crt-glow">INTEGRITY_CHECK: SHA256_PASSED</p>
      </footer>
    </div>
  );
}
