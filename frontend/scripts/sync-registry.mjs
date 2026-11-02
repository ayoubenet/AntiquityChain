import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const contracts = { AntiquityRegistry: "registryAbi.json", AntiquityTransactions: "transactionsAbi.json" };
await mkdir(path.join(root, "frontend/src/generated"), { recursive: true });
for (const [name, output] of Object.entries(contracts)) {
  const artifactPath = path.join(root, `blockchain/artifacts/contracts/${name}.sol/${name}.json`);
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  await writeFile(path.join(root, "frontend/src/generated", output), `${JSON.stringify(artifact.abi, null, 2)}\n`);
}
console.log("Registry and Transactions ABIs synchronized from Hardhat artifacts");
