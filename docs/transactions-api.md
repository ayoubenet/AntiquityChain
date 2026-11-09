# API du module Transactions

Contrat : `AntiquityTransactions` · Solidity `0.8.34` · OpenZeppelin `5.6.1` (`IERC721`, `ReentrancyGuard`) · réseau local Hardhat `31337`.

Le contrat ne stocke aucun propriétaire : `AntiquityRegistry.ownerOf(tokenId)` reste la source unique. Le constructeur reçoit l'adresse du Registry (refusée si ce n'est pas un contrat) ; elle est immuable, donc un Registry redéployé impose de redéployer Transactions.

## Fonctions

| Fonction | Paramètres | Écriture ? | Permissions | Résultat |
|---|---|---|---|---|
| `transferAntique` | `(uint256 tokenId, address to)` | Oui | Propriétaire + `approve` (ou `setApprovalForAll`) | `Registry.safeTransferFrom` ; `Transfer` + `AntiquityTransferred` |
| `declareSaleAndTransfer` | `(uint256 tokenId, address buyer, uint256 declaredPriceWei, bytes32 saleDocumentHash)` | Oui | Propriétaire + `approve` | Transfert + `SaleDeclared`, dans la même transaction |
| `addProvenanceEvidence` | `(uint256 tokenId, bytes32 evidenceHash, string evidenceURI, string description)` | Oui | Propriétaire courant | `ProvenanceEvidenceAdded` |
| `registry()` | Aucun | Non | Public | Adresse du Registry lié |

`transferAntique` et `declareSaleAndTransfer` sont `nonReentrant`, car `safeTransferFrom` appelle `onERC721Received` sur un destinataire contrat.

## Motifs de refus

| Message / erreur | Cause |
|---|---|
| `Registry must be a contract` | Constructeur appelé avec l'adresse zéro ou un compte externe |
| `ERC721NonexistentToken` (erreur du Registry) | Token inconnu |
| `Not token owner` | L'appelant n'est pas `ownerOf(tokenId)` |
| `Invalid recipient` | Destinataire `address(0)` |
| `Already owner` | Destinataire = propriétaire actuel |
| `Approve Transactions first` | Ni `getApproved(tokenId)` ni `isApprovedForAll(owner, Transactions)` |
| `ERC721InvalidReceiver` (erreur du Registry) | Destinataire contrat qui n'implémente pas `IERC721Receiver` |
| `Price must be positive` / `Missing sale proof` | Vente déclarée à prix nul ou sans empreinte de document |
| `Missing evidence hash` / `Missing evidence URI` | Preuve incomplète |

## Événements

- `AntiquityTransferred(uint256 indexed tokenId, address indexed from, address indexed to, address initiatedBy)` : transferts passés **par ce module** uniquement.
- `SaleDeclared(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 declaredPriceWei, bytes32 saleDocumentHash)` : déclaration du vendeur. **Aucun ETH n'est transféré ni vérifié**, la signature de l'acheteur n'est pas recueillie.
- `ProvenanceEvidenceAdded(uint256 indexed tokenId, address indexed submittedBy, bytes32 evidenceHash, string evidenceURI, string description)` : preuve complémentaire non expertisée, distincte de `AntiqueVerified`. Les preuves s'ajoutent, aucune n'est modifiable.
- Source externe : `AntiquityRegistry.Transfer(address indexed from, address indexed to, uint256 indexed tokenId)` est la **seule** base de l'historique de propriété complet, transferts directs compris. `from = 0x0` correspond à la création.

## Utilisation

1. Le propriétaire appelle `Registry.approve(adresseTransactions, tokenId)` (préférer cette approbation ponctuelle à `setApprovalForAll`).
2. Il appelle `transferAntique` ou `declareSaleAndTransfer`. Dans le Registry, `msg.sender` est alors le contrat Transactions, d'où l'approbation préalable.
3. L'approbation ponctuelle est effacée par le transfert ; le nouveau propriétaire doit approuver à nouveau.

Le frontend (`frontend/src/services/transactions.js`) vérifie le propriétaire, ne demande l'approbation que si elle manque, puis reconstruit l'historique en interrogeant les logs par tranches de 5 000 blocs à partir de `VITE_DEPLOYMENT_BLOCK`, triés par bloc, index de transaction et index de log.

L'ABI est copiée dans `frontend/src/generated/transactionsAbi.json` par `frontend/scripts/sync-registry.mjs` à chaque `npm run dev` ou `npm run build`.

## Tests

`blockchain/test/unit/Transactions.test.ts` couvre les scénarios TX-01 à TX-22 du guide (motifs de refus vérifiés avec `viem.assertions`), plus l'acceptation de `setApprovalForAll`. Les destinataires contrats de TX-21/22 sont les mocks de `blockchain/test/mocks/ReceiverMocks.sol`. `blockchain/test/integration/AntiquitySystem.test.ts` déploie le module Ignition `AntiquitySystem` et rejoue le scénario commun : enregistrement, attestation, transfert, vente déclarée, preuve et transfert direct.
