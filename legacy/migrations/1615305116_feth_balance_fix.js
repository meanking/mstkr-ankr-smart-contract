const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");

const FETH = artifacts.require("FETH");
const FETH_R3 = artifacts.require("FETH_R3");

module.exports = async function(deployer) {
  let feth = await FETH.deployed();
  const upgraded = await upgradeProxy(feth.address, FETH_R3, { deployer });
  if (deployer.network === 'mainnet') {
    await upgraded.decreaseUserShares('0xb11b0d8d021442c3840fda5172ac888a7e258be2', '999999999999999998000000000000000001');
  }
};
