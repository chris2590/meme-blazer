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

// RPC Setup
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
      alert("Burn complete!");
    } catch (error) {
      console.error("Burn failed", error);
      alert("Burn failed — check console.");
    }

    setBurning(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "black", color: "white", padding: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #444", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold" }}>Meme Blazer v2</h1>
        <WalletMultiButton />
      </header>

      {publicKey ? (
        <div>
          <p>Connected Wallet: {publicKey.toBase58()}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
            <button
              onClick={handleTokenBurn}
              disabled={burning}
              style={{
                backgroundColor: "#dc2626",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
                color: "white",
              }}
            >
              {burning ? "Burning..." : "Burn Tokens"}
            </button>
            <button
              style={{
                backgroundColor: "#2563eb",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
                color: "white",
              }}
            >
              Burn NFTs
            </button>
            <button
              style={{
                backgroundColor: "#16a34a",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
                color: "white",
              }}
            >
              Burn Domains
            </button>
            <button
              style={{
                backgroundColor: "#ca8a04",
                padding: "1rem",
                borderRadius: "0.75rem",
                fontSize: "1.25rem",
                color: "white",
              }}
            >
              Close Rent Accounts
            </button>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Referral System</h2>
            <p style={{ fontSize: "0.875rem" }}>
              Share this link to earn rewards: <br />
              <code style={{ color: "#c084fc" }}>
                https://memeblazer.netlify.app/?ref={publicKey.toBase58()}
              </code>
            </p>
          </div>
        </div>
      ) : (
        <p>Connect your wallet to begin burning bags.</p>
      )}

      <footer style={{ marginTop: "3rem", borderTop: "1px solid #444", paddingTop: "1rem", textAlign: "center", fontSize: "0.875rem" }}>
        Follow us on{" "}
        <a
          href="https://x.com/MemeCoinMania77"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#60a5fa" }}
        >
          @memecoinmania77
        </a>{" "}
        and join the{" "}
        <a
          href="https://t.me/memecoinmaniadex"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4ade80" }}
        >
          Telegram
        </a>
      </footer>
    </div>
  );
}
