import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";

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
    "https://api.devnet.solana.com",
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
    owner: new PublicKey(decodedEscrowLayout.initializerPubkey),
    borrower: new PublicKey(decodedEscrowLayout.rentee),
    mint: new PublicKey(decodedEscrowLayout.tokenPubkey),
  };
  const xToken = new Token(
    connection,
    new PublicKey("8dv9xBuvv7czsX32tnkafSfi9d7Bh5y4Ly5stdGjEg5Z"),
    TOKEN_PROGRAM_ID,
    withdrawer
  );
  const associatedOwnerTokenAddress = await (
    await xToken.getOrCreateAssociatedAccountInfo(escrowState.owner)
  ).address;
  const associatedBorrowerTokenAddress = await (
    await xToken.getOrCreateAssociatedAccountInfo(escrowState.borrower)
  ).address;
  const accountList = [
    {
      pubkey: escrowState.XTokenTempAccountPubkey,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: escrowStateAccountPubkey, isSigner: false, isWritable: true }, //PDA with data
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: associatedOwnerTokenAddress, isSigner: false, isWritable: true },
    {
      pubkey: associatedBorrowerTokenAddress,
      isSigner: false,
      isWritable: true,
    }
  ];
  accountList.push({
    pubkey: new PublicKey("6Nojx8PpkWPiBKtzssZCobWujYfemdCFKBfs2WLeCBBK"),
    isSigner: false,
    isWritable: true,
  });
  const withdrawIx = new TransactionInstruction({
    programId: escrowProgramId,
    data: Buffer.from(Uint8Array.of(2)),
    keys: accountList,
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
