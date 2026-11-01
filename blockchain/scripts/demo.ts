import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { keccak256 } from "viem";

const { viem } = await network.create({ network: "localhost" });
const publicClient = await viem.getPublicClient();
const [admin, registrar, expert, owner] = await viem.getWalletClients();
const deployments = JSON.parse(await readFile("ignition/deployments/chain-31337/deployed_addresses.json", "utf8"));
const address = deployments["RegistryModule#AntiquityRegistry"];
if (!address) throw new Error("Deploy RegistryModule first");

const registry = await viem.getContractAt("AntiquityRegistry", address);
const byRegistrar = await viem.getContractAt("AntiquityRegistry", address, { client: { wallet: registrar } });
const byExpert = await viem.getContractAt("AntiquityRegistry", address, { client: { wallet: expert } });
await registry.write.grantRole([await registry.read.REGISTRAR_ROLE(), registrar.account.address]);
await registry.write.grantRole([await registry.read.EXPERT_ROLE(), expert.account.address]);

const evidence = await readFile(path.resolve("../docs/examples/evidence-1.txt"));
const evidenceHash = keccak256(evidence);
const ids: bigint[] = [];
for (const name of ["Amphore de démonstration", "Vase de démonstration"]) {
  const hash = await byRegistrar.write.registerAntique([
    owner.account.address, name, "Greece (declared)", "Classical (declared)",
    "ipfs://REMPLACER_PAR_UN_CID_REEL", "ipfs://REMPLACER_PAR_UN_CID_REEL", evidenceHash,
  ]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const events = await publicClient.getContractEvents({
    address, abi: registry.abi, eventName: "AntiqueRegistered",
    fromBlock: receipt.blockNumber, toBlock: receipt.blockNumber,
  });
  const id = events[0]?.args.tokenId;
  if (id === undefined) throw new Error("Registration event missing");
  ids.push(id);
}
await byExpert.write.verifyAntique([ids[0]]);
console.log(JSON.stringify({
  chainId: Number(await publicClient.getChainId()), registry: address,
  admin: admin.account.address, registrar: registrar.account.address,
  expert: expert.account.address, owner: owner.account.address,
  tokenIds: ids.map(String), evidenceHash,
}, null, 2));
