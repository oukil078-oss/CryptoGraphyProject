/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, ShieldAlert, Key, Lock, Unlock, PenTool, CheckCircle, 
  Calculator, RefreshCw, AlertTriangle, Play, HelpCircle, ChevronRight, Check
} from 'lucide-react';
import { BigIntegerViewer } from './BigIntegerViewer';
import { CryptoStatusBadge } from './CryptoStatusBadge';
import { RsaKeyPair, RsaEncryptResult, RsaSignResult, HybridEncryptResult } from '../types';
import { modExp, isPrimeMillerRabin, modInverse, gcd } from '../lib/math';
import { CyclicAttackLab } from './CyclicAttackLab';

export function RsaLab() {
  const [activeTab, setActiveTab] = useState<'keygen' | 'cipher' | 'hybrid' | 'sig' | 'math' | 'security' | 'cyclic'>('keygen');
  const [bitSize, setBitSize] = useState<number>(512);
  const [loading, setLoading] = useState<boolean>(false);
  
  // RSA Key Pairs state
  const [keys, setKeys] = useState<RsaKeyPair | null>({
    p: '135587746100183971289110757269163274221',
    q: '124195031251390491849103940192831092809',
    n: '16839324546481180470557452656914569503525143398935748281104928103983210921789',
    phi: '16839324546481180470557452656914569503265360621584141154331584836371110788080',
    e: '65537',
    d: '15049320141940192049194019401920491204910249120491024912049120491204912049121',
    bitLength: 512,
    isPedagogic: true
  });

  // Manual inputs for full variables control
  const [manualP, setManualP] = useState<string>('983');
  const [manualQ, setManualQ] = useState<string>('997');
  const [manualE, setManualE] = useState<string>('17');
  const [manualLogs, setManualLogs] = useState<string[]>([]);
  const [manualStatus, setManualStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Action states
  const [plainText, setPlainText] = useState<string>('Bonjour de CryptoLab !');
  const [cipherResult, setCipherResult] = useState<RsaEncryptResult | null>(null);
  const [decryptedText, setDecryptedText] = useState<string>('');
  
  // Hybrid states
  const [hybridText, setHybridText] = useState<string>('Un message secret très très long qui dépasse largement la taille standard autorisée par un module RSA classique, illustrant l\'usage du chiffrement hybride avec l\'algorithme AES-GCM-256 et des enveloppes de sécurité numériques.');
  const [hybridResult, setHybridResult] = useState<HybridEncryptResult | null>(null);
  const [hybridDecrypted, setHybridDecrypted] = useState<string>('');

  // Signature states
  const [signMessage, setSignMessage] = useState<string>('Je soussigné certifie que la transaction est approuvée.');
  const [signResult, setSignResult] = useState<RsaSignResult | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<{ isValid: boolean; checked: boolean } | null>(null);

  // Math Lab states
  const [mathBase, setMathBase] = useState<string>('123');
  const [mathExpState, setMathExpState] = useState<string>('45');
  const [mathMod, setMathMod] = useState<string>('67');
  const [mathExpResult, setMathExpResult] = useState<string>('');
  const [mathExpSteps, setMathExpSteps] = useState<Array<{ bit: number; accum: string; baseVal: string; comment: string }>>([]);

  const [mathInvA, setMathInvA] = useState<string>('17');
  const [mathInvM, setMathInvM] = useState<string>('120');
  const [mathInvResult, setMathInvResult] = useState<string>('');
  const [mathInvError, setMathInvError] = useState<string>('');

  // Security lab states
  const [smallN, setSmallN] = useState<string>('18377');
  const [factorResult, setFactorResult] = useState<{ p: string; q: string; phi: string; d: string; durationMs: number } | null>(null);
  const [textbookInput, setTextbookInput] = useState<string>('OUI');
  const [textbookCiphers, setTextbookCiphers] = useState<Array<{ type: string; c1: string; c2: string }>>([]);

  // Generate Keys from API
  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rsa/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bitLength: bitSize,
          isPedagogic: bitSize <= 512
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setKeys({
        p: data.p,
        q: data.q,
        n: data.n,
        phi: data.phi,
        e: data.e,
        d: data.d,
        bitLength: data.bitLength,
        isPedagogic: data.isPedagogic
      });
      
      setManualStatus('idle');
      setManualLogs([]);
      // Clear secondary states
      setCipherResult(null);
      setDecryptedText('');
      setHybridResult(null);
      setHybridDecrypted('');
      setSignResult(null);
      setVerifyStatus(null);
    } catch (e: any) {
      alert("Erreur de génération : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Process Custom manual inputs
  const handleValidateManualKeys = () => {
    const logs: string[] = [];
    setManualStatus('idle');
    try {
      const p = BigInt(manualP);
      const q = BigInt(manualQ);
      const e = BigInt(manualE);

      logs.push(`🔍 Début des vérifications de validité pour p=${p}, q=${q}, e=${e}`);

      // 1. Check if P is prime
      const pIsPrime = isPrimeMillerRabin(p, 20);
      logs.push(`🧪 Primalité de p : ${pIsPrime ? 'CONFORME (Probablement Premier)' : 'NON CONFORME (Composé)'}`);
      if (!pIsPrime) throw new Error("Le paramètre p n'est pas un nombre premier !");

      // 2. Check if Q is prime
      const qIsPrime = isPrimeMillerRabin(q, 20);
      logs.push(`🧪 Primalité de q : ${qIsPrime ? 'CONFORME (Probablement Premier)' : 'NON CONFORME (Composé)'}`);
      if (!qIsPrime) throw new Error("Le paramètre q n'est pas un nombre premier !");

      // 3. Distinct primes
      if (p === q) {
        logs.push(`❌ Erreur : p et q sont identiques`);
        throw new Error("p et q doivent être différents !");
      }

      const n = p * q;
      const phi = (p - 1n) * (q - 1n);
      logs.push(`🧮 Calcul du modulo n = p * q = ${n}`);
      logs.push(`🧮 Calcul de l'indicateur d'Euler phi(n) = (p-1)(q-1) = ${phi}`);

      // 4. Coprimalité de e et phi
      const g = gcd(e, phi);
      logs.push(`🧪 Coprimalité de e et phi(n) : PGCD = ${g}`);
      if (g !== 1n) {
        throw new Error("L'exposant public e doit être premier avec phi(n) !");
      }

      // 5. Calcul de l'inverse modulaire d
      const d = modInverse(e, phi);
      logs.push(`🔑 Calcul de l'exposant privé d = e^-1 mod phi(n) = ${d}`);

      // Set keys
      setKeys({
        p: p.toString(),
        q: q.toString(),
        n: n.toString(),
        phi: phi.toString(),
        e: e.toString(),
        d: d.toString(),
        bitLength: n.toString(2).length,
        isPedagogic: true
      });

      setManualStatus('success');
      setManualLogs(logs);

      // Clear secondary states
      setCipherResult(null);
      setDecryptedText('');
      setHybridResult(null);
      setHybridDecrypted('');
      setSignResult(null);
      setVerifyStatus(null);
    } catch (err: any) {
      logs.push(`❌ ÉCHEC : ${err.message}`);
      setManualLogs(logs);
      setManualStatus('error');
    }
  };

  // Encrypt Plaintext via API
  const handleEncrypt = async () => {
    if (!keys) return;
    try {
      const res = await fetch('/api/rsa/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: plainText,
          publicKey: { e: keys.e, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCipherResult(data);
      setDecryptedText('');
    } catch (e: any) {
      alert("Erreur de chiffrement : " + e.message);
    }
  };

  // Decrypt Ciphertext via API
  const handleDecrypt = async () => {
    if (!keys || !cipherResult) return;
    try {
      const res = await fetch('/api/rsa/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cipherText: cipherResult.cipherText,
          privateKey: { d: keys.d, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDecryptedText(data.decrypted);
    } catch (e: any) {
      alert("Erreur de déchiffrement : " + e.message);
    }
  };

  // Hybrid Encryption
  const handleHybridEncrypt = async () => {
    if (!keys) return;
    try {
      const res = await fetch('/api/rsa/hybrid/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: hybridText,
          publicKey: { e: keys.e, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHybridResult(data);
      setHybridDecrypted('');
    } catch (e: any) {
      alert("Erreur de chiffrement hybride : " + e.message);
    }
  };

  const handleHybridDecrypt = async () => {
    if (!keys || !hybridResult) return;
    try {
      const res = await fetch('/api/rsa/hybrid/decrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: hybridResult,
          privateKey: { d: keys.d, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHybridDecrypted(data.decrypted);
    } catch (e: any) {
      alert("Erreur de déchiffrement hybride : " + e.message);
    }
  };

  // Sign Message via API
  const handleSign = async () => {
    if (!keys) return;
    try {
      const res = await fetch('/api/rsa/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: signMessage,
          privateKey: { d: keys.d, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSignResult(data);
      setVerifyStatus(null);
    } catch (e: any) {
      alert("Erreur de signature : " + e.message);
    }
  };

  // Verify Signature via API
  const handleVerify = async () => {
    if (!keys || !signResult) return;
    try {
      const res = await fetch('/api/rsa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: signMessage,
          signature: signResult.signature,
          publicKey: { e: keys.e, n: keys.n },
          bitLength: keys.bitLength
        })
      });
      const data = await res.json();
      setVerifyStatus({ isValid: data.isValid, checked: true });
    } catch (e: any) {
      alert("Erreur de vérification : " + e.message);
    }
  };

  // Math Exponentiation Simulation (Client-side step extraction)
  const handleMathExp = () => {
    try {
      const b = BigInt(mathBase);
      const e = BigInt(mathExpState);
      const m = BigInt(mathMod);

      if (m <= 0n) throw new Error("Le modulo doit être strictement supérieur à zéro.");

      let res = 1n;
      let accum = b % m;
      const steps: any[] = [];

      const binaryStr = e.toString(2);
      
      for (let i = binaryStr.length - 1; i >= 0; i--) {
        const bit = parseInt(binaryStr[i]);
        const oldRes = res;
        if (bit === 1) {
          res = (res * accum) % m;
          steps.push({
            bit: 1,
            accum: res.toString(),
            baseVal: accum.toString(),
            comment: `Bit 1 : Résultat = (${oldRes} × ${accum}) mod ${m} = ${res}`
          });
        } else {
          steps.push({
            bit: 0,
            accum: res.toString(),
            baseVal: accum.toString(),
            comment: `Bit 0 : Aucun changement du résultat accumulé (${res})`
          });
        }
        accum = (accum * accum) % m;
      }
      
      setMathExpResult(res.toString());
      setMathExpSteps(steps);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Factoring simple composite numbers
  const handleFactorN = () => {
    const nVal = parseInt(smallN);
    if (isNaN(nVal) || nVal <= 3) {
      alert("Veuillez saisir un entier impair composé supérieur à 3.");
      return;
    }
    if (nVal % 2 === 0) {
      alert("Ce nombre est pair, la factorisation avec p=2 est triviale.");
      return;
    }

    const start = performance.now();
    let pVal = -1;
    let qVal = -1;

    // Trial division
    const max = Math.ceil(Math.sqrt(nVal));
    for (let i = 3; i <= max; i += 2) {
      if (nVal % i === 0) {
        pVal = i;
        qVal = nVal / i;
        break;
      }
    }

    const durationMs = performance.now() - start;

    if (pVal !== -1) {
      const phiVal = (pVal - 1) * (qVal - 1);
      const e = 3;
      let dVal = -1;
      for (let d = 1; d < phiVal; d++) {
        if ((e * d) % phiVal === 1) {
          dVal = d;
          break;
        }
      }
      
      setFactorResult({
        p: pVal.toString(),
        q: qVal.toString(),
        phi: phiVal.toString(),
        d: dVal !== -1 ? dVal.toString() : 'Non calculable (PGCD(e, phi) != 1 pour e=3)',
        durationMs: parseFloat(durationMs.toFixed(3))
      });
    } else {
      setFactorResult(null);
      alert("Ce nombre est premier ou trop grand pour être factorisé par division naïve simple !");
    }
  };

  // Textbook RSA vs padded demo
  const handleTextbookDemo = async () => {
    if (!keys) return;
    try {
      const textBytes = new TextEncoder().encode(textbookInput);
      let textBig = 0n;
      textBytes.forEach(b => {
        textBig = (textBig << 8n) | BigInt(b);
      });

      const cTextbook = modExp(textBig, BigInt(keys.e), BigInt(keys.n)).toString(16);

      const res1 = await fetch('/api/rsa/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textbookInput, publicKey: { e: keys.e, n: keys.n }, bitLength: keys.bitLength })
      });
      const data1 = await res1.json();

      const res2 = await fetch('/api/rsa/encrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textbookInput, publicKey: { e: keys.e, n: keys.n }, bitLength: keys.bitLength })
      });
      const data2 = await res2.json();

      setTextbookCiphers([
        {
          type: 'Textbook RSA (Sans Padding)',
          c1: cTextbook,
          c2: cTextbook
        },
        {
          type: 'RSA avec Padding PKCS#1 v1.5 (Sécurisé)',
          c1: data1.cipherText,
          c2: data2.cipherText
        }
      ]);
    } catch (e: any) {
      alert("Erreur de simulation : " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Panel: Selected bits */}
      <div className="border border-slate-800 bg-slate-900/60 p-5 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2 uppercase tracking-wide font-mono crt-glow">
            <Key size={18} className="text-emerald-400" />
            PARAMÈTRES DU LABORATOIRE RSA / HYBRIDE
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-normal font-mono">
            Générez des clés asymétriques aléatoires ou injectez vos propres variables ci-dessous. Les clés courtes facilitent la visibilité des calculs théoriques de TP.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={bitSize} 
            onChange={(e) => setBitSize(parseInt(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-mono font-bold px-3 py-2 focus:outline-none focus:border-emerald-500 rounded-lg w-full md:w-44"
          >
            <option value={16}>16 bits (Ultra-Faible)</option>
            <option value={512}>512 bits (Faible - Pédagogique)</option>
            <option value={2048}>2048 bits (Fort - Standard)</option>
            <option value={3072}>3072 bits (Ultra-Fort - Militaire)</option>
          </select>
          <button 
            onClick={handleGenerateKeys}
            disabled={loading}
            className="technical-btn-solid rounded-lg cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'CALCUL...' : 'GÉNÉRER'}
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl shadow-lg flex-wrap gap-1">
        {[
          { id: 'keygen', label: 'Générateur de Clés & Modulo' },
          { id: 'cipher', label: 'Chiffrement/Déchiffrement' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-[11px] font-mono font-bold uppercase transition-all flex-1 cursor-pointer rounded-lg text-center ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabs Contents */}
      {keys && (
        <div className="space-y-6">
          
          {/* Keygen Tab */}
          {activeTab === 'keygen' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 space-y-6">
                
                {/* Active key deck */}
                <div className="border border-slate-800 bg-slate-900/40 backdrop-blur p-6 rounded-xl shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-2">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">MODULES ET EXPOSANTS ACTIFS</h3>
                    <CryptoStatusBadge type="security" value={keys.isPedagogic} />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 font-mono">
                    <BigIntegerViewer value={keys.n} label="Module Public (n = p × q)" />
                    <BigIntegerViewer value={keys.e} label="Exposant Public d'encryptage (e)" />
                  </div>

                  {keys.isPedagogic ? (
                    <div className="space-y-4 border-t border-slate-800/80 pt-4">
                      <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider block font-mono flex items-center gap-1">
                        <Unlock size={12} /> SECRETS PRIVÉS DÉCOUVERTS (MODE ACCRÉDITÉ SÉANCE DE TP)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <BigIntegerViewer value={keys.p} label="Facteur premier secret p" />
                        <BigIntegerViewer value={keys.q} label="Facteur premier secret q" />
                        <BigIntegerViewer value={keys.phi} label="Fonction indicatrice d'Euler phi(n) = (p-1)(q-1)" />
                        <BigIntegerViewer value={keys.d} label="Exposant de déchiffrement privé d (d = e^-1 mod phi(n))" />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 p-5 border border-slate-800 text-center space-y-2 rounded-lg mt-4">
                      <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                        🔒 Les facteurs secrets d'origine (<span className="italic font-serif">p, q, φ(n), d</span>) de 2048/3072 bits sont protégés et cryptographiquement inaccessibles par le client conformément au principe de <strong>séparation des privilèges</strong>.
                      </p>
                      <button 
                        onClick={() => {
                          if (confirm("ATTENTION : Divulguer la clé privée détruit la sécurité d'un vrai système. Voulez-vous forcer l'affichage pédagogique dans le cadre de ce TP ?")) {
                            setKeys({...keys, isPedagogic: true});
                          }
                        }}
                        className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        Forcer l'affichage des secrets de TP
                      </button>
                    </div>
                  )}
                </div>

                {/* ADVANCED PARAMETERS CONSTRUCTOR (Manual) */}
                <div className="border border-slate-800 bg-slate-900/40 backdrop-blur p-6 rounded-xl shadow-lg space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono flex items-center gap-2">
                      <Calculator size={14} className="text-emerald-400" />
                      🔬 CONSTRUCTEUR MANUEL DE PARAMÈTRES (SÉANCE DE TP)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Prenez le contrôle total de l'arithmétique. Saisissez vos propres nombres premiers et vérifiez pas à pas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-mono font-bold">Premier p</label>
                      <input 
                        type="text"
                        value={manualP}
                        onChange={(e) => setManualP(e.target.value.replace(/\D/g, ''))}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-xs px-3 py-2 w-full rounded-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-mono font-bold">Premier q</label>
                      <input 
                        type="text"
                        value={manualQ}
                        onChange={(e) => setManualQ(e.target.value.replace(/\D/g, ''))}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-xs px-3 py-2 w-full rounded-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 uppercase font-mono font-bold">Exposant Public e</label>
                      <input 
                        type="text"
                        value={manualE}
                        onChange={(e) => setManualE(e.target.value.replace(/\D/g, ''))}
                        className="bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white font-mono text-xs px-3 py-2 w-full rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleValidateManualKeys}
                    className="technical-btn-solid rounded-lg w-full flex items-center justify-center gap-2 py-2 cursor-pointer text-xs"
                  >
                    <Play size={12} />
                    VÉRIFIER ET GÉNÉRER LA CLÉ DE TP PERSONNALISÉE
                  </button>

                  {/* Verification Logs */}
                  {manualLogs.length > 0 && (
                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-lg font-mono text-[11px] space-y-1.5 scrollbar-thin">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1 flex justify-between items-center">
                        <span>RAPPORT D'AUDIT ARITHMÉTIQUE</span>
                        {manualStatus === 'success' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1"><Check size={12} /> CLÉ INJECTÉE</span>
                        ) : (
                          <span className="text-red-400 font-bold flex items-center gap-1"><ShieldAlert size={12} /> SÉCURITÉ REJETÉE</span>
                        )}
                      </div>
                      {manualLogs.map((log, i) => (
                        <div key={i} className={`flex gap-1.5 ${log.includes('❌') || log.includes('ÉCHEC') ? 'text-red-400' : log.includes('🔑') ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          <span>&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

              {/* Sidebar stats */}
              <div className="border border-slate-800 bg-slate-900/60 p-5 rounded-xl shadow-lg space-y-4 h-fit text-xs text-slate-300">
                <h4 className="text-xs font-black font-mono uppercase border-b border-slate-800 pb-2 text-slate-200">COHÉRENCE MATHÉMATIQUE</h4>
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg text-xs space-y-2 leading-relaxed">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1.5 font-mono text-[10px]">
                    <span className="font-bold uppercase">TAILLE EN BITS :</span>
                    <span className="font-bold text-emerald-400">{keys.bitLength} BITS</span>
                  </div>
                  <div className="text-center font-serif italic text-sm text-slate-100 py-1.5 border-b border-slate-800/60">
                    e × d ≡ 1 mod φ(n)
                  </div>
                  <p className="text-[11px] leading-relaxed font-mono text-slate-400">
                    L'exposant privé <span className="font-bold text-emerald-400">d</span> est l'inverse modulaire multiplicatif de <span className="font-bold text-emerald-400">e</span>. Ce paramètre permet d'inverser la bijection asymétrique.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* Cipher Tab */}
          {activeTab === 'cipher' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Encrypt block */}
              <div className="border border-slate-800 bg-slate-900/40 p-5 rounded-xl shadow-lg space-y-4">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono border-b border-slate-800 pb-2.5 flex items-center gap-1.5">
                  <Lock size={15} className="text-emerald-400 animate-pulse" />
                  ENCRYPTAGE ASYMÉTRIQUE PKCS#1 V1.5
                </h3>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase font-mono">Message en clair :</label>
                  <textarea 
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs p-3 h-24 focus:outline-none focus:border-emerald-500 font-mono rounded-lg"
                    placeholder="Saisissez votre message clair..."
                  />
                </div>
                <button 
                  onClick={handleEncrypt}
                  className="technical-btn-solid rounded-lg cursor-pointer w-full flex items-center justify-center gap-1.5"
                >
                  CHIFFRER PAR EXPONENTIATION MODULAIRE
                </button>

                {cipherResult && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800 pb-1">
                      <span className="font-bold">LONGUEUR CRYPTOGRAMME :</span>
                      <span className="font-bold text-emerald-400">{cipherResult.cipherText.length / 2} OCTETS</span>
                    </div>
                    <BigIntegerViewer value={cipherResult.cipherText} label="Cryptogramme (c) - Hexadécimal" isHex />
                    <BigIntegerViewer value={cipherResult.formattedCipher} label="Cryptogramme (c) - Entier Décimal" />
                  </div>
                )}
              </div>

              {/* Decrypt block */}
              <div className="border border-slate-800 bg-slate-900/40 p-5 rounded-xl shadow-lg space-y-4">
                <h3 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono border-b border-slate-800 pb-2.5 flex items-center gap-1.5">
                  <Unlock size={15} className="text-amber-500 animate-pulse" />
                  DÉCHIFFREMENT ASYMÉTRIQUE
                </h3>
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg text-center space-y-3">
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    La clé privée <span className="font-serif italic text-white">d</span> déchiffre le cryptogramme côté serveur :
                  </p>
                  <div className="bg-slate-900 px-3 py-1.5 border border-slate-800 rounded-lg inline-block font-serif italic text-sm text-slate-200 font-bold">
                    m = c<sup>d</sup> mod n
                  </div>
                </div>

                <button 
                  onClick={handleDecrypt}
                  disabled={!cipherResult}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 disabled:bg-slate-900 border border-emerald-500/30 text-emerald-400 disabled:text-slate-600 font-mono font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer w-full justify-center"
                >
                  DÉCRYPTAGE PRIVÉ ET EXTRACTION DU PADDING
                </button>

                {decryptedText && (
                  <div className="bg-emerald-500/5 p-4 border border-emerald-500/20 rounded-lg space-y-1.5 text-slate-200 font-mono">
                    <span className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase flex items-center gap-1">
                      <CheckCircle size={14} /> TEXTE RETROUVÉ (RESTITUTION DU SERVEUR)
                    </span>
                    <p className="font-bold text-xs pt-1">{decryptedText}</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
