import { useState } from 'react'
import { connectWallet } from '../services/registry'
import { errorMessage } from '../services/transactions'

const expectedChainId = import.meta.env.VITE_CHAIN_ID || '31337'

export default function WalletStatus({ account, onConnected }) {
  const [error, setError] = useState('')

  async function connect() {
    setError('')
    try { onConnected((await connectWallet()).account) }
    catch (failure) { setError(errorMessage(failure, 'Connexion au wallet impossible.')) }
  }

  return <div className="wallet-status">
    <button className="wallet" onClick={connect} title={account ? `Réseau attendu : chain ID ${expectedChainId}` : undefined}>
      {account ? `${account.slice(0, 6)}…${account.slice(-4)} · ${expectedChainId}` : 'Connecter le wallet'}</button>
    {error && <span className="wallet-error" role="alert">{error}</span>}
  </div>
}
