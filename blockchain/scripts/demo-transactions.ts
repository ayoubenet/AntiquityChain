import { readFile } from "node:fs/promises";
import { network } from "hardhat";
import { getAddress, keccak256, parseEther, toBytes } from "viem";

// Run after `ignition deploy ignition/modules/AntiquitySystem.ts` and `scripts/demo.ts`:
// local account 3 owns token 1; it is transferred to account 4, then sold (declared) to account 5.
const { viem } = await network.create({ network: "localhost" });
const publicClient = await viem.getPublicClient();
const [, , , alice, bob, claire] = await viem.getWalletClients();
const deployments = JSON.parse(await readFile("ignition/deployments/chain-31337/deployed_addresses.json", "utf8"));
const registryAddress = deployments["AntiquitySystem#AntiquityRegistry"];
const transactionsAddress = deployments["AntiquitySystem#AntiquityTransactions"];
if (!registryAddress || !transactionsAddress) throw new Error("Deploy AntiquitySystem first");

const as = async (walletClient: typeof alice) => ({
  registry: await viem.getContractAt("AntiquityRegistry", registryAddress, { client: { wallet: walletClient } }),
  transactions: await viem.getContractAt("AntiquityTransactions", transactionsAddress, { client: { wallet: walletClient } }),
});
const wait = async (hash: `0x${string}`) => publicClient.waitForTransactionReceipt({ hash });
const tokenId = 1n;
const byAlice = await as(alice);
if (getAddress(await byAlice.registry.read.ownerOf([tokenId])) !== getAddress(alice.account.address)) {
  throw new Error("Token 1 must belong to local account 3: run scripts/demo.ts on a fresh deployment");
}

const saleDocumentHash = keccak256(toBytes("Contrat de vente fictif de démonstration"));
const steps = [
  await wait(await byAlice.registry.write.approve([transactionsAddress, tokenId])),
  await wait(await byAlice.transactions.write.transferAntique([tokenId, bob.account.address])),
];
const byBob = await as(bob);
steps.push(
  await wait(await byBob.registry.write.approve([transactionsAddress, tokenId])),
  await wait(await byBob.transactions.write.declareSaleAndTransfer([tokenId, claire.account.address, parseEther("0.5"), saleDocumentHash])),
);
const byClaire = await as(claire);
steps.push(await wait(await byClaire.transactions.write.addProvenanceEvidence([
  tokenId, keccak256(toBytes("Constat de transport fictif")), "ipfs://REMPLACER_PAR_UN_CID_REEL", "Constat de transport (démonstration)",
])));

console.log(JSON.stringify({
  registry: registryAddress, transactions: transactionsAddress, tokenId: tokenId.toString(),
  path: [alice.account.address, bob.account.address, claire.account.address],
  owner: await byAlice.registry.read.ownerOf([tokenId]), saleDocumentHash,
  transactionHashes: steps.map((receipt) => receipt.transactionHash),
}, null, 2));
