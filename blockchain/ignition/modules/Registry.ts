import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RegistryModule", (m) => {
  const registry = m.contract("AntiquityRegistry");
  return { registry };
});
