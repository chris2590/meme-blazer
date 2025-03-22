import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createBurnInstruction, TOKEN_PROGRAM_ID, getAccount, createCloseAccountInstruction } from '@solana/spl-token';
import { FaBurn, FaFire, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import dogeCoinStack from './doge-coin-stack.png';
import './App.css';

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

function App() {
  const [connection, setConnection] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('');
  const [userReferralCode, setUserReferralCode] = useState('');

  useEffect(() => {
    const conn = new Connection(RPC_ENDPOINT, 'confirmed');
    setConnection(conn);
    console.log('Connected to:', RPC_ENDPOINT);
  }, []);

  const connectWallet = async () => {
    setIsLoading(true);
    setStatusMessage('Connecting...');
    try {
      let solanaWallet = null;
      if (window.solana && window.solana.isPhantom) {
        solanaWallet = window.solana;
        console.log('Phantom detected');
      } else if (window.solflare && window.solflare.isSolflare) {
        solanaWallet = window.solflare;
        console.log('Solflare detected');
      } else if (window.backpack) {
        solanaWallet = window.backpack;
        console.log('Backpack detected');
      } else {
        throw new Error('No supported wallet detected. Install Phantom, Solflare, or Backpack.');
      }
      await solanaWallet.connect();
      setWallet(solanaWallet);
      setStatusMessage('Connected: ' + solanaWallet.publicKey.toString());
      console.log('Wallet:', solanaWallet.publicKey.toString());
      generateUserReferralCode(solanaWallet.publicKey);
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
      setNfts([]);
      setUserReferralCode('');
      setStatusMessage('Disconnected');
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
    setStatusMessage('Loading assets...');
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
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
            image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
          };
        });
      const userNFTs = tokenAccounts.value
        .filter(account => account.account.data.parsed.info.tokenAmount.uiAmount === 1 && account.account.data.parsed.info.decimals === 0)
        .map(account => {
          const { mint } = account.account.data.parsed.info;
          return {
            mint: new PublicKey(mint),
            address: account.pubkey.toString(),
            symbol: 'NFT',
            image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
          };
        });
      console.log('Tokens:', userTokens);
      console.log('NFTs:', userNFTs);
      setTokens(userTokens);
      setNfts(userNFTs);
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
    setStatusMessage('Preparing token burn...');
    try {
      const tokenMint = selectedToken.mint;
      const tokenAccountInfo = await getOrCreateAssociatedTokenAccount(connection, wallet.publicKey, tokenMint, wallet.publicKey);
      const tokenAccount = tokenAccountInfo.address;
      const amountToBurn = Math.floor(selectedToken.balance * Math.pow(10, selectedToken.decimals));
      const transaction = new Transaction().add(
        createBurnInstruction(tokenAccount, tokenMint, wallet.publicKey, amountToBurn, [], TOKEN_PROGRAM_ID),
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
      setStatusMessage('Burning token...');
      await connection.confirmTransaction(signature, 'confirmed');
      setStatusMessage('Token burned! 🔥');
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

  const burnNFT = async () => {
    if (!selectedNFT || !wallet || !connection) return;
    setIsLoading(true);
    setStatusMessage('Preparing NFT burn...');
    try {
      const nftMint = selectedNFT.mint;
      const tokenAccountInfo = await getAccount(connection, new PublicKey(selectedNFT.address));
      const tokenAccount = tokenAccountInfo.address;
      const transaction = new Transaction().add(
        createBurnInstruction(tokenAccount, nftMint, wallet.publicKey, 1, [], TOKEN_PROGRAM_ID),
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
      setStatusMessage('Burning NFT...');
      await connection.confirmTransaction(signature, 'confirmed');
      setStatusMessage('NFT burned! 🔥');
      setTransactionSuccess(true);
      triggerConfetti();
      setNfts(nfts.filter(n => n.mint.toString() !== selectedNFT.mint.toString()));
      setSelectedNFT(null);
      setTimeout(() => {
        setShowConfirmation(false);
        setTransactionSuccess(false);
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('NFT burn error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const closeAccount = async () => {
    if (!selectedToken || !wallet || !connection) return;
    setIsLoading(true);
    setStatusMessage('Preparing to close account...');
    try {
      const tokenAccountInfo = await getAccount(connection, new PublicKey(selectedToken.address));
      const tokenAccount = tokenAccountInfo.address;
      const transaction = new Transaction().add(
        createCloseAccountInstruction(tokenAccount, wallet.publicKey, wallet.publicKey, []),
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
      setStatusMessage('Closing account...');
      await connection.confirmTransaction(signature, 'confirmed');
      setStatusMessage('Account closed! SOL reclaimed.');
      setTransactionSuccess(true);
      triggerConfetti();
      setTokens(tokens.filter(t => t.address.toString() !== selectedToken.address.toString()));
      setNfts(nfts.filter(n => n.address.toString() !== selectedToken.address.toString()));
      setSelectedToken(null);
      setTimeout(() => {
        setShowConfirmation(false);
        setTransactionSuccess(false);
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('Close account error:', error);
      setStatusMessage(`Error: ${error.message}`);
      setIsLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const showBurnConfirmation = (type, item) => {
    setConfirmationType(type);
    if (type === 'token') setSelectedToken(item);
    if (type === 'nft') setSelectedNFT(item);
    if (type === 'close') setSelectedToken(item);
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
      </header>
      {wallet && wallet.publicKey ? (
        <main className="main-content">
          <div className="tabs">
            <button className="active"><FaCoins /> Tokens & NFTs</button>
          </div>
          <div className="tab-content">
            {isLoading ? (
              <div className="loading">
                <FaFire className="loading-icon animate-flame" />
                <p>{statusMessage || 'Loading...'}</p>
              </div>
            ) : (
              <div className="tokens-tab">
                {tokens.length === 0 && nfts.length === 0 ? (
                  <div className="no-items"><FaExclamationTriangle /><p>No tokens or NFTs found.</p></div>
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
                        <button className="burn-button" onClick={() => showBurnConfirmation('token', token)}><FaBurn /> Burn</button>
                        <button className="close-button" onClick={() => showBurnConfirmation('close', token)}>Close Account</button>
                      </div>
                    ))}
                    {nfts.map((nft, index) => (
                      <div className="token-item" key={index}>
                        <div className="token-info">
                          <img src={nft.image} alt={nft.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                          <div>
                            <h3>{nft.symbol}</h3>
                            <p>NFT</p>
                          </div>
                        </div>
                        <button className="burn-button" onClick={() => showBurnConfirmation('nft', nft)}><FaBurn /> Burn</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {showConfirmation && (selectedToken || selectedNFT) && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <h2><FaFire /> Confirm {confirmationType === 'token' ? 'Token Burn' : confirmationType === 'nft' ? 'NFT Burn' : 'Account Close'}</h2>
                <div className="confirmation-content">
                  <p>You are about to {confirmationType === 'token' ? 'burn' : confirmationType === 'nft' ? 'burn' : 'close'}:</p>
                  <div className="item-details">
                    <img src={confirmationType === 'nft' ? selectedNFT.image : selectedToken.image} alt={confirmationType === 'nft' ? selectedNFT.symbol : selectedToken.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                    <div>
                      <h3>{confirmationType === 'nft' ? selectedNFT.symbol : selectedToken.symbol}</h3>
                      <p>{confirmationType === 'nft' ? 'NFT' : `${selectedToken.balance.toLocaleString()} tokens`}</p>
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
                    <p>{statusMessage || (confirmationType === 'close' ? 'Account closed! 🔥' : 'Burn successful! 🔥')}</p>
                  </div>
                ) : (
                  <div className="confirmation-buttons">
                    <button className="cancel-button" onClick={() => setShowConfirmation(false)}>Cancel</button>
                    <button className="confirm-button" onClick={confirmationType === 'token' ? burnToken : confirmationType === 'nft' ? burnNFT : closeAccount}>
                      <FaBurn /> {confirmationType === 'close' ? 'Close It!' : 'Burn It!'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="referral-section">
            <h3>Referral Code: {userReferralCode || 'Not generated'}</h3>
            <p>Share this code to earn rewards (coming soon).</p>
          </div>
        </main>
      ) : (
        <div className="connect-wallet">
          <div className="hero">
            <img src={dogeCoinStack} alt="Doge Coin Stack" className="connect-image animate-coin-stack" />
            <h2>Connect Your Wallet to Start Burning</h2>
            <p>Burn your worthless meme coins and NFTs while reclaiming SOL.</p>
          </div>
          <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>
          {statusMessage && <p className="status-message">{statusMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
