import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { BookOpen, Key, Vote, ShieldAlert } from 'lucide-react';

export function DocReport() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  return (
    <div ref={containerRef} className="space-y-8 font-mono">
      {/* Intro Banner */}
      <div className="border border-slate-800 bg-slate-900/60 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wider crt-glow">
          <BookOpen size={18} className="text-emerald-400" />
          Rapport & Guide Méthodologique de TP
        </h2>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-3xl font-sans">
          Ce rapport est spécialement structuré pour la présentation académique. Il résume les fondements mathématiques, les formules algorithmiques et les schémas d'architectures sécurisées pour les trois axes développés dans la plateforme.
        </p>
      </div>

      {/* Grid of Sections */}
      <div className="space-y-8">
        
        {/* Module 1: RSA with Big Integers */}
        <div className="border border-slate-800 bg-slate-900/30 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Key size={16} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Module 1 : RSA & Algorithme des Grands Nombres
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                Le cryptosystème RSA repose sur la difficulté calculatoire de la factorisation d'entiers composés de grands facteurs premiers (problème mathématique asymétrique à sens unique).
              </p>
              <h4 className="font-mono font-bold text-emerald-400 text-xs uppercase">Processus Algorithmique :</h4>
              <ul className="list-decimal pl-5 space-y-2 font-mono text-[11px] text-slate-400">
                <li>
                  <strong className="text-slate-200">Génération :</strong> Choisir de grands nombres premiers p et q. Calculer le module public N = p * q.
                </li>
                <li>
                  <strong className="text-slate-200">Indicateur d'Euler :</strong> φ(N) = (p - 1) * (q - 1).
                </li>
                <li>
                  <strong className="text-slate-200">Clé Publique e :</strong> Choisir e premier avec φ(N), généralement e = 65537.
                </li>
                <li>
                  <strong className="text-slate-200">Clé Privée d :</strong> Calculer l'inverse modulaire par l'algorithme d'Euclide étendu : d ≡ e^(-1) (mod φ(N)).
                </li>
                <li>
                  <strong className="text-slate-200">Chiffrement :</strong> C = M^e (mod N).
                </li>
                <li>
                  <strong className="text-slate-200">Déchiffrement :</strong> M = C^d (mod N).
                </li>
              </ul>
            </div>

            {/* Diagram 1: RSA Structure */}
            <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">
                Flux d'Échange & Chiffrement RSA
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 160" className="w-full max-w-sm">
                {/* Node Alice */}
                <rect x="20" y="50" width="70" height="40" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x="55" y="74" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">Alice (M)</text>

                {/* Arrow Alice to Cipher */}
                <path d="M 90 70 L 155 70" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#doc-arrow)" />
                <text x="122" y="60" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">C = M^e mod N</text>

                {/* Node Channel/Ciphertext */}
                <rect x="165" y="50" width="100" height="40" rx="6" fill="#0f172a" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3" />
                <text x="215" y="74" fill="#ef4444" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="monospace">Ciphertext (C)</text>

                {/* Arrow Cipher to Bob */}
                <path d="M 265 70 L 335 70" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#doc-arrow)" />
                <text x="300" y="60" fill="#10b981" fontSize="9" textAnchor="middle" fontFamily="monospace">M = C^d mod N</text>

                {/* Node Bob */}
                <rect x="345" y="50" width="70" height="40" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                <text x="380" y="74" fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">Bob (M)</text>

                {/* Marker definition */}
                <defs>
                  <marker id="doc-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Module 2: Cyclic Attack */}
        <div className="border border-slate-800 bg-slate-900/30 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <ShieldAlert size={16} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Module 2 : Attaque Cyclique sur RSA
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                L'attaque cyclique (ou par points fixes) exploite la bijection de la fonction de chiffrement RSA sur l'anneau fini Z/NZ. L'attaquant chiffre successivement le message intercepté C0 = C jusqu'à ce que la valeur boucle et revienne à C.
              </p>
              <h4 className="font-mono font-bold text-amber-400 text-xs uppercase">Principe de convergence :</h4>
              <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-lg font-mono text-[11px] leading-relaxed text-slate-400 space-y-1">
                <p>C0 = C</p>
                <p>C_(i+1) ≡ C_i^e (mod N)</p>
                <p>On s'arrête au plus petit entier k ≥ 1 tel que C_k = C_0.</p>
                <p className="text-emerald-400 font-bold mt-1">
                  Puisque C_k ≡ C_(k-1)^e ≡ C_0 (mod N), on en déduit que : M = C_(k-1)
                </p>
              </div>
              <p className="text-slate-400 text-[11px]">
                L'attaquant retrouve le message clair d'origine M à l'étape k-1 sans aucune factorisation de clé privée !
              </p>
            </div>

            {/* Diagram 2: Cyclic attack orbit */}
            <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">
                Orbite & Fermeture du Cycle Mathématique
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 220" className="w-full max-w-sm">
                {/* Outer loop circle */}
                <circle cx="250" cy="110" r="60" fill="none" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Node C0 (Ciphertext) */}
                <circle cx="250" cy="50" r="18" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
                <text x="250" y="54" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">C0</text>
                <text x="250" y="25" fill="#3b82f6" fontSize="10" fontWeight="bold" textAnchor="middle">C_interception</text>

                {/* Node C1 */}
                <circle cx="310" cy="110" r="18" fill="#475569" stroke="#0f172a" strokeWidth="2" />
                <text x="310" y="114" fill="#fff" fontSize="10" textAnchor="middle">C1</text>
                <text x="355" y="114" fill="#94a3b8" fontSize="9" textAnchor="middle">C_0^e mod N</text>

                {/* Node C2 = M (Cleartext) */}
                <circle cx="250" cy="170" r="18" fill="#10b981" stroke="#0f172a" strokeWidth="2" />
                <text x="250" y="174" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">C2</text>
                <text x="250" y="200" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">Message (M)</text>

                {/* Directed Curved Paths */}
                <path d="M 268 55 Q 300 75 310 90" fill="none" stroke="#3b82f6" strokeWidth="1.5" markerEnd="url(#doc-arrow-small)" />
                <path d="M 305 125 Q 290 155 268 165" fill="none" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#doc-arrow-small)" />
                <path d="M 232 165 Q 200 110 232 55" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3" markerEnd="url(#doc-arrow-small)" />

                <defs>
                  <marker id="doc-arrow-small" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#e2e8f0" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Module 3: Paillier Homomorphic voting */}
        <div className="border border-slate-800 bg-slate-900/30 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Vote size={16} />
            </div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Module 3 : Vote Électronique Homomorphe (Paillier)
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p>
                Le cryptosystème de Paillier possède une propriété d'homomorphisme additif. Il permet de multiplier deux messages chiffrés pour additionner leurs clairs sous-jacents, rendant le calcul des résultats de l'élection transparent et préservant l'anonymat absolu des votants.
              </p>
              <h4 className="font-mono font-bold text-emerald-400 text-xs uppercase">Propriétés & Formules :</h4>
              <ul className="list-disc pl-5 space-y-2 font-mono text-[11px] text-slate-400">
                <li>
                  <strong className="text-slate-200">Chiffrement :</strong> c = g^m * r^n (mod n²) (où r est un entier aléatoire d'entropie).
                </li>
                <li>
                  <strong className="text-slate-200">Homomorphisme :</strong>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800 mt-1 text-emerald-400 font-bold">
                    E(m1) * E(m2) ≡ (g^m1 * r1^n) * (g^m2 * r2^n) ≡ g^(m1 + m2) * (r1 * r2)^n ≡ E(m1 + m2) (mod n²)
                  </div>
                </li>
                <li>
                  <strong className="text-slate-200">Agrégation Globale :</strong> Multiplier tous les bulletins chiffrés produit le total chiffré de l'élection :
                  <p className="mt-1 text-slate-300">C_total = ∏ C_i (mod n²)</p>
                </li>
                <li>
                  <strong className="text-slate-200">Déchiffrement :</strong> Seule l'autorité électorale déchiffre C_total pour obtenir le total des votes, sans jamais pouvoir décoder les votes individuels.
                </li>
              </ul>
            </div>

            {/* Diagram 3: Homomorphic ballot aggregation */}
            <div className="border border-slate-800/80 bg-slate-950/40 rounded-xl p-4 flex flex-col justify-center items-center">
              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase tracking-wider">
                Agrégation des Bulletins Homomorphes
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 180" className="w-full max-w-sm">
                {/* Voters */}
                <rect x="10" y="20" width="70" height="25" rx="4" fill="#1e293b" stroke="#334155" />
                <text x="45" y="36" fill="#94a3b8" fontSize="9" textAnchor="middle">Électeur A (1)</text>

                <rect x="10" y="55" width="70" height="25" rx="4" fill="#1e293b" stroke="#334155" />
                <text x="45" y="71" fill="#94a3b8" fontSize="9" textAnchor="middle">Électeur B (0)</text>

                <rect x="10" y="90" width="70" height="25" rx="4" fill="#1e293b" stroke="#334155" />
                <text x="45" y="106" fill="#94a3b8" fontSize="9" textAnchor="middle">Électeur C (1)</text>

                {/* Arrows to multiplication block */}
                <path d="M 80 32 L 170 65" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2" markerEnd="url(#doc-arrow-small)" />
                <path d="M 80 67 L 170 75" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2" markerEnd="url(#doc-arrow-small)" />
                <path d="M 80 102 L 170 85" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2" markerEnd="url(#doc-arrow-small)" />

                {/* Multiplication symbol block (Homomorphic aggregator) */}
                <circle cx="190" cy="75" r="22" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                <text x="190" y="80" fill="#10b981" fontSize="16" fontWeight="bold" textAnchor="middle">×</text>
                <text x="190" y="112" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">PRODUIT DES CHIFFRÉS</text>

                {/* Arrow to authority */}
                <path d="M 212 75 L 305 75" stroke="#10b981" strokeWidth="2" markerEnd="url(#doc-arrow)" />
                <text x="258" y="65" fill="#10b981" fontSize="9" textAnchor="middle">C_total = C1 * C2 * C3</text>

                {/* Autorité électorale */}
                <rect x="315" y="50" width="115" height="50" rx="6" fill="#1e293b" stroke="#10b981" strokeWidth="1.5" />
                <text x="372" y="72" fill="#f8fafc" fontSize="10" fontWeight="bold" textAnchor="middle">Autorité (Déchiffre)</text>
                <text x="372" y="88" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Total = 2 votes</text>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
