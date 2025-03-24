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

// RPC & addresses
const RPC = "https://necessary-small-voice.solana-mainnet.quiknode.pro/c1525aa4daeb6697ac1a3faa3da30b005b54b26e/";
const connection = new Connection(RPC, "confirmed");

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

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");
      alert("🔥 Burn successful!");
    } catch (err) {
      console.error("Burn failed", err);
      alert("Error during burn.");
    }

    setBurning(false);
  };

  return (
    <div style={{ backgroundColor: "black", color: "white", minHeight: "100vh", padding: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #444", paddingBottom: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold" }}>Meme Blazer v2</h1>
        <WalletMultiButton />
      </header>

      {publicKey ? (
        <div>
          <p style={{ marginBottom: "1rem" }}>Connected Wallet: {publicKey.toBase58()}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button
              onClick={handleTokenBurn}
              disabled={burning}
              style={{
                backgroundColor: "#dc2626",
                color: "white",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
              }}
            >
              {burning ? "Burning..." : "Burn Tokens"}
            </button>

            <button
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
              }}
            >
              Burn NFTs
            </button>

            <button
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
              }}
            >
              Burn Domains
            </button>

            <button
              style={{
                backgroundColor: "#eab308",
                color: "black",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
              }}
            >
              Close Rent Accounts
            </button>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Referral System</h2>
            <p style={{ fontSize: "0.875rem" }}>
              Share this link to earn rewards:
              <br />
              <code style={{ color: "#c084fc" }}>
                https://memeblazer.netlify.app/?ref={publicKey.toBase58()}
              </code>
            </p>
          </div>
        </div>
      ) : (
        <p>Connect your wallet to start burning your bags 🔥</p>
      )}

      <footer style={{ marginTop: "3rem", borderTop: "1px solid #444", paddingTop: "1rem", fontSize: "0.875rem", textAlign: "center" }}>
        Follow us on{" "}
        <a href="https://x.com/MemeCoinMania77" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
          @memecoinmania77
        </a>{" "}
        and join the{" "}
        <a href="https://t.me/memecoinmaniadex" target="_blank" rel="noreferrer" style={{ color: "#4ade80" }}>
          Telegram
        </a>
      </footer>
    </div>
  );
}
