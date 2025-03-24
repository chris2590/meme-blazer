import React from "react";
import ReactDOM from "react-dom/client";
import MemeBlazer from "./App.js"; // <- FIXED RIGHT HERE
import "@solana/wallet-adapter-react-ui/styles.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <MemeBlazer />
  </React.StrictMode>
);
