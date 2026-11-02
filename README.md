# AntiquityChain

Prototype académique de registre d'antiquités. Il comprend deux contrats : **AntiquityRegistry** (membre 1) pour la création de NFT ERC-721, la fiche de provenance déclarée, le hash de preuve et l'attestation d'expert ; **AntiquityTransactions** (membre 2) pour les transferts encadrés, les ventes déclarées (sans paiement on-chain) et les preuves de provenance complémentaires.

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
npx hardhat ignition deploy ignition/modules/AntiquitySystem.ts --network localhost
npx hardhat run scripts/demo.ts --network localhost
npx hardhat run scripts/demo-transactions.ts --network localhost
```

Le module `AntiquitySystem` déploie le Registry puis Transactions avec l'adresse du Registry (`Registry.ts` reste disponible pour déployer le Registry seul). Le premier script de démonstration donne le rôle registraire au compte local 1, le rôle expert au compte 2, crée deux objets au compte 3 et atteste le premier. Il affiche les adresses, IDs et le hash Keccak-256 du fichier `docs/examples/evidence-1.txt`. Le second transfère le token 1 du compte 3 au compte 4 via Transactions, enregistre une vente déclarée vers le compte 5 et ajoute une preuve de provenance. Détails et adresses : [déploiement local](docs/deployment-local.md). Les URI `ipfs://REMPLACER_PAR_UN_CID_REEL` dans cette démonstration sont des placeholders : aucun fichier n'est téléversé vers IPFS.

Si le nœud local a été redémarré, redéployer avec `npx hardhat ignition deploy ignition/modules/AntiquitySystem.ts --network localhost --reset`, puis relancer le script de démonstration. Le stockage et les comptes du nœud sont éphémères.

## Lancer le frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
```

Renseigner `VITE_REGISTRY_ADDRESS` et `VITE_TRANSACTIONS_ADDRESS` dans `.env.local` avec les adresses affichées par Ignition ou dans `blockchain/ignition/deployments/chain-31337/deployed_addresses.json`. Puis :

```powershell
npm run dev
```

Pour vérifier la lecture du token de démonstration avec ethers.js depuis le même environnement que le frontend : `node scripts/check-local.mjs` (nœud et script de démonstration actifs).

Ouvrir `http://localhost:5173`. Configurer le wallet sur le RPC `http://127.0.0.1:8545`, chain ID `31337`, et importer **uniquement un compte local de développement** affiché par `hardhat node`. Le frontend copie automatiquement les ABI des deux contrats compilés. La lecture d'une fiche fonctionne sans connexion wallet tant que le nœud local répond ; l'enregistrement et l'attestation exigent une signature et le rôle correspondant.

Le formulaire calcule Keccak-256 sur les octets d'un fichier choisi. Il n'envoie pas ce fichier vers IPFS : préparez vous-même les URI de métadonnées et de provenance. Pour une preuve réutilisable, conservez exactement le fichier haché hors chaîne.

Les onglets **Transférer** et **Vente déclarée** vérifient le propriétaire, demandent l'approbation ERC-721 du contrat Transactions si elle manque (première signature), puis le transfert (seconde signature). Une vente déclarée publie un prix et le hash du document de vente, mais **aucun ETH n'est payé**. L'onglet **Historique** reconstitue la chaîne des propriétaires depuis les événements `Transfer` du Registry, transferts directs compris, et permet au propriétaire courant d'ajouter une preuve non expertisée.

## Répartition et interface

Voir [l'architecture](docs/architecture.md), [l'API du Registry](docs/registry-api.md), [l'API Transactions](docs/transactions-api.md), le [déploiement local](docs/deployment-local.md) et les [repères de développement](docs/developpement.md). Le module Transactions lit `ownerOf(tokenId)`, exige une approbation ERC-721 avant le transfert et l'historique complet repose sur les événements `Transfer` du Registry.

Une attestation indique qu'un wallet autorisé a déclaré avoir examiné le dossier. Le prototype ne prouve pas l'authenticité physique, la propriété juridique ou la qualification réelle de l'expert. Ne publiez pas de données personnelles sensibles dans les URI ou transactions.
