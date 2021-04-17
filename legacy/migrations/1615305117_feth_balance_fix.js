const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");

const FETH = artifacts.require("FETH");
const FETH_R4 = artifacts.require("FETH_R4");

module.exports = async function(deployer) {
  let feth = await FETH.deployed();
  const upgraded = await upgradeProxy(feth.address, FETH_R4, { deployer });
  if (deployer.network === 'mainnet') {
    await upgraded.increaseUserShares('0x3726e541B7b1c376c698aDC7a6536F7470D6a86E', '484375000000000000');
    await upgraded.increaseUserShares('0x4DC361759736AC636FfE2125096005CE7eB95Cd1', '5328125000000000000');
    await upgraded.increaseUserShares('0x9fa1b23dfaC9F5f6C8160D2A5e4Cd6e3F3958D89', '484375000000000000');
  }
};
