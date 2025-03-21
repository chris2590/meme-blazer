// App.js - Fixed for wallet connect and @solana/spl-token v0.4.8
import React, { useState, useEffect, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createBurnInstruction, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'; // Updated imports
import { FaBurn, FaFire, FaTwitter, FaTelegram, FaMoneyBillWave, FaLink, FaImage, FaGlobe, FaCoins, FaExclamationTriangle } from 'react-icons/fa';
import { IoMdClose } from 'react-icons/io';
import { HiMenu } from 'react-icons/hi';
import confetti from 'canvas-confetti';
import './App.css';

const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const RPC_ENDPOINT = "https://api.mainnet-beta.solana.com";
const FEE_WALLET = new PublicKey("GcuxAvTz9SsEaWf9hLfjbrDGpeu7DUxXKEpgpCMWstDb");
const FEE_PERCENTAGE = 1;

function App() {
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = RPC_ENDPOINT || clusterApiUrl(network);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ], []);

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

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      generateUserReferralCode();
      fetchUserAssets();
    } else if (wallet.wallet && !wallet.connected) {
      wallet.connect().catch(() => setStatusMessage('Wallet connection failed. Install Phantom!'));
    }
  }, [wallet.connected, wallet.publicKey, wallet.wallet]);

  const generateUserReferralCode = async () => {
    if (wallet.publicKey) {
      const hash = await sha256(wallet.publicKey.toString());
      setUserReferralCode(hash.substring(0, 8));
    }
  };

  const fetchUserAssets = async () => {
    if (!wallet.connected) return;
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
            mint: new PublicKey(mint), // Convert to PublicKey
            balance: tokenAmount.uiAmount,
            decimals: tokenAmount.decimals,
            address: account.pubkey.toString(),
            symbol: 'Unknown',
            name: 'Unknown',
            image: `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
          };
        });
      setTokens(userTokens);

      const mockNFTs = [
        { mint: 'NFT1', name: 'Degen Ape #1234', image: 'https://arweave.net/example-nft-image-1', collection: 'Degen Ape Academy' },
        { mint: 'NFT2', name: 'Solana Monkey #5678', image: 'https://arweave.net/example-nft-image-2', collection: 'SMB' }
      ];
      setNfts(mockNFTs);

      const mockDomains = [
        { name: 'example.sol', expiry: '2025-12-31' },
        { name: 'memecoin.sol', expiry: '2026-06-30' }
      ];
      setDomains(mockDomains);

      setIsLoading(false);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching assets:', error);
      setStatusMessage('Error loading assets.');
      setIsLoading(false);
    }
  };

  const burnToken = async () => {
    if (!selectedToken || !wallet.connected || !wallet.publicKey || !wallet.signTransaction) return;
    setIsLoading(true);
    setStatusMessage('Preparing to burn tokens...');
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
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

  const burnNFT = async () => {
    if (!selectedNFT || !wallet.connected) return;
    setIsLoading(true);
    setStatusMessage('Preparing to burn NFT...');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock burn
      setStatusMessage('NFT burned successfully! 🔥');
      setTransactionSuccess(true);
      triggerConfetti();
      setNfts(nfts.filter(n => n.mint !== selectedNFT.mint));
      setSelectedNFT(null);
      setTimeout(() => {
        setShowConfirmation(false);
        setTransactionSuccess(false);
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('NFT burn error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const burnDomain = async () => {
    if (!selectedDomain || !wallet.connected) return;
    setIsLoading(true);
    setStatusMessage('Preparing to burn domain...');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock burn
      setStatusMessage('Domain burned successfully! 🔥');
      setTransactionSuccess(true);
      triggerConfetti();
      setDomains(domains.filter(d => d.name !== selectedDomain.name));
      setSelectedDomain(null);
      setTimeout(() => {
        setShowConfirmation(false);
        setTransactionSuccess(false);
        setStatusMessage('');
      }, 3000);
    } catch (error) {
      console.error('Domain burn error:', error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const shareOnTwitter = ()
     
