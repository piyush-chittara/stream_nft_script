import { Connection, PublicKey } from "@solana/web3.js";
import BN = require("bn.js");

import {
  EscrowLayout,
  ESCROW_ACCOUNT_DATA_LAYOUT,
  getProgramId,
  getPublicKey,
  logError,
} from "./utils";

const bob = async () => {
  // const escrowStateAccountPubkey = getPublicKey("escrow");
  const xMint = getPublicKey("mint_x");
  const escrowProgramId = getProgramId();
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  
  const [pda, _nounce] = await PublicKey.findProgramAddress(
    [xMint.toBuffer()],
    escrowProgramId
  );

  const escrowAccount = await connection.getAccountInfo(pda);

  if (escrowAccount === null) {
    logError("Could not find escrow at given address!");
    process.exit(1);
  }

  const encodedEscrowState = escrowAccount.data;
  const decodedEscrowLayout = ESCROW_ACCOUNT_DATA_LAYOUT.decode(
    encodedEscrowState
  ) as EscrowLayout;
  const escrowState = {
    escrowAccountPubkey: pda.toBase58(),
    isInitialized: !!decodedEscrowLayout.isInitialized,
    initializerAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerPubkey
    ).toBase58(),
    XTokenTempAccountPubkey: new PublicKey(
      decodedEscrowLayout.initializerTempTokenAccountPubkey
    ).toBase58(),
    initializerRentRecieveAccount: new PublicKey(
      decodedEscrowLayout.initializerReceivingTokenAccountPubkey
    ).toBase58(),
    tokenPubkey: new PublicKey(decodedEscrowLayout.tokenPubkey).toBase58(),
    rate: new BN(decodedEscrowLayout.rate, 10, "le"),
    expiry: new BN(decodedEscrowLayout.expiry, 10, "le"),
    rentee: new PublicKey(decodedEscrowLayout.rentee).toBase58(),
    state: new BN(decodedEscrowLayout.state),
    min_duration: new BN(decodedEscrowLayout.min_duration, 10, "le"),
    max_duration: new BN(decodedEscrowLayout.max_duration, 10, "le"),
  };
  console.log("pda: ", escrowState);
};

bob();
