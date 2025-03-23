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

const PRIMARY_RPC = "https://necessary-small-voice.solana-mainnet.quiknode.pro/c1525aa4daeb6697ac1a3faa3da30b005b54b26e/";
const BACKUP_RPC = clusterApiUrl("mainnet-beta");
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
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex justify-between items-center border-b border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold">🔥 Meme Blazer v2</h1>
        <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
      </header>
      {publicKey ? (
        <div className="space-y-4">
          <p className="text-lg">Connected Wallet: {publicKey.toBase58()}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className="bg-red-600 hover:bg-red-700 p-4 rounded-xl text-xl"
              onClick={handleTokenBurn}
              disabled={burning}
            >
              {burning ? "Burning..." : "Burn Tokens"}
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl text-xl">
              Burn NFTs
            </button>
            <button className="bg-green-600 hover:bg-green-700 p-4 rounded-xl text-xl">
              Burn Domains
            </button>
            <button className="bg-yellow-600 hover:bg-yellow-700 p-4 rounded-xl text-xl">
              Close Rent Accounts
            </button>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-2">Referral System</h2>
            <p className="text-sm">
              Share this link to earn rewards: <br />
              <code className="text-purple-400">https://memeblazer.netlify.app/?ref={publicKey.toBase58()}</code>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-lg">Connect your wallet to begin burning bags 🔥</p>
      )}
      <footer className="mt-10 border-t border-gray-700 pt-4 text-center text-sm">
        Follow us on <a href="https://x.com/MemeCoinMania77" className="text-blue-400" target="_blank" rel="noopener noreferrer">@memecoinmania77</a> and join the <a href="https://t.me/memecoinmaniadex" className="text-green-400" target="_blank" rel="noopener noreferrer">Telegram</a>
      </footer>
    </div>
  );
}
