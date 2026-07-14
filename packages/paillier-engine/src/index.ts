import { PaillierKeyPair } from '@cryptolab/shared-types';
import { generatePrime, modExp, modInverse, gcd, isPrimeMillerRabin, getRandomBigIntBits } from '@cryptolab/rsa-engine';

// Least Common Multiple
export function lcm(a: bigint, b: bigint): bigint {
  if (a === 0n || b === 0n) return 0n;
  const g = gcd(a, b);
  const prod = a * b;
  const absProd = prod < 0n ? -prod : prod;
  return absProd / g;
}

// Generate Paillier Key Pair
export function generatePaillierKeyPair(bitLength: number): PaillierKeyPair {
  const halfBits = Math.floor(bitLength / 2);
  let p = generatePrime(halfBits);
  let q = generatePrime(bitLength - halfBits);
  
  while (p === q) {
    q = generatePrime(bitLength - halfBits);
  }
  
  const n = p * q;
  const n2 = n * n;
  const g = n + 1n; // standard selection for fast encryption and secure usage
  
  const lambda = lcm(p - 1n, q - 1n);
  
  // L(x) = (x - 1) / n
  const L = (x: bigint) => (x - 1n) / n;
  
  const gLambda = modExp(g, lambda, n2);
  const lVal = L(gLambda);
  const mu = modInverse(lVal, n);
  
  return {
    publicKey: {
      n: n.toString(),
      g: g.toString(),
      n2: n2.toString()
    },
    privateKey: {
      lambda: lambda.toString(),
      mu: mu.toString(),
      n: n.toString()
    },
    bitLength
  };
}

// Encrypt a value using Paillier
export function encryptPaillier(m: bigint, publicKey: { n: string; g: string; n2: string }): { ciphertext: string; r: string } {
  const nBig = BigInt(publicKey.n);
  const gBig = BigInt(publicKey.g);
  const n2Big = BigInt(publicKey.n2);
  
  if (m < 0n || m >= nBig) {
    throw new Error(`Message must be within range [0, n - 1].`);
  }
  
  // Find a random r coprime to n
  let r = getRandomBigIntRange(1n, nBig - 1n);
  while (gcd(r, nBig) !== 1n) {
    r = getRandomBigIntRange(1n, nBig - 1n);
  }
  
  const gm = modExp(gBig, m, n2Big);
  const rn = modExp(r, nBig, n2Big);
  const ciphertext = (gm * rn) % n2Big;
  
  return {
    ciphertext: ciphertext.toString(),
    r: r.toString()
  };
}

// Decrypt a Paillier ciphertext
export function decryptPaillier(ciphertext: string, privateKey: { lambda: string; mu: string; n: string }): string {
  const cBig = BigInt(ciphertext);
  const lambdaBig = BigInt(privateKey.lambda);
  const muBig = BigInt(privateKey.mu);
  const nBig = BigInt(privateKey.n);
  const n2Big = nBig * nBig;
  
  if (cBig < 0n || cBig >= n2Big) {
    throw new Error("Invalid ciphertext (must be less than n^2).");
  }
  
  const L = (x: bigint) => (x - 1n) / nBig;
  
  const cLambda = modExp(cBig, lambdaBig, n2Big);
  const lVal = L(cLambda);
  const m = (lVal * muBig) % nBig;
  
  return m.toString();
}

// Homomorphic addition: E(m1) * E(m2) mod n^2 = E(m1 + m2)
export function addHomomorphic(c1: string, c2: string, publicKey: { n2: string }): string {
  const c1Big = BigInt(c1);
  const c2Big = BigInt(c2);
  const n2Big = BigInt(publicKey.n2);
  
  return ((c1Big * c2Big) % n2Big).toString();
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
