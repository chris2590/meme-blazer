import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const BURN_ADDRESS = new PublicKey("11111111111111111111111111111111");

export default function App() {
  const { publicKey, sendTransaction } = useWallet();
  const [burning, setBurning] = useState(false);

  const handleBurn = async () => {
    if (!publicKey) return;
    setBurning(true);
    try {
      const totalLamports = 0.01 * LAMPORTS_PER_SOL;
      const fee = totalLamports * 0.01;
      const burn = totalLamports - fee;

      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: BURN_ADDRESS, lamports: burn }),
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: FEE_WALLET, lamports: fee })
      );

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      alert("🔥 Burn successful!");
    } catch (e) {
      console.error(e);
      alert("❌ Burn failed");
    }
    setBurning(false);
  };

  return (
    <div style={{ backgroundColor: "#000", color: "#fff", padding: "2rem", fontFamily: "monospace" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1>Meme Blazer 🔥</h1>
        <WalletMultiButton />
      </header>

      {publicKey ? (
        <div>
          <p>Wallet: {publicKey.toBase58()}</p>
          <button onClick={handleBurn} disabled={burning}>
            {burning ? "Burning..." : "Burn Tokens"}
          </button>
        </div>
      ) : (
        <p>Connect wallet to start burning 👇</p>
      )}
    </div>
  );
}
