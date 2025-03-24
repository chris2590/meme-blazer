import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const PRIMARY_RPC = "https://necessary-small-voice.solana-mainnet.quiknode.pro/c1525aa4daeb6697ac1a3faa3da30b005b54b26e/";
const connection = new Connection(PRIMARY_RPC, "confirmed");

const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const BURN_ADDRESS = new PublicKey("11111111111111111111111111111111");

export default function MemeBlazer() {
  const { publicKey, sendTransaction } = useWallet();
  const [burning, setBurning] = useState(false);

  const handleTokenBurn = async () => {
    if (!publicKey) return;
    setBurning(true);

    try {
      const totalLamports = 0.01 * LAMPORTS_PER_SOL;
      const feeLamports = totalLamports * 0.01;
      const burnLamports = totalLamports - feeLamports;

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: BURN_ADDRESS,
          lamports: burnLamports,
        }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: FEE_WALLET,
          lamports: feeLamports,
        })
      );

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      alert("🔥 Burn complete!");
    } catch (error) {
      console.error("Burn failed", error);
      alert("Burn failed — check console.");
    }

    setBurning(false);
  };

  return (
    <div style={{ backgroundColor: "black", color: "white", minHeight: "100vh", padding: "1rem" }}>
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid gray",
        paddingBottom: "1rem", marginBottom: "1.5rem"
      }}>
        <h1 style={{ fontSize: "30px", fontWeight: "bold" }}>Meme Blazer v2</h1>
        <WalletMultiButton />
      </header>

      {publicKey ? (
        <div>
          <p>Connected Wallet: {publicKey.toBase58()}</p>
          <button onClick={handleTokenBurn} disabled={burning}>
            {burning ? "Burning..." : "Burn Tokens"}
          </button>
        </div>
      ) : (
        <p>Connect your wallet to begin burning 🔥</p>
      )}

      <footer style={{ marginTop: "3rem", borderTop: "1px solid gray", paddingTop: "1rem", textAlign: "center" }}>
        <a href="https://x.com/MemeCoinMania77" target="_blank" rel="noreferrer">X: @memecoinmania77</a> &nbsp;|&nbsp;
        <a href="https://t.me/memecoinmaniadex" target="_blank" rel="noreferrer">Telegram</a>
      </footer>
    </div>
  );
}
