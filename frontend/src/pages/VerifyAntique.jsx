import { useState } from 'react'
import { connectWallet, getAntique, hasRole, verifyAntique } from '../services/registry'

export default function VerifyAntique({ onConnected }) {
  const [id, setId] = useState('')
  const [item, setItem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function search(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setItem(null)
    try {
      if (!/^\d+$/.test(id) || BigInt(id) < 1n) throw new Error('Saisissez un identifiant de token positif.')
      setItem(await getAntique(BigInt(id)))
    } catch (error) {
      setMessage(error.shortMessage || error.message || 'Token introuvable ou réseau indisponible.')
    } finally { setBusy(false) }
  }

  async function attest() {
    setBusy(true)
    setMessage('')
    try {
      const wallet = await connectWallet()
      onConnected(wallet.account)
      if (!await hasRole(wallet.contract, 'EXPERT_ROLE', wallet.account)) {
        throw new Error('Ce wallet ne possède pas le rôle d’expert.')
      }
      setMessage('Signature et confirmation de l’attestation en attente…')
      await verifyAntique(wallet.contract, BigInt(id))
      setItem(await getAntique(BigInt(id)))
      setMessage('Attestation enregistrée et transaction confirmée.')
    } catch (error) {
      setMessage(error.shortMessage || error.reason || error.message || 'Échec de l’attestation.')
    } finally { setBusy(false) }
  }

  return <section className="panel">
    <div className="section-heading"><span className="eyebrow">02 · ATTESTATION</span><h2>Consulter et attester</h2>
      <p>La fiche est lisible par tous. L’attestation exige un wallet doté du rôle d’expert.</p></div>
    <form className="search-row" onSubmit={search}><label>Identifiant du token<input type="number" min="1" step="1" required value={id}
      onChange={(event) => setId(event.target.value)} placeholder="1" /></label><button disabled={busy} type="submit">Rechercher</button></form>
    {message && <p className="notice" role="status">{message}</p>}
    {item && <div className="dossier">
      <div className="dossier-title"><div><span className="eyebrow">TOKEN #{item.tokenId}</span><h3>{item.name}</h3></div>
        <span className={`badge ${item.verified ? 'verified' : ''}`}>{item.verified ? 'Attestation enregistrée' : 'Sans attestation'}</span></div>
      <dl>
        <div><dt>Origine déclarée</dt><dd>{item.origin}</dd></div>
        <div><dt>Période déclarée</dt><dd>{item.period}</dd></div>
        <div><dt>Propriétaire actuel</dt><dd><code>{item.owner}</code></dd></div>
        <div><dt>Métadonnées</dt><dd><code>{item.metadataURI}</code></dd></div>
        <div><dt>Dossier de provenance</dt><dd><code>{item.provenanceURI}</code></dd></div>
        <div><dt>Empreinte des preuves</dt><dd><code>{item.evidenceHash}</code></dd></div>
        {item.verified && <><div><dt>Expert</dt><dd><code>{item.verifiedBy}</code></dd></div><div><dt>Date du bloc</dt><dd>{item.verifiedAt}</dd></div></>}
      </dl>
      {!item.verified && <button disabled={busy} onClick={attest}>Attester ce dossier</button>}
      <p className="footnote">Une attestation consigne la déclaration d’un expert. Elle ne garantit pas l’authenticité physique de l’objet.</p>
    </div>}
  </section>
}
