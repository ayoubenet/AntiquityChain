import { useState } from 'react'
import WalletStatus from './components/WalletStatus'
import AntiqueHistory from './pages/AntiqueHistory'
import DeclareSale from './pages/DeclareSale'
import RegisterAntique from './pages/RegisterAntique'
import TransferAntique from './pages/TransferAntique'
import VerifyAntique from './pages/VerifyAntique'
import { registryConfigured } from './services/registry'
import { transactionsConfigured } from './services/transactions'
import './App.css'

const pages = [
  ['register', 'Enregistrer'],
  ['verify', 'Consulter & attester'],
  ['transfer', 'Transférer'],
  ['sale', 'Vente déclarée'],
  ['history', 'Historique'],
]

function App() {
  const [page, setPage] = useState('register')
  const [account, setAccount] = useState('')

  return <div className="site-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><span>AntiquityChain<small>REGISTRE DES ANTIQUITÉS</small></span></div>
      <WalletStatus account={account} onConnected={setAccount} /></header>
    <main><div className="intro"><span className="eyebrow">PROTOCOLE DE PROVENANCE · DÉMONSTRATION</span>
      <h1>Une trace numérique<br /><em>pour chaque objet.</em></h1>
      <p>Enregistrez une fiche, transférez l’objet, déclarez ses ventes et retracez chaque propriétaire depuis la blockchain.</p></div>
      {(!registryConfigured() || !transactionsConfigured()) && <p className="notice" role="alert">Configurez les adresses des contrats (<code>VITE_REGISTRY_ADDRESS</code>, <code>VITE_TRANSACTIONS_ADDRESS</code>) dans <code>frontend/.env.local</code> avant d’utiliser l’application.</p>}
      <nav className="tabs" aria-label="Fonctions du registre">{pages.map(([key, label]) =>
        <button key={key} className={page === key ? 'active' : ''} onClick={() => setPage(key)}>{label}</button>)}</nav>
      {page === 'register' && <RegisterAntique account={account} onConnected={setAccount} />}
      {page === 'verify' && <VerifyAntique onConnected={setAccount} />}
      {page === 'transfer' && <TransferAntique onConnected={setAccount} />}
      {page === 'sale' && <DeclareSale onConnected={setAccount} />}
      {page === 'history' && <AntiqueHistory onConnected={setAccount} />}
    </main><footer>Prototype académique · L’enregistrement ne certifie ni l’authenticité physique ni la propriété juridique. Les ventes sont déclarées, non payées on-chain.</footer>
  </div>
}

export default App
