const BinancePool = artifacts.require("BinancePool_R7")
const AETH = artifacts.require("AETH_R1")

contract("Binance Pool", function (accounts) {
    let globalPool, pegETH, aETH, owner, staker, intermediary;

    before(async function () {
        owner = accounts[0];
        staker = accounts[1];
        intermediary = accounts[2];
        /* peg-eth */
        pegETH = await AETH.new();
        await pegETH.initialize(owner);
        /* aETH */
        aETH = await AETH.new();
        await aETH.initialize(owner);
        /* global pool */
        globalPool = await BinancePool.new();
        globalPool.initialize(pegETH.address, owner)
        /* init */
        await aETH.updateRatio('1000000000000000000');
        await globalPool.changeAethContract(aETH.address);
        /* mint */
        await pegETH.mint(owner, '100000000000000000000');
        await pegETH.mint(staker, '100000000000000000000');
    });

    it("user can stake Peg-ETH", async () => {
        await pegETH.approve(globalPool.address, '100000000000000000', {from: owner});
        const {logs} = await globalPool.stake('100000000000000000', {from: owner});
        assert.equal(logs[0].event, 'StakePending');
        assert.equal(logs[0].args['staker'], owner);
        assert.equal(logs[0].args['amount'].toString(10), '100000000000000000');
        assert.equal(logs[1].event, 'StakeConfirmed');
        assert.equal(logs[1].args['staker'], owner);
        assert.equal(logs[1].args['amount'].toString(10), '100000000000000000');
        const pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'].length, pendingStakes['1'].length);
        assert.equal(pendingStakes['0'].length, 1);
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0], '100000000000000000');
    });

    it("intermediary can claim funds", async () => {
        await pegETH.approve(globalPool.address, '100000000000000000', {from: owner});
        await globalPool.stake('100000000000000000', {from: owner});
        await pegETH.approve(globalPool.address, '100000000000000000', {from: staker});
        await globalPool.stake('100000000000000000', {from: staker});
        let pendingStakes = await globalPool.getRawPendingStakes()
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][0].toString(10), '200000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '100000000000000000');
        // lets claim only 0.1 from 0.3 total staked (0.2 left)
        let tx = await globalPool.claimToIntermediary(owner, '0', '100000000000000000');
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers[0], owner);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '100000000');
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][0].toString(10), '100000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '100000000000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][0].toString(10), '100000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '100000000000000000');
        let currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
        // lets claim only 0.1 from 0.2 total staked (0.1 left)
        tx = await globalPool.claimToIntermediary(owner, '0', '100000000000000000');
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers[0], owner);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '100000000');
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][0].toString(10), '0');
        assert.equal(pendingStakes['1'][1].toString(10), '100000000000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], staker);
        assert.equal(pendingStakes['1'][0].toString(10), '100000000000000000');
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 1);
        await globalPool.resetPendingGap();
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
        await globalPool.calcPendingGap();
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 1);
        // lets claim reset 0.1 from 0.1 (queue should be empty)
        tx = await globalPool.claimToIntermediary(owner, '0', '100000000000000000');
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers.length, 1); // should be 1 because we include previous gap
        assert.equal(tx.logs['0'].args.amounts.length, 1);
        assert.equal(tx.logs['0'].args.stakers[0], staker);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '100000000');
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'].length, 0);
        assert.equal(pendingStakes['1'].length, 0);
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
    });

    it("pending stakes are well calculated", async () => {
        await pegETH.approve(globalPool.address, '200000000000000000', {from: owner});
        await globalPool.stake('200000000000000000', {from: owner});
        // lets claim 0.1 from pool
        let pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '200000000000000000');
        await globalPool.claimToIntermediary(owner, '0', '100000000000000000');
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '100000000000000000');
        // lets stake 0.1 more from another user
        await pegETH.approve(globalPool.address, '100000000000000000', {from: staker});
        await globalPool.stake('100000000000000000', {from: staker});
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '100000000000000000');
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][1].toString(10), '100000000000000000');
        // lets claim 0.1 more
        await globalPool.claimToIntermediary(owner, '0', '200000000000000000');
        pendingStakes = await globalPool.getRawPendingStakes();
        assert.equal(pendingStakes['0'].length, 0);
        assert.equal(pendingStakes['1'].length, 0);
    });

    it("fee can be greater than claimable", async () => {
        await pegETH.approve(globalPool.address, '100150000000000000', {from: staker});
        await globalPool.stake('100150000000000000', {from: staker});
        // lets claim 0.1 from pool
        const tx = await globalPool.claimToIntermediary(intermediary, '150000000000000', '12000000000000000000');
        console.log(tx);
        console.log(JSON.stringify(tx.logs, null, 2));
    });

    it("should not fail", async () => {
        await pegETH.mint(globalPool.address, '14620000000000000000');
        await globalPool.initState([
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x0000000000000000000000000000000000000000',
            '0x8240C103e4c7204A4D6228034F34C02f70b24E30',
            '0x7Df816f8560FcF350eA3e062AF6CE63abEDde540',
            '0x7565870388D5e3E27B60B951516331dCfAfbcf47',
            '0xbae3BAD311A211DBc19C14a5D2995a9a4741abc7',
            '0x464715AD9720c3CAc220Ab56fd656ef75A852813',
            '0x34D3de07db54F30192FA5fEeD31e954d2655FFe2',
            '0x5FE96748B9F9F6DF3b7f8C71Cbd6B62E12997Be2',
            '0x0dc8fcad7b435DA1eA5C6Ebc4AD3ea14DecD2e0b',
            '0xE12050Ce2D262254452726E0d73AD86C1ca4e555',
            '0x592e1E16016C25651513591B7eBed5ca803ad39e',
            '0x6e10Fc64cDf757ca75C32046fa6B6c6f4D87a742',
            '0x9F2aA42dB07E691420e5C9B6B5461B4Edc9B273C',
            '0xF51d00bc1069f5b6036dC3eA422a10f9b290275D',
            '0x7444F0765A758B3BDD82447e95EfB192C9e431fD',
            '0x175256F85A43d02a252C3e2b953fA8EfDFF9972B',
            '0x4aCa4103C5881E64BbA01fED10e450ae2457C658',
            '0x8777a578C8c0690f1bA52062eD650dF35985758C',
            '0x32EF8DaF43b0A738B22C930F3FDB99DEDAD23a21',
            '0x0525919467fA1A84074646aF4d59dd7Db35fa671',
            '0x1415D6586E2dD9Cd5cfE3ff0C086c26356DB888e',
            '0xE5a381D7881542Ce8Cf46d5CD29D1677115281FD',
            '0xB86603D7D4ae0abea7221E4aD16d5Aa815cCEf82',
            '0x4a849b8d8285dfBA8965c2e3d30bE5Fd8FbC63b6',
            '0x3d99E23aB4Bf6A71e65E1Cbf78D394bDe5E2ABA3'
        ], [
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '0',
            '500000000000000000',
            '19800000000000000000',
            '900000000000000000',
            '3200000000000000000',
            '1000000000000000000',
            '3500000000000000000',
            '100000000000000000',
            '400000000000000000',
            '100000000000000000',
            '2000000000000000000',
            '900000000000000000',
            '100000000000000000',
            '100000000000000000',
            '1000000000000000000',
            '5500000000000000000',
            '800000000000000000',
            '2100000000000000000',
            '2900000000000000000',
            '100000000000000000',
            '400000000000000000',
            '2000000000000000000',
            '900000000000000000',
            '72700000000000000000',
            '4900000000000000000'
        ], '18', '88745619435499027');
        const tx = await globalPool.claimToIntermediary(
          '0xcabd85f6c78faf4760e18da331c4fea74a25dea7',
          '0x000000000000000000000000000000000000000000000000003ffe0fda13549a',
          '0x000000000000000000000000000000000000000000000000a688906bd8b00000',
          {gas: 300_000}
        );
        assert.equal(tx.logs[0].event, 'IntermediaryClaimed');
        assert.equal(tx.logs[0].args['stakers'][0], '0x8240C103e4c7204A4D6228034F34C02f70b24E30');
        assert.equal(tx.logs[0].args['stakers'][1], '0x7Df816f8560FcF350eA3e062AF6CE63abEDde540');
        assert.equal(tx.logs[0].args['amounts'][0].toString(10), '500000000');
        assert.equal(tx.logs[0].args['amounts'][1].toString(10), '11500000000');
        const totalPendingStakes = await globalPool.countPendingStakesUnderThreshold();
        const pendingStakes = await globalPool.getPendingStakes();
        const rawPendingStakes = await globalPool.getRawPendingStakes();
        console.log(`~~~~~~~~~~~~~~~~~`);
        console.log(pendingStakes);
        console.log(`~~~~~~~~~~~~~~~~~`);
        console.log(rawPendingStakes);
        console.log(`~~~~~~~~~~~~~~~~~`);
        console.log(totalPendingStakes);
    });
});
