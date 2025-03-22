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
  const [referralStats] = useState({ count: 0, earnings: 0 }); // Placeholder

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
      const tokenAccountInfo = await getAccount(connection, new PublicKey(selectedToken.address));
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
      const signature = await connection.sendRawTransaction(signed.serialize
