const Governance_R1 = artifacts.require("Governance_R1")
const AETH = artifacts.require("AETH")
const GlobalPool = artifacts.require("GlobalPool")
const GlobalPool_R30 = artifacts.require("GlobalPool_R30")
const ANKR = artifacts.require("ANKR")

const { deployProxy, upgradeProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
  if (deployer.network !== "goerli") {
    return
  }
  const globalPool = await upgradeProxy((await GlobalPool.deployed()).address, GlobalPool_R30, { deployer });
  const ankr = await ANKR.deployed();
  const aeth = await AETH.deployed()
  if (Boolean(await globalPool.isPaused(web3.utils.fromAscii('topUpANKR'))))
    await globalPool.togglePause(web3.utils.fromAscii('topUpANKR'))
  const governance = await deployProxy(Governance_R1, [ankr.address, globalPool.address, aeth.address], { deployer })
  const currentOwner = await globalPool.owner();
  console.log(`Global Pool Owner: ${currentOwner}`);
  console.log(`Global Pool Address: ${globalPool.address}`);
  console.log(`Setting config contract`);
  await globalPool.updateConfigContract(governance.address)
  console.log(`Setting staking contract`);
  await globalPool.updateStakingContract(governance.address)
  console.log(`Changing operator`);
  await governance.changeOperator("0x100dd6c27454cb1DAdd1391214A344C6208A8C80")
};
