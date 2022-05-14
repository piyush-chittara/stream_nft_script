import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import BN = require("bn.js");
import {
  EscrowLayout,
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getKeypair,
  getProgramId,
  getPublicKey,
  logError,
} from "./utils";

const bob = async () => {
  const bobKeypair = getKeypair("bob"); //fee payer
  const escrowStateAccountPubkey = getPublicKey("escrow");
  const destPubKey = getPublicKey("bob"); //receiver
  const xMint = getPublicKey("mint_x");
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
    initializerAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerPubkey
    ),
    XTokenTempAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerTempTokenAccountPubkey
    ),
    initializerRentRecieveAccount: new PublicKey(
      decodedEscrowLayout.initializerReceivingTokenAccountPubkey
    ),
    tokenPubkey: new PublicKey(decodedEscrowLayout.tokenPubkey),
    rate: new BN(decodedEscrowLayout.rate, 10, "le"),
    expiry: new BN(decodedEscrowLayout.expiry, 10, "le"),
    rentee: new PublicKey(decodedEscrowLayout.rentee),
    state: new BN(decodedEscrowLayout.state),
  };

  // const xToken = new Token(connection, xMint, TOKEN_PROGRAM_ID, bobKeypair);
  // const associatedDestinationTokenAddr = await (
  //   await xToken.getOrCreateAssociatedAccountInfo(destPubKey)
  // ).address;
  // const associatedDestinationTokenAddr = await Token.getAssociatedTokenAddress(
  //   xToken.associatedProgramId,
  //   xToken.programId,
  //   xMint,
  //   destPubKey
  // );
  // const receiverAccount = await connection.getAccountInfo(
  //   associatedDestinationTokenAddr
  // );
  // const rentTransaction = new Transaction();
  // if (receiverAccount === null) {
  //   rentTransaction.add(
  //     Token.createAssociatedTokenAccountInstruction(
  //       xToken.associatedProgramId,
  //       xToken.programId,
  //       xMint,
  //       associatedDestinationTokenAddr,
  //       bobKeypair.publicKey,
  //       bobKeypair.publicKey
  //     )
  //   );
  // }
  console.log(escrowState.XTokenTempAccountPubkey.toBase58());

  console.log(
    "initializerRentRecieveAccount is",
    escrowState.initializerRentRecieveAccount.toBase58()
  );

  console.log(
    "initializerPubkey is",
    escrowState.initializerAccountPubkey.toBase58()
  );
  const PDA = await PublicKey.findProgramAddress(
    [xMint.toBuffer()],
    escrowProgramId
  );
  console.log("PDA is: {}", PDA[0].toBase58());
  const exchangeInstruction = new TransactionInstruction({
    programId: escrowProgramId,
    data: Buffer.from(
      Uint8Array.of(
        1,
        ...new BN(1).toArray("le", 8),
        ...new BN(1).toArray("le", 8)
      )
    ),
    keys: [
      { pubkey: bobKeypair.publicKey, isSigner: true, isWritable: false },
      {
        pubkey: destPubKey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: escrowState.XTokenTempAccountPubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: escrowState.initializerAccountPubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: escrowState.initializerRentRecieveAccount,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: escrowStateAccountPubkey, isSigner: false, isWritable: true }, //PDA with data
      {
        pubkey: new PublicKey("11111111111111111111111111111111"),
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  // const aliceYTokenAccountPubkey = getPublicKey("alice_y");
  // const [aliceYbalance, bobXbalance] = await Promise.all([
  //   getTokenBalance(aliceYTokenAccountPubkey, connection),
  //   getTokenBalance(bobXTokenAccountPubkey, connection),
  // ]);

  console.log("Sending Bob's transaction...");
  const rentTransaction = new Transaction();
  await connection.sendTransaction(
    rentTransaction.add(exchangeInstruction),
    [bobKeypair],
    { skipPreflight: false, preflightCommitment: "confirmed" }
  );

  // sleep to allow time to update
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("✨Rent paid and rentee added✨\n");
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
