import { AccountLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

// Aim: Get Escrow Data, Change it and send it back 
// Get Reqd pubkey and keypair from files
// Create transaction to modify escrow account
// Send transaction to the network
// Get Escrow data for verification //? Why are we doing it ?

//? what is async doing
// 
const alice = async () => {
  const escrowProgramId = getProgramId();
  //? Issue here 
  const aliceXTokenAccountPubkey = getPublicKey("alice_x"); //? Not reqd ?
  // const aliceYTokenAccountPubkey = getPublicKey("alice_y");
  const XTokenMintPubkey = getPublicKey("mint_x");
  const aliceKeypair = getKeypair("alice");
  const tempXTokenAccountKeypair = getKeypair(""); //? Its already transfered to PDA 
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  const [pda, _nounce] = await PublicKey.findProgramAddress(
    [XTokenMintPubkey.toBuffer()],
    escrowProgramId
  );

  //* Creating Instruction to Modify Escrow Account and Sending it to the network
  const modifyEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: aliceKeypair.publicKey, isSigner: true, isWritable: false },
      {
        pubkey: tempXTokenAccountKeypair.publicKey, //? Need to get from file
        isSigner: false,
        isWritable: true,
      },
      // {
      //   pubkey: aliceKeypair.publicKey,
      //   isSigner: false,
      //   isWritable: false,
      // },
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: new PublicKey("11111111111111111111111111111111"),
        isSigner: false,
        isWritable: false,
      },
    ],
    data: Buffer.from(
      Uint8Array.of(
        4, // Change the tag of instruction to 4
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8)
      )
    ),
  });

  console.log("Step5");
  const tx = new Transaction().add(
    modifyEscrowIx
  );
  console.log("Sending Alice's transaction...");
  await connection.sendTransaction(
    tx,
    [aliceKeypair, tempXTokenAccountKeypair],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  console.log("Step6");
  // sleep to allow time to update 
  await new Promise((resolve) => setTimeout(resolve, 5000));

  //* Get data from escrow account for verification
  console.log("Step7");
  const escrowAccount = await connection.getAccountInfo(pda);

  if (escrowAccount === null || escrowAccount.data.length === 0) {
    logError("Escrow state account has not been initialized properly");
    process.exit(1);
  }

  const encodedEscrowState = escrowAccount.data;
  const decodedEscrowState = ESCROW_ACCOUNT_DATA_LAYOUT.decode(
    encodedEscrowState
  ) as EscrowLayout;
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
  writePublicKey(pda, "escrow");
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

alice();
