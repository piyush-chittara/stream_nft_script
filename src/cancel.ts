import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import {
  EscrowLayout,
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getKeypair,
  getProgramId,
  getPublicKey,
  logError,
} from "./utils";

const bob = async () => {
  const escrowStateAccountPubkey = getPublicKey("escrow");
  const cancelerXPub = getPublicKey("alice_x");
  const canceler = getKeypair("alice");
  const escrowProgramId = getProgramId();
  const connection = new Connection(
    "https://api.testnet.solana.com",
    "confirmed"
  );
  const escrowAccount = await connection.getAccountInfo(
    escrowStateAccountPubkey
  );
  if (escrowAccount === null) {
    logError("Could not find escrow at given address!");
    process.exit(1);
  }

  const encodedEscrowState = escrowAccount.data;
  const decodedEscrowLayout = ESCROW_ACCOUNT_DATA_LAYOUT.decode(
    encodedEscrowState
  ) as EscrowLayout;
  const escrowState = {
    escrowAccountPubkey: escrowStateAccountPubkey,
    isInitialized: !!decodedEscrowLayout.isInitialized,
    XTokenTempAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerTempTokenAccountPubkey
    ),
  };
  const cancelIx = new TransactionInstruction({
    programId: escrowProgramId,
    data: Buffer.from(Uint8Array.of(3)),
    keys: [
      { pubkey: canceler.publicKey, isSigner: true, isWritable: true },
      { pubkey: cancelerXPub, isSigner: false, isWritable: true },
      {
        pubkey: escrowState.XTokenTempAccountPubkey,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: escrowStateAccountPubkey, isSigner: false, isWritable: true }, //PDA with data
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  });

  console.log("Sending Cancel's transaction...");
  const rentTransaction = new Transaction();
  await connection.sendTransaction(rentTransaction.add(cancelIx), [canceler], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  // sleep to allow time to update
  //   await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Cancel Success✨\n");
  // console.table([
  //   {
  //     "Alice Token Account X": await getTokenBalance(
  //       getPublicKey("alice_x"),
  //       connection
  //     ),
  //     "Alice Token Account Y": newAliceYbalance,
  //     "Bob Token Account X": newBobXbalance,
  //     "Bob Token Account Y": await getTokenBalance(
  //       bobYTokenAccountPubkey,
  //       connection
  //     ),
  //   },
  // ]);
  console.log("Complete");
};

bob();
