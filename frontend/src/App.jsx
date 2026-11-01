import { useState } from 'react'
import RegisterAntique from './pages/RegisterAntique'
import VerifyAntique from './pages/VerifyAntique'
import { connectWallet, registryConfigured } from './services/registry'
import './App.css'

function App() {
  const [page, setPage] = useState('register')
  const [account, setAccount] = useState('')
  const [walletError, setWalletError] = useState('')

  async function connect() {
    setWalletError('')
    try { setAccount((await connectWallet()).account) }
    catch (error) { setWalletError(error.shortMessage || error.message) }
  }

  return <div className="site-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><span>AntiquityChain<small>REGISTRE DES ANTIQUITÉS</small></span></div>
      <button className="wallet" onClick={connect}>{account ? `${account.slice(0, 6)}…${account.slice(-4)}` : 'Connecter le wallet'}</button></header>
    <main><div className="intro"><span className="eyebrow">PROTOCOLE DE PROVENANCE · DÉMONSTRATION</span>
      <h1>Une trace numérique<br /><em>pour chaque objet.</em></h1>
      <p>Enregistrez une fiche, conservez l’empreinte de ses preuves et consultez les attestations des experts.</p></div>
      {!registryConfigured() && <p className="notice" role="alert">Configurez l’adresse du contrat dans <code>frontend/.env.local</code> avant d’utiliser l’application.</p>}
      {walletError && <p className="notice" role="alert">{walletError}</p>}
      <nav className="tabs" aria-label="Fonctions du registre"><button className={page === 'register' ? 'active' : ''} onClick={() => setPage('register')}>Enregistrer</button>
        <button className={page === 'verify' ? 'active' : ''} onClick={() => setPage('verify')}>Consulter & attester</button></nav>
      {page === 'register' ? <RegisterAntique account={account} onConnected={setAccount} /> : <VerifyAntique onConnected={setAccount} />}
    </main><footer>Prototype académique · L’enregistrement ne certifie ni l’authenticité physique ni la propriété juridique.</footer>
  </div>
}

export default App
