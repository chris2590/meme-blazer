import React from "react";
import ReactDOM from "react-dom/client";
import MemeBlazer from "./App";
import "@solana/wallet-adapter-react-ui/styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MemeBlazer />
  </React.StrictMode>
);
