const BinancePool = artifacts.require("BinancePool_R6");

module.exports = async (deployer) => {
    /*const binancePool = await BinancePool.deployed();
    if (deployer.network === 'smartchain') {
        let aEthRewards = await binancePool.claimableAETHRewardOf('0x2d25e050fCf2551a9e78bDcF6d6FD0483d3f5211');
        console.log(`Current aETH rewards: ${aEthRewards}`);
        await binancePool.burnAethRewards('0x2d25e050fCf2551a9e78bDcF6d6FD0483d3f5211', '10900000000000000000');
        aEthRewards = await binancePool.claimableAETHRewardOf('0x2d25e050fCf2551a9e78bDcF6d6FD0483d3f5211');
        console.log(`New aETH rewards: ${aEthRewards}`);
    }*/
};
