# CryptoLab Portal : Plateforme Académique de Cryptographie

Une plateforme interactive d'apprentissage et de simulation arithmétique pour l'étude des protocoles de cryptographie asymétrique et homomorphe.

---

## Présentation du Projet
Ce projet a été conçu pour l'étude pratique et la visualisation des concepts fondamentaux de la cryptographie moderne. Il permet d'expérimenter en temps réel sur des structures algébriques de taille réelle grâce à la manipulation de grands entiers (`BigInt` natifs).

La plateforme intègre trois laboratoires d'expérimentation :
1. **Laboratoire RSA & Enveloppe Hybride :** Simulation complète de la génération de clés, du chiffrement/déchiffrement avec padding PKCS#1 v1.5, de la signature numérique et du chiffrement hybride (combinaison RSA + AES).
2. **Laboratoire d'Attaque Cyclique :** Démonstration de la vulnérabilité de la permutation RSA déterministe par recherche d'orbites et détection de points fixes.
3. **Bureau de Vote Homomorphe (Paillier) :** Implémentation d'un protocole de vote électronique sécurisé exploitant les propriétés d'homomorphisme additif du cryptosystème de Paillier pour agréger les bulletins de manière anonyme.

---

## Architecture Logicielle

Le projet est structuré de façon modulaire afin de séparer la logique mathématique de l'interface utilisateur :

```
├── packages/                   # Moteurs cryptographiques autonomes
│   ├── rsa-engine/             # Implémentation isolée des algorithmes RSA
│   ├── paillier-engine/        # Implémentation isolée du système de Paillier
│   └── shared-types/           # Définitions de types partagées
├── src/                        # Application Front-End (React + Vite)
│   ├── components/
│   │   ├── RsaLab.tsx          # Interface du laboratoire RSA & Hybride
│   │   ├── CyclicAttackLab.tsx # Interface et graphique d'analyse d'orbites de l'attaque cyclique
│   │   ├── VotingLab.tsx       # Simulateur de scrutin électoral de Paillier
│   │   ├── DocReport.tsx       # Guide méthodologique et fiches de synthèse intégrées
│   │   └── BigIntegerViewer.tsx # Visualisateur pour les grands nombres arithmétiques
│   ├── lib/
│   │   ├── math.ts             # Primitives arithmétiques (PGCD, Miller-Rabin, Exponentiation modulaire)
│   │   ├── rsa.ts              # Logique métier RSA et gestion du padding PKCS#1 v1.5
│   │   └── paillier.ts         # Logique métier du cryptosystème de Paillier
│   ├── App.tsx                 # Gestion de l'état global et de la navigation par onglets
│   └── index.css               # Intégration Tailwind CSS et styles de l'interface
├── server.ts                   # Serveur de production Express gérant l'API de vote
└── README.md                   # Documentation technique du projet
```

---

## Formulations Mathématiques & Principes Directeurs

### 1. Cryptographie Asymétrique RSA & Rembourrage

#### Génération des clés
1. Choisir deux grands nombres premiers distincts $p$ et $q$.
2. Calculer le module de chiffrement public :
   $$N = p \times q$$
3. Calculer l'indicateur d'Euler (totient) :
   $$\phi(N) = (p-1)(q-1)$$
4. Choisir un exposant public $e$ premier avec $\phi(N)$ (généralement $e = 65537$).
5. Calculer l'exposant privé $d$ comme l'inverse modulaire de $e$ modulo $\phi(N)$ à l'aide de l'algorithme d'Euclide étendu :
   $$d \times e \equiv 1 \pmod{\phi(N)}$$

#### Opérations fondamentales
*   **Chiffrement :** $C = M^e \pmod N$
*   **Déchiffrement :** $M = C^d \pmod N$

#### Rembourrage PKCS#1 v1.5 (Padding)
Le chiffrement RSA de base est déterministe : un même message $M$ produit toujours le même chiffré $C$. Pour garantir la sécurité sémantique (sécurité IND-CPA), on utilise un formatage avec aléa avant le chiffrement :
$$m_{\text{padded}} = \text{0x00} \parallel \text{0x02} \parallel PS \parallel \text{0x00} \parallel M$$

Où $PS$ (Padding String) est une séquence d'octets pseudo-aléatoires non nuls. La longueur minimale de $PS$ est de 8 octets.

---

### 2. Mécanisme de l'Attaque Cyclique sur RSA

L'attaque cyclique exploite le fait que l'exponentiation modulaire par l'exposant public $e$ définit une permutation sur l'ensemble fini $\mathbb{Z}/N\mathbb{Z}$. En chiffrant de manière itérative un texte chiffré intercepté, on finit par former un cycle fermé.

#### Algorithme
Soit $C$ le message chiffré intercepté. On pose $C_0 = C$.
On calcule successivement :
$$C_{i} \equiv (C_{i-1})^e \pmod N$$

L'algorithme s'arrête lorsqu'on détecte un indice $k \ge 1$ tel que :
$$C_k = C_0$$

Puisque $C_k = C_0$, on a $(C_{k-1})^e \equiv C \pmod N$. Par injectivité de la fonction de chiffrement, on en déduit que le message clair d'origine $M$ est égal à la valeur de l'étape précédente :
$$M = C_{k-1} \pmod N$$

#### Représentation de l'orbite de permutation
Le cycle formé par l'attaque cyclique se visualise sous la forme d'un graphe orbitaire fermé :

```
          [C0 : Chiffré intercepté] <-------+
                      |                      |
             Chiffrer |                      | Chiffrer (étape k)
                      v                      |
          [C1 : C0^e mod N]                  |
                      |                      |
             Chiffrer |                      |
                      v                      |
          [C2 : C1^e mod N] ===> ... ===> [Ck]
                      |
                      v (Dernière étape avant la fermeture)
          [M = C(k-1) : Message clair extrait]
```

---

### 3. Cryptosystème de Paillier & Vote Homomorphe

Le système de Paillier est un cryptosystème asymétrique probabiliste doté d'une propriété d'homomorphisme additif.

#### Génération des clés
1. Choisir deux nombres premiers $p$ et $q$. Calculer $n = p \times q$ et $n^2$.
2. Définir le générateur $g = n + 1$.
3. Calculer la clé privée d'extraction $\lambda = \text{ppcm}(p-1, q-1)$ et le coefficient $\mu = (L(g^\lambda \bmod n^2))^{-1} \bmod n$, où la fonction $L$ est définie par :
   $$L(x) = \frac{x-1}{n}$$

#### Chiffrement d'un bulletin
Pour chiffrer un choix de vote $m \in \{0, 1\}$ avec un aléa secret $r$ premier avec $n$ :
$$c = g^m \cdot r^n \pmod{n^2}$$

#### Agrégation homomorphe des bulletins
Grâce aux propriétés de l'exponentiation, le produit de deux chiffrés correspond au chiffrement de la somme des clairs correspondants :
$$E(m_1) \cdot E(m_2) \equiv (g^{m_1} \cdot r_1^n) \cdot (g^{m_2} \cdot r_2^n) \equiv g^{m_1 + m_2} \cdot (r_1 r_2)^n \equiv E(m_1 + m_2) \pmod{n^2}$$

Pour un scrutin contenant $k$ bulletins, le bureau de vote multiplie tous les bulletins individuels chiffrés :
$$C_{\text{total}} = \prod_{i=1}^{k} C_i \pmod{n^2}$$

Le déchiffrement final de $C_{\text{total}}$ à l'aide de la clé privée donne la somme totale des votes sans jamais révéler les choix de vote individuels :
$$\sum_{i=1}^{k} m_i = L\left(C_{\text{total}}^\lambda \bmod n^2\right) \times \mu \pmod n$$

---

## Extraits de Code Clés

### 1. Test de Primalité de Miller-Rabin (`src/lib/math.ts`)
Garantit la génération rigoureuse de grands entiers premiers pour la construction des clés RSA et Paillier :

```typescript
// Test de primalité probabiliste de Miller-Rabin
export function isPrimeMillerRabin(n: bigint, k: number = 8): boolean {
  if (n <= 1n) return false;
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n) return false;

  // Décomposer n - 1 sous la forme 2^s * d
  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
  }

  // Répéter le test k fois pour réduire la probabilité d'erreur
  for (let i = 0; i < k; i++) {
    const a = getRandomBigIntRange(2n, n - 2n);
    let x = modExp(a, d, n);

    if (x === 1n || x === n - 1n) continue;

    let isComposite = true;
    for (let r = 0n; r < s - 1n; r++) {
      x = modExp(x, 2n, n);
      if (x === n - 1n) {
        isComposite = false;
        break;
      }
    }
    if (isComposite) return false; // Composé certain
  }
  return true; // Probablement premier
}
```

### 2. Algorithme de Résolution de l'Attaque Cyclique (`src/components/CyclicAttackLab.tsx`)
Ce bloc de calcul effectue l'exponentiation modulaire itérative pour trouver l'orbite d'un chiffré :

```typescript
// Recherche itérative de la période orbitale
let current = ciphertextVal;
const maxIterations = 2000;
let orbitalPeriod = 0;
let isSolved = false;

for (let i = 1; i <= maxIterations; i++) {
  // Application répétée de la permutation de chiffrement : C_i = (C_i-1)^e mod N
  const nextVal = modExp(current, eVal, nVal);
  
  steps.push({
    step: i,
    value: nextVal.toString(),
    formula: `C${i} = (${current})^${eVal} mod ${nVal} = ${nextVal}`
  });

  // Détection du point fixe de retour à C0
  if (nextVal === ciphertextVal) {
    orbitalPeriod = i;
    isSolved = true;
    break;
  }

  current = nextVal;
}

if (isSolved) {
  // Le message en clair correspond à l'état précédant immédiatement le rebouclage
  const decryptedMessage = steps[orbitalPeriod - 1].value;
}
```

### 3. Fonctions Cryptographiques de Paillier (`src/lib/paillier.ts`)
Implémentation de l'homomorphisme de Paillier pour l'agrégation électorale :

```typescript
// Chiffrement probabiliste de Paillier
export function encryptPaillier(m: bigint, publicKey: PaillierPublicKey): {
  ciphertext: bigint;
  r: bigint;
} {
  const { n, g, n2 } = publicKey;
  
  // Choisir un aléa r premier avec n
  let r = getRandomBigIntRange(1n, n - 1n);
  while (gcd(r, n) !== 1n) {
    r = getRandomBigIntRange(1n, n - 1n);
  }
  
  // c = (g^m) * (r^n) mod n^2
  const gm = modExp(g, m, n2);
  const rn = modExp(r, n, n2);
  return { ciphertext: (gm * rn) % n2, r };
}

// Multiplication homomorphe des bulletins chiffrés : Enc(m1) * Enc(m2) mod n^2 = Enc(m1 + m2)
export function addHomomorphic(c1: bigint, c2: bigint, publicKey: PaillierPublicKey): bigint {
  return (c1 * c2) % publicKey.n2;
}
```

---

## Installation et Utilisation Locale

### Prérequis
*   **Node.js** (version 18 ou supérieure recommandée)
*   **npm** ou **yarn**

### 1. Installation des modules
Installez l'ensemble des dépendances du projet :
```bash
npm install
```

### 2. Lancement de l'environnement de développement
Démarre l'application locale avec rechargement à chaud (accessible à l'adresse `http://localhost:3000`) :
```bash
npm run dev
```

### 3. Compilation pour la production
Génère une version optimisée du client React dans le dossier `dist/` et compile le fichier `server.ts` à l'aide d'esbuild :
```bash
npm run build
```

### 4. Démarrage en production
Démarre le serveur web Express optimisé compilé pour la mise en production :
```bash
npm start
```

---
*Ce projet constitue une ressource d'étude pratique et interactive pour illustrer les notions fondamentales de l'arithmétique modulaire appliquée à la sécurité de l'information.*
