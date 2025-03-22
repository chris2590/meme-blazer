import React, { useState, useEffect } from 'react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FaBurn, FaFire, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import dogeCoinStack from './doge-coin-stack.png';
import './App.css';

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

function App() {
  const [connection, setConnection] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    const conn = new window.solanaWeb3.Connection(RPC_ENDPOINT, 'confirmed');
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
      } else {
        throw new Error('No Phantom wallet found. Install it.');
      }
      await solanaWallet.connect();
      setWallet(solanaWallet);
      setStatusMessage('Connected: ' + solanaWallet.publicKey.toString());
      console.log('Wallet:', solanaWallet.publicKey.toString());
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
      console.log('Tokens:', userTokens);
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
      <header>
        <div className="logo">
          <img src={dogeCoinStack} alt="Doge Coin Stack" className="logo-image" />
          <div className="logo-text">
            <h1>Meme Blazer</h1>
            <p>by Meme Coin Mania</p>
          </div>
        </div>
        <div className="wallet-connect">
          {wallet ? (
            <button onClick={disconnectWallet}>Disconnect</button>
          ) : (
            <button onClick={connectWallet}>Connect Wallet</button>
          )}
        </div>
      </header>
      {wallet && wallet.publicKey ? (
        <main>
          <div className="tabs">
            <button className="active"><FaCoins /> Tokens</button>
          </div>
          <div>
            {isLoading ? (
              <div>
                <FaFire className="loading-icon" />
                <p>{statusMessage || 'Loading...'}</p>
              </div>
            ) : (
              <div>
                {tokens.length === 0 ? (
                  <div><FaExclamationTriangle /><p>No tokens found.</p></div>
                ) : (
                  <div>
                    {tokens.map((token, index) => (
                      <div key={index}>
                        <div>
                          <img src={token.image} alt={token.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                          <div>
                            <h3>{token.symbol}</h3>
                            <p>{token.balance.toLocaleString()} tokens</p>
                          </div>
                        </div>
                        <button onClick={() => showBurnConfirmation(token)}><FaBurn /> Burn</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {showConfirmation && selectedToken && (
            <div className="modal-overlay">
              <div>
                <h2><FaFire /> Confirm Burn</h2>
                <div>
                  <p>You are about to burn:</p>
                  <div>
                    <img src={selectedToken.image} alt={selectedToken.symbol} onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }} />
                    <div>
                      <h3>{selectedToken.symbol}</h3>
                      <p>{selectedToken.balance.toLocaleString()} tokens</p>
                    </div>
                  </div>
                  <p>This action cannot be undone!</p>
                  <p>1% fee supports Meme Blazer.</p>
                </div>
                {isLoading ? (
                  <div>
                    <FaFire className="loading-icon" />
                    <p>{statusMessage || 'Processing...'}</p>
                  </div>
                ) : transactionSuccess ? (
                  <div>
                    <FaFire className="success-icon" />
                    <p>{statusMessage || 'Burn successful! 🔥'}</p>
                  </div>
                ) : (
                  <div>
                    <button onClick={() => setShowConfirmation(false)}>Cancel</button>
                    <button onClick={burnToken}><FaBurn /> Burn It!</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      ) : (
        <div>
          <div>
            <img src={dogeCoinStack} alt="Doge Coin Stack" className="connect-image" />
            <h2>Connect Your Wallet to Start Burning</h2>
            <p>Burn your worthless meme coins while reclaiming SOL.</p>
          </div>
          <button onClick={connectWallet}>Connect Wallet</button>
          {statusMessage && <p>{statusMessage}</p>}
        </div>
      )}
    </div>
  );
}

export default App;
