# Architecture du prototype

```mermaid
flowchart LR
  Wallet[Wallet MetaMask] --> Web[Interface React + ethers]
  Web --> Registry[AntiquityRegistry · ERC-721]
  Web --> Transactions[AntiquityTransactions · membre 2]
  Web --> Files[Fichiers hors chaîne]
  Registry --> Dossier[Fiche et hash des preuves]
  Registry --> Ownership[ownerOf et événements Transfer]
  Transactions -->|safeTransferFrom après approve| Registry
  Transactions --> Declarations[SaleDeclared · ProvenanceEvidenceAdded]
```

## Transfert via le module Transactions

```mermaid
sequenceDiagram
  actor Alice
  participant R as AntiquityRegistry
  participant T as AntiquityTransactions
  Alice->>R: approve(T, tokenId)
  Alice->>T: transferAntique(tokenId, Bob)
  T->>R: ownerOf(tokenId) == Alice ? getApproved / isApprovedForAll ?
  T->>R: safeTransferFrom(Alice, Bob, tokenId) (msg.sender = T)
  R-->>R: emit Transfer(Alice, Bob, tokenId)
  T-->>T: emit AntiquityTransferred
```

## Vente déclarée (sans paiement)

```mermaid
sequenceDiagram
  actor Bob
  participant R as AntiquityRegistry
  participant T as AntiquityTransactions
  Bob->>R: approve(T, tokenId)
  Bob->>T: declareSaleAndTransfer(tokenId, Claire, prixWei, hashDocument)
  T->>R: safeTransferFrom(Bob, Claire, tokenId)
  R-->>R: emit Transfer(Bob, Claire, tokenId)
  T-->>T: emit AntiquityTransferred + SaleDeclared
  Note over T: Transaction atomique : si le transfert échoue, aucun SaleDeclared n'est conservé. Aucun ETH n'est déplacé.
```

## Contrat commun proposé

- Un `tokenId` ERC-721 représente une antiquité. `ownerOf(tokenId)` est la source unique de propriété numérique.
- `registerAntique(initialOwner, name, origin, period, metadataURI, provenanceURI, evidenceHash)` comporte exactement sept arguments dans cet ordre. Seul `REGISTRAR_ROLE` peut l'appeler.
- `getAntique(tokenId)` lit la fiche initiale et l'attestation. `tokenURI(tokenId)` lit les métadonnées externes.
- `verifyAntique(tokenId)` enregistre une seule attestation par un compte doté de `EXPERT_ROLE`.
- `AntiqueRegistered`, `AntiqueVerified` et `Transfer` permettent de reconstruire la chronologie. Toutes les mutations de propriété, même directes, sont dans les logs `Transfer` du Registry.
- Le module Transactions doit recevoir une approbation ERC-721 via `approve` ou `setApprovalForAll`. Son appel au Registry aura le contrat Transactions comme `msg.sender`. Aucun rôle administrateur n'est nécessaire pour transférer.

## Stockage et limites

Le contrat conserve les déclarations d'origine et de période, l'URI de provenance, le hash Keccak-256 du fichier de preuve et l'attestation. Les photos et rapports restent hors chaîne. Les URI et la fiche initiale ne disposent d'aucune fonction publique de modification. Une URI pointant vers un contenu mutable peut néanmoins changer hors chaîne ; privilégier des URI de contenu comme IPFS.

`verified` indique seulement qu'un expert autorisé a enregistré une attestation. Ni l'authenticité physique, ni la propriété juridique, ni la qualification réelle du wallet expert ne sont vérifiées automatiquement. `block.timestamp` sert à situer l'attestation dans la chronologie du réseau.

## Décisions communes avec le module Transactions

- `AntiquityTransactions(address registry)` reçoit l'adresse du Registry au déploiement ; elle est immuable. Le module Ignition `AntiquitySystem` déploie les deux contrats dans cet ordre.
- Le module ne stocke aucun propriétaire et n'a aucun rôle du Registry. Il exige `ownerOf(tokenId) == msg.sender` et une approbation ERC-721 (`approve` ponctuel recommandé, `setApprovalForAll` accepté).
- Les ventes du MVP sont des **déclarations** : prix en wei et hash du document de vente, sans paiement on-chain.
- La provenance initiale reste dans le Registry ; les preuves ultérieures sont des événements `ProvenanceEvidenceAdded`, non expertisés.
- L'historique de propriété se lit dans `Registry.Transfer` (transferts directs inclus), complété par `SaleDeclared`, `ProvenanceEvidenceAdded` et `AntiqueVerified`, regroupés par hash de transaction.

Voir [l'API Transactions](transactions-api.md) et le [déploiement local](deployment-local.md).
