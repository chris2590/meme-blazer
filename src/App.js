import React, { useState, useEffect, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { FaBurn, FaFire, FaTwitter, FaTelegram, FaMoneyBillWave, FaLink, FaImage, FaGlobe, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
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
const DEFAULT_RPC_ENDPOINT = "https://api.mainnet-beta.solana.com"; // Fallback RPC
const RPC_ENDPOINT = process.env.REACT_APP_RPC_ENDPOINT || DEFAULT_RPC_ENDPOINT;
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = RPC_ENDPOINT || clusterApiUrl(network);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ], []);

  useEffect(() => {
    console.log('Wallets initialized:', wallets.map(w => ({ name: w.name, readyState: w.readyState })));
    wallets.forEach(wallet => {
      console.log(`${wallet.name} readyState:`, wallet.readyState);
      wallet.on('connect', () => console.log(`${wallet.name} connected`));
      wallet.on('disconnect', () => console.log(`${wallet.name} disconnected`));
      wallet.on('error', (err) => console.error(`${wallet.name} error:`, err));
    });
  }, [wallets]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
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
  const [nfts, setNfts] = useState([]);
  const [domains, setDomains] = useState([]);
  const [activeTab, setActiveTab] = useState('tokens');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('');
  const [burnAmount, setBurnAmount] = useState('');
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [userReferralCode, setUserReferralCode] = useState('');
  const [referralStats] = useState({ count: 0, earnings: 0 });

  // Manual connect with direct Phantom/Solflare check
  const handleConnect = async () => {
    if (wallet.wallet) {
      try {
        await wallet.connect();
        setStatusMessage('Wallet connected successfully!');
      } catch (err) {
        console.error('Wallet connect failed:', err);
        setStatusMessage(`Connection failed: ${err.message}`);
      }
    } else if (window.solana && window.solana.isPhantom) {
      try {
        await window.solana.connect();
        setStatusMessage('Phantom connected manually!');
      } catch (err) {
        console.error('Phantom manual connect failed:', err);
        setStatusMessage(`Phantom connect failed: ${err.message}`);
      }
    } else if (window.solflare && window.solflare.isSolflare) {
      try {
        await window.solflare.connect();
        setStatusMessage('Solflare connected manually!');
      } catch (err) {
        console.error('Solflare manual connect failed:', err);
        setStatusMessage(`Solflare connect failed: ${err.message}`);
      }
    } else {
      setStatusMessage('No Solana wallet detected. Install Phantom or Solflare!');
    }
  };

  useEffect(() => {
    console.log('Wallet state:', { 
      connected: wallet.connected, 
      publicKey: wallet.publicKey?.toString(), 
      walletReady: wallet.wallet?.readyState 
    });
    if (wallet.connected && wallet.publicKey) {
      console.log('Wallet connected:', wallet.publicKey.toString());
      generateUserReferralCode();
      fetchUserAssets();
    } else if (wallet.wallet && wallet.wallet.readyState === 'Installed') {
      console.log('Wallet detected but not connected');
      setStatusMessage('Wallet detected! Click "Connect Wallet" or "Manual Connect" to proceed.');
    } else if (window.solana || window.solflare) {
      console.log('Native Solana wallet detected');
      setStatusMessage('Native wallet detected! Use "Manual Connect" if the button fails.');
    } else {
      console.log('No wallet detected—install Phantom or Solflare!');
      setStatusMessage('No wallet detected. Install Phantom or Solflare!');
    }
  }, [wallet.connected, wallet.publicKey, wallet.wallet]);

  const generateUserReferralCode = async () => {
    if (wallet.publicKey) {
      const hash = await sha256(wallet.publicKey.toString());
      setUserReferralCode(hash.substring(0, 8));
    }
  };

  const fetchUserAssets = async () => {
    if (!wallet.connected || !wallet.publicKey) return;
    setIsLoading(true);
    setStatusMessage('Loading your assets...');
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
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
      setIsLoading(false);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching assets:', error);
      setStatusMessage(`Error loading assets: ${error.message}`);
      setIsLoading(false);
    }
  };

  const burnToken = async () => {
    if (!selectedToken || !wallet.connected || !wallet.publicKey || !wallet.sign
