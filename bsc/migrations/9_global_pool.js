const BinancePool = artifacts.require("BinancePool");
const BinancePool_R5 = artifacts.require("BinancePool_R5");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const prevGlobalPool = await BinancePool.deployed();
    await upgradeProxy(prevGlobalPool.address, BinancePool_R5, {deployer});
};