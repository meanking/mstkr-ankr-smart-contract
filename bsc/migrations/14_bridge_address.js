const AETH_R1 = artifacts.require("AETH_R1");

const {upgradeProxy} = require("@openzeppelin/truffle-upgrades");

module.exports = async (deployer) => {
    const aETH = await AETH_R1.deployed();
    let crossChainAddress;
    switch (deployer.network) {
        case 'smartchaintestnet':
        case 'test':
            crossChainAddress = '0x61b06Bc2D44C419C8746533adfD34CFaF2897114';
            break;
        case 'smartchain':
            crossChainAddress = '0x4436E53e73B001aFfa7eDe6f7E8894EFcf466F15';
            break;
        default:
            throw new Error(`Not supported chain ${deployer.network}`);
    }
    if (crossChainAddress) {
        await aETH.changeCrossChainBridge(crossChainAddress);
    }
};
