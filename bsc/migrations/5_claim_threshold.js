const BinancePool = artifacts.require("BinancePool");
const BinancePool_R2 = artifacts.require("BinancePool_R2");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const existing = await BinancePool.deployed();
    const globalPool = await upgradeProxy(existing.address, BinancePool_R2, {deployer});
    let burnAmount = '0';
    if (deployer.network === 'smartchain') {
        burnAmount = '466000000000000';
    }
    const claimableFeeBalance = await globalPool.claimableFeeBalance();
    console.log(`Going to burn ${burnAmount} fee from ${claimableFeeBalance}`);
    await globalPool.burnCollectedFee(burnAmount);
};