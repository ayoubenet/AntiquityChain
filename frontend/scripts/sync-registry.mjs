import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const artifactPath = path.join(root, "blockchain/artifacts/contracts/AntiquityRegistry.sol/AntiquityRegistry.json");
const outputPath = path.join(root, "frontend/src/generated/registryAbi.json");
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact.abi, null, 2)}\n`);
console.log("Registry ABI synchronized from Hardhat artifact");
