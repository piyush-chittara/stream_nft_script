// Create and send transaction to the network to get the report id
// Client sends transaction instruction to fetch data about a specific NFT_address 
// Then Program process the transaction and prints out NFT price data
// Two Accounts in Transaction Instruction:
// 1. Account that holds the NFT_address - Escrow Account
// 2. Account that holds the report id - Report Account

//? How do we fetch data from Oracle ?
//? In which step : Client ->Oracle -> Program or Program -> Oracle -> Client

//--------------------------------------------------------------------------------

//Javascript client for reading feeding price of Banksea Oracle
/*
import { getBankseaOracleProgram } from '@banksea-finance/oracle-client'
import { fetchTokenReport } from '@banksea-finance/oracle-client'

const program = getBankseaOracleProgram('devnet')
//Note: due to Banksea Oracle is deployed to devnet only now, so only devnet is available now.

export type NFTIdentify = SolanaNFTIdentify
export type SolanaNFTIdentify = string

// fetch NFT 's report Id on Solana
const report2 = await fetchTokenReport(program, nft_address)
console.log(report2.convert())
*/
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


