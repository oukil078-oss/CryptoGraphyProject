/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Arbitrary precision modular arithmetic helper library
 * using JavaScript's native BigInt.
 */

// Greatest Common Divisor (PGCD)
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

// Least Common Multiple (PPCM)
export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  const g = gcd(a, b);
  const prod = a * b;
  const absProd = prod < 0n ? -prod : prod;
  return absProd / g;
}

// Algorithme d'Euclide étendu
// Renvoie { gcd, x, y } tel que a*x + b*y = gcd
export function extendedGCD(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  let old_r = a, r = b;
  let old_s = 1n, s = 0n;
  let old_t = 0n, t = 1n;

  while (r !== 0n) {
    const quotient = old_r / r;
    
    let temp = r;
    r = old_r - quotient * r;
    old_r = temp;

    temp = s;
    s = old_s - quotient * s;
    old_s = temp;

    temp = t;
    t = old_t - quotient * t;
    old_t = temp;
  }

  return {
    gcd: old_r,
    x: old_s,
    y: old_t
  };
}

// Inverse modulaire : d tel que e * d = 1 mod m
export function modInverse(a: bigint, m: bigint): bigint {
  const { gcd: g, x } = extendedGCD(a, m);
  if (g !== 1n) {
    throw new Error("L'inverse modulaire n'existe pas car les nombres ne sont pas premiers entre eux (gcd != 1).");
  }
  // S'assurer que le résultat est positif
  return (x % m + m) % m;
}

// Exponentiation modulaire rapide (Square-and-Multiply)
// Calcule (base ^ exp) % mod
export function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 0n) throw new Error("Le modulo ne peut pas être zéro.");
  if (mod === 1n) return 0n;
  
  let result = 1n;
  let b = (base % mod + mod) % mod;
  let e = exp;

  if (e < 0n) {
    b = modInverse(b, mod);
    e = -e;
  }

  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % mod;
    }
    b = (b * b) % mod;
    e >>= 1n;
  }
  
  return result;
}

// Test de primalité de Miller-Rabin
// Renvoie true si n est probablement premier, false s'il est composé
export function isPrimeMillerRabin(n: bigint, k: number = 20): boolean {
  if (n <= 1n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  // Écrire n - 1 comme 2^s * d
  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  // Effectuer k tests de Miller-Rabin
  for (let i = 0; i < k; i++) {
    // Choisir un témoin aléatoire a dans [2, n-2]
    const a = getRandomBigIntRange(2n, n - 2n);
    let x = modExp(a, d, n);

    if (x === 1n || x === n - 1n) {
      continue;
    }

    let composite = true;
    for (let r = 0n; r < s - 1n; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        composite = false;
        break;
      }
    }

    if (composite) {
      return false; // Assurément composé
    }
  }

  return true; // Probablement premier
}

// Obtenir un entier cryptographique aléatoire de taille de bits spécifiée
export function getRandomBytes(numBytes: number): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.getRandomValues === 'function') {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && typeof (globalThis as any).crypto.getRandomValues === 'function') {
    (globalThis as any).crypto.getRandomValues(bytes);
  } else {
    if (typeof window !== 'undefined') {
      // Fallback non cryptographique en dernier recours pour le navigateur si pas de window.crypto
      for (let i = 0; i < numBytes; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    } else {
      try {
        // Fallback Node.js
        const nodeCrypto = eval("require('crypto')");
        const buf = nodeCrypto.randomBytes(numBytes);
        bytes.set(buf);
      } catch (e) {
        for (let i = 0; i < numBytes; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }
    }
  }
  return bytes;
}

// Générer un BigInt aléatoire de taille exacte en bits
export function getRandomBigIntBits(bits: number): bigint {
  const numBytes = Math.ceil(bits / 8);
  const bytes = getRandomBytes(numBytes);
  
  let val = 0n;
  for (let i = 0; i < bytes.length; i++) {
    val = (val << 8n) | BigInt(bytes[i]);
  }
  
  // Masquer les bits en trop si le compte de bits n'est pas un multiple de 8
  const extraBits = (numBytes * 8) - bits;
  if (extraBits > 0) {
    val >>= BigInt(extraBits);
  }
  
  // S'assurer que le bit de poids fort est à 1 pour garantir la taille en bits
  val |= (1n << BigInt(bits - 1));
  
  return val;
}

// Générer un BigInt aléatoire dans l'intervalle [min, max] inclus
export function getRandomBigIntRange(min: bigint, max: bigint): bigint {
  if (min > max) throw new Error("min ne peut pas être supérieur à max");
  const range = max - min;
  if (range === 0n) return min;
  
  const bitLength = range.toString(2).length;
  let val = getRandomBigIntBits(bitLength);
  
  while (val > range) {
    val = getRandomBigIntBits(bitLength);
  }
  
  return min + val;
}

// Générer un nombre premier aléatoire d'une certaine taille en bits
export function generatePrime(bits: number): bigint {
  if (bits < 4) throw new Error("La taille des premiers doit être d'au moins 4 bits.");
  
  // Pour les tailles extrêmement petites, renvoyer des valeurs simples rapidement
  if (bits === 4) {
    const primes4 = [11n, 13n];
    return primes4[Math.floor(Math.random() * primes4.length)];
  }
  if (bits === 8) {
    const primes8 = [131n, 137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n, 181n, 191n, 193n, 197n, 199n, 211n, 223n, 227n, 229n, 233n, 239n, 241n];
    return primes8[Math.floor(Math.random() * primes8.length)];
  }

  let attempts = 0;
  while (attempts < 5000) {
    // Générer un nombre impair de la bonne taille
    let p = getRandomBigIntBits(bits);
    if (p % 2n === 0n) p += 1n;
    
    // Test de division rapide avec des petits nombres premiers pour éliminer 90% des candidats
    const smallPrimes = [3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n];
    let divisible = false;
    for (const sp of smallPrimes) {
      if (p !== sp && p % sp === 0n) {
        divisible = true;
        break;
      }
    }
    
    if (divisible) {
      attempts++;
      continue;
    }

    // Lancer Miller-Rabin
    if (isPrimeMillerRabin(p, 15)) {
      return p;
    }
    attempts++;
  }
  
  throw new Error(`Échec de la génération de nombre premier après 5000 tentatives sur ${bits} bits.`);
}
