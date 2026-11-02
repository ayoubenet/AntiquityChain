import { useState } from 'react'
import { connectTransactions, errorMessage, parseTokenId, requireRecipient, transferAntique } from '../services/transactions'

export default function TransferAntique({ onConnected }) {
  const [id, setId] = useState('')
  const [recipient, setRecipient] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    try {
      const tokenId = parseTokenId(id)
      const to = requireRecipient(recipient)
      setMessage('Connexion au wallet et vérification du réseau…')
      const wallet = await connectTransactions()
      onConnected(wallet.account)
      setMessage('Vérification du propriétaire et de l’approbation…')
      setResult(await transferAntique(wallet, tokenId, to, setMessage))
      setMessage('Transfert confirmé.')
    } catch (error) {
      setMessage(errorMessage(error, 'Échec du transfert.'))
    } finally { setBusy(false) }
  }

  return <section className="panel">
    <div className="section-heading"><span className="eyebrow">03 · TRANSFERT</span><h2>Transférer une antiquité</h2>
      <p>Don ou transfert sans prix. Le contrat Transactions doit d’abord être autorisé pour ce token : la page le demande si nécessaire.</p></div>
    <form onSubmit={submit} className="form-grid">
      <label>Identifiant du token<input type="number" min="1" step="1" required value={id} placeholder="1"
        onChange={(event) => setId(event.target.value)} /></label>
      <label>Adresse du destinataire<input type="text" required value={recipient} placeholder="0x…"
        onChange={(event) => setRecipient(event.target.value)} /></label>
      <div className="wide actions"><button disabled={busy} type="submit">{busy ? 'Transaction en cours…' : 'Transférer le NFT'}</button></div>
    </form>
    {message && <p className="notice" role="status">{message}</p>}
    {result && <div className="result"><strong>Nouveau propriétaire</strong><span><code>{result.owner}</code></span>
      {result.approvalHash && <span>Approbation : <code>{result.approvalHash}</code></span>}
      <span>Transfert : <code>{result.hash}</code></span></div>}
  </section>
}
