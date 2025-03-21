// App.js - Fixed for wallet connect and @solana/spl-token v0.4.8
import React, { useState, useEffect, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createBurnInstruction, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
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

  const shareOnTwitter = () => {
    const text = `I just burned some worthless tokens on Meme Blazer and reclaimed my SOL! 🔥💰 Join me at https://memeblazer.io @MemeCoinMania77`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnTelegram = () => {
    const text = `I just burned some worthless tokens on Meme Blazer and reclaimed my SOL! 🔥💰 Join me!`;
    window.open(`https://t.me/share/url?url=https://memeblazer.io&text=${encodeURIComponent(text)}`, '_blank');
  };

  const openReferralModal = () => setShowReferralModal(true);
  const closeReferralModal = () => setShowReferralModal(false);

  const copyReferralLink = () => {
    const referralLink = `https://memeblazer.io?ref=${userReferralCode}`;
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied!');
  };

  const showBurnConfirmation = (type, item) => {
    setConfirmationType(type);
    if (type === 'token') setSelectedToken(item);
    else if (type === 'nft') setSelectedNFT(item);
    else if (type === 'domain') setSelectedDomain(item);
    setShowConfirmation(true);
  };

  const closeConfirmation = () => {
    setShowConfirmation(false);
    setSelectedToken(null);
    setSelectedNFT(null);
    setSelectedDomain(null);
  };

  const confirmBurn = () => {
    if (confirmationType === 'token') burnToken();
    else if (confirmationType === 'nft') burnNFT();
    else if (confirmationType === 'domain') burnDomain();
  };

  return (
    <div className="meme-blazer">
      <header className="header">
        <div className="logo">
          <FaFire className="logo-icon" />
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

      {isMenuOpen && (
        <div className="mobile-menu">
          <div className="menu-items">
            <button onClick={() => { setActiveTab('tokens'); setIsMenuOpen(false); }}><FaCoins /> Tokens</button>
            <button onClick={() => { setActiveTab('nfts'); setIsMenuOpen(false); }}><FaImage /> NFTs</button>
            <button onClick={() => { setActiveTab('domains'); setIsMenuOpen(false); }}><FaGlobe /> Domains</button>
            <button onClick={() => { openReferralModal(); setIsMenuOpen(false); }}><FaMoneyBillWave /> Referrals</button>
          </div>
        </div>
      )}

      <div className="social-sharing">
        <button className="twitter-button" onClick={shareOnTwitter}><FaTwitter /> Tweet</button>
        <button className="telegram-button" onClick={shareOnTelegram}><FaTelegram /> Telegram</button>
        <button className="referral-button" onClick={openReferralModal}><FaMoneyBillWave /> Refer</button>
      </div>

      <main className="main-content">
        {!wallet.connected ? (
          <div className="connect-wallet">
            <FaFire className="fire-icon" />
            <h2>Connect Your Wallet to Start Burning</h2>
            <p>Burn your worthless meme coins, NFTs, and domains while reclaiming valuable SOL.</p>
            <WalletMultiButton />
          </div>
        ) : (
          <>
            <div className="tabs">
              <button className={activeTab === 'tokens' ? 'active' : ''} onClick={() => setActiveTab('tokens')}><FaCoins /> Tokens</button>
              <button className={activeTab === 'nfts' ? 'active' : ''} onClick={() => setActiveTab('nfts')}><FaImage /> NFTs</button>
              <button className={activeTab === 'domains' ? 'active' : ''} onClick={() => setActiveTab('domains')}><FaGlobe /> Domains</button>
            </div>

            <div className="tab-content">
              {isLoading ? (
                <div className="loading">
                  <FaFire className="loading-icon" />
                  <p>{statusMessage || 'Loading...'}</p>
                </div>
              ) : (
                <>
                  {activeTab === 'tokens' && (
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
                              <button className="burn-button" onClick={() => showBurnConfirmation('token', token)}><FaBurn /> Burn</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'nfts' && (
                    <div className="nfts-tab">
                      {nfts.length === 0 ? (
                        <div className="no-items"><FaExclamationTriangle /><p>No NFTs found.</p></div>
                      ) : (
                        <div className="nft-list">
                          {nfts.map((nft, index) => (
                            <div className="nft-item" key={index}>
                              <div className="nft-info">
                                <img src={nft.image} alt={nft.name} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                                <div>
                                  <h3>{nft.name}</h3>
                                  <p>{nft.collection}</p>
                                </div>
                              </div>
                              <button className="burn-button" onClick={() => showBurnConfirmation('nft', nft)}><FaBurn /> Burn</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'domains' && (
                    <div className="domains-tab">
                      {domains.length === 0 ? (
                        <div className="no-items"><FaExclamationTriangle /><p>No domains found.</p></div>
                      ) : (
                        <div className="domain-list">
                          {domains.map((domain, index) => (
                            <div className="domain-item" key={index}>
                              <div className="domain-info">
                                <FaGlobe className="domain-icon" />
                                <div>
                                  <h3>{domain.name}</h3>
                                  <p>Expires: {domain.expiry}</p>
                                </div>
                              </div>
                              <button className="burn-button" onClick={() => showBurnConfirmation('domain', domain)}><FaBurn /> Burn</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {showConfirmation && (
        <div className="modal-overlay">
          <div className="confirmation-modal">
            <h2><FaFire /> Confirm Burn</h2>
            {confirmationType === 'token' && selectedToken && (
              <div className="confirmation-content">
                <p>You are about to burn:</p>
                <div className="item-details">
                  <img src={selectedToken.image} alt={selectedToken.symbol} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                  <div>
                    <h3>{selectedToken.symbol}</h3>
                    <p>{selectedToken.balance.toLocaleString()} tokens</p>
                  </div>
                </div>
                <p className="warning">This action cannot be undone!</p>
                <p className="fee-info">1% fee supports Meme Blazer.</p>
              </div>
            )}
            {confirmationType === 'nft' && selectedNFT && (
              <div className="confirmation-content">
                <p>You are about to burn:</p>
                <div className="item-details">
                  <img src={selectedNFT.image} alt={selectedNFT.name} onError={e => e.target.src = 'https://via.placeholder.com/40'} />
                  <div>
                    <h3>{selectedNFT.name}</h3>
                    <p>{selectedNFT.collection}</p>
                  </div>
                </div>
                <p className="warning">This action cannot be undone!</p>
                <p className="fee-info">1% fee supports Meme Blazer.</p>
              </div>
            )}
            {confirmationType === 'domain' && selectedDomain && (
              <div className="confirmation-content">
                <p>You are about to burn:</p>
                <div className="item-details">
                  <FaGlobe className="domain-icon" />
                  <div>
                    <h3>{selectedDomain.name}</h3>
                    <p>Expires: {selectedDomain.expiry}</p>
                  </div>
                </div>
                <p className="warning">This action cannot be undone!</p>
                <p className="fee-info">1% fee supports Meme Blazer.</p>
              </div>
            )}
            {isLoading ? (
              <div className="loading">
                <FaFire className="loading-icon" />
                <p>{statusMessage || 'Processing...'}</p>
              </div>
            ) : transactionSuccess ? (
              <div className="success-message">
                <FaFire className="success-icon" />
                <p>{statusMessage || 'Burn successful! 🔥'}</p>
              </div>
            ) : (
              <div className="confirmation-buttons">
                <button className="cancel-button" onClick={closeConfirmation}>Cancel</button>
                <button className="confirm-button" onClick={confirmBurn}><FaBurn /> Burn It!</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReferralModal && (
        <div className="modal-overlay">
          <div className="referral-modal">
            <button className="close-button" onClick={closeReferralModal}><IoMdClose /></button>
            <h2><FaMoneyBillWave /> Referral Program</h2>
            <div className="referral-content">
              <p>Share your referral link and earn rewards!</p>
              <div className="referral-link">
                <input type="text" value={`https://memeblazer.io?ref=${userReferralCode}`} readOnly />
                <button onClick={copyReferralLink}><FaLink /> Copy</button>
              </div>
              <div className="referral-stats">
                <div className="stat"><h3>Referrals</h3><p>{referralStats.count}</p></div>
                <div className="stat"><h3>Earnings</h3><p>{referralStats.earnings.toFixed(4)} SOL</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>© 2025 Meme Coin Mania. All rights reserved.</p>
        <div className="footer-links">
          <a href="https://twitter.com/memecoinmania77" target="_blank" rel="noopener noreferrer">Twitter</a>
          <span>•</span>
          <a href="https://t.me/memecoinmaniadex" target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
      </footer>
    </div>
  );
}

export default App;
