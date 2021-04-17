const CrossChainBridge = artifacts.require("CrossChainBridge")
const MintableToken = artifacts.require("MintableToken")

contract("CrossChainBridge", function (accounts) {
    let crossChain, owner, sender, recipient;

    let aEthToken, bEthToken, cEthToken, dEthToken;

    // 1337

    before(async function () {
        aEthToken = await MintableToken.new();
        aEthToken.initialize('Token A', 'aETH');
        bEthToken = await MintableToken.new();
        bEthToken.initialize('Token B', 'bETH');
        cEthToken = await MintableToken.new();
        cEthToken.initialize('Token C', 'cETH');
        dEthToken = await MintableToken.new();
        dEthToken.initialize('Token D', 'dETH');
        crossChain = await CrossChainBridge.new();
        crossChain.initialize("0x256e78f10eE9897bda1c36C30471A2b3c8aE5186")
        owner = accounts[0];
        sender = accounts[1];
        recipient = accounts[2];
        await aEthToken.mint(owner, '100000000000000000000');
        await aEthToken.mint(sender, '100000000000000000000');
        await bEthToken.mint(owner, '100000000000000000000');
        await bEthToken.mint(sender, '100000000000000000000');
    });

    it("token registration should work", async () => {
        const tx = await crossChain.registerBridge('1', aEthToken.address, bEthToken.address, '1338');
        assert.equal(tx.logs[0].event, 'BridgeRegistered');
        assert.equal(tx.logs[1].event, 'BridgeEnabled');
        let {'0': bridge, '1': index} = await crossChain.getBridgeBySourceAndTarget(aEthToken.address, bEthToken.address, '1337', '1338');
        assert.equal(index.toString(10), '1')
        assert.equal(`${bridge.bridgeStatus}`, '1')
        //assert.equal(`${bridge.bidgeType}`, '1')
        assert.equal(bridge.fromToken, aEthToken.address)
        assert.equal(bridge.toToken, bEthToken.address)
        assert.equal(bridge.fromChain, '1337')
        assert.equal(bridge.toChain, '1338')
    });

    it("can't register token with the same address", async () => {
        try {
            await crossChain.registerBridge('1', aEthToken.address, bEthToken.address, '1338');
            assert.fail()
        } catch (e) {
            assert.equal(e.message.includes('CrossChainBridge: this token is already registered'), true);
        }
    });

    it("can deposit funds", async () => {
        const allBridges = await crossChain.getAllBridges();
        console.log(`allBridges:`);
        console.log(allBridges);
        await aEthToken.approve(crossChain.address, '1000000000000000000', {
            from: sender,
        });
        const tx = await crossChain.deposit(aEthToken.address, bEthToken.address, '1338', recipient, '1000000000000000000', {
            from: sender,
        });
        console.log(`Locked A: ${await crossChain.lockedOf(aEthToken.address)}`);
        console.log(`Locked B: ${await crossChain.lockedOf(bEthToken.address)}`);
        console.log(`Minted A: ${await crossChain.mintedOf(aEthToken.address)}`);
        console.log(`Minted B: ${await crossChain.mintedOf(bEthToken.address)}`);
        console.log(tx);
        console.log(tx.logs);
    })

    it("can withdraw funds", async () => {
        var EC = require('elliptic').ec;
        var ec = new EC('secp256k1');
        let keyPair = ec.keyFromPrivate('5667c2a27bf6c4daf6091094009fa4f30a6573b45ec836704eb20d5f219ce778');
        const txHash = '0x002f6e276e6421b22967a8c1f7f7a8f4a9530a56d46220231d7fab4c22cbed98'
        const txDataToSign = await web3.utils.soliditySha3(
            crossChain.address,
            bEthToken.address,
            aEthToken.address,
            '1338',
            '1337',
            sender,
            recipient,
            '1000000000000000000',
            txHash,
        );
        let res = keyPair.sign(txDataToSign.substring(2));
        let signature = '0x' + Buffer.concat([
            res.r.toArrayLike(Buffer, 'be', 32),
            res.s.toArrayLike(Buffer, 'be', 32)
        ]).toString('hex') + (res.recoveryParam === 0 ? '1b' : '1c');
        const result = await crossChain.checkSignature(
                                      bEthToken.address,
                                      aEthToken.address,
                                      '1338',
                                      '1337',
                                      sender,
                                      recipient,
                                      '1000000000000000000',
                                      txHash,
                                      signature);
        assert.equal(result, '0x256e78f10eE9897bda1c36C30471A2b3c8aE5186');
        const {logs} = await crossChain.withdraw(bEthToken.address, aEthToken.address, '1338', sender, '1000000000000000000', txHash, signature,{
            from: recipient,
        });
        assert.equal(logs[0].event, 'CrossChainWithdraw');
        assert.equal(logs[0].args['fromToken'], bEthToken.address);
        assert.equal(logs[0].args['toToken'], aEthToken.address);
        assert.equal(logs[0].args['fromChain'], '1338');
        assert.equal(logs[0].args['toChain'], '1337');
        assert.equal(logs[0].args['fromAddress'], sender);
        assert.equal(logs[0].args['toAddress'], recipient);
        assert.equal(logs[0].args['withdrawAmount'].toString(10), '1000000000000000000');
        assert.equal(logs[0].args['depositTxHash'], txHash);
    })
});