// App.js - Fixed for wallet connect
import React, { useState, useEffect, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FaBurn, FaFire, FaTwitter, FaTelegram, FaMoneyBillWave, FaLink, FaImage, FaGlobe, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { HiMenu } from 'react-icons/hi';
import confetti from 'canvas-confetti';
import './App.css';

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"; // Reliable public endpoint
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = RPC_ENDPOINT || clusterApiUrl(network);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <MemeBlazer />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function MemeBlazer() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [activeTab, setActiveTab] = useState('tokens');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      fetchUserAssets();
    } else if (wallet.wallet && !wallet.connected) {
      wallet.connect().catch(() => setStatusMessage('Wallet connection failed. Install Phantom!'));
    }
  }, [wallet.connected, wallet.publicKey, wallet.wallet]);

  const fetchUserAssets = async () => {
    if (!wallet.connected) return;
    setIsLoading(true);
    setStatusMessage('Loading assets...');
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID });
      const userTokens = tokenAccounts.value
        .filter(acc => acc.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .map(acc => ({
          mint: acc.account.data.parsed.info.mint,
          balance: acc.account.data.parsed.info.tokenAmount.uiAmount,
          symbol: 'Unknown',
          image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${acc.account.data.parsed.info.mint}/logo.png`
        }));
      setTokens(userTokens);
      setIsLoading(false);
      setStatusMessage('');
    } catch (error) {
      setStatusMessage('Error loading assets.');
      setIsLoading(false);
    }
  };

  const burnToken = async (token) => {
    if (!wallet.connected) return;
    setIsLoading(true);
    setStatusMessage('Burning token...');
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const tokenMint = new PublicKey(token.mint);
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: tokenMint });
      const tokenAccount = tokenAccounts.value[0].pubkey;
      const tokenObj = new Token(connection, tokenMint, TOKEN_PROGRAM_ID, wallet.publicKey);
      const accountInfo = await tokenObj.getAccountInfo(tokenAccount);
      const transaction = new Transaction().add(
        Token.createBurnInstruction(
          TOKEN_PROGRAM_ID,
          tokenMint,
          tokenAccount,
          wallet.publicKey,
          [],
          accountInfo.amount
        ),
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: FEE_WALLET,
          lamports: Math.floor(LAMPORTS_PER_SOL * FEE_PERCENTAGE / 100)
        })
      );
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');
      setTokens(tokens.filter(t => t.mint !== token.mint));
      setStatusMessage('Token burned! 🔥');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      setStatusMessage('Burn failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="meme-blazer">
      <header className="header">
        <div className="logo">
          <FaFire className="logo-icon" />
          <h1>Meme Blazer</h1>
        </div>
        <div className="wallet-connect">
          <WalletMultiButton />
        </div>
        <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <IoMdClose /> : <HiMenu />}
        </button>
      </header>

      <main className="main-content">
        {!wallet.connected ? (
          <div className="connect-wallet">
            <FaFire className="fire-icon" />
            <h2>Connect Wallet</h2>
            <p>Burn meme coins and reclaim SOL!</p>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="tab-content">
            {isLoading ? (
              <div className="loading">
                <FaFire className="loading-icon" />
                <p>{statusMessage || 'Loading...'}</p>
              </div>
            ) : tokens.length === 0 ? (
              <div className="no-items"><FaExclamationTriangle /><p>No tokens found.</p></div>
            ) : (
              <div className="token-list">
                {tokens.map((token, index) => (
                  <div className="token-item" key={index}>
                    <div className="token-info">
                      <img src={token.image} alt={token.symbol} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                      <div>
                        <h3>{token.symbol}</h3>
                        <p>{token.balance} tokens</p>
                      </div>
                    </div>
                    <button className="burn-button" onClick={() => burnToken(token)}><FaBurn /> Burn</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© 2025 Meme Coin Mania</p>
      </footer>
    </div>
  );
}

export default App;