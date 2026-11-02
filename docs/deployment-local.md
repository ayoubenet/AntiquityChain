# Déploiement local

| Élément | Valeur |
|---|---|
| RPC / chain ID | `http://127.0.0.1:8545` / `31337` |
| Outils | Hardhat 3.21, Hardhat Ignition 3.1, Solidity 0.8.34 (`viaIR`, optimiseur 200), OpenZeppelin 5.6.1 |
| Module Ignition | `blockchain/ignition/modules/AntiquitySystem.ts` (Registry, puis Transactions avec l'adresse du Registry) |
| `AntiquitySystem#AntiquityRegistry` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `AntiquitySystem#AntiquityTransactions` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Blocs de déploiement | 1 et 2 (`VITE_DEPLOYMENT_BLOCK=0` convient en local) |
| ABI | `blockchain/artifacts/contracts/<Contrat>.sol/<Contrat>.json`, copiées dans `frontend/src/generated/` |

Adresses relevées le 2 novembre 2026 sur un nœud neuf. Elles sont déterministes pour le premier déploiement du compte 0 d'un nœud Hardhat neuf, mais doivent être revérifiées dans `blockchain/ignition/deployments/chain-31337/deployed_addresses.json` après tout redémarrage.

## Procédure

```powershell
# Terminal 1
cd blockchain
npx hardhat node

# Terminal 2
cd blockchain
npx hardhat ignition deploy ignition/modules/AntiquitySystem.ts --network localhost
npx hardhat run scripts/demo.ts --network localhost
npx hardhat run scripts/demo-transactions.ts --network localhost
```

Après un redémarrage du nœud, ajouter `--reset` à la commande Ignition, puis relancer les scripts et mettre à jour `frontend/.env.local`.

## Wallets de test (adresses uniquement)

Comptes publics générés par `hardhat node` ; ne jamais y envoyer de fonds réels.

| Compte | Rôle dans la démonstration | Adresse |
|---|---|---|
| 0 | Admin / déployeur | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| 1 | Registraire | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| 2 | Expert | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| 3 | Alice, premier propriétaire des tokens 1 et 2 | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| 4 | Bob, reçoit le token 1 par `transferAntique` | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |
| 5 | Claire, acheteuse déclarée du token 1 (0,5 ETH déclaré) | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` |

`demo.ts` crée les tokens 1 et 2 pour Alice et atteste le token 1. `demo-transactions.ts` approuve puis transfère le token 1 vers Bob, enregistre la vente déclarée Bob → Claire et ajoute une preuve de transport au nom de Claire. Pour la démonstration du transfert direct, Claire peut appeler `safeTransferFrom` sur le Registry depuis son wallet : la page Historique l'affiche comme « Transfert ERC-721 direct ».
