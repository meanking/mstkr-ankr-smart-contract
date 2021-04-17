const AnkrAVAX = artifacts.require("AnkrAVAX");
const AvalanchePool = artifacts.require("AvalanchePool");

const {deployProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    let operatorAddress;
    switch (deployer.network) {
        case 'fujitestnetcchain':
        case 'test':
            operatorAddress = "0xaF769e24839761eD9422b8FfdE2dB006F0FaE165";
            break;
        case 'avalanchecchain':
            operatorAddress = "0x4069D8A3dE3A72EcA86CA5e0a4B94619085E7362";
            break;
        default: {
            throw new Error(`Not supported network (${deployer.network})`)
        }
    }
    await deployProxy(AnkrAVAX, [operatorAddress], {deployer});

    await deployProxy(AvalanchePool, [operatorAddress], {deployer});

    const pool = await AvalanchePool.deployed();
    const token = await AnkrAVAX.deployed();

    await pool.changeAnkrAvaxContract(token.address);
    await token.changeAvalanchePool(pool.address);
};