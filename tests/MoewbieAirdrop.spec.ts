import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Address } from '@ton/core';
import { MoewbieAirdrop } from '../wrappers/MoewbieAirdrop';
import '@ton/test-utils';

describe('MoewbieAirdrop', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let moewbieAirdrop: SandboxContract<MoewbieAirdrop>;
    let owner: SandboxContract<TreasuryContract>;
    const DEFAULT_AIRDROP_AMOUNT = toNano('1'); // 1 token for each airdrop
    const JETTON_ADDRESS = 'kQAiboDEv_qRrcEdrYdwbVLNOXBHwShFbtKGbQVJ2OKxY_Di';

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        owner = await blockchain.treasury('owner');

        // Initialize the MoewbieAirdrop contract with the default owner and jetton address
        moewbieAirdrop = blockchain.openContract(await MoewbieAirdrop.fromInit(Address.parse(JETTON_ADDRESS)));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await moewbieAirdrop.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: moewbieAirdrop.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy the contract with the correct initial values', async () => {
        const balanceBefore = await moewbieAirdrop.getBalance();
        expect(balanceBefore).toBe(0n); // Check that the initial balance is 0
    });

    it('should allow owner to deposit into the vault', async () => {
        const depositAmount = toNano('1'); // Owner deposits 1 token

        const depositResult = await moewbieAirdrop.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: depositAmount,
                forwardPayload: beginCell().asSlice(),
            },
        );

        expect(depositResult.transactions).toHaveTransaction({
            from: owner.address,
            to: moewbieAirdrop.address,
            success: true,
        });

        const balanceAfter = await moewbieAirdrop.getBalance();
        expect(balanceAfter).toBe(depositAmount); // Balance should be increased by the deposit amount
    });

    it('should airdrop tokens to a user and reduce the vault balance', async () => {
        const depositAmount = toNano('10'); // First, deposit 10 tokens into the vault
        await moewbieAirdrop.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: depositAmount,
                forwardPayload: beginCell().asSlice(),
            },
        );

        const user = await blockchain.treasury('user');
        const balanceBefore = await moewbieAirdrop.getBalance();
        expect(balanceBefore).toBe(depositAmount); // Ensure deposit was successful

        const airdropResult = await moewbieAirdrop.send(
            user.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: DEFAULT_AIRDROP_AMOUNT,
                forwardPayload: beginCell().asSlice(),
            },
        );

        expect(airdropResult.transactions).toHaveTransaction({
            from: user.address,
            to: moewbieAirdrop.address,
            success: true,
        });

        const balanceAfter = await moewbieAirdrop.getBalance();
        expect(balanceAfter).toBe(balanceBefore - DEFAULT_AIRDROP_AMOUNT); // Balance should decrease by the airdrop amount
    });

    it('should prevent airdrop if the vault balance is insufficient', async () => {
        const user = await blockchain.treasury('user');

        // Attempting to airdrop when vault balance is 0
        const airdropResult = await moewbieAirdrop.send(
            user.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: DEFAULT_AIRDROP_AMOUNT,
                forwardPayload: beginCell().asSlice(),
            },
        );

        // This transaction should fail because the balance is insufficient
        expect(airdropResult.transactions).toHaveTransaction({
            from: user.address,
            to: moewbieAirdrop.address,
            success: false,
        });
    });

    it('should allow the owner to withdraw all tokens from the vault', async () => {
        const depositAmount = toNano('10'); // Deposit 10 tokens into the vault
        await moewbieAirdrop.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: depositAmount,
                forwardPayload: beginCell().asSlice(),
            },
        );

        const balanceBefore = await moewbieAirdrop.getBalance();
        expect(balanceBefore).toBe(depositAmount); // Ensure deposit was successful

        const withdrawResult = await moewbieAirdrop.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Withdraw',
                queryId: 0n,
                amount: depositAmount,
            },
        );

        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: moewbieAirdrop.address,
            success: true,
        });

        const balanceAfter = await moewbieAirdrop.getBalance();
        expect(balanceAfter).toBe(0n); // Balance should be 0 after withdrawal
    });

    it('should prevent non-owners from withdrawing tokens', async () => {
        const depositAmount = toNano('10'); // Deposit some tokens first
        await moewbieAirdrop.send(
            owner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'TokenNotification',
                queryId: 0n,
                amount: depositAmount,
                forwardPayload: beginCell().asSlice(),
            },
        );

        const nonOwner = await blockchain.treasury('nonOwner');

        const withdrawResult = await moewbieAirdrop.send(
            nonOwner.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Withdraw',
                queryId: 0n,
                amount: depositAmount,
            },
        );

        // This transaction should fail because the sender is not the owner
        expect(withdrawResult.transactions).toHaveTransaction({
            from: nonOwner.address,
            to: moewbieAirdrop.address,
            success: false,
        });

        const balanceAfter = await moewbieAirdrop.getBalance();
        expect(balanceAfter).toBe(depositAmount); // Balance should remain unchanged
    });
});
