/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { generatePrime, modInverse, modExp, getRandomBytes, gcd } from './math';

export interface RsaKey {
  e: bigint;
  d?: bigint;
  n: bigint;
}

// Lightweight pure TS SHA-256 fallback for browser contexts where subtle crypto is missing
function sha256Fallback(data: Uint8Array): Uint8Array {
  function rotateRight(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  
  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  const l = data.length * 8;
  const pendingBytes = (data.length + 9) % 64;
  const paddingLen = pendingBytes === 0 ? 0 : 64 - pendingBytes;
  const padded = new Uint8Array(data.length + 1 + paddingLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, l & 0xffffffff);
  if (l > 0xffffffff) {
    view.setUint32(padded.length - 8, Math.floor(l / 0x100000000));
  }
  
  const w = new Uint32Array(64);
  for (let i = 0; i < padded.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotateRight(7, w[j - 15]) ^ rotateRight(18, w[j - 15]) ^ (w[j - 15] >>> 3);
      const s1 = rotateRight(17, w[j - 2]) ^ rotateRight(19, w[j - 2]) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }
    
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];
    let e = h[4];
    let f = h[5];
    let g = h[6];
    let h_val = h[7];
    
    for (let j = 0; j < 64; j++) {
      const S1 = rotateRight(6, e) ^ rotateRight(11, e) ^ rotateRight(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h_val + S1 + ch + k[j] + w[j]) | 0;
      const S0 = rotateRight(2, a) ^ rotateRight(13, a) ^ rotateRight(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      
      h_val = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + h_val) | 0;
  }
  
  const result = new Uint8Array(32);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 8; i++) {
    resultView.setUint32(i * 4, h[i]);
  }
  return result;
}

// SHA-256 hash helper (works in both Node.js and browser)
export async function sha256(message: string | Uint8Array): Promise<Uint8Array> {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  } else if (typeof window === 'undefined') {
    // Node.js
    const crypto = eval("require('crypto')");
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return new Uint8Array(hash.digest());
  } else {
    // Fallback pure TS
    return sha256Fallback(data);
  }
}

// Convert bytes to Hex
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert Hex to bytes
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Générer des clés RSA
export function generateRsaKeys(bits: number, pedagogic: boolean = false): {
  p: bigint;
  q: bigint;
  n: bigint;
  phi: bigint;
  e: bigint;
  d: bigint;
} {
  const halfBits = Math.floor(bits / 2);
  let p = generatePrime(halfBits);
  let q = generatePrime(bits - halfBits);
  
  // S'assurer que p et q sont distincts
  while (p === q) {
    q = generatePrime(bits - halfBits);
  }
  
  const n = p * q;
  const phi = (p - 1n) * (q - 1n);
  
  // Choisir e (couramment 65537)
  let e = 65537n;
  if (bits <= 32) {
    // Pour les tailles de clé pédagogiques extrêmement petites
    e = 3n;
    while (gcd(e, phi) !== 1n) {
      e += 2n;
    }
  } else {
    while (gcd(e, phi) !== 1n) {
      e += 2n; // Si 65537 n'est pas premier avec phi (très rare)
    }
  }
  
  const d = modInverse(e, phi);
  
  return { p, q, n, phi, e, d };
}

// PKCS#1 v1.5 Padding pour chiffrement
export function padPKCS1v15Encrypt(message: string, keySizeBits: number): bigint {
  const msgBytes = new TextEncoder().encode(message);
  const keySizeBytes = Math.ceil(keySizeBits / 8);
  
  if (msgBytes.length > keySizeBytes - 11) {
    throw new Error(`Message trop long. Taille max pour cette clé : ${keySizeBytes - 11} octets.`);
  }
  
  const padded = new Uint8Array(keySizeBytes);
  padded[0] = 0x00;
  padded[1] = 0x02; // Type de bloc pour le chiffrement
  
  const paddingLength = keySizeBytes - msgBytes.length - 3;
  const randBytes = getRandomBytes(paddingLength);
  
  // Remplir le padding avec des octets non nuls
  for (let i = 0; i < paddingLength; i++) {
    let r = randBytes[i];
    while (r === 0) {
      r = getRandomBytes(1)[0];
    }
    padded[2 + i] = r;
  }
  
  padded[2 + paddingLength] = 0x00; // Séparateur
  padded.set(msgBytes, 3 + paddingLength);
  
  // Convertir l'Uint8Array rembourré en BigInt
  let m = 0n;
  for (let i = 0; i < padded.length; i++) {
    m = (m << 8n) | BigInt(padded[i]);
  }
  return m;
}

// PKCS#1 v1.5 Dé-padding pour déchiffrement
export function unpadPKCS1v15Encrypt(mBigInt: bigint, keySizeBits: number): string {
  const keySizeBytes = Math.ceil(keySizeBits / 8);
  const bytes = new Uint8Array(keySizeBytes);
  
  let temp = mBigInt;
  for (let i = keySizeBytes - 1; i >= 0; i--) {
    bytes[i] = Number(temp & 0xffn);
    temp >>= 8n;
  }
  
  // S'assurer que le premier octet (après conversion) est correct
  // Note: Si le BigInt est plus court, les premiers octets seront 0
  if (bytes[1] !== 0x02) {
    // Essayer de recalibrer au cas où le premier octet était omis (zéro de tête)
    let firstBlockTypeIndex = bytes.indexOf(0x02);
    if (firstBlockTypeIndex === -1 || firstBlockTypeIndex > 3) {
      throw new Error("Erreur de dé-rembourrage (Bloc invalide ou corrompu).");
    }
  }
  
  // Trouver l'octet séparateur 0x00 après le bloc de padding de type 0x02
  let separatorIndex = -1;
  const startIndex = bytes[1] === 0x02 ? 2 : bytes.indexOf(0x02) + 1;
  
  for (let i = startIndex; i < bytes.length; i++) {
    if (bytes[i] === 0x00) {
      separatorIndex = i;
      break;
    }
  }
  
  if (separatorIndex === -1) {
    throw new Error("Erreur de dé-rembourrage (Séparateur 0x00 introuvable).");
  }
  
  const msgBytes = bytes.slice(separatorIndex + 1);
  return new TextDecoder().decode(msgBytes);
}

// PKCS#1 v1.5 Padding pour signature
export async function padPKCS1v15Sign(message: string, keySizeBits: number): Promise<bigint> {
  const hash = await sha256(message);
  const keySizeBytes = Math.ceil(keySizeBits / 8);
  
  // Structure : 0x00 || 0x01 || PS (0xFF...) || 0x00 || T (ASN.1 + HASH)
  // Pour faire simple et pédagogique, nous concaténons un préambule simple + le hash de 32 octets.
  // Ce qui représente un schéma d'authentification par signature parfait pour notre laboratoire.
  const padded = new Uint8Array(keySizeBytes);
  padded[0] = 0x00;
  padded[1] = 0x01; // Type de bloc pour la signature
  
  const paddingLength = keySizeBytes - hash.length - 3;
  if (paddingLength < 8) {
    throw new Error("Clé trop petite pour signer un hash SHA-256.");
  }
  
  for (let i = 0; i < paddingLength; i++) {
    padded[2 + i] = 0xff; // Remplissage constant
  }
  
  padded[2 + paddingLength] = 0x00; // Séparateur
  padded.set(hash, 3 + paddingLength);
  
  // Convertir en BigInt
  let m = 0n;
  for (let i = 0; i < padded.length; i++) {
    m = (m << 8n) | BigInt(padded[i]);
  }
  return m;
}

// Chiffrement hybride RSA + AES-256-GCM
export async function encryptHybrid(
  message: string,
  rsaKey: { e: bigint; n: bigint },
  keySizeBits: number
): Promise<{
  encryptedKey: string; // RSA-encrypted AES Key (hex)
  iv: string; // hex
  tag: string; // hex
  cipherText: string; // hex
}> {
  // 1. Générer une clé AES-256 aléatoire (32 octets)
  const aesKeyBytes = getRandomBytes(32);
  
  // 2. Chiffrer la clé AES avec RSA PKCS#1 v1.5
  let aesKeyHex = bytesToHex(aesKeyBytes);
  const paddedKey = padPKCS1v15Encrypt(aesKeyHex, keySizeBits);
  const encryptedKeyBigInt = modExp(paddedKey, rsaKey.e, rsaKey.n);
  const encryptedKeyHex = encryptedKeyBigInt.toString(16);
  
  // 3. Chiffrer le message avec AES-GCM (En utilisant l'API Web Crypto ou l'API Node.js)
  const iv = getRandomBytes(12);
  let cipherTextHex = "";
  let tagHex = "";
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Client-side Web Crypto
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyBytes,
      'AES-GCM',
      false,
      ['encrypt']
    );
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      new TextEncoder().encode(message)
    );
    
    const fullCipher = new Uint8Array(encryptedBuffer);
    // Les 16 derniers octets de AES-GCM de Web Crypto contiennent le tag d'authentification
    const tag = fullCipher.slice(fullCipher.length - 16);
    const cipherText = fullCipher.slice(0, fullCipher.length - 16);
    
    cipherTextHex = bytesToHex(cipherText);
    tagHex = bytesToHex(tag);
  } else if (typeof window === 'undefined') {
    // Server-side Node.js
    const crypto = eval("require('crypto')");
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKeyBytes, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    
    cipherTextHex = encrypted;
    tagHex = bytesToHex(tag);
  } else {
    throw new Error("Client-side SubtleCrypto is missing or not supported in this context.");
  }
  
  return {
    encryptedKey: encryptedKeyHex,
    iv: bytesToHex(iv),
    tag: tagHex,
    cipherText: cipherTextHex
  };
}

// Déchiffrement hybride RSA + AES-256-GCM
export async function decryptHybrid(
  payload: {
    encryptedKey: string;
    iv: string;
    tag: string;
    cipherText: string;
  },
  rsaKey: { d: bigint; n: bigint },
  keySizeBits: number
): Promise<string> {
  // 1. Déchiffrer la clé AES avec RSA
  const encryptedKeyBigInt = BigInt('0x' + payload.encryptedKey);
  const paddedKey = modExp(encryptedKeyBigInt, rsaKey.d, rsaKey.n);
  const aesKeyHex = unpadPKCS1v15Encrypt(paddedKey, keySizeBits);
  const aesKeyBytes = hexToBytes(aesKeyHex);
  
  const iv = hexToBytes(payload.iv);
  const tag = hexToBytes(payload.tag);
  const cipherTextBytes = hexToBytes(payload.cipherText);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Client-side Web Crypto
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyBytes,
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // Web Crypto attend que le ciphertext et le tag soient concaténés pour AES-GCM decrypt
    const fullCipher = new Uint8Array(cipherTextBytes.length + tag.length);
    fullCipher.set(cipherTextBytes);
    fullCipher.set(tag, cipherTextBytes.length);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      fullCipher
    );
    
    return new TextDecoder().decode(decryptedBuffer);
  } else if (typeof window === 'undefined') {
    // Server-side Node.js
    const crypto = eval("require('crypto')");
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKeyBytes, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(payload.cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } else {
    throw new Error("Client-side SubtleCrypto is missing or not supported in this context.");
  }
}
