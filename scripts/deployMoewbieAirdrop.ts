import { Address, toNano } from '@ton/core';
import { MoewbieAirdrop } from '../wrappers/MoewbieAirdrop';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const moewbieAirdrop = provider.open(
        await MoewbieAirdrop.fromInit(Address.parse('kQAiboDEv_qRrcEdrYdwbVLNOXBHwShFbtKGbQVJ2OKxY_Di')),
    );

    await moewbieAirdrop.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(moewbieAirdrop.address);

    console.log('Balance', await moewbieAirdrop.getBalance());
}
