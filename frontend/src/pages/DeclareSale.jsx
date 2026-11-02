import { useState } from 'react'
import { connectTransactions, declareSale, errorMessage, hashFile, parseTokenId, requireRecipient } from '../services/transactions'

export default function DeclareSale({ onConnected }) {
  const [id, setId] = useState('')
  const [buyer, setBuyer] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setResult(null)
    try {
      const tokenId = parseTokenId(id)
      const to = requireRecipient(buyer)
      if (!/^\d+(\.\d{1,18})?$/.test(price.trim())) throw new Error('Saisissez un prix déclaré en ETH, par exemple 0.5.')
      const documentHash = await hashFile(file)
      setMessage('Connexion au wallet et vérification du réseau…')
      const wallet = await connectTransactions()
      onConnected(wallet.account)
      setMessage('Vérification du propriétaire et de l’approbation…')
      setResult({ ...await declareSale(wallet, tokenId, to, price.trim(), documentHash, setMessage), documentHash })
      setMessage('Vente déclarée et transfert confirmés. Aucun paiement n’a été effectué par la blockchain.')
    } catch (error) {
      setMessage(errorMessage(error, 'Échec de la vente déclarée.'))
    } finally { setBusy(false) }
  }

  return <section className="panel">
    <div className="section-heading"><span className="eyebrow">04 · VENTE DÉCLARÉE</span><h2>Déclarer une vente</h2>
      <p>Le vendeur déclare un prix et l’empreinte du contrat de vente ; le NFT est transféré dans la même transaction. <strong>Aucun ETH n’est transféré</strong> : il s’agit d’une déclaration, pas d’un paiement vérifié.</p></div>
    <form onSubmit={submit} className="form-grid">
      <label>Identifiant du token<input type="number" min="1" step="1" required value={id} placeholder="1"
        onChange={(event) => setId(event.target.value)} /></label>
      <label>Adresse de l’acheteur<input type="text" required value={buyer} placeholder="0x…"
        onChange={(event) => setBuyer(event.target.value)} /></label>
      <label>Prix déclaré (ETH)<input type="text" inputMode="decimal" required value={price} placeholder="0.5"
        onChange={(event) => setPrice(event.target.value)} /><small>Converti en wei pour l’événement. Aucun montant n’est débité.</small></label>
      <label>Document de vente à hacher (Keccak-256)<input type="file" required
        onChange={(event) => setFile(event.target.files?.[0] || null)} /><small>Seule l’empreinte est publiée ; conservez le fichier hors chaîne.</small></label>
      <div className="wide actions"><button disabled={busy} type="submit">{busy ? 'Transaction en cours…' : 'Déclarer la vente et transférer'}</button></div>
    </form>
    {message && <p className="notice" role="status">{message}</p>}
    {result && <div className="result"><strong>Vente déclarée</strong><span>Nouveau propriétaire : <code>{result.owner}</code></span>
      <span>Empreinte du document : <code>{result.documentHash}</code></span>
      {result.approvalHash && <span>Approbation : <code>{result.approvalHash}</code></span>}
      <span>Transaction : <code>{result.hash}</code></span></div>}
  </section>
}
