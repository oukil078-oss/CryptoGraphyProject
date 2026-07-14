import re

with open('src/components/RsaLab.tsx', 'r') as f:
    content = f.read()

# Add imports if missing
imports_to_add = "import { generateRsaKeys, padPKCS1v15Encrypt, unpadPKCS1v15Encrypt, padPKCS1v15Sign, encryptHybrid, decryptHybrid, sha256, bytesToHex } from '../lib/rsa';\n"
content = imports_to_add + content

# Replace fetch calls with direct calls
content = re.sub(r'const res = await fetch\(\'/api/rsa/keys/generate\', \{[^\}]+\}\);.*?const data = await res\.json\(\);', 
'''
const start = Date.now();
const keys = generateRsaKeys(bitSize, bitSize <= 32);
const durationMs = Date.now() - start;
const data = {
  p: keys.p.toString(),
  q: keys.q.toString(),
  n: keys.n.toString(),
  phi: keys.phi.toString(),
  e: keys.e.toString(),
  d: keys.d.toString(),
  bitLength: bitSize,
  isPedagogic: bitSize <= 32,
  durationMs
};
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/encrypt\', \{[^\}]+\}\);.*?const data = await res\.json\(\);',
'''
const start = Date.now();
const padded = padPKCS1v15Encrypt(message, currentKey.bitLength);
const cipherBigInt = modExp(padded, BigInt(currentKey.publicKey.e), BigInt(currentKey.publicKey.n));
const durationMs = Date.now() - start;
const data = {
  message,
  cipherText: cipherBigInt.toString(16),
  formattedCipher: cipherBigInt.toString(),
  durationMs
};
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/decrypt\', \{[^\}]+\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);',
'''
const start = Date.now();
const cipherBigInt = BigInt('0x' + cipherText.replace(/[^0-9a-fA-F]/g, ''));
const padded = modExp(cipherBigInt, BigInt(currentKey.privateKey.d), BigInt(currentKey.publicKey.n));
const decryptedMessage = unpadPKCS1v15Encrypt(padded, currentKey.bitLength);
const durationMs = Date.now() - start;
const data = {
  decrypted: decryptedMessage,
  durationMs
};
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/hybrid/encrypt\', \{[^\}]+\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);',
'''
const start = Date.now();
const rsaPubKey = { e: BigInt(currentKey.publicKey.e), n: BigInt(currentKey.publicKey.n) };
const result = await encryptHybrid(hybridMessage, rsaPubKey, currentKey.bitLength);
const durationMs = Date.now() - start;
const data = {
  ...result,
  originalSize: new TextEncoder().encode(hybridMessage).length,
  cipherSize: result.cipherText.length / 2,
  durationMs
};
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/hybrid/decrypt\', \{[^\}]+\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);',
'''
const start = Date.now();
const rsaPrivKey = { d: BigInt(currentKey.privateKey.d), n: BigInt(currentKey.publicKey.n) };
const decrypted = await decryptHybrid({
  encryptedKey: hybridCipher.encryptedKey,
  iv: hybridCipher.iv,
  tag: hybridCipher.tag,
  cipherText: hybridCipher.cipherText
}, rsaPrivKey, currentKey.bitLength);
const durationMs = Date.now() - start;
const data = { decrypted, durationMs };
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/sign\', \{[^\}]+\}\);.*?const data = await res\.json\(\);.*?if \(!res\.ok\) throw new Error\(data\.error \|\| "Erreur"\);',
'''
const start = Date.now();
const paddedSign = await padPKCS1v15Sign(signMessage, currentKey.bitLength);
const signatureBigInt = modExp(paddedSign, BigInt(currentKey.privateKey.d), BigInt(currentKey.publicKey.n));
const hash = bytesToHex(await sha256(signMessage));
const durationMs = Date.now() - start;
const data = {
  message: signMessage,
  hash,
  signature: signatureBigInt.toString(16),
  formattedSignature: signatureBigInt.toString(),
  durationMs
};
''', content, flags=re.DOTALL)

content = re.sub(r'const res = await fetch\(\'/api/rsa/verify\', \{[^\}]+\}\);.*?const data = await res\.json\(\);',
'''
const start = Date.now();
const sigBigInt = BigInt('0x' + (sigResult?.signature || '').replace(/[^0-9a-fA-F]/g, ''));
const decryptedSig = modExp(sigBigInt, BigInt(currentKey.publicKey.e), BigInt(currentKey.publicKey.n));
const expectedPadded = await padPKCS1v15Sign(verifyMessage, currentKey.bitLength);
const isValid = decryptedSig === expectedPadded;
const durationMs = Date.now() - start;
const data = { isValid, durationMs };
''', content, flags=re.DOTALL)

# Math ModExp
content = re.sub(r'const res = await fetch\(\'/api/rsa/math/modexp\', \{[^\}]+\}\);.*?const data = await res\.json\(\);',
'''
const start = Date.now();
const resBig = modExp(BigInt(mathBase), BigInt(mathExp), BigInt(mathMod));
const durationMs = Date.now() - start;
const data = { result: resBig.toString(), durationMs };
''', content, flags=re.DOTALL)

# Dictionary Attack
content = re.sub(r'const res1 = await fetch\(\'/api/rsa/encrypt\', \{.*?body: JSON.stringify\(\{.*?message: m1.*?\}\).*?\}\);.*?const data1 = await res1\.json\(\);',
'''
const p1 = padPKCS1v15Encrypt(m1, attackKeySize);
const c1 = modExp(p1, BigInt(65537), n1).toString(16);
const data1 = { cipherText: c1 };
''', content, flags=re.DOTALL)

content = re.sub(r'const res2 = await fetch\(\'/api/rsa/encrypt\', \{.*?body: JSON.stringify\(\{.*?message: m2.*?\}\).*?\}\);.*?const data2 = await res2\.json\(\);',
'''
const p2 = padPKCS1v15Encrypt(m2, attackKeySize);
const c2 = modExp(p2, BigInt(65537), n1).toString(16);
const data2 = { cipherText: c2 };
''', content, flags=re.DOTALL)


with open('src/components/RsaLab.tsx', 'w') as f:
    f.write(content)

