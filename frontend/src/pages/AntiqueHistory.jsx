import { useState } from 'react'
import { addProvenanceEvidence, connectTransactions, errorMessage, getHistory, hashFile, parseTokenId } from '../services/transactions'

const labels = {
  mint: 'Création du NFT', transfer: 'Transfert', sale: 'Vente déclarée',
  verified: 'Attestation d’expert', evidence: 'Preuve ajoutée par le propriétaire',
}

function Entry({ entry }) {
  return <li className={`timeline-item ${entry.kind}`}>
    <div className="timeline-head"><strong>{labels[entry.kind]}</strong><span>{entry.date} · bloc {entry.blockNumber}</span></div>
    {entry.kind === 'mint' && <span>Premier propriétaire : <code>{entry.to}</code></span>}
    {(entry.kind === 'transfer' || entry.kind === 'sale') && <span><code>{entry.from}</code> → <code>{entry.to}</code></span>}
    {entry.via && entry.kind !== 'mint' && <span className="badge">{entry.via}</span>}
    {entry.kind === 'sale' && <><span>Prix déclaré : {entry.price} ETH <em>(non payé on-chain)</em></span>
      <span>Empreinte du document : <code>{entry.documentHash}</code></span></>}
    {entry.kind === 'verified' && <span>Expert : <code>{entry.by}</code></span>}
    {entry.kind === 'evidence' && <><span>{entry.description || 'Sans description'} — <code>{entry.evidenceURI}</code></span>
      <span>Empreinte : <code>{entry.evidenceHash}</code> · soumise par <code>{entry.by}</code></span>
      <span className="badge">Déclaration non expertisée</span></>}
    <span className="tx">Transaction : <code>{entry.txHash}</code></span>
  </li>
}

export default function AntiqueHistory({ onConnected }) {
  const [id, setId] = useState('')
  const [history, setHistory] = useState(null)
  const [evidence, setEvidence] = useState({ uri: '', description: '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function load(tokenId) {
    setHistory(await getHistory(tokenId))
  }

  async function search(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setHistory(null)
    try { await load(parseTokenId(id)) }
    catch (error) { setMessage(errorMessage(error, 'Token introuvable ou réseau indisponible.')) }
    finally { setBusy(false) }
  }

  async function submitEvidence(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const tokenId = BigInt(history.tokenId)
      const evidenceHash = await hashFile(file)
      const wallet = await connectTransactions()
      onConnected(wallet.account)
      setMessage('Signature et confirmation de la preuve en attente…')
      await addProvenanceEvidence(wallet, tokenId, evidenceHash, evidence.uri, evidence.description)
      await load(tokenId)
      setEvidence({ uri: '', description: '' })
      setMessage('Preuve ajoutée à l’historique.')
    } catch (error) {
      setMessage(errorMessage(error, 'Échec de l’ajout de la preuve.'))
    } finally { setBusy(false) }
  }

  return <section className="panel">
    <div className="section-heading"><span className="eyebrow">05 · HISTORIQUE</span><h2>Historique et provenance</h2>
      <p>La succession des propriétaires provient des événements <code>Transfer</code> du Registry, y compris les transferts ERC-721 directs. Ventes déclarées et preuves complémentaires proviennent du contrat Transactions.</p></div>
    <form className="search-row" onSubmit={search}><label>Identifiant du token<input type="number" min="1" step="1" required value={id}
      onChange={(event) => setId(event.target.value)} placeholder="1" /></label><button disabled={busy} type="submit">Afficher</button></form>
    {message && <p className="notice" role="status">{message}</p>}
    {history && <div className="dossier">
      <div className="dossier-title"><div><span className="eyebrow">TOKEN #{history.tokenId}</span><h3>{history.name}</h3></div>
        <span className={`badge ${history.verified ? 'verified' : ''}`}>{history.verified ? 'Attestation enregistrée' : 'Sans attestation'}</span></div>
      <dl>
        <div><dt>Propriétaire actuel</dt><dd><code>{history.owner}</code></dd></div>
        <div><dt>Provenance initiale</dt><dd><code>{history.provenanceURI}</code></dd></div>
      </dl>
      <ol className="timeline">{history.entries.map((entry) => <Entry key={`${entry.txHash}-${entry.logIndex}`} entry={entry} />)}</ol>

      <form onSubmit={submitEvidence} className="form-grid evidence-form">
        <h4 className="wide">Ajouter une preuve de provenance (propriétaire actuel)</h4>
        <label>URI de la preuve<input type="text" required value={evidence.uri} placeholder="ipfs://…"
          onChange={(event) => setEvidence({ ...evidence, uri: event.target.value })} /></label>
        <label>Description<input type="text" value={evidence.description} placeholder="Rapport de conservation"
          onChange={(event) => setEvidence({ ...evidence, description: event.target.value })} /></label>
        <label className="wide">Fichier de preuve à hacher (Keccak-256)<input type="file" required
          onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <div className="wide actions"><button disabled={busy} type="submit">Ajouter la preuve</button></div>
      </form>
      <p className="footnote">Une preuve ajoutée est une déclaration du propriétaire, ni expertisée ni certifiée. Une vente déclarée n’est pas un paiement confirmé.</p>
    </div>}
  </section>
}
