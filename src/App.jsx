import React, { useEffect, useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";

// RPCs
const PRIMARY_RPC = "https://necessary-small-voice.solana-mainnet.quiknode.pro/c1525aa4daeb6697ac1a3faa3da30b005b54b26e/";
const BACKUP_RPC = clusterApiUrl("mainnet-beta");
const connection = new Connection(PRIMARY_RPC, "confirmed");

// Fee + Burn Wallets
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const BURN_ADDRESS = new PublicKey("11111111111111111111111111111111");

export default function App() {
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
    } catch (err) {
      console.error("Burn failed", err);
      alert("Burn failed — check console.");
    }
    setBurning(false);
  };

  return (
    <div style={{ backgroundColor: "black", color: "white", minHeight: "100vh", padding: "1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid gray", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "30px", fontWeight: "bold" }}>Meme Blazer v2</h1>
        <WalletMultiButton />
      </header>

      {publicKey ? (
        <div>
          <p style={{ fontSize: "1.1rem" }}>
            Connected Wallet: {publicKey.toBase58()}
          </p>
          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            <button
              style={{ backgroundColor: "red", color: "white", padding: "1rem", borderRadius: "0.5rem", fontSize: "1rem" }}
              onClick={handleTokenBurn}
              disabled={burning}
            >
              {burning ? "Burning..." : "Burn Tokens"}
            </button>
            <button style={{ backgroundColor: "blue", color: "white", padding: "1rem", borderRadius: "0.5rem", fontSize: "1rem" }}>
              Burn NFTs
            </button>
            <button style={{ backgroundColor: "green", color: "white", padding: "1rem", borderRadius: "0.5rem", fontSize: "1rem" }}>
              Burn Domains
            </button>
            <button style={{ backgroundColor: "goldenrod", color: "black", padding: "1rem", borderRadius: "0.5rem", fontSize: "1rem" }}>
              Close Rent Accounts
            </button>
          </div>
          <div style={{ marginTop: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Referral System</h2>
            <p style={{ fontSize: "0.9rem" }}>
              Share this link to earn rewards:<br />
              <code style={{ color: "#a78bfa" }}>
                https://memeblazer.netlify.app/?ref={publicKey.toBase58()}
              </code>
            </p>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "1.1rem" }}>Connect your wallet to begin burning bags 🔥</p>
      )}

      <footer style={{ marginTop: "2rem", borderTop: "1px solid gray", paddingTop: "1rem", textAlign: "center", fontSize: "0.9rem" }}>
        Follow us on{" "}
        <a href="https://x.com/MemeCoinMania77" target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>
          @memecoinmania77
        </a>{" "}
        and join the{" "}
        <a href="https://t.me/memecoinmaniadex" target="_blank" rel="noreferrer" style={{ color: "#34d399" }}>
          Telegram
        </a>
      </footer>
    </div>
  );
}
