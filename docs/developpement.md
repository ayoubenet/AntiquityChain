# Repères de développement

## Structure du projet

| Chemin | Rôle |
|---|---|
| `blockchain/contracts/` | Contrats Solidity |
| `blockchain/test/unit/` | Tests unitaires de chaque contrat (`node:test` et viem) |
| `blockchain/test/integration/` | Parcours complet déployé avec Ignition |
| `blockchain/test/mocks/` | Contrats Solidity utilisés uniquement par les tests |
| `blockchain/ignition/modules/` | Modules de déploiement Hardhat Ignition |
| `blockchain/scripts/` | Scripts de démonstration exécutés avec `hardhat run` |
| `blockchain/hardhat.config.ts` | Configuration Hardhat 3 et du compilateur |
| `frontend/src/` | Interface React et service ethers.js |

## Vérification après une modification

Depuis `blockchain/`, compiler avant de vérifier les types, car les types du contrat proviennent de l'ABI compilée :

```powershell
npx hardhat build
npx tsc --noEmit
npx hardhat test
```

Les tests utilisent une simulation de blockchain créée par `network.create()`. `unit/Registry.test.ts` couvre les rôles, les événements, les données du NFT et les transferts ERC-721 ; `unit/Transactions.test.ts` couvre les scénarios TX-01 à TX-22 ; `integration/AntiquitySystem.test.ts` déploie `AntiquitySystem` avec Ignition et rejoue le parcours complet, transfert direct inclus. Les contrats de `test/mocks/` servent uniquement de destinataires dans les tests ; Hardhat les compile sans les mélanger aux artifacts de `contracts/`.

Le frontend utilise les ABI copiées depuis les artifacts Hardhat (Registry et Transactions) par `frontend/scripts/sync-registry.mjs`. Après un changement de signature Solidity, recompiler le contrat et relancer le frontend ou son build. Les commandes de déploiement et de démonstration se trouvent dans le [README](../README.md).

Documentation technique : [Hardhat 3](https://hardhat.org/docs), [tests Hardhat](https://hardhat.org/docs/guides/testing), [viem](https://viem.sh/docs) et [OpenZeppelin Contracts 5.x](https://docs.openzeppelin.com/contracts/5.x/).
