import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toBytes, zeroAddress } from "viem";

describe("AntiquityRegistry", async () => {
  const { viem } = await network.create();
  const [admin, registrar, expert, owner, visitor, buyer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();
  const evidenceHash = keccak256(toBytes("fictional provenance dossier v1"));
  const details = [
    owner.account.address,
    "Amphore",
    "Greece (declared)",
    "Classical (declared)",
    "ipfs://metadata-example",
    "ipfs://provenance-example",
    evidenceHash,
  ] as const;

  async function setup() {
    const registry = await viem.deployContract("AntiquityRegistry");
    const as = async (walletClient: typeof admin) =>
      viem.getContractAt("AntiquityRegistry", registry.address, { client: { wallet: walletClient } });
    return { registry, as };
  }

  it("assigns the initial roles and exposes ERC-721 identity", async () => {
    const { registry } = await setup();
    assert.equal(await registry.read.name(), "AntiquityChain");
    assert.equal(await registry.read.symbol(), "ANTQ");
    for (const role of [
      await registry.read.DEFAULT_ADMIN_ROLE(),
      await registry.read.REGISTRAR_ROLE(),
      await registry.read.EXPERT_ROLE(),
    ]) {
      assert.equal(await registry.read.hasRole([role, admin.account.address]), true);
    }
    assert.equal(await registry.read.supportsInterface(["0x80ac58cd"]), true);
  });

  it("mints distinct IDs, retains the original dossier and emits registration and mint events", async () => {
    const { registry } = await setup();
    const first = await registry.write.registerAntique(details);
    const second = await registry.write.registerAntique(details);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: first });
    assert.equal(receipt.status, "success");
    const registered = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "AntiqueRegistered", fromBlock: 0n });
    assert.deepEqual(registered.map((event) => event.args.tokenId), [1n, 2n]);
    assert.equal(registered[0].args.initialOwner?.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(registered[0].args.evidenceHash, evidenceHash);
    const transfers = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "Transfer", fromBlock: 0n });
    assert.deepEqual(transfers.map((event) => event.args.tokenId), [1n, 2n]);
    assert.equal(transfers[0].args.from, zeroAddress);
    assert.equal((await registry.read.ownerOf([1n])).toLowerCase(), owner.account.address.toLowerCase());
    assert.equal((await registry.read.ownerOf([2n])).toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(await registry.read.tokenURI([1n]), details[4]);
    const antique = await registry.read.getAntique([1n]);
    assert.equal(antique.name, details[1]);
    assert.equal(antique.origin, details[2]);
    assert.equal(antique.period, details[3]);
    assert.equal(antique.provenanceURI, details[5]);
    assert.equal(antique.evidenceHash, evidenceHash);
    assert.equal(antique.verified, false);
    assert.equal(antique.verifiedBy, zeroAddress);
    assert.equal(antique.verifiedAt, 0n);
    await publicClient.waitForTransactionReceipt({ hash: second });
  });

  it("restricts registration and rejects missing data", async () => {
    const { registry, as } = await setup();
    const outsider = await as(visitor);
    await assert.rejects(outsider.write.registerAntique(details));
    await registry.write.grantRole([await registry.read.REGISTRAR_ROLE(), registrar.account.address]);
    const authorized = await as(registrar);
    await authorized.write.registerAntique(details);
    assert.equal((await registry.read.ownerOf([1n])).toLowerCase(), owner.account.address.toLowerCase());
    await assert.rejects(registry.write.registerAntique([zeroAddress, details[1], details[2], details[3], details[4], details[5], details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], "", details[2], details[3], details[4], details[5], details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], details[1], "", details[3], details[4], details[5], details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], details[1], details[2], "", details[4], details[5], details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], details[1], details[2], details[3], "", details[5], details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], details[1], details[2], details[3], details[4], "", details[6]]));
    await assert.rejects(registry.write.registerAntique([details[0], details[1], details[2], details[3], details[4], details[5], `0x${"00".repeat(32)}`]));
    await assert.rejects(registry.read.getAntique([999n]));
    await assert.rejects(registry.read.ownerOf([999n]));
  });

  it("records one attributable expert attestation and respects role revocation", async () => {
    const { registry, as } = await setup();
    await registry.write.registerAntique(details);
    const outsider = await as(visitor);
    await assert.rejects(outsider.write.verifyAntique([1n]));
    await registry.write.grantRole([await registry.read.EXPERT_ROLE(), expert.account.address]);
    const specialist = await as(expert);
    await specialist.write.verifyAntique([1n]);
    const antique = await registry.read.getAntique([1n]);
    assert.equal(antique.verified, true);
    assert.equal(antique.verifiedBy.toLowerCase(), expert.account.address.toLowerCase());
    assert.ok(antique.verifiedAt > 0n);
    const events = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "AntiqueVerified", fromBlock: 0n });
    assert.equal(events.length, 1);
    assert.equal(events[0].args.tokenId, 1n);
    assert.equal(events[0].args.expert?.toLowerCase(), expert.account.address.toLowerCase());
    await assert.rejects(specialist.write.verifyAntique([1n]));
    await assert.rejects(specialist.write.verifyAntique([999n]));
    await registry.write.registerAntique(details);
    await registry.write.revokeRole([await registry.read.EXPERT_ROLE(), expert.account.address]);
    await assert.rejects(specialist.write.verifyAntique([2n]));
  });

  it("uses standard ERC-721 approval and transfer rules", async () => {
    const { registry, as } = await setup();
    await registry.write.registerAntique(details);
    const outsider = await as(visitor);
    await assert.rejects(outsider.write.safeTransferFrom([owner.account.address, buyer.account.address, 1n]));
    const owned = await as(owner);
    await owned.write.approve([visitor.account.address, 1n]);
    assert.equal((await registry.read.getApproved([1n])).toLowerCase(), visitor.account.address.toLowerCase());
    await outsider.write.safeTransferFrom([owner.account.address, buyer.account.address, 1n]);
    assert.equal((await registry.read.ownerOf([1n])).toLowerCase(), buyer.account.address.toLowerCase());
    const transfers = await publicClient.getContractEvents({ address: registry.address, abi: registry.abi, eventName: "Transfer", fromBlock: 0n });
    assert.equal(transfers.length, 2);
    assert.equal(transfers[1].args.from?.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(transfers[1].args.to?.toLowerCase(), buyer.account.address.toLowerCase());
  });
});
