const BinancePool = artifacts.require("BinancePool");
const BinancePool_R1 = artifacts.require("BinancePool_R1");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const existing = await BinancePool.deployed();
    await upgradeProxy(existing.address, BinancePool_R1, { deployer });
};