/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  ShieldAlert, Play, RefreshCw, Info, ArrowRight, HelpCircle, AlertTriangle
} from 'lucide-react';
import { BigIntegerViewer } from './BigIntegerViewer';
import { modExp } from '../lib/math';

interface CyclicStep {
  step: number;
  value: string;
  expression: string;
}

const TEST_PRESETS = [
  { label: 'Standard Démo (N=259, e=5, C=134)', n: '259', e: '5', c: '134' },
  { label: 'Simple (N=55, e=3, C=17)', n: '55', e: '3', c: '17' },
  { label: 'Moyen (N=187, e=7, C=42)', n: '187', e: '7', c: '42' },
  { label: 'Sécurisé (N=3233, e=17, C=855) - Cycle long', n: '3233', e: '17', c: '855' }
];

export function CyclicAttackLab() {
  const [paramN, setParamN] = useState<string>('259');
  const [paramE, setParamE] = useState<string>('5');
  const [paramC, setParamC] = useState<string>('134');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cycleLength: number;
    recoveredMessage: string;
    steps: CyclicStep[];
  } | null>(null);

  const handleApplyPreset = (preset: typeof TEST_PRESETS[0]) => {
    setParamN(preset.n);
    setParamE(preset.e);
    setParamC(preset.c);
    setResult(null);
    setError(null);
  };

  const handleRunAttack = () => {
    setError(null);
    setResult(null);
    
    // Validate inputs
    let nVal: bigint, eVal: bigint, cVal: bigint;
    try {
      nVal = BigInt(paramN.trim());
      eVal = BigInt(paramE.trim());
      cVal = BigInt(paramC.trim());
    } catch (e) {
      setError("Les paramètres doivent être des entiers décimaux valides.");
      return;
    }

    if (nVal <= 1n) {
      setError("Le module public N doit être supérieur à 1.");
      return;
    }
    if (eVal <= 1n) {
      setError("L'exposant e doit être supérieur à 1.");
      return;
    }
    if (cVal >= nVal || cVal < 0n) {
      setError("Le ciphertext C doit être compris entre 0 et N-1.");
      return;
    }

    setLoading(true);

    // Run the cycle calculation in a timeout to allow the loading state to render
    setTimeout(() => {
      try {
        const steps: CyclicStep[] = [];
        steps.push({
          step: 0,
          value: cVal.toString(),
          expression: `C0 = C = ${cVal}`
        });

        let current = cVal;
        const maxIterations = 2000;
        let k = 0;
        let converged = false;

        for (let i = 1; i <= maxIterations; i++) {
          // C_i = (C_i-1)^e mod N
          const nextVal = modExp(current, eVal, nVal);
          
          steps.push({
            step: i,
            value: nextVal.toString(),
            expression: `C${i} = (${current})^${eVal} mod ${nVal} = ${nextVal}`
          });

          if (nextVal === cVal) {
            k = i;
            converged = true;
            break;
          }

          current = nextVal;
        }

        if (!converged) {
          setError(`L'attaque n'a pas convergé après ${maxIterations} itérations. Cela démontre que les paramètres sélectionnés possèdent une longueur de cycle trop grande, résistant à l'attaque cyclique élémentaire !`);
          setLoading(false);
          return;
        }

        const recoveredMessage = steps[k - 1].value;

        setResult({
          cycleLength: k,
          recoveredMessage,
          steps
        });
      } catch (err: any) {
        setError(`Erreur d'exécution : ${err.message}`);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  // Helper to draw the cycle coordinates
  const renderCycleSVG = () => {
    if (!result || result.steps.length === 0) return null;
    const k = result.cycleLength;
    
    // Limit visualization to at most 10 nodes to keep it legible
    const numNodes = Math.min(k, 8);
    const radius = 65;
    const centerX = 160;
    const centerY = 100;
    
    const nodes = [];
    for (let i = 0; i < numNodes; i++) {
      const angle = (i * 2 * Math.PI) / numNodes - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const isStart = i === 0;
      const isRecovered = i === k - 1;
      
      nodes.push({
        label: `C${i}`,
        value: result.steps[i].value,
        x,
        y,
        isStart,
        isRecovered
      });
    }

    return (
      <svg className="w-full h-48 border border-slate-800 bg-slate-950/80 rounded-xl" viewBox="0 0 320 200">
        {/* Draw cycle paths */}
        <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-40" />
        
        {/* Connection arrows */}
        {nodes.map((node, idx) => {
          const nextNode = nodes[(idx + 1) % nodes.length];
          // Simple straight line with arrow or curve
          return (
            <path
              key={`line-${idx}`}
              d={`M ${node.x} ${node.y} Q ${(node.x + nextNode.x) / 2 + 10} ${(node.y + nextNode.y) / 2 + 10} ${nextNode.x} ${nextNode.y}`}
              fill="none"
              stroke={node.isRecovered ? "#10b981" : "#f59e0b"}
              strokeWidth="1"
              markerEnd="url(#arrow)"
              className="opacity-70"
            />
          );
        })}

        {/* Marker definitions for arrows */}
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>
        </defs>

        {/* Nodes */}
        {nodes.map((node, idx) => (
          <g key={`node-${idx}`}>
            <circle 
              cx={node.x} 
              cy={node.y} 
              r="16" 
              className={`${
                node.isStart 
                  ? 'fill-blue-600 stroke-blue-400' 
                  : node.isRecovered 
                    ? 'fill-emerald-600 stroke-emerald-400 animate-pulse' 
                    : 'fill-slate-800 stroke-slate-600'
              } stroke-2`} 
            />
            <text 
              x={node.x} 
              y={node.y + 4} 
              textAnchor="middle" 
              className="font-mono text-[9px] font-bold fill-white"
            >
              {node.value}
            </text>
            <text 
              x={node.x} 
              y={node.y < centerY ? node.y - 20 : node.y + 26} 
              textAnchor="middle" 
              className="font-sans text-[8px] fill-slate-400 font-semibold"
            >
              {node.label}{node.isStart ? ' (Chiffré)' : node.isRecovered ? ' (M)' : ''}
            </text>
          </g>
        ))}

        {k > numNodes && (
          <text x={centerX} y={centerY} textAnchor="middle" className="font-mono text-[10px] fill-amber-500 font-bold">
            + {k - numNodes} étapes masquées
          </text>
        )}
      </svg>
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  const resultContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultContainerRef.current) {
      gsap.fromTo(
        resultContainerRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, [result]);

  return (
    <div 
      ref={containerRef}
      className="space-y-6"
    >
      {/* Intro Banner */}
      <div className="border-l-4 border-amber-500 bg-amber-950/20 p-6 rounded-r-xl space-y-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-amber-500 animate-pulse" size={24} />
          <h2 className="text-lg font-bold text-amber-400 font-mono tracking-wide uppercase">
            Module 2 : Attaque Cyclique sur RSA
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed font-sans max-w-4xl">
          Explorez la vulnérabilité mathématique inhérente aux petits modules de chiffrement en observant la convergence cyclique d'un texte chiffré sous de multiples chiffrements successifs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Parameters Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-slate-800 bg-slate-900/40 backdrop-blur p-5 rounded-xl shadow-lg space-y-4">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">
              Paramètres de l'attaque
            </h3>

            {/* Presets dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block">Scénarios de test :</label>
              <div className="flex flex-col gap-1.5">
                {TEST_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full text-left px-3 py-2 bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-[11px] font-mono rounded-lg transition-colors cursor-pointer text-slate-300 hover:text-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800/60 my-2 pt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Module Public (N) :</label>
                <input 
                  type="text" 
                  value={paramN} 
                  onChange={(e) => setParamN(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Exposant Public (e) :</label>
                <input 
                  type="text" 
                  value={paramE} 
                  onChange={(e) => setParamE(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Cryptogramme (C) :</label>
                <input 
                  type="text" 
                  value={paramC} 
                  onChange={(e) => setParamC(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleRunAttack}
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold font-mono text-xs uppercase py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              <Play size={14} className="fill-current" />
              {loading ? 'Simulation en cours...' : 'Lancer l\'Attaque'}
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-slate-800 bg-slate-900/40 backdrop-blur p-5 rounded-xl shadow-lg min-h-[380px] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono mb-4">
                Rapport d'analyse de cycle
              </h3>

              {!result && !loading && (
                <div className="text-slate-400 text-xs font-mono py-12 text-center space-y-4">
                  <p>Configurez les paramètres à gauche et cliquez sur le bouton pour lancer la simulation mathématique.</p>
                  <p className="text-[11px] text-amber-500/80 italic">Note : Avec la configuration par défaut, l'attaque converge rapidement, permettant une observation claire du cycle.</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="text-amber-500 animate-spin" size={28} />
                  <p className="text-xs font-mono text-slate-400">Calcul du point fixe et de la trajectoire cyclique...</p>
                </div>
              )}

              {result && (
                <div 
                  ref={resultContainerRef}
                  className="space-y-4"
                >
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <ShieldAlert size={16} />
                    <span><strong>Attaque réussie !</strong> Le cycle a convergé et le message a été extrait sans clé privée.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl font-mono text-center">
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block mb-1">Longueur du Cycle (k) :</span>
                      <div className="text-2xl font-black text-white">{result.cycleLength}</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl font-mono text-center">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">Message Extrait (M) :</span>
                      <div className="text-2xl font-black text-white">{result.recoveredMessage}</div>
                    </div>
                  </div>

                  {/* SVG Map */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Visualisation du Cycle Mathématique :</span>
                    {renderCycleSVG()}
                  </div>

                  {/* Iterations table */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Tableau des transitions :</span>
                    <div className="border border-slate-800 bg-slate-950 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                      <table className="w-full text-[11px] font-mono text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                            <th className="px-3 py-1.5">Étape (i)</th>
                            <th className="px-3 py-1.5">Valeur (C_i)</th>
                            <th className="px-3 py-1.5">Relation mathématique</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {result.steps.map((step) => {
                            const isStart = step.step === 0;
                            const isRecovered = step.step === result.cycleLength - 1;
                            return (
                              <tr 
                                key={step.step} 
                                className={`${isStart ? 'bg-blue-950/20' : isRecovered ? 'bg-emerald-950/20 text-emerald-300' : ''}`}
                              >
                                <td className="px-3 py-1.5 text-slate-500 font-bold">{step.step}</td>
                                <td className="px-3 py-1.5 font-bold">{step.value}</td>
                                <td className="px-3 py-1.5 text-slate-400 text-[10px]">{step.expression}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info notice footer */}
            <div className="border-t border-slate-800/60 pt-4 text-[10px] text-slate-400 font-mono flex items-start gap-1.5">
              <Info size={12} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                La <strong>longueur du cycle (k)</strong> est le nombre exact d'itérations de chiffrement nécessaires pour reboucler sur la valeur initiale. Le message extrait est l'étape <strong>C_(k-1)</strong>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Theoretical explanation cards */}
      <div className="border border-slate-800 bg-slate-900/20 backdrop-blur p-6 rounded-xl shadow-lg space-y-4 font-mono">
        <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-1.5">
          <HelpCircle size={14} className="text-amber-500" />
          Explication Théorique de l'Attaque Cyclique
        </h3>

        {/* SVG de Cycle */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/50 mb-6 flex justify-center p-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250" className="w-full max-w-lg">
            <rect width="500" height="250" fill="transparent" rx="10" />
            
            {/* Cercle central représentant le cycle */}
            <circle cx="250" cy="125" r="70" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="5 5"/>
            
            {/* Nœuds du cycle */}
            {/* C0 = C = 134 */}
            <circle cx="250" cy="55" r="20" fill="#2563eb" stroke="#0f172a" strokeWidth="2"/>
            <text x="250" y="60" fontFamily="monospace" fontSize="11" fontWeight="bold" fill="white" textAnchor="middle">134</text>
            <text x="250" y="25" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" fontWeight="bold" textAnchor="middle">C0 = C (Chiffré)</text>

            {/* C1 = 10 */}
            <circle cx="320" cy="125" r="20" fill="#475569" stroke="#0f172a" strokeWidth="2"/>
            <text x="320" y="130" fontFamily="monospace" fontSize="11" fontWeight="bold" fill="white" textAnchor="middle">10</text>
            <text x="365" y="130" fontFamily="sans-serif" fontSize="11" fill="#94a3b8" textAnchor="middle">C1 = C^e</text>

            {/* C2 = 26 */}
            <circle cx="250" cy="195" r="20" fill="#10b981" stroke="#0f172a" strokeWidth="2"/>
            <text x="250" y="200" fontFamily="monospace" fontSize="11" fontWeight="bold" fill="white" textAnchor="middle">26</text>
            <text x="250" y="230" fontFamily="sans-serif" fontSize="11" fill="#10b981" fontWeight="bold" textAnchor="middle">C2 = M (Clair !)</text>

            {/* Flèches d'évolution */}
            {/* C0 -> C1 */}
            <path d="M 270 70 Q 310 90 315 105" fill="none" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)"/>
            {/* C1 -> C2 */}
            <path d="M 310 145 Q 290 185 270 190" fill="none" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow)"/>
            {/* C2 -> C0 */}
            <path d="M 230 185 Q 180 125 230 70" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3" markerEnd="url(#arrow)"/>

            {/* Définition de la flèche */}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="currentColor" className="text-slate-400" />
              </marker>
            </defs>
          </svg>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="space-y-3">
            <h4 className="font-mono font-bold text-amber-400 text-xs uppercase">1. Le Principe d'Orbite</h4>
            <p>
              Puisque le message M et le texte chiffré C appartiennent à l'anneau fini Z/NZ, et que l'exponentiation modulaire par l'exposant public e est une bijection (permutation) sur cet ensemble, l'application répétée du chiffrement générera inévitablement un cycle fermé.
            </p>
            <p>
              Si l'on définit la suite de ciphertexts par récurrence :
              <span className="block bg-slate-950 p-2 font-mono text-[11px] rounded border border-slate-800 my-2 text-white text-center">
                C_0 = C <br />
                C_(i+1) = (C_i)^e mod N
              </span>
              Il existe un plus petit entier $k \ge 1$ tel que $C_k = C_0 = C$.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono font-bold text-amber-400 text-xs uppercase">2. Extraction du Message Clair (M)</h4>
            <p>
              Puisque $C_k = C$, nous pouvons analyser l'équation à l'itération précédente :
              <span className="block bg-slate-950 p-2 font-mono text-[11px] rounded border border-slate-800 my-2 text-white text-center">
                C_k = (C_(k-1))^e ≡ C (mod N)
              </span>
              Par définition, le message clair d'origine $M$ est le seul nombre qui, élevé à la puissance $e$ modulo $N$, donne le ciphertext $C$ (c'est le principe du chiffrement RSA). Par conséquent :
              <span className="block bg-slate-950 p-2 font-mono text-[11px] rounded border border-slate-800 my-2 text-emerald-400 text-center font-bold">
                M = C_(k-1)
              </span>
              Ainsi, le message en clair est l'avant-dernier élément de la suite de ciphertexts, avant que la suite ne boucle sur la valeur initiale $C$ !
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4">
          <h4 className="font-mono font-bold text-amber-400 text-xs uppercase mb-2">3. Contre-mesures & Taille des Clés</h4>
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            La longueur du cycle k est un diviseur de l'ordre de la permutation induite par e modulo N. Pour que l'attaque réussisse en pratique, k doit être extrêmement petit. Si p et q sont de grands nombres premiers sûrs (sélectionnés de sorte que p-1 et q-1 possèdent de très grands facteurs premiers), la longueur du cycle k sera extrêmement grande (proche de phi(N)), ce qui rend l'attaque totalement infaisable en pratique.
          </p>
        </div>
      </div>
    </div>
  );
}
