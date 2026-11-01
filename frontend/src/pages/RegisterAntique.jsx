import { useState } from 'react'
import { connectWallet, hasRole, hashEvidence, registerAntique } from '../services/registry'

const initial = { initialOwner: '', name: '', origin: '', period: '', metadataURI: '', provenanceURI: '' }

export default function RegisterAntique({ account, onConnected }) {
  const [fields, setFields] = useState(initial)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setResult(null)
    try {
      const wallet = await connectWallet()
      onConnected(wallet.account)
      if (!await hasRole(wallet.contract, 'REGISTRAR_ROLE', wallet.account)) {
        throw new Error('Ce wallet ne possède pas le rôle de registraire.')
      }
      const evidenceHash = await hashEvidence(file)
      setMessage('Signature et confirmation de la transaction en attente…')
      const created = await registerAntique(wallet.contract, fields, evidenceHash)
      setResult({ ...created, evidenceHash })
      setMessage('Antiquité enregistrée et transaction confirmée.')
    } catch (error) {
      setMessage(error.shortMessage || error.reason || error.message || 'Échec de l’enregistrement.')
    } finally {
      setBusy(false)
    }
  }

  function field(name, label, placeholder) {
    return <label key={name}>{label}<input type="text" required value={fields[name]} placeholder={placeholder}
      onChange={(event) => setFields({ ...fields, [name]: event.target.value })} /></label>
  }

  return <section className="panel">
    <div className="section-heading"><span className="eyebrow">01 · REGISTRY</span><h2>Enregistrer une antiquité</h2>
      <p>Créez une fiche de provenance déclarée et le NFT associé. Les fichiers restent hors chaîne.</p></div>
    <form onSubmit={submit} className="form-grid">
      {field('name', 'Nom de l’objet', 'Amphore antique')}
      {field('initialOwner', 'Adresse du premier propriétaire', account || '0x…')}
      {field('origin', 'Origine déclarée', 'Grèce')}
      {field('period', 'Période déclarée', 'Antiquité classique')}
      {field('metadataURI', 'URI des métadonnées JSON', 'ipfs://…')}
      {field('provenanceURI', 'URI du dossier de provenance', 'ipfs://…')}
      <label className="wide">Fichier de preuve à hacher (Keccak-256)<input type="file" required
        onChange={(event) => setFile(event.target.files?.[0] || null)} />
        <small>Déposez le fichier sur un stockage externe et indiquez son URI ci-dessus. Le fichier n’est pas envoyé par cette page.</small></label>
      <div className="wide actions"><button disabled={busy} type="submit">{busy ? 'Transaction en cours…' : 'Enregistrer le NFT'}</button></div>
    </form>
    {message && <p className="notice" role="status">{message}</p>}
    {result && <div className="result"><strong>Token #{result.tokenId.toString()}</strong><span>Hash de preuve : <code>{result.evidenceHash}</code></span>
      <span>Transaction : <code>{result.transactionHash}</code></span></div>}
  </section>
}
