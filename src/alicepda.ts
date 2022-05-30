/* Importing the AccountLayout, Token, and TOKEN_PROGRAM_ID from the spl-token library. */
import { AccountLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

/* Importing the Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, and
TransactionInstruction from the @solana/web3.js library. */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

import BN = require("bn.js");
import {
  EscrowLayout,
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getKeypair,
  getProgramId,
  getPublicKey,
  logError,
  writePublicKey,
} from "./utils";

console.log(" Alice starts ");
const alice = async () => {

  // * GET PUBKEY {

  // Get Pubkey of Escrow Program
  const escrowProgramId = getProgramId(); 
  
  // Get Pubkey of Alice's Token X account
  const aliceXTokenAccountPubkey = getPublicKey("alice_x");
  
  // const aliceYTokenAccountPubkey = getPublicKey("alice_y");

  // get pubkey of Token X Mint Account
  const XTokenMintPubkey = getPublicKey("mint_x");
  
  // * GET KEYPAIR {

  // get keypair of Alice account //? We don't Alice Y token account because Y is SOL, right ??
  const aliceKeypair = getKeypair("alice");
  
  // get keypair of Temp token x account
  const tempXTokenAccountKeypair = new Keypair();
  
  // Establish Json RPC connection with devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  /* 
    Alice's transaction consists of 5 instructions.

    1. create empty account owned by token program
    2. initialize empty account as Alice's X token account
    3. transfer X tokens from Alice's main X token account to her temporary X token account
    4. create empty account owned by escrow program
    5. initialize empty account as escrow state and transfer temporary X token account ownership to PDA
  */

  // * 1 Empty account to hold NFT rented out by Alice
  // Creating a new account for the temporary token account.
  // const tempXTokenAccount = new Account(); //? Why not create new temp Token Account 
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    ),
    fromPubkey: aliceKeypair.publicKey, // pays rent for account space
    newAccountPubkey: tempXTokenAccountKeypair.publicKey, //? How do we already know pk of account that has yet to be created
  });

  console.log("Step1");
  // * 2 Initializing the temporary token account. 
  const initTempAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    XTokenMintPubkey,
    tempXTokenAccountKeypair.publicKey,
    aliceKeypair.publicKey
  );
  
  console.log("Step2");
  // * 3 Transferring 1 token from Alice's X token account to the temporary token account.
  const transferXTokensToTempAccIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    aliceXTokenAccountPubkey,
    tempXTokenAccountKeypair.publicKey,
    aliceKeypair.publicKey,
    [],
    1
  );

  console.log("Step3");
  // * Finding the program address of the escrow program. 
  const [pda, _nounce] = await PublicKey.findProgramAddress(
    [XTokenMintPubkey.toBuffer()], //? What is buffer representation 
    escrowProgramId
  );

  // const transferSolRentToPDA = SystemProgram.transfer({
  //   fromPubkey: aliceKeypair.publicKey,
  //   toPubkey: pda,
  //   lamports: await connection.getMinimumBalanceForRentExemption(
  //     ESCROW_ACCOUNT_DATA_LAYOUT.span
  //   ),
  // }); //? Why comment out? Why is it not reqd ?

  // const escrowKeypair = new Keypair(); //? Why is new Escrow Account not created ?
  // const createEscrowAccountIx = SystemProgram.createAccount({
  //   space: ESCROW_ACCOUNT_DATA_LAYOUT.span,
  //   lamports: await connection.getMinimumBalanceForRentExemption(
  //     ESCROW_ACCOUNT_DATA_LAYOUT.span
  //   ),
  //   fromPubkey: aliceKeypair.publicKey,
  //   newAccountPubkey: pda,
  //   programId: escrowProgramId,
  // });

  console.log("Step4");
  // * 5 Creating a new transaction instruction.
  const initEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: aliceKeypair.publicKey, 
        isSigner: true, 
        isWritable: false 
      },
      {
        pubkey: tempXTokenAccountKeypair.publicKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: aliceKeypair.publicKey,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: pda, 
        isSigner: false, 
        isWritable: true 
      },
      { pubkey: SYSVAR_RENT_PUBKEY, // Systen Var for Rent
        isSigner: false, 
        isWritable: false 
      },
      { pubkey: TOKEN_PROGRAM_ID, // Token Program
        isSigner: false, 
        isWritable: false 
      },
      {
        pubkey: new PublicKey("11111111111111111111111111111111"), // System Program
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from(  //? unclear of what's happening
      Uint8Array.of(
        0,
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8)
      )
    ),
  });

  console.log("Step5");
  // * Creating the transaction
  const tx = new Transaction().add(
    createTempTokenAccountIx,
    initTempAccountIx,
    transferXTokensToTempAccIx,
    // createEscrowAccountIx,
    initEscrowIx
  );

  console.log("Sending Alice's transaction...");
  // * Sending the Transaction 
  await connection.sendTransaction(
    tx,
    [aliceKeypair, tempXTokenAccountKeypair],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  ); //todo Make sure everything is there before sending

  console.log("Step6");
  // sleep to allow time to update
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log("Step7");
  // Fetch all the account info for pda (specific pubkey)
  const escrowAccount = await connection.getAccountInfo(pda);

  if (escrowAccount === null || escrowAccount.data.length === 0) {
    logError("Escrow state account has not been initialized properly"); //? Why not have its own custom Error 
    process.exit(1);
  }

  const encodedEscrowState = escrowAccount.data; // data is currently encoded
  const decodedEscrowState = ESCROW_ACCOUNT_DATA_LAYOUT.decode(
    encodedEscrowState
  ) as EscrowLayout; // decode according to EscrowLayout schema

  // Verify correctness of decoded Escrow data
  console.log("Step8");
  if (!decodedEscrowState.isInitialized) {
    logError("Escrow state initialization flag has not been set");
    process.exit(1);
  } else if (
    !new PublicKey(decodedEscrowState.initializerPubkey).equals(
      aliceKeypair.publicKey
    )
  ) {
    logError(
      "InitializerPubkey has not been set correctly / not been set to Alice's public key"
    );
    process.exit(1);
  } else if (
    !new PublicKey(
      decodedEscrowState.initializerReceivingTokenAccountPubkey
    ).equals(aliceKeypair.publicKey)
  ) {
    logError(
      "initializerReceivingTokenAccountPubkey has not been set correctly / not been set to Alice's Y public key"
    );
    process.exit(1);
  } else if (
    !new PublicKey(decodedEscrowState.initializerTempTokenAccountPubkey).equals(
      tempXTokenAccountKeypair.publicKey
    )
  ) {
    logError(
      "initializerTempTokenAccountPubkey has not been set correctly / not been set to temp X token account public key"
    );
    process.exit(1);
  }
  writePublicKey(pda, "escrow"); // Store Pubkey of PDA in file

  // console.table([
  //   {
  //     "Alice Token Account X": await getTokenBalance(
  //       aliceXTokenAccountPubkey,
  //       connection
  //     ),
  //     "Alice Token Account Y": await getTokenBalance(
  //       aliceKeypair.publicKey,
  //       connection
  //     ),
  //     "Bob Token Account X": await getTokenBalance(
  //       getPublicKey("bob_x"),
  //       connection
  //     ),
  //     "Bob Token Account Y": await getTokenBalance(
  //       getPublicKey("bob_y"),
  //       connection
  //     ),
  //     "Temporary Token Account X": await getTokenBalance(
  //       tempXTokenAccountKeypair.publicKey,
  //       connection
  //     ),
  //   },
  // ]);

  console.log("complete");
};

alice();  //? Can we shift it at the top ?
