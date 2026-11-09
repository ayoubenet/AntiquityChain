import { ethers } from 'ethers'
import abi from '../generated/registryAbi.json'

const address = import.meta.env.VITE_REGISTRY_ADDRESS
const chainId = BigInt(import.meta.env.VITE_CHAIN_ID || '31337')
const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545'

export function registryConfigured() {
  return Boolean(address && ethers.isAddress(address))
}

function requireAddress() {
  if (!registryConfigured()) throw new Error('Adresse du Registry absente. Renseignez VITE_REGISTRY_ADDRESS dans frontend/.env.local.')
  return address
}

export function readRegistry() {
  return new ethers.Contract(requireAddress(), abi, new ethers.JsonRpcProvider(rpcUrl))
}

export async function connectWallet() {
  if (!window.ethereum) throw new Error('Aucun wallet détecté. Installez MetaMask ou un wallet compatible.')
  const provider = new ethers.BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  const network = await provider.getNetwork()
  if (network.chainId !== chainId) throw new Error(`Mauvais réseau. Sélectionnez le chain ID ${chainId}.`)
  const signer = await provider.getSigner()
  return { account: await signer.getAddress(), contract: new ethers.Contract(requireAddress(), abi, signer) }
}

export async function hasRole(contract, roleName, account) {
  const role = await contract[roleName]()
  return contract.hasRole(role, account)
}

export async function registerAntique(contract, fields, evidenceHash) {
  const tx = await contract.registerAntique(
    fields.initialOwner, fields.name.trim(), fields.origin.trim(), fields.period.trim(),
    fields.metadataURI.trim(), fields.provenanceURI.trim(), evidenceHash,
  )
  const receipt = await tx.wait()
  if (receipt.status !== 1) throw new Error('La transaction a échoué.')
  const event = receipt.logs.map((log) => {
    try { return contract.interface.parseLog(log) } catch { return null }
  }).find((log) => log?.name === 'AntiqueRegistered')
  if (!event) throw new Error('Transaction confirmée, mais événement AntiqueRegistered introuvable.')
  return { tokenId: event.args.tokenId, transactionHash: receipt.hash }
}

export async function getAntique(tokenId) {
  const contract = readRegistry()
  const [item, owner, metadataURI] = await Promise.all([
    contract.getAntique(tokenId), contract.ownerOf(tokenId), contract.tokenURI(tokenId),
  ])
  return {
    tokenId: tokenId.toString(), owner, metadataURI,
    name: item.name, origin: item.origin, period: item.period,
    provenanceURI: item.provenanceURI, evidenceHash: item.evidenceHash,
    verified: item.verified, verifiedBy: item.verifiedBy,
    verifiedAt: item.verifiedAt ? new Date(Number(item.verifiedAt) * 1000).toLocaleString('fr-FR') : null,
  }
}

export async function verifyAntique(contract, tokenId) {
  const tx = await contract.verifyAntique(tokenId)
  const receipt = await tx.wait()
  if (receipt.status !== 1) throw new Error('La transaction a échoué.')
  return receipt.hash
}
