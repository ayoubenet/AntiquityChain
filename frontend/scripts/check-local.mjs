import { readFile } from 'node:fs/promises'
import { ethers } from 'ethers'
import abi from '../src/generated/registryAbi.json' with { type: 'json' }

const deployments = JSON.parse(await readFile('../blockchain/ignition/deployments/chain-31337/deployed_addresses.json', 'utf8'))
const address = deployments['AntiquitySystem#AntiquityRegistry'] ?? deployments['RegistryModule#AntiquityRegistry']
const registry = new ethers.Contract(address, abi, new ethers.JsonRpcProvider('http://127.0.0.1:8545'))
const token = await registry.getAntique(1n)
console.log(JSON.stringify({ address, tokenId: '1', name: token.name, verified: token.verified, owner: await registry.ownerOf(1n) }, null, 2))
