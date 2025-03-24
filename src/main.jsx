import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js"; // 👈 make sure this is App.js (not .jsx)

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
