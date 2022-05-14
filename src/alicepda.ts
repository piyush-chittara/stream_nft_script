import { AccountLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

const alice = async () => {
  const escrowProgramId = getProgramId();

  const aliceXTokenAccountPubkey = getPublicKey("alice_x");
  // const aliceYTokenAccountPubkey = getPublicKey("alice_y");
  const XTokenMintPubkey = getPublicKey("mint_x");
  const aliceKeypair = getKeypair("alice");

  const tempXTokenAccountKeypair = new Keypair();
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  // Empty account to hold NFT
  const createTempTokenAccountIx = SystemProgram.createAccount({
    programId: TOKEN_PROGRAM_ID,
    space: AccountLayout.span,
    lamports: await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span
    ),
    fromPubkey: aliceKeypair.publicKey,
    newAccountPubkey: tempXTokenAccountKeypair.publicKey,
  });
  console.log("Step1");
  const initTempAccountIx = Token.createInitAccountInstruction(
    TOKEN_PROGRAM_ID,
    XTokenMintPubkey,
    tempXTokenAccountKeypair.publicKey,
    aliceKeypair.publicKey
  );
  console.log("Step2");
  const transferXTokensToTempAccIx = Token.createTransferInstruction(
    TOKEN_PROGRAM_ID,
    aliceXTokenAccountPubkey,
    tempXTokenAccountKeypair.publicKey,
    aliceKeypair.publicKey,
    [],
    1
  );
  console.log("Step3");
  // eslint-disable-next-line no-unused-vars
  const [pda, _nounce] = await PublicKey.findProgramAddress(
    [XTokenMintPubkey.toBuffer()],
    escrowProgramId
  );
  // const transferSolRentToPDA = SystemProgram.transfer({
  //   fromPubkey: aliceKeypair.publicKey,
  //   toPubkey: pda,
  //   lamports: await connection.getMinimumBalanceForRentExemption(
  //     ESCROW_ACCOUNT_DATA_LAYOUT.span
  //   ),
  // });
  // const escrowKeypair = new Keypair();
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
  const initEscrowIx = new TransactionInstruction({
    programId: escrowProgramId,
    keys: [
      { pubkey: aliceKeypair.publicKey, isSigner: true, isWritable: false },
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
        0,
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8),
        ...new BN(2).toArray("le", 8),
        ...new BN(110).toArray("le", 8)
      )
    ),
  });
  console.log("Step5");
  const tx = new Transaction().add(
    createTempTokenAccountIx,
    initTempAccountIx,
    transferXTokensToTempAccIx,
    // createEscrowAccountIx,
    initEscrowIx
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
