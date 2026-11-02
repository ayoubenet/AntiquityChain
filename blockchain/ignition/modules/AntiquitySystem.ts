import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AntiquitySystem", (m) => {
  const registry = m.contract("AntiquityRegistry");
  const transactions = m.contract("AntiquityTransactions", [registry]);
  return { registry, transactions };
});
