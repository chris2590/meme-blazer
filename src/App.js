import React, { useState, useEffect } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FaBurn, FaFire, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { HiMenu } from 'react-icons/hi';
import confetti from 'canvas-confetti';
import dogeCoinStack from './doge-coin-stack.png';
import './App.css';

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
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

  useEffect(() => {
    const conn = new window.solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');
    setConnection(conn);
    console.log('Connection set:', RPC_ENDPOINT);
  }, []);

  const connectWallet = async () => {
    setIsLoading(true);
    setStatusMessage('Connecting...');
    try {
      let solanaWallet = null;
      if (window.solana && window.solana.isPhantom) {
        solanaWallet = window.solana;
        console.log('Phantom found');
      } else if (window.solflare && window.solflare.isSolflare) {
        solanaWallet = window.solflare;
        console.log('Solflare found');
      } else {
        throw new Error('No Solana wallet detected. Install Phantom or Solflare.');
      }
      await solanaWallet.connect();
      setWallet(solanaWallet);
      setStatusMessage('Connected: ' + solanaWallet.publicKey.toString());
      console.log('Connected:', solanaWallet.publicKey.toString());
      fetchUserAssets(solanaWallet.publicKey);
    } catch (err) {
      console.error('Connect error:', err);
      setStatusMessage(`Failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    if (wallet) {
      wallet.disconnect();
      setWallet(null);
      setTokens([]);
      setStatusMessage('Disconnected');
    }
  };

  const fetchUserAssets = async (publicKey) => {
    if (!publicKey || !connection) return;
    setIsLoading(true);
    setStatusMessage('Loading tokens...');
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
      console.log('Tokens loaded:', userTokens);
      setTokens(userTokens);
      setStatusMessage('');
    } catch (error) {
      console.error('Fetch error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const burnToken = async () => {
    if (!selectedToken || !wallet || !connection) return;
    setIsLoading(true);
    setStatusMessage('Preparing burn...');
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
      setStatusMessage('Approve in wallet...');
      const signed = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      setStatusMessage('Burning...');
      await connection.confirmTransaction(signature, 'confirmed');
      setStatusMessage('Burned! 🔥');
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
                          <img src={token.image} alt={token.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                          <div>
                            <h3>{token.symbol}</h3>
                            <p>{token.balance.toLocaleString()} tokens</p>
                          </div>
                        </div>
                        <button className="burn-button" onClick={() => showBurnConfirmation(token)}>
                          <FaBurn /> Burn
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {showConfirmation && selectedToken && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <h2><FaFire /> Confirm Burn</h2>
                <div className="confirmation-content">
                  <p>You are about to burn:</p>
                  <div className="item-details">
                    <img src={selectedToken.image} alt={selectedToken.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                    <div>
                      <h3>{selectedToken.symbol}</h3>
                      <p>{selectedToken.balance.toLocaleString()} tokens</p>
                    </div>
                  </div>
                  <p className="warning">This action cannot be undone!</p>
                  <p className="fee-info">1% fee supports Meme Blazer.</p>
                </div>
                {isLoading ? (
                  <div className="loading">
                    <FaFire className="loading-icon animate-flame" />
                    <p>{statusMessage || 'Processing...'}</p>
                  </div>
                ) : transactionSuccess ? (
                  <div className="success-message">
                    <FaFire className="success-icon animate-flame" />
                    <p>{statusMessage || 'Burn successful! 🔥'}</p>
                  </div>
                ) : (
                  <div className="confirmation-buttons">
                    <button className="cancel-button" onClick={() => setShowConfirmation(false)}>Cancel</button>
                    <button className="confirm-button" onClick={burnToken}><FaBurn /> Burn It!</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      ) : (
        <div className="connect-wallet">
          <div className="hero">
            <img src={dogeCoinStack} alt="Doge Coin Stack" className="connect-image animate-coin-stack" />
            <h2>Connect Your Wallet to Start Burning</h2>
            <p>Burn your worthless meme coins, NFTs, and domains while reclaiming valuable SOL.</p>
          </div>
          <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>
          {statusMessage && <p className="status-message">{statusMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
