# API du Registry

Contrat : `AntiquityRegistry` · Solidity `0.8.34` · OpenZeppelin `5.6.1` · réseau local Hardhat `31337`.

| Fonction | Accès | Résultat |
|---|---|---|
| `registerAntique(address,string,string,string,string,string,bytes32)` | `REGISTRAR_ROLE` | Nouveau `tokenId` ; événement `AntiqueRegistered` et `Transfer` |
| `getAntique(uint256)` | Public | `Antique { name, origin, period, provenanceURI, evidenceHash, verified, verifiedBy, verifiedAt }` |
| `verifyAntique(uint256)` | `EXPERT_ROLE` | Attestation unique ; événement `AntiqueVerified` |
| `ownerOf(uint256)` / `tokenURI(uint256)` | Public | Propriétaire actuel / URI des métadonnées |
| `approve(address,uint256)` / `getApproved(uint256)` / `safeTransferFrom(address,address,uint256)` | ERC-721 | Approbation et transfert standards |
| `hasRole(bytes32,address)` / `grantRole(bytes32,address)` / `revokeRole(bytes32,address)` | Lecture publique / écriture admin | Gestion des rôles |

L'ABI est générée dans `blockchain/artifacts/contracts/AntiquityRegistry.sol/AntiquityRegistry.json` après compilation. Le frontend copie sa propriété `abi` dans `frontend/src/generated/registryAbi.json` à chaque démarrage ou build.

Après le déploiement local, l'adresse réelle est enregistrée dans `blockchain/ignition/deployments/chain-31337/deployed_addresses.json`, sous la clé `RegistryModule#AntiquityRegistry`. Elle doit être copiée dans `frontend/.env.local` comme `VITE_REGISTRY_ADDRESS`. Ce fichier est ignoré par Git, car l'adresse d'un nœud local ne doit pas être considérée comme permanente.

Déploiement vérifié le 1er novembre 2026 sur le nœud local de démonstration : `0x5FbDB2315678afecb367f032d93F642f64180aa3`, chain ID `31337`. Deux tokens ont été créés (IDs 1 et 2), et le token 1 a reçu une attestation. Cette adresse doit être revérifiée si le nœud redémarre.

Le déployeur reçoit initialement les rôles admin, registraire et expert pour la démonstration. L'admin peut accorder des rôles distincts avec `grantRole`. Les rôles ne s'impliquent pas mutuellement.
