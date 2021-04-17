const BinancePool = artifacts.require("BinancePool");
const BinancePool_R3 = artifacts.require("BinancePool_R3");

const AETH = artifacts.require("AETH");
const AETH_R1 = artifacts.require("AETH_R1");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const globalPool = await BinancePool_R3.deployed(),
        aETH = await AETH_R1.deployed();
    const {'0': stakers, '1': amounts} = await globalPool.getPendingStakes();
    if (stakers.length !== amounts.length) {
        throw new Error(`Incorrect staker and amount lengths`)
    }
    console.log(`Pending Stakers: ${stakers}`);
    console.log(`Pending Amounts: ${amounts}`);
    const ratio = await aETH.ratio();
    console.log(`Global Ratio: ${ratio}`);
    await globalPool.confirmPendingStakes();
};