/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generatePrime, modInverse, modExp, lcm, gcd, getRandomBigIntRange } from './math';

export interface PaillierPublicKey {
  n: bigint;
  g: bigint;
  n2: bigint; // n^2
}

export interface PaillierPrivateKey {
  lambda: bigint;
  mu: bigint;
  n: bigint;
}

// Générer une paire de clés Paillier
export function generatePaillierKeys(bits: number): {
  publicKey: PaillierPublicKey;
  privateKey: PaillierPrivateKey;
} {
  const halfBits = Math.floor(bits / 2);
  let p = generatePrime(halfBits);
  let q = generatePrime(bits - halfBits);
  
  // S'assurer que p et q sont distincts et de même taille
  while (p === q) {
    q = generatePrime(bits - halfBits);
  }
  
  const n = p * q;
  const n2 = n * n;
  
  // g = n + 1 est le choix standard et le plus sûr pour Paillier,
  // car il garantit que g est d'ordre un multiple de n et simplifie les calculs.
  const g = n + 1n;
  
  const lambda = lcm(p - 1n, q - 1n);
  
  // Fonction L(x) = (x - 1) / n
  const L = (x: bigint) => (x - 1n) / n;
  
  // Calculer mu = (L(g^lambda mod n^2))^-1 mod n
  const gLambda = modExp(g, lambda, n2);
  const lVal = L(gLambda);
  const mu = modInverse(lVal, n);
  
  return {
    publicKey: { n, g, n2 },
    privateKey: { lambda, mu, n }
  };
}

// Chiffrer un message m avec la clé publique Paillier
export function encryptPaillier(m: bigint, publicKey: PaillierPublicKey): {
  ciphertext: bigint;
  r: bigint;
} {
  const { n, g, n2 } = publicKey;
  
  if (m < 0n || m >= n) {
    throw new Error(`Le message à chiffrer doit être dans l'intervalle [0, n - 1].`);
  }
  
  // Choisir un r aléatoire dans [1, n - 1] tel que gcd(r, n) = 1
  let r = getRandomBigIntRange(1n, n - 1n);
  while (gcd(r, n) !== 1n) {
    r = getRandomBigIntRange(1n, n - 1n);
  }
  
  // Calculer c = (g^m * r^n) mod n^2
  const gm = modExp(g, m, n2);
  const rn = modExp(r, n, n2);
  const ciphertext = (gm * rn) % n2;
  
  return { ciphertext, r };
}

// Déchiffrer un cryptogramme c avec la clé privée Paillier
export function decryptPaillier(c: bigint, privateKey: PaillierPrivateKey): bigint {
  const { lambda, mu, n } = privateKey;
  const n2 = n * n;
  
  if (c < 0n || c >= n2) {
    throw new Error(`Le cryptogramme invalide. Il doit être inférieur à n^2.`);
  }
  
  // Fonction L(x) = (x - 1) / n
  const L = (x: bigint) => (x - 1n) / n;
  
  // m = L(c^lambda mod n^2) * mu mod n
  const cLambda = modExp(c, lambda, n2);
  const lVal = L(cLambda);
  const m = (lVal * mu) % n;
  
  return m;
}

// Addition homomorphe de deux cryptogrammes : Enc(m1) * Enc(m2) mod n^2 = Enc(m1 + m2 mod n)
export function addHomomorphic(c1: bigint, c2: bigint, publicKey: PaillierPublicKey): bigint {
  return (c1 * c2) % publicKey.n2;
}

// Multiplication homomorphe par une constante : Enc(m1)^k mod n^2 = Enc(k * m1 mod n)
export function multiplyHomomorphic(c: bigint, k: bigint, publicKey: PaillierPublicKey): bigint {
  // S'assurer que la constante est positive
  const exp = k < 0n ? (publicKey.n + (k % publicKey.n)) % publicKey.n : k;
  return modExp(c, exp, publicKey.n2);
}
