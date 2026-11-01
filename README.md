# AntiquityChain

Prototype académique de registre d'antiquités. Le module disponible est **AntiquityRegistry** (membre 1) : création de NFT ERC-721, fiche de provenance déclarée, hash de preuve et attestation d'expert. Le contrat Transactions du membre 2 reste à intégrer.

## Prérequis

Node.js 22.13+ (Node 24 testé), npm et un wallet EIP-1193 comme MetaMask. Les comptes et fonds générés par Hardhat servent uniquement au développement local.

## Installer et tester

```powershell
cd blockchain
npm ci
npx hardhat compile
npx tsc --noEmit
npx hardhat test
```

Le projet utilise Hardhat 3, OpenZeppelin 5, TypeScript, viem et `node:test`. Le compilateur Solidity `0.8.34` est configuré avec l'optimiseur et `viaIR` pour la fonction d'enregistrement à sept paramètres.

## Démarrer le nœud et déployer

Dans un premier terminal :

```powershell
cd blockchain
npx hardhat node
```

Dans un second terminal :

```powershell
cd blockchain
npx hardhat ignition deploy ignition/modules/Registry.ts --network localhost
npx hardhat run scripts/demo.ts --network localhost
```

Le script de démonstration donne le rôle registraire au compte local 1, le rôle expert au compte 2, crée deux objets au compte 3 et atteste le premier. Il affiche les adresses, IDs et le hash Keccak-256 du fichier `docs/examples/evidence-1.txt`. Les URI `ipfs://REMPLACER_PAR_UN_CID_REEL` dans cette démonstration sont des placeholders : aucun fichier n'est téléversé vers IPFS.

Si le nœud local a été redémarré, redéployer avec `npx hardhat ignition deploy ignition/modules/Registry.ts --network localhost --reset`, puis relancer le script de démonstration. Le stockage et les comptes du nœud sont éphémères.

## Lancer le frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
```

Renseigner `VITE_REGISTRY_ADDRESS` dans `.env.local` avec l'adresse affichée par Ignition ou dans `blockchain/ignition/deployments/chain-31337/deployed_addresses.json`. Puis :

```powershell
npm run dev
```

Pour vérifier la lecture du token de démonstration avec ethers.js depuis le même environnement que le frontend : `node scripts/check-local.mjs` (nœud et script de démonstration actifs).

Ouvrir `http://localhost:5173`. Configurer le wallet sur le RPC `http://127.0.0.1:8545`, chain ID `31337`, et importer **uniquement un compte local de développement** affiché par `hardhat node`. Le frontend copie automatiquement l'ABI du contrat compilé. La lecture d'une fiche fonctionne sans connexion wallet tant que le nœud local répond ; l'enregistrement et l'attestation exigent une signature et le rôle correspondant.

Le formulaire calcule Keccak-256 sur les octets d'un fichier choisi. Il n'envoie pas ce fichier vers IPFS : préparez vous-même les URI de métadonnées et de provenance. Pour une preuve réutilisable, conservez exactement le fichier haché hors chaîne.

## Répartition et interface

Voir [l'architecture](docs/architecture.md) et [l'API du Registry](docs/registry-api.md). Le module Transactions doit lire `ownerOf(tokenId)`, obtenir une approbation ERC-721 avant le transfert et utiliser les événements `Transfer` du Registry pour l'historique complet.

Une attestation indique qu'un wallet autorisé a déclaré avoir examiné le dossier. Le prototype ne prouve pas l'authenticité physique, la propriété juridique ou la qualification réelle de l'expert. Ne publiez pas de données personnelles sensibles dans les URI ou transactions.
