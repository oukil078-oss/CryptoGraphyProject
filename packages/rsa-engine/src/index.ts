import { RsaKeyPair } from '@cryptolab/shared-types';

// Greatest Common Divisor
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

// Extended Euclidean Algorithm
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

  return { gcd: old_r, x: old_s, y: old_t };
}

// Modular Inverse
export function modInverse(a: bigint, m: bigint): bigint {
  const { gcd: g, x } = extendedGCD(a, m);
  if (g !== 1n) {
    throw new Error("Modular inverse does not exist (numbers are not coprime).");
  }
  return (x % m + m) % m;
}

// Modular Exponentiation (Square and Multiply)
export function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 0n) throw new Error("Modulo cannot be zero.");
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

// Generate secure random bytes
export function getRandomBytes(numBytes: number): Uint8Array {
  const bytes = new Uint8Array(numBytes);
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    try {
      const crypto = require('crypto');
      const buf = crypto.randomBytes(numBytes);
      bytes.set(buf);
    } catch (e) {
      // Math.random fallback
      for (let i = 0; i < numBytes; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
  }
  return bytes;
}

// Generate random BigInt with specific bits length
export function getRandomBigIntBits(bits: number): bigint {
  const numBytes = Math.ceil(bits / 8);
  const bytes = getRandomBytes(numBytes);
  
  let val = 0n;
  for (let i = 0; i < bytes.length; i++) {
    val = (val << 8n) | BigInt(bytes[i]);
  }
  
  const extraBits = (numBytes * 8) - bits;
  if (extraBits > 0) {
    val >>= BigInt(extraBits);
  }
  
  val |= (1n << BigInt(bits - 1)); // Ensure exact bit size
  val |= 1n; // Ensure it is odd
  
  return val;
}

// Miller-Rabin Primality Test
export function isPrimeMillerRabin(n: bigint, k: number = 20): boolean {
  if (n <= 1n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s += 1n;
  }

  for (let i = 0; i < k; i++) {
    // Random witness in [2, n-2]
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
      return false;
    }
  }

  return true;
}

function getRandomBigIntRange(min: bigint, max: bigint): bigint {
  if (min > max) throw new Error("min cannot be greater than max");
  const range = max - min;
  if (range === 0n) return min;
  
  const bitLength = range.toString(2).length;
  let val = getRandomBigIntBits(bitLength);
  
  while (val > range) {
    val = getRandomBigIntBits(bitLength);
  }
  
  return min + val;
}

// Generate prime number of specified bits
export function generatePrime(bits: number): bigint {
  if (bits < 4) throw new Error("Bits must be at least 4.");
  
  // Quick small prime caches for small demo sizes
  if (bits === 4) {
    const primes4 = [11n, 13n];
    return primes4[Math.floor(Math.random() * primes4.length)];
  }
  
  let attempts = 0;
  while (attempts < 5000) {
    let p = getRandomBigIntBits(bits);
    if (p % 2n === 0n) p += 1n;
    
    // Trial division with first few primes
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

    if (isPrimeMillerRabin(p, 15)) {
      return p;
    }
    attempts++;
  }
  
  throw new Error(`Failed to generate prime of ${bits} bits after 5000 attempts.`);
}

/**
 * Generate RSA Key Pair
 * If isPedagogic is true (and keysize is small, e.g. 512 bits), we expose p, q, phi, and d.
 * If keysize is large (e.g. 2048 or 3072 bits), or if isPedagogic is false,
 * we strictly protect or omit p, q, and d, or label them as restricted in our output.
 */
export function generateRsaKeyPair(bitLength: number, isPedagogic: boolean = false): RsaKeyPair {
  const start = Date.now();
  
  // Force secure sizes to NEVER be pedagogic
  const isEduMode = isPedagogic && bitLength <= 512;
  
  const halfBits = Math.floor(bitLength / 2);
  let p = generatePrime(halfBits);
  let q = generatePrime(bitLength - halfBits);
  
  while (p === q) {
    q = generatePrime(bitLength - halfBits);
  }
  
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  
  let e = 65537n;
  if (bitLength <= 32) {
    e = 3n;
    while (gcd(e, phi) !== 1n) {
      e += 2n;
    }
  } else {
    while (gcd(e, phi) !== 1n) {
      e += 2n;
    }
  }
  
  const d = modInverse(e, phi);
  const durationMs = Date.now() - start;
  
  if (isEduMode) {
    return {
      p: p.toString(),
      q: q.toString(),
      n: n.toString(),
      phi: phi.toString(),
      e: e.toString(),
      d: d.toString(),
      bitLength,
      isPedagogic: true,
      durationMs
    };
  } else {
    // SECURE MODE: Do not expose p, q, and d directly or omit them for public delivery
    // (In a real backend, d is kept in a HSM or private enclave, and p/q are scrubbed immediately)
    return {
      p: "REDACTED_FOR_SECURITY_MODE",
      q: "REDACTED_FOR_SECURITY_MODE",
      n: n.toString(),
      phi: "REDACTED_FOR_SECURITY_MODE",
      e: e.toString(),
      d: "REDACTED_FOR_SECURITY_MODE", // Only n and e are shared publicly
      bitLength,
      isPedagogic: false,
      durationMs
    };
  }
}
