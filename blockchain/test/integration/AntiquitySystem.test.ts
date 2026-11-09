import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, parseEther, toBytes, zeroAddress } from "viem";
import AntiquitySystem from "../../ignition/modules/AntiquitySystem.js";

describe("AntiquitySystem end-to-end", async () => {
  const { ignition, viem } = await network.create();
  const [admin, registrar, expert, alice, bob, claire] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  it("registers, attests, transfers, declares a sale and rebuilds the full history", async () => {
    const { registry, transactions } = await ignition.deploy(AntiquitySystem);
    assert.equal(getAddress(await transactions.read.registry()), getAddress(registry.address));
    const as = async (walletClient: typeof admin) => ({
      registry: await viem.getContractAt("AntiquityRegistry", registry.address, { client: { wallet: walletClient } }),
      transactions: await viem.getContractAt("AntiquityTransactions", transactions.address, { client: { wallet: walletClient } }),
    });

    await registry.write.grantRole([await registry.read.REGISTRAR_ROLE(), registrar.account.address]);
    await registry.write.grantRole([await registry.read.EXPERT_ROLE(), expert.account.address]);
    await (await as(registrar)).registry.write.registerAntique([
      alice.account.address, "Amphore", "Grèce", "Antiquité", "ipfs://metadata-example",
      "ipfs://provenance-example", keccak256(toBytes("fictional evidence")),
    ]);
    await (await as(expert)).registry.write.verifyAntique([1n]);

    const byAlice = await as(alice);
    await byAlice.registry.write.approve([transactions.address, 1n]);
    await byAlice.transactions.write.transferAntique([1n, bob.account.address]);
    assert.equal(getAddress(await registry.read.ownerOf([1n])), getAddress(bob.account.address));

    const byBob = await as(bob);
    const saleHash = keccak256(toBytes("fictional sale contract Bob -> Claire"));
    await byBob.registry.write.approve([transactions.address, 1n]);
    await byBob.transactions.write.declareSaleAndTransfer([1n, claire.account.address, parseEther("0.5"), saleHash]);
    const byClaire = await as(claire);
    await byClaire.transactions.write.addProvenanceEvidence([1n, keccak256(toBytes("fictional transport report")), "ipfs://transport-example", "Transport report"]);

    // Direct ERC-721 transfer outside the Transactions module.
    await byClaire.registry.write.safeTransferFrom([claire.account.address, alice.account.address, 1n]);
    assert.equal(getAddress(await registry.read.ownerOf([1n])), getAddress(alice.account.address));

    const transfers = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "Transfer", args: { tokenId: 1n }, fromBlock: 0n });
    assert.deepEqual(
      transfers.map((event) => getAddress(event.args.to!)),
      [alice, bob, claire, alice].map((wallet) => getAddress(wallet.account.address)),
    );
    assert.equal(transfers[0].args.from, zeroAddress);

    const moduleTransfers = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "AntiquityTransferred", fromBlock: 0n });
    assert.equal(moduleTransfers.length, 2);
    const sales = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "SaleDeclared", fromBlock: 0n });
    assert.equal(sales.length, 1);
    assert.equal(sales[0].args.declaredPriceWei, parseEther("0.5"));
    assert.equal(sales[0].transactionHash, transfers[2].transactionHash);
    const proofs = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "ProvenanceEvidenceAdded", fromBlock: 0n });
    assert.equal(proofs.length, 1);
    assert.equal((await registry.read.getAntique([1n])).verified, true);
  });
});
