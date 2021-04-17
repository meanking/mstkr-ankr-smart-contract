const BinancePool = artifacts.require("BinancePool");
const BinancePool_R4 = artifacts.require("BinancePool_R4");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const prevGlobalPool = await BinancePool.deployed();
    const globalPool = await upgradeProxy(prevGlobalPool.address, BinancePool_R4, {deployer});
    if (deployer.network === 'smartchain') {
        //await globalPool.burnAethRewards('0x2ffc59d32a524611bb891cab759112a51f9e33c0', '4000000000000000000');
    }
    await globalPool.confirmPendingStakes();
};