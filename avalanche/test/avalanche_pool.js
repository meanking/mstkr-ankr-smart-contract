const helpers = require("./helpers/helpers");
const AvalanchePool = artifacts.require("AvalanchePool")
const AnkrAVAX = artifacts.require("AnkrAVAX")

contract("Avalanche Pool", function (accounts) {
    let globalPool, ankrAVAX, owner, staker, staker2, staker3, intermediary;

    beforeEach(async function () {
        owner = accounts[0];
        staker = accounts[1];
        intermediary = accounts[2];
        staker2 = accounts[3];
        staker3 = accounts[4];
        /* ankrAVAX */
        ankrAVAX = await AnkrAVAX.new();
        await ankrAVAX.initialize(owner);
        /* global pool */
        globalPool = await AvalanchePool.new();
        globalPool.initialize(owner)
        /* init */
        await ankrAVAX.updateRatio('900000000000000000');
        await ankrAVAX.updateLastConfirmedRatio('950000000000000000');
        await globalPool.changeAnkrAvaxContract(ankrAVAX.address);
        await ankrAVAX.changeAvalanchePool(globalPool.address)
    });

    it("user can stake AVAX", async () => {
        const {logs} = await globalPool.stake({from: staker, value: helpers.wei(7)});
        assert.equal(logs[0].event, 'StakePending');
        assert.equal(logs[0].args['staker'], staker);
        assert.equal(logs[0].args['amount'].toString(10), '7000000000000000000');
        const pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'].length, pendingStakes['1'].length);
        assert.equal(pendingStakes['0'].length, 1);
        assert.equal(pendingStakes['0'][0], staker);
        assert.equal(pendingStakes['1'][0], '7000000000000000000');
    });

    it("user can claim ankrAVAX", async () => {
        await globalPool.stake({from: staker, value: helpers.wei(7)});
        let amount = await globalPool.claimableAnkrAVAXRewardOf(staker);
        assert.equal(amount.toString(10), '6300000000000000000')

        await globalPool.stake({from: staker, value: helpers.wei(6)});

        amount = await globalPool.claimableAnkrAVAXRewardOf(staker);
        assert.equal(amount.toString(10), '11700000000000000000' )

        const {logs} = await globalPool.claimAllAnkrAVAX({from: staker});
        assert.equal(logs[0].event, 'RewardClaimed');
        assert.equal(logs[0].args['staker'], staker);
        assert.equal(logs[0].args['amount'].toString(10), '11700000000000000000');

        assert(ankrAVAX.balanceOf(staker).toString(10), '11700000000000000000')

        amount = await globalPool.claimableAnkrAVAXRewardOf(staker);
        assert.equal(amount.toString(10), '0' )
    });

    it("get pending stakes is ONLY available for operator", async () => {
        const pendingStakes = await globalPool.getPendingStakes({from: owner});
        assert.equal(pendingStakes['0'].length, pendingStakes['1'].length);
        assert.equal(pendingStakes['0'].length, 0);
        await globalPool.getPendingStakes({from: staker})
            .then(assert.fail)
            .catch(function(error) {
                   assert.include(
                       error.message,
                       'Operator: not allowed'
                   )
            });
    });

    it("intermediary can claim funds", async () => {
        await globalPool.stake({from: staker, value: helpers.wei(10)});
        await globalPool.stake({from: staker, value: helpers.wei(15)});
        await globalPool.stake({from: staker2, value: helpers.wei(20)});
        let pendingStakes = await globalPool.getPendingStakes()
        assert.equal(pendingStakes['0'][0], staker);
        assert.equal(pendingStakes['0'][1], staker2);
        assert.equal(pendingStakes['1'][0].toString(10), '25000000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '20000000000000000000');
        // lets claim only 7 from 45 total staked (38 left)
        const balanceBefore = web3.utils.toBN(await balanceOf(intermediary));
        let tx = await globalPool.claimToIntermediary(intermediary, '7000000000000000000', {from: owner});
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers[0], staker);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '7000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], staker);
        assert.equal(pendingStakes['0'][1], staker2);
        assert.equal(pendingStakes['1'][0].toString(10), '18000000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '20000000000000000000');
        let currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
        const balanceAfter = web3.utils.toBN(await balanceOf(intermediary));
        assert.equal((balanceAfter.sub(balanceBefore)).toString(10), '7000000000000000000');
        // lets claim only 21 from 38 total staked (17 left)
        tx = await globalPool.claimToIntermediary(intermediary, '21000000000000000000');
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers[0], staker);
        assert.equal(tx.logs['0'].args.stakers[1], staker2);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '18000000000');
        assert.equal(tx.logs['0'].args.amounts[1].toString(10), '3000000000'); // 3 ankrAVAX / 0.95
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingStakes['0'][1], staker2);
        assert.equal(pendingStakes['1'][0].toString(10), '0');
        assert.equal(pendingStakes['1'][1].toString(10), '17000000000000000000');
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 1);
        await globalPool.resetPendingGap();
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
        await globalPool.calcPendingGap();
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 1);
        // lets claim reset 17 from 17 (queue should be empty)
        tx = await globalPool.claimToIntermediary(intermediary, '17000000000000000000');
        assert.equal(tx.logs['0'].event, 'IntermediaryClaimed');
        assert.equal(tx.logs['0'].args.stakers.length, 1); // should be 1 because we included previous gap
        assert.equal(tx.logs['0'].args.amounts.length, 1);
        assert.equal(tx.logs['0'].args.stakers[0], staker2);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '17000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'].length, 0);
        assert.equal(pendingStakes['1'].length, 0);
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
    });

    it("stakes claiming allowed ONLY for operator", async () => {
        await globalPool.claimToIntermediary(intermediary, '21000000000000000000', {from: staker})
            .then(assert.fail)
            .catch(function(error) {
                   assert.include(
                       error.message,
                       'Operator: not allowed'
                   )
            });
    });

    it("pending stakes are well calculated", async () => {
        await globalPool.stake({from: owner, value: helpers.wei(3)});
        let pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '3000000000000000000');
        // lets claim 0.1 from pool
        await globalPool.claimToIntermediary(owner, '100000000000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '2900000000000000000');
        // lets stake 4 more from another user
        await globalPool.stake({from: staker, value: helpers.wei(4)});
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'][0], owner);
        assert.equal(pendingStakes['1'][0].toString(10), '2900000000000000000');
        assert.equal(pendingStakes['0'][1], staker);
        assert.equal(pendingStakes['1'][1].toString(10), '4000000000000000000');
        // lets claim 6.9 more
        await globalPool.claimToIntermediary(owner, '6900000000000000000');
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'].length, 0);
        assert.equal(pendingStakes['1'].length, 0);
    });

    it("an empty list of pending stakes can be correctly returned", async () => {
        const pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'].length, pendingStakes['1'].length);
        assert.equal(pendingStakes['0'].length, 0);
    });

    it("user can claim AVAX", async () => {
        await ankrAVAX.mint(staker2, '5000000000000000000');
        const {logs} = await globalPool.claim('2000000000000000000', {from: staker2});
        assert.equal(logs[0].event, 'AvaxClaimPending');
        assert.equal(logs[0].args['claimer'], staker2);
        assert.equal(logs[0].args['amount'].toString(10), '2000000000000000000');
        const claimedAmount = await globalPool.pendingAvaxClaimsOf(staker2);
        assert.equal(claimedAmount.toString(10), '2000000000000000000');
        assert(ankrAVAX.balanceOf(staker2).toString(10), '3000000000000000000')
        const pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'].length, pendingClaims['1'].length);
        assert.equal(pendingClaims['0'].length, 1);
        assert.equal(pendingClaims['0'][0], staker2);
        assert.equal(pendingClaims['1'][0], '2000000000000000000');
    });

    it("staker claims are served", async () => {
        await ankrAVAX.mint(staker, '9000000000000000000');
        await globalPool.claim('3000000000000000000', {from: staker}); // 3 ankrAVAX
        await ankrAVAX.mint(staker2, '15000000000000000000');
        await globalPool.claim('4000000000000000000', {from: staker2}); // 4 ankrAVAX
        let pendingStakes = await globalPool.getPendingClaims()
        assert.equal(pendingStakes['0'][0], staker);
        assert.equal(pendingStakes['0'][1], staker2);
        assert.equal(pendingStakes['1'][0].toString(10), '3000000000000000000');
        assert.equal(pendingStakes['1'][1].toString(10), '4000000000000000000');

        // lets serve only 3 of 7 total claimed (4 left due)
        const residueBalanceBefore = web3.utils.toBN(await balanceOf(intermediary));
        const balanceBefore = web3.utils.toBN(await balanceOf(staker));
        let tx = await globalPool.serveClaims(intermediary, '100000000000000000', {from: owner, value: helpers.wei(5)});
        assert.equal(tx.logs['0'].event, 'ClaimsServed');
        assert.equal(tx.logs['0'].args.claimers[0], staker);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '3157894736'); // 3 ankrAVAX / 0.95
        pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['0'][1], staker2);
        assert.equal(pendingClaims['1'][0].toString(10), '0');
        assert.equal(pendingClaims['1'][1].toString(10), '4000000000000000000');
        let currentGap = await globalPool.pendingClaimGap();
        assert.equal(currentGap, 1);
        const balanceAfter = web3.utils.toBN(await balanceOf(staker));
        assert.equal((balanceAfter.sub(balanceBefore)).toString(10), '3157894736842105263'); // 3 ankrAVAX / 0.95
        const residueBalanceAfter = web3.utils.toBN(await balanceOf(intermediary));
        assert.equal((residueBalanceAfter.sub(residueBalanceBefore)).toString(10), '1842105263157894737');  // 5000000000 - 3157894736

        await ankrAVAX.mint(staker3, '6000000000000000000');
        await globalPool.claim('1000000000000000000', {from: staker3}); // 1 ankrAVAX
        await globalPool.claim('2000000000000000000', {from: staker}); // 2 ankrAVAX
        // lets serve only 5 or 7 total staked (17 left)pendingStakes
        tx = await globalPool.serveClaims(intermediary, '100000000000000000', {from: owner, value: helpers.wei(6)});
        assert.equal(tx.logs['0'].event, 'ClaimsServed');
        assert.equal(tx.logs['0'].args.claimers[0], staker2);
        assert.equal(tx.logs['0'].args.claimers[1], staker3);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '4210526315'); // 4 ankrAVAX / 0.95
        assert.equal(tx.logs['0'].args.amounts[1].toString(10), '1052631578'); // 1 ankrAVAX / 0.95
        pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['0'][1], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['0'][2], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['0'][3], staker);
        assert.equal(pendingClaims['1'][0].toString(10), '0');
        assert.equal(pendingClaims['1'][1].toString(10), '0');
        assert.equal(pendingClaims['1'][2].toString(10), '0');
        assert.equal(pendingClaims['1'][3].toString(10), '2000000000000000000');
        currentGap = await globalPool.pendingClaimGap();
        assert.equal(currentGap, 3);

        await globalPool.resetPendingClaimGap();
        currentGap = await globalPool.pendingClaimGap();
        assert.equal(currentGap, 0);
        await globalPool.calcPendingClaimGap();
        currentGap = await globalPool.pendingClaimGap();
        assert.equal(currentGap, 3);

        await globalPool.claim('3000000000000000000', {from: staker3}); // 1 ankrAVAX
        // lets serve the reset 4 of 4 (queue should be empty)
        tx = await globalPool.serveClaims(intermediary, '100000000000000000', {from: owner, value: helpers.wei(5.5)});
        assert.equal(tx.logs['0'].event, 'ClaimsServed');
        assert.equal(tx.logs['0'].args.claimers[0], staker);
        assert.equal(tx.logs['0'].args.claimers[1], staker3);
        assert.equal(tx.logs['0'].args.amounts[0].toString(10), '2105263157'); // 2 ankrAVAX / 0.95
        assert.equal(tx.logs['0'].args.amounts[1].toString(10), '3157894736'); // 3 ankrAVAX / 0.95
        pendingStakes = await globalPool.getPendingStakes();
        assert.equal(pendingStakes['0'].length, 0);
        assert.equal(pendingStakes['1'].length, 0);
        currentGap = await globalPool.pendingGap();
        assert.equal(currentGap, 0);
    });

    it("pending claims can be served ONLY by operator", async () => {
        await globalPool.serveClaims(intermediary, '100000000000000000', {from: staker})
            .then(assert.fail)
            .catch(function(error) {
                   assert.include(
                       error.message,
                       'Operator: not allowed'
                   )
            });
    });

    it("pending claims are well calculated", async () => {
        await ankrAVAX.mint(staker, '9000000000000000000');
        await globalPool.claim('2000000000000000000', {from: staker}); // 2 ankrAVAX
        await ankrAVAX.mint(staker2, '15000000000000000000');
        await globalPool.claim('4000000000000000000', {from: staker2}); // 4 ankrAVAX
        await ankrAVAX.mint(staker3, '7000000000000000000');
        await globalPool.claim('3000000000000000000', {from: staker3}); // 3 ankrAVAX
        let pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'][0], staker);
        assert.equal(pendingClaims['1'][0].toString(10), '2000000000000000000');
        assert.equal(pendingClaims['0'][1], staker2);
        assert.equal(pendingClaims['1'][1].toString(10), '4000000000000000000');
        assert.equal(pendingClaims['0'][2], staker3);
        assert.equal(pendingClaims['1'][2].toString(10), '3000000000000000000');
        // lets serve 2
        await globalPool.serveClaims(intermediary, '100000000000000000', {from: owner, value: helpers.wei(2.5)});
        pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['1'][0].toString(10), '0');
        assert.equal(pendingClaims['0'][1], staker2);
        assert.equal(pendingClaims['1'][1].toString(10), '4000000000000000000');
        assert.equal(pendingClaims['0'][2], staker3);
        assert.equal(pendingClaims['1'][2].toString(10), '3000000000000000000');
        // lets claim 5 more
        await globalPool.claim('5000000000000000000', {from: staker}); // 5 ankrAVAX
        pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'][0], '0x0000000000000000000000000000000000000000');
        assert.equal(pendingClaims['1'][0].toString(10), '0');
        assert.equal(pendingClaims['0'][1], staker2);
        assert.equal(pendingClaims['1'][1].toString(10), '4000000000000000000');
        assert.equal(pendingClaims['0'][2], staker3);
        assert.equal(pendingClaims['1'][2].toString(10), '3000000000000000000');
        assert.equal(pendingClaims['0'][3], staker);
        assert.equal(pendingClaims['1'][3].toString(10), '5000000000000000000');
        // lets serve all  12
        await globalPool.serveClaims(intermediary, '100000000000000000', {from: owner, value: helpers.wei(12.7)});
        pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'].length, 0);
        assert.equal(pendingClaims['1'].length, 0);
    });

    it("an empty list of pending claims can be correctly returned", async () => {
        const pendingClaims = await globalPool.getPendingClaims();
        assert.equal(pendingClaims['0'].length, pendingClaims['1'].length);
        assert.equal(pendingClaims['0'].length, 0);
    });

    it("get pending claims is ONLY available for operator", async () => {
        const pendingClaims = await globalPool.getPendingClaims({from: owner});
        assert.equal(pendingClaims['0'].length, pendingClaims['1'].length);
        assert.equal(pendingClaims['0'].length, 0);
        await globalPool.getPendingClaims({from: staker})
            .then(assert.fail)
            .catch(function(error) {
                   assert.include(
                       error.message,
                       'Operator: not allowed'
                   )
            });
    });

    it("burn pending AVAX rewards ONLY available for owner", async () => {
        await globalPool.burnAnkrAvaxRewards(staker2, '100000000', {from: staker})
            .then(assert.fail)
            .catch(function(error) {
                   assert.include(
                       error.message,
                       'Ownable: caller is not the owner'
                   )
            });
    });
});