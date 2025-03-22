import React, { useState, useEffect } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FaBurn, FaFire, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { HiMenu } from 'react-icons/hi';
import confetti from 'canvas-confetti';
import dogeCoinStack from './doge-coin-stack.png';
import './App.css';

// SHA-256 for referral code
const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Constants
const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"; // Swap with Alchemy if needed
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

function App() {
  const [connection, setConnection] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState('');

  // Connect to Solana RPC
  useEffect(() => {
    const conn = new window.solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');
    setConnection(conn);
  }, []);

  // Wallet connection logic
  const connectWallet = async () => {
    setIsLoading(true);
    setStatusMessage('Connecting wallet...');
    try {
      let solanaWallet = null;
      if (window.solana && window.solana.isPhantom) {
        solanaWallet = window.solana;
        console.log('Phantom detected');
      } else if (window.solflare && window.solflare.isSolflare) {
        solanaWallet = window.solflare;
        console.log('Solflare detected');
      } else {
        throw new Error('No Solana wallet detected. Install Phantom or Solflare!');
      }

      await solanaWallet.connect();
      setWallet(solanaWallet);
      setStatusMessage('Wallet connected: ' + solanaWallet.publicKey.toString());
      console.log('Wallet connected:', solanaWallet.publicKey.toString());
      generateUserReferralCode(solanaWallet.publicKey);
      fetchUserAssets(solanaWallet.publicKey);
    } catch (err) {
      console.error('Wallet connect failed:', err);
      setStatusMessage(`Connection failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    if (wallet) {
      wallet.disconnect();
      setWallet(null);
      setTokens([]);
      setStatusMessage('Wallet disconnected');
    }
  };

  const generateUserReferralCode = async (publicKey) => {
    if (publicKey) {
      const hash = await sha256(publicKey.toString());
      setUserReferralCode(hash.substring(0, 8));
    }
  };

  const fetchUserAssets = async (publicKey) => {
    if (!publicKey || !connection) return;
    setIsLoading(true);
    setStatusMessage('Loading your assets...');
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      const userTokens = tokenAccounts.value
        .filter(account => account.account.data.parsed.info.tokenAmount.uiAmount > 0)
        .map(account => {
          const { mint, tokenAmount } = account.account.data.parsed.info;
          return {
            mint: new PublicKey(mint),
            balance: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals,
            address: account.pubkey.toString(),
            symbol: 'Unknown',
            name: 'Unknown',
            image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
          };
        });
      console.log('Fetched tokens:', userTokens);
      setTokens(userTokens);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching assets:', error);
      setStatusMessage(`Error loading assets: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const burnToken = async () => {
    if (!selectedToken || !wallet || !connection) return;
    setIsLoading(true);
    setStatusMessage('Preparing to burn tokens...');
    try {
      const tokenMint = selectedToken.mint;
      const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.publicKey,
        tokenMint,
        wallet.publicKey
      );
      const tokenAccount = tokenAccountInfo.address;
      const amountToBurn = Math.floor(selectedToken.balance * Math.pow(10, selectedToken.decimals));

      const transaction = new Transaction().add(
        createBurnInstruction(
          tokenAccount,
          tokenMint,
          wallet.publicKey,
          amountToBurn,
          [],
          TOKEN_PROGRAM_ID
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

      setStatusMessage('Please approve in your wallet...');
      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      setStatusMessage('Burning tokens...');
      await connection.confirmTransaction(signature, 'confirmed');

      setStatusMessage('Tokens burned successfully! 🔥');
      setTransactionSuccess(true);
      triggerConfetti();
      setTokens(tokens.filter(t => t.mint.toString() !== selectedToken.mint.toString()));
      setSelectedToken(null);

      setTimeout(() => {
        setShowConfirmation(false);
        setTransactionSuccess(false);
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('Burn error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const showBurnConfirmation = (item) => {
    setSelectedToken(item);
    setShowConfirmation(true);
  };

  return (
    <div className="meme-blazer">
      <header className="header">
        <div className="logo">
          <img src={dogeCoinStack} alt="Doge Coin Stack" className="logo-image animate-coin-stack" />
          <div className="logo-text">
            <h1>Meme Blazer</h1>
            <p>by Meme Coin Mania</p>
          </div>
        </div>
        <div className="wallet-connect">
          {wallet ? (
            <button className="disconnect-button" onClick={disconnectWallet}>Disconnect</button>
          ) : (
            <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>
          )}
        </div>
        <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <IoMdClose /> : <HiMenu />}
        </button>
      </header>

      {wallet && wallet.publicKey ? (
        <main className="main-content">
          <div className="tabs">
            <button className="active"><FaCoins /> Tokens</button>
          </div>

          <div className="tab-content">
            {isLoading ? (
              <div className="loading">
                <FaFire className="loading-icon animate-flame" />
                <p>{statusMessage || 'Loading...'}</p>
              </div>
            ) : (
              <div className="tokens-tab">
                {tokens.length === 0 ? (
                  <div className="no-items"><FaExclamationTriangle /><p>No tokens found.</p></div>
                ) : (
                  <div className="token-list">
                    {tokens.map((token, index) => (
                      <div className="token-item" key={index}>
                        <div className="token-info">
                          <img src={token.image} alt={token.symbol} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                          <div>
                            <h3>{token.symbol}</h3>
                            <p>{token.balance.toLocaleString()} tokens</p>
                          </div>
                        </div>
                        <button className="burn-button" onClick={() => showBurnConfirmation(token)}>
                          <FaBurn /> Burn
