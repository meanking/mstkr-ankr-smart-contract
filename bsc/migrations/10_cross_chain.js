const AETH_R1 = artifacts.require("AETH_R1");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const aETH = await AETH_R1.deployed();
    let crossChainAddress;
    switch (deployer.network) {
        case 'smartchaintestnet':
        case 'test':
            crossChainAddress = '0x6447209080359F3d2a61A8B056CDbD23D9dCCb9E';
            break;
        default:
            console.warn(`Not supported chain ${deployer.network}`);
    }
    if (crossChainAddress) {
        await aETH.changeCrossChainBridge(crossChainAddress);
    }
};