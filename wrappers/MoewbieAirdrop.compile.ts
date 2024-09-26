import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/moewbie_airdrop.tact',
    options: {
        debug: true,
    },
};
