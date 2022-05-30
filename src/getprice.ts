// Create and send transaction to the network to get the report id

// yarn add @banksea-finance/oracle-client 
// # or npm install @banksea-finance/oracle-client --save

//* Get Oracle Program 
import { getBankseaOracleProgram } from '@banksea-finance/oracle-client'

const program = getBankseaOracleProgram('devnet')
//Note: due to Banksea Oracle is deployed to devnet only now, so only devnet is available now.

import { fetchTokenReport } from '@banksea-finance/oracle-client'


import {
    Keypair,
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    SystemProgram,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'mz/fs';
import path from 'path';
import * as borsh from 'borsh';

import { getPayer, getRpcUrl, createKeypairFromFile } from './utils';

import BN from 'bn.js';

/**
 * Connection to the network
 */
let connection: Connection;

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair;

/**
 * program id
 */
let programId: PublicKey;

/**
 * The public key of the answer account 
 */
//let answerPubkey: PublicKey;

/**
 * Path to program files
 */
const PROGRAM_PATH = path.resolve(__dirname, '../target/deploy');

/**
 * Path to program shared object file which should be deployed on chain.
 * This file is created when running either:
 *   - `npm run build:program-c`
 *   - `npm run build:program-rust`
 */
//const PROGRAM_SO_PATH = path.join(PROGRAM_PATH, 'banksea_oracle_example.so');

/**
 * Path to the keypair of the deployed program.
 * This file is created when running `solana program deploy ../target/deploy/banksea_oracle_example.so`
 */
const PROGRAM_KEYPAIR_PATH = path.join(PROGRAM_PATH, 'nft_escrow-keypair.json');

/**
 * The oralce program id on devnet
 */
const ORACLE_PROGRAM_ID = new PublicKey("BorcZEiGQJAL62M9QotWAvZYGkymuVnf42mj5HYnLZQj");

/**
 * Chain ID defined by oracle
 */
enum ChainId {
    Solana = 0,
}
/**
 * @name: encodeChainId
 * @description: encode chain id to Uint8Array
 * @param id: chain id (0: Solana; 1: Ethererum) 
 * @returns uint8 array
 */
function encodeChainId(id: number): Uint8Array {
    const encoder =
    typeof TextEncoder === "undefined"
        ? new (require("util").TextEncoder)("utf-8") // Node.
        : new TextEncoder(); // Browser.
    return encoder.encode(id.toString());
}

function chainName(id: number): string {
    let name: string;
    switch (id) {
    case 0: { name = "Solana"; break; }
    case 1: { name = "Ethererum"; break; }
    default: { name = "DEFAULT"; break; }
    }
    return name;
}



/*
the fetchTokenReport function require two parameters:
the first one is fixes parameter program, you should always pass the program which getting from getBankseaOracleProgram method to it.
the second one is identify, it requires type of NFTIdentify.
*/

/**
 * The collections on Solana have no uniform character.
 * `Token address` can locate to a certain NFT
 * It's actually a `PublicKey`. But requires base58 string from it here.
 */
export type NFTIdentify = SolanaNFTIdentify
export type SolanaNFTIdentify = string
const report2 = await fetchTokenReport(program, nft_address)
console.log(report2.convert())
// Output:
// { if nft_adrress: 'HKoqbFrRRUxuU5aDZNydPBTKbDHB28pNqQRiHYdr3VB4'
//   "assetAddr":"6FskgWZiFRW9CoA31WvpzMm4dYz2SPCTYXLeZ1HZsadj",
//   "decimal":"0",
//   "price":"0",
//   "priceType":"SOL",
//   "risk":"0",
//   "time":"0",
//   "name":"Degen Ape #1005"
// }





async function getReportIdFromSOL(tokenMint: string): Promise<PublicKey> {
    const sourceChainId = 0;
    const _programId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    const _tokenId = new PublicKey(tokenMint);
    const [reportId,] = await PublicKey.findProgramAddress(
    [encodeChainId(sourceChainId), _programId.toBuffer(), _tokenId.toBuffer()],
    ORACLE_PROGRAM_ID,
    );
    return reportId;
}

export async function getPriceOnSolana(): Promise<void> {
const reportId = await getReportIdFromSOL(nft_address); 

let report = {
    pubkey: reportId,
    isSigner: false,
    isWritable: false,
};

let answer = {
    pubkey: answerPubkey,
    isSigner: false,
    isWritable: true
};

const instruction = new TransactionInstruction({
    keys: [report, answer],
    programId,
    data: Buffer.alloc(0),
});

await sendAndConfirmTransaction(
    connection,
    new Transaction().add(instruction),
    [payer],
);

// print the detail of answer account 
const accountInfo = await connection.getAccountInfo(answerPubkey);
if (accountInfo === null) {
    throw 'Error: cannot find the account';
}

const answerInfo = borsh.deserializeUnchecked(
    AnswerSchema,
    AnswerAccount,
    Buffer.from(accountInfo.data),
);

answerInfo.print();
}