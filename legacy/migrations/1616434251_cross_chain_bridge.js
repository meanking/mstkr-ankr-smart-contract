const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");

const AETH = artifacts.require("AETH");
const AETH_R11 = artifacts.require("AETH_R11");
const FETH = artifacts.require("FETH_R2");

module.exports = async function(deployer, network, accounts) {
  const existing = await AETH.deployed();
  let crossChainBridge = "";
  switch (deployer.network) {
    case "test": {
      crossChainBridge = "0x8D3588C8c6091423CA31279DFE40892468Fc26cD";
      break;
    }
    case "goerli": {
      crossChainBridge = "0x8D3588C8c6091423CA31279DFE40892468Fc26cD";
      break;
    }
    case "mainnet": {
      crossChainBridge = "0xE7AC5115eEeedD1DD57649a4c7077a0F9D10B795";
      break;
    }
    default:
      throw new Error(`Not supported network: ${deployer.network}`);
  }
  console.log(`aETH proxy: ${existing.address}`);
  console.log(`aETH owner: ${await existing.owner()}`);
  const aeth = await upgradeProxy(existing.address, AETH_R11, { deployer });
  let feth = await FETH.deployed();
  const currentOwner = await aeth.owner();
  console.log(`Current aETH owner is: ${currentOwner}`);
  await aeth.setBscBridgeContract(crossChainBridge);
  if (await feth.owner() === "0x0000000000000000000000000000000000000000") await feth.setOwnership();
  await feth.setBscBridgeContract(crossChainBridge);
};
