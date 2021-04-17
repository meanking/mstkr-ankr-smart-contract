const BinancePool = artifacts.require("BinancePool");
const BinancePool_R6 = artifacts.require("BinancePool_R6");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const prevGlobalPool = await BinancePool.deployed();
    const binancePool = await upgradeProxy(prevGlobalPool.address, BinancePool_R6, {deployer});
    /* we must init pending gap */
    await binancePool.calcPendingGap();
};