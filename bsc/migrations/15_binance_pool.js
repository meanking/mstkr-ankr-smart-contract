const BinancePool = artifacts.require("BinancePool");
const BinancePool_R7 = artifacts.require("BinancePool_R7");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const prevGlobalPool = await BinancePool.deployed();
    const binancePool = await upgradeProxy(prevGlobalPool.address, BinancePool_R7, {deployer});
};
