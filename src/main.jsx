import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

const network = WalletAdapterNetwork.Mainnet;
const endpoint = "https://api.mainnet-beta.solana.com";
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

ReactDOM.createRoot(document.getElementById("root")).render(
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
