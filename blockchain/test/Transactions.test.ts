import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, parseEther, toBytes, zeroAddress, zeroHash } from "viem";

describe("AntiquityTransactions", async () => {
  const { viem } = await network.create();
  const [admin, alice, bob, claire, attacker] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const evidenceHash = keccak256(toBytes("fictional provenance dossier v1"));
  const saleHash = keccak256(toBytes("fictional sale contract Alice -> Bob"));
  const price = parseEther("0.5");
  const details = [
    alice.account.address,
    "Amphore",
    "Greece (declared)",
    "Classical (declared)",
    "ipfs://metadata-example",
    "ipfs://provenance-example",
    evidenceHash,
  ] as const;

  async function setup() {
    const registry = await viem.deployContract("AntiquityRegistry");
    const transactions = await viem.deployContract("AntiquityTransactions", [registry.address]);
    await registry.write.registerAntique(details);
    const as = async (walletClient: typeof admin) => ({
      registry: await viem.getContractAt("AntiquityRegistry", registry.address, { client: { wallet: walletClient } }),
      transactions: await viem.getContractAt("AntiquityTransactions", transactions.address, { client: { wallet: walletClient } }),
    });
    const ownerOf = async (tokenId = 1n) => getAddress(await registry.read.ownerOf([tokenId]));
    return { registry, transactions, as, ownerOf };
  }

  async function approvedByAlice() {
    const context = await setup();
    const byAlice = await context.as(alice);
    await byAlice.registry.write.approve([context.transactions.address, 1n]);
    return { ...context, byAlice };
  }

  describe("deployment", () => {
    it("TX-01 links the Registry given to the constructor", async () => {
      const { registry, transactions } = await setup();
      assert.equal(getAddress(await transactions.read.registry()), getAddress(registry.address));
    });

    it("TX-02 rejects the zero address and an EOA as Registry", async () => {
      await assert.rejects(viem.deployContract("AntiquityTransactions", [zeroAddress]), /Registry must be a contract/);
      await assert.rejects(viem.deployContract("AntiquityTransactions", [alice.account.address]), /Registry must be a contract/);
    });
  });

  describe("transferAntique", () => {
    it("TX-03 TX-09 TX-10 transfers an approved token and emits both events", async () => {
      const { registry, transactions, byAlice, ownerOf } = await approvedByAlice();
      assert.equal(await ownerOf(), getAddress(alice.account.address));
      const hash = byAlice.transactions.write.transferAntique([1n, bob.account.address]);
      await viem.assertions.emitWithArgs(hash, transactions, "AntiquityTransferred", [
        1n, getAddress(alice.account.address), getAddress(bob.account.address), getAddress(alice.account.address),
      ]);
      assert.equal(await ownerOf(), getAddress(bob.account.address));
      const transfers = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "Transfer", fromBlock: 0n });
      assert.equal(transfers.length, 2);
      assert.equal(getAddress(transfers[1].args.from!), getAddress(alice.account.address));
      assert.equal(getAddress(transfers[1].args.to!), getAddress(bob.account.address));
      assert.equal(transfers[1].args.tokenId, 1n);
    });

    it("TX-04 refuses a transfer without approval", async () => {
      const { as, ownerOf } = await setup();
      const byAlice = await as(alice);
      await viem.assertions.revertWith(byAlice.transactions.write.transferAntique([1n, bob.account.address]), "Approve Transactions first");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-05 refuses a caller who is not the owner, even when the contract is approved", async () => {
      const { as, ownerOf } = await approvedByAlice();
      const byAttacker = await as(attacker);
      await viem.assertions.revertWith(byAttacker.transactions.write.transferAntique([1n, claire.account.address]), "Not token owner");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-06 refuses the zero address as recipient", async () => {
      const { byAlice, ownerOf } = await approvedByAlice();
      await viem.assertions.revertWith(byAlice.transactions.write.transferAntique([1n, zeroAddress]), "Invalid recipient");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-07 refuses a transfer to the current owner", async () => {
      const { byAlice } = await approvedByAlice();
      await viem.assertions.revertWith(byAlice.transactions.write.transferAntique([1n, alice.account.address]), "Already owner");
    });

    it("TX-08 refuses an unknown token", async () => {
      const { registry, byAlice } = await approvedByAlice();
      await viem.assertions.revertWithCustomError(
        byAlice.transactions.write.transferAntique([999n, bob.account.address]), registry, "ERC721NonexistentToken",
      );
    });

    it("TX-11 records a direct Registry transfer only in Registry.Transfer", async () => {
      const { registry, transactions, as, ownerOf } = await setup();
      const byAlice = await as(alice);
      await byAlice.registry.write.safeTransferFrom([alice.account.address, bob.account.address, 1n]);
      assert.equal(await ownerOf(), getAddress(bob.account.address));
      const transfers = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "Transfer", fromBlock: 0n });
      assert.equal(transfers.length, 2);
      const moduleTransfers = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "AntiquityTransferred", fromBlock: 0n });
      assert.equal(moduleTransfers.length, 0);
    });

    it("TX-12 clears the single-token approval after the transfer", async () => {
      const { registry, byAlice, as } = await approvedByAlice();
      await byAlice.transactions.write.transferAntique([1n, bob.account.address]);
      assert.equal(await registry.read.getApproved([1n]), zeroAddress);
      const byBob = await as(bob);
      await viem.assertions.revertWith(byBob.transactions.write.transferAntique([1n, claire.account.address]), "Approve Transactions first");
    });

    it("accepts an existing setApprovalForAll", async () => {
      const { as, ownerOf, transactions } = await setup();
      const byAlice = await as(alice);
      await byAlice.registry.write.setApprovalForAll([transactions.address, true]);
      await byAlice.transactions.write.transferAntique([1n, bob.account.address]);
      assert.equal(await ownerOf(), getAddress(bob.account.address));
    });
  });

  describe("declareSaleAndTransfer", () => {
    it("TX-13 transfers the token and emits SaleDeclared without moving ether", async () => {
      const { transactions, byAlice, ownerOf } = await approvedByAlice();
      const before = await publicClient.getBalance({ address: bob.account.address });
      const hash = byAlice.transactions.write.declareSaleAndTransfer([1n, bob.account.address, price, saleHash]);
      await viem.assertions.emitWithArgs(hash, transactions, "SaleDeclared", [
        1n, getAddress(alice.account.address), getAddress(bob.account.address), price, saleHash,
      ]);
      assert.equal(await ownerOf(), getAddress(bob.account.address));
      assert.equal(await publicClient.getBalance({ address: bob.account.address }), before);
      assert.equal(await publicClient.getBalance({ address: transactions.address }), 0n);
    });

    it("TX-14 refuses a zero declared price", async () => {
      const { byAlice, ownerOf } = await approvedByAlice();
      await viem.assertions.revertWith(byAlice.transactions.write.declareSaleAndTransfer([1n, bob.account.address, 0n, saleHash]), "Price must be positive");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-15 refuses a missing sale document hash", async () => {
      const { byAlice, ownerOf } = await approvedByAlice();
      await viem.assertions.revertWith(byAlice.transactions.write.declareSaleAndTransfer([1n, bob.account.address, price, zeroHash]), "Missing sale proof");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-16 keeps no SaleDeclared event when the transfer fails", async () => {
      const { transactions, as, ownerOf } = await setup();
      const byAlice = await as(alice);
      await viem.assertions.revertWith(byAlice.transactions.write.declareSaleAndTransfer([1n, bob.account.address, price, saleHash]), "Approve Transactions first");
      const sales = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "SaleDeclared", fromBlock: 0n });
      assert.equal(sales.length, 0);
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });
  });

  describe("addProvenanceEvidence", () => {
    const proof = keccak256(toBytes("fictional conservation report 2026"));

    it("TX-17 lets the current owner append evidence", async () => {
      const { transactions, as } = await setup();
      const byAlice = await as(alice);
      await viem.assertions.emitWithArgs(
        byAlice.transactions.write.addProvenanceEvidence([1n, proof, "ipfs://report-example", "Conservation report"]),
        transactions, "ProvenanceEvidenceAdded",
        [1n, getAddress(alice.account.address), proof, "ipfs://report-example", "Conservation report"],
      );
      await byAlice.transactions.write.addProvenanceEvidence([1n, proof, "ipfs://report-example-2", "Exhibition certificate"]);
      const events = await publicClient.getContractEvents({ address: transactions.address, abi: transactions.abi, eventName: "ProvenanceEvidenceAdded", fromBlock: 0n });
      assert.deepEqual(events.map((event) => event.args.description), ["Conservation report", "Exhibition certificate"]);
    });

    it("TX-18 refuses evidence from a non-owner", async () => {
      const { as } = await setup();
      const byAttacker = await as(attacker);
      await viem.assertions.revertWith(byAttacker.transactions.write.addProvenanceEvidence([1n, proof, "ipfs://fake", "Fake"]), "Not token owner");
    });

    it("TX-19 refuses an empty hash or URI", async () => {
      const { as } = await setup();
      const byAlice = await as(alice);
      await viem.assertions.revertWith(byAlice.transactions.write.addProvenanceEvidence([1n, zeroHash, "ipfs://report", "Report"]), "Missing evidence hash");
      await viem.assertions.revertWith(byAlice.transactions.write.addProvenanceEvidence([1n, proof, "", "Report"]), "Missing evidence URI");
    });
  });

  describe("history and recipients", () => {
    it("TX-20 keeps a complete, chronological Transfer history across module and direct transfers", async () => {
      const { registry, transactions, as, ownerOf } = await setup();
      const byAlice = await as(alice);
      const byBob = await as(bob);
      const byClaire = await as(claire);
      await byAlice.registry.write.approve([transactions.address, 1n]);
      await byAlice.transactions.write.transferAntique([1n, bob.account.address]);
      await byBob.registry.write.approve([transactions.address, 1n]);
      await byBob.transactions.write.declareSaleAndTransfer([1n, claire.account.address, price, saleHash]);
      await byClaire.registry.write.safeTransferFrom([claire.account.address, alice.account.address, 1n]);

      const transfers = await publicClient.getContractEvents({
        address: registry.address, abi: registry.abi, eventName: "Transfer", args: { tokenId: 1n }, fromBlock: 0n,
      });
      assert.deepEqual(
        transfers.map((event) => [getAddress(event.args.from!), getAddress(event.args.to!)]),
        [
          [zeroAddress, alice.account.address],
          [alice.account.address, bob.account.address],
          [bob.account.address, claire.account.address],
          [claire.account.address, alice.account.address],
        ].map(([from, to]) => [getAddress(from), getAddress(to)]),
      );
      const blocks = transfers.map((event) => event.blockNumber);
      assert.deepEqual(blocks, [...blocks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-21 fails atomically for a contract recipient without onERC721Received", async () => {
      const { registry, byAlice, ownerOf } = await approvedByAlice();
      const sink = await viem.deployContract("NonReceiverMock");
      await viem.assertions.revertWithCustomError(byAlice.transactions.write.transferAntique([1n, sink.address]), registry, "ERC721InvalidReceiver");
      assert.equal(await ownerOf(), getAddress(alice.account.address));
    });

    it("TX-22 transfers to a contract recipient that implements IERC721Receiver", async () => {
      const { byAlice, ownerOf } = await approvedByAlice();
      const receiver = await viem.deployContract("ERC721ReceiverMock");
      await byAlice.transactions.write.transferAntique([1n, receiver.address]);
      assert.equal(await ownerOf(), getAddress(receiver.address));
    });
  });
});
