import { Address, beginCell, toNano } from '@ton/core';
import { MoewbieAirdrop } from '../wrappers/MoewbieAirdrop';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // Get the contract address from arguments or prompt for it
    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('MoewbieAirdrop address'));

    // Check if the contract is deployed
    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const moewbieAirdrop = provider.open(MoewbieAirdrop.fromAddress(address));

    // Get the current balance of the contract
    const balanceBefore = await moewbieAirdrop.getBalance();

    // Send a TokenNotification to add tokens to the vault
    await moewbieAirdrop.send(
        provider.sender(),
        {
            value: toNano('0.05'), // Sending some TON value to cover fees
        },
        {
            $$type: 'TokenNotification',
            queryId: 0n,
            amount: toNano('5'), // Simulate sending 5 tokens
            forwardPayload: beginCell().asSlice(),
        },
    );

    ui.write('Waiting for balance to update...');

    // Wait for the contract balance to be updated
    let balanceAfter = await moewbieAirdrop.getBalance();
    let attempt = 1;
    while (balanceAfter === balanceBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000); // Wait for 2 seconds
        balanceAfter = await moewbieAirdrop.getBalance();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Balance updated successfully!');
    ui.write(`New balance: ${balanceAfter.toString()}`);
}
