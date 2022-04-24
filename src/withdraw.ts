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
  const withdrawer = getKeypair("bob");
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
  const withdrawIx = new TransactionInstruction({
    programId: escrowProgramId,
    data: Buffer.from(Uint8Array.of(2)),
    keys: [
      {
        pubkey: escrowState.XTokenTempAccountPubkey,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: escrowStateAccountPubkey, isSigner: false, isWritable: true }, //PDA with data
    ],
  });

  console.log("Sending Withdraw's transaction...");
  const rentTransaction = new Transaction();
  await connection.sendTransaction(
    rentTransaction.add(withdrawIx),
    [withdrawer],
    {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    }
  );

  // sleep to allow time to update
  //   await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("Withdraw Success✨\n");
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
