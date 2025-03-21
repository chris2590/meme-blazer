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
import dogeCoinStack from './doge-coin-stack.png'; // Add the image to your project
import './App.css';

// SHA-256 for referral code
const sha256 = async (message) => {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Constants
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

  // Debug wallet init
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
    console.log('Wallet state:', { 
      connected: wallet.connected, 
      publicKey: wallet.publicKey?.toString(), 
      walletReady: wallet.wallet?.readyState 
    });
    if (wallet.connected && wallet.publicKey) {
      console.log('Wallet connected:', wallet.publicKey.toString());
      generateUserReferralCode();
      fetchUserAssets();
    } else if (wallet.wallet && !wallet.connected) {
      console.log('Attempting wallet connect...');
      wallet.connect().catch((err) => {
        console.error('Wallet connect failed:', err);
        setStatusMessage('Wallet connection failed. Install Phantom or Solflare!');
      });
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
      setStatusMessage('Error loading assets.');
      setIsLoading(false);
    }
  };

  const burnToken = async () => {
    if (!selectedToken || !wallet.connected || !wallet.publicKey || !wallet.signTransaction) return;
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

  const showBurnConfirmation = (type, item) => {
    setConfirmationType(type);
    if (type === 'token') setSelectedToken(item);
    setShowConfirmation(true);
  };

  return (
    <div className="meme-blazer">
      <header className="header">
        <div className="logo">
          <img src={dogeCoinStack} alt="Doge Coin Stack" className="logo-image" />
          <div className="logo-text">
            <h1>Meme Blazer</h1>
            <p>by Meme Coin Mania</p>
          </div>
        </div>
        <div className="wallet-connect">
          <WalletMultiButton />
        </div>
        <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <IoMdClose /> : <HiMenu />}
        </button>
      </header>

      {wallet.connected ? (
        <main className="main-content">
          <div className="tabs">
            <button className={activeTab === 'tokens' ? 'active' : ''} onClick={() => setActiveTab('tokens')}>
              <FaCoins /> Tokens
            </button>
          </div>

          <div className="tab-content">
            {isLoading ? (
              <div className="loading">
                <FaFire className="loading-icon animate-flame" />
                <p>{statusMessage || 'Loading...'}</p>
              </div>
            ) : (
              activeTab === 'tokens' && (
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
                          <button className="burn-button" onClick={() => showBurnConfirmation('token', token)}>
                            <FaBurn /> Burn
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {showConfirmation && confirmationType === 'token' && selectedToken && (
            <div className="modal-overlay">
              <div className="confirmation-modal">
                <h2><FaFire /> Confirm Burn</h2>
                <div className="confirmation-content">
                  <p>You are about to burn:</p>
                  <div className="item-details">
                    <img src={selectedToken.image} alt={selectedToken.symbol} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                    <div>
                      <h3>{token.symbol}</h3>
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
          <FaFire className="fire-icon animate-flame" />
          <img src={dogeCoinStack} alt="Doge Coin Stack" className="connect-image animate-coin-stack" />
          <h2>Connect Your Wallet to Start Burning</h2>
          <p>Burn your worthless meme coins, NFTs, and domains while reclaiming valuable SOL.</p>
          <WalletMultiButton />
        </div>
      )}
    </div>
  );
}

export default App;
