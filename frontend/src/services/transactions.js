import { ethers } from 'ethers'
import transactionsAbi from '../generated/transactionsAbi.json'
import { connectWallet, readRegistry } from './registry'

const address = import.meta.env.VITE_TRANSACTIONS_ADDRESS
const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'
const deploymentBlock = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0)
const LOG_PAGE = 5000

export function transactionsConfigured() {
  return Boolean(address && ethers.isAddress(address))
}

function requireAddress() {
  if (!transactionsConfigured()) throw new Error('Adresse du contrat Transactions absente. Renseignez VITE_TRANSACTIONS_ADDRESS dans frontend/.env.local.')
  return address
}

function readTransactions() {
  return new ethers.Contract(requireAddress(), transactionsAbi, new ethers.JsonRpcProvider(rpcUrl))
}

export function errorMessage(error, fallback) {
  if (error?.code === 'ACTION_REJECTED') return 'Signature refusée dans le wallet.'
  if (error?.code === 'NETWORK_ERROR' || /fetch|ECONNREFUSED/i.test(error?.message || '')) return 'Nœud RPC inaccessible. Vérifiez que la blockchain locale est démarrée.'
  return error?.reason || error?.shortMessage || error?.message || fallback
}

export function parseTokenId(value) {
  if (!/^\d+$/.test(String(value).trim()) || BigInt(value) < 1n) throw new Error('Saisissez un identifiant de token positif.')
  return BigInt(value)
}

export function requireRecipient(value) {
  if (!ethers.isAddress(value.trim())) throw new Error('Adresse Ethereum du destinataire invalide.')
  return ethers.getAddress(value.trim())
}

export async function hashFile(file) {
  if (!file) throw new Error('Choisissez le fichier à hacher.')
  return ethers.keccak256(new Uint8Array(await file.arrayBuffer()))
}

/** Connects the wallet and returns both contracts bound to the signer. */
export async function connectTransactions() {
  const wallet = await connectWallet()
  const transactions = new ethers.Contract(requireAddress(), transactionsAbi, wallet.contract.runner)
  return { account: wallet.account, registry: wallet.contract, transactions }
}

/** Checks ownership against Registry.ownerOf, the single source of truth. */
export async function requireOwnership({ registry, account }, tokenId) {
  let owner
  try { owner = await registry.ownerOf(tokenId) }
  catch { throw new Error(`Le token #${tokenId} n’existe pas.`) }
  if (owner.toLowerCase() !== account.toLowerCase()) throw new Error(`Ce wallet n’est pas propriétaire du token #${tokenId} (propriétaire : ${owner}).`)
  return owner
}

/** Requests a single-token approval only when neither approve nor setApprovalForAll already covers this contract. */
export async function ensureApproval({ registry, account }, tokenId, onStep = () => {}) {
  const spender = requireAddress()
  const [approved, operator] = await Promise.all([registry.getApproved(tokenId), registry.isApprovedForAll(account, spender)])
  if (approved.toLowerCase() === spender.toLowerCase() || operator) return null
  onStep('Autorisez le contrat Transactions à transférer ce token (signature 1/2)…')
  const receipt = await (await registry.approve(spender, tokenId)).wait()
  if (receipt.status !== 1) throw new Error('L’approbation a échoué.')
  return receipt.hash
}

async function confirm(tx) {
  const receipt = await tx.wait()
  if (receipt.status !== 1) throw new Error('La transaction a échoué.')
  return receipt.hash
}

export async function transferAntique(wallet, tokenId, recipient, onStep) {
  await requireOwnership(wallet, tokenId)
  const approvalHash = await ensureApproval(wallet, tokenId, onStep)
  onStep('Signez le transfert dans le wallet…')
  const hash = await confirm(await wallet.transactions.transferAntique(tokenId, recipient))
  return { approvalHash, hash, owner: await wallet.registry.ownerOf(tokenId) }
}

export async function declareSale(wallet, tokenId, buyer, priceEth, saleDocumentHash, onStep) {
  const priceWei = ethers.parseEther(priceEth)
  if (priceWei <= 0n) throw new Error('Le prix déclaré doit être positif.')
  if (!ethers.isHexString(saleDocumentHash, 32) || saleDocumentHash === ethers.ZeroHash) throw new Error('Empreinte du document de vente invalide (bytes32 attendu).')
  await requireOwnership(wallet, tokenId)
  const approvalHash = await ensureApproval(wallet, tokenId, onStep)
  onStep('Signez la vente déclarée dans le wallet…')
  const hash = await confirm(await wallet.transactions.declareSaleAndTransfer(tokenId, buyer, priceWei, saleDocumentHash))
  return { approvalHash, hash, owner: await wallet.registry.ownerOf(tokenId) }
}

export async function addProvenanceEvidence(wallet, tokenId, evidenceHash, evidenceURI, description) {
  if (!evidenceURI.trim()) throw new Error('Indiquez l’URI de la preuve.')
  await requireOwnership(wallet, tokenId)
  return confirm(await wallet.transactions.addProvenanceEvidence(tokenId, evidenceHash, evidenceURI.trim(), description.trim()))
}

// Queries logs in bounded block ranges to stay within RPC limits.
async function queryPaged(contract, filter, latest) {
  const logs = []
  for (let from = deploymentBlock; from <= latest; from += LOG_PAGE) {
    logs.push(...await contract.queryFilter(filter, from, Math.min(from + LOG_PAGE - 1, latest)))
  }
  return logs
}

/**
 * Rebuilds the token's timeline. Ownership comes from Registry.Transfer (which includes direct ERC-721
 * transfers); declared sales and owner-submitted evidence come from Transactions and stay labelled as such.
 */
export async function getHistory(tokenId) {
  const registry = readRegistry()
  const transactions = readTransactions()
  const provider = registry.runner.provider
  const [owner, antique, latest] = await Promise.all([registry.ownerOf(tokenId), registry.getAntique(tokenId), provider.getBlockNumber()])
  const [transfers, verifications, viaModule, sales, proofs] = await Promise.all([
    queryPaged(registry, registry.filters.Transfer(null, null, tokenId), latest),
    queryPaged(registry, registry.filters.AntiqueVerified(tokenId), latest),
    queryPaged(transactions, transactions.filters.AntiquityTransferred(tokenId), latest),
    queryPaged(transactions, transactions.filters.SaleDeclared(tokenId), latest),
    queryPaged(transactions, transactions.filters.ProvenanceEvidenceAdded(tokenId), latest),
  ])

  const moduleTxs = new Set(viaModule.map((log) => log.transactionHash))
  const saleByTx = new Map(sales.map((log) => [log.transactionHash, log]))
  const entries = [
    ...transfers.map((log) => {
      const sale = saleByTx.get(log.transactionHash)
      const mint = log.args.from === ethers.ZeroAddress
      return {
        log, kind: mint ? 'mint' : sale ? 'sale' : 'transfer',
        from: log.args.from, to: log.args.to,
        via: mint ? 'Registry · création' : moduleTxs.has(log.transactionHash) ? 'Contrat Transactions' : 'Transfert ERC-721 direct',
        price: sale ? ethers.formatEther(sale.args.declaredPriceWei) : null,
        documentHash: sale?.args.saleDocumentHash ?? null,
      }
    }),
    ...verifications.map((log) => ({ log, kind: 'verified', by: log.args.expert })),
    ...proofs.map((log) => ({
      log, kind: 'evidence', by: log.args.submittedBy,
      evidenceHash: log.args.evidenceHash, evidenceURI: log.args.evidenceURI, description: log.args.description,
    })),
  ].sort((a, b) => a.log.blockNumber - b.log.blockNumber || a.log.transactionIndex - b.log.transactionIndex || a.log.index - b.log.index)

  const blockNumbers = [...new Set(entries.map((entry) => entry.log.blockNumber))]
  const blocks = new Map(await Promise.all(blockNumbers.map(async (number) => [number, await provider.getBlock(number)])))

  return {
    tokenId: tokenId.toString(), owner, name: antique.name, provenanceURI: antique.provenanceURI, verified: antique.verified,
    entries: entries.map(({ log, ...entry }) => ({
      ...entry, txHash: log.transactionHash, blockNumber: log.blockNumber, logIndex: log.index,
      date: new Date(Number(blocks.get(log.blockNumber).timestamp) * 1000).toLocaleString('fr-FR'),
    })),
  }
}
