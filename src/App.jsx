import React from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function App() {
  return (
    <div
      style={{
        backgroundColor: "black",
        color: "white",
        minHeight: "100vh",
        padding: "1rem",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #555",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "30px", fontWeight: "bold" }}>
          Meme Blazer v2
        </h1>
        <WalletMultiButton />
      </header>

      <p>🔥 Let's burn some bags...</p>
    </div>
  );
}
