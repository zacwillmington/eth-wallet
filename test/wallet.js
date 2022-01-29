const {expectRevert} = require('@openzeppelin/test-helpers');
 
const Wallet = artifacts.require('Wallet');

contract("wallet", (accounts) => {
    let wallet;

    beforeEach(async () => {
        wallet = await Wallet.new(
            [accounts[0], accounts[1], accounts[2]],
            2
        );
        await web3.eth.sendTransaction({from: accounts[0], to: wallet.address, value: 1000});
    });

    it('should have correct approvers and quorum', async () => {
        const approvers = await wallet.getApprovers();
        const quorum = await wallet.quorum();
        assert.equal(approvers.length === 3, true);
        assert.equal(approvers[0] === accounts[0], true);
        assert.equal(approvers[1] === accounts[1], true);
        assert.equal(approvers[2] === accounts[2], true);
        assert(quorum.toNumber() === 2);
    });

    it('should create transfers', async () => {
        await wallet.createTransfer(accounts[0], 100, {from: accounts[2]});
        const transfers = await wallet.getTransfers();

        assert(transfers.length === 1);
        assert(transfers[0].id === '0');
        assert(transfers[0].amount === '100');
        assert(transfers[0].to === accounts[0]);
        assert(transfers[0].approvals === '0');
        assert(transfers[0].sent === false);
    });

    it('should not create transfer if sender is not approved', async () => {
        await expectRevert(
            wallet.createTransfer(accounts[5], 100, { from: accounts[4]}),
            'Unpermitted sender address'
        );
    });

    it('should increment approvals', async () => {
        await wallet.createTransfer(accounts[5], 100, { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[0] });
        const transfers = await wallet.getTransfers();
        const balance = await web3.eth.getBalance(wallet.address);

        assert(transfers[0].approvals === '1');
        assert(transfers[0].sent === false);
        assert(balance === '1000');
    });

    it('should send transfer if quorum reached', async () => {
        const balanceBefore = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));        
        await wallet.createTransfer(accounts[6], 1000, { from: accounts[0] })
        await wallet.approveTransfer(0, { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[1] });
        const balanceAfter = web3.utils.toBN(await web3.eth.getBalance(accounts[6]));

        assert(balanceAfter.sub(balanceBefore).toNumber() === 1000);
    });

    it('should not approve transfer if sender is not approved', async () => {
        await wallet.createTransfer(accounts[6], 1000, { from: accounts[0] })
        await wallet.approveTransfer(0, { from: accounts[0] });
        await wallet.approveTransfer(0, { from: accounts[1] });
        
        await expectRevert(
            wallet.approveTransfer(0, { from: accounts[2] }),
            'Transfer already completed'
        );
    });

    it('should not approve transfer twice', async () => {
        await wallet.createTransfer(accounts[6], 1000, { from: accounts[0] })
        await wallet.approveTransfer(0, { from: accounts[0] });
        
        await expectRevert(
            wallet.approveTransfer(0, { from: accounts[0] }),
            'Transfer already approved'
        );
    });
});