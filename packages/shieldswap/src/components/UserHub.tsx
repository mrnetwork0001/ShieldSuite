import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { WalletState } from "../lib/wallet";
import toast from "react-hot-toast";
import { ClaimSuccessModal } from "./ClaimSuccessModal";

interface UserHubProps {
  wallet: WalletState;
  onConnect: () => void;
}

export const UserHub: React.FC<UserHubProps> = ({ wallet, onConnect }) => {
  const [eligibility, setEligibility] = useState<{
    loading: boolean;
    checked: boolean;
    eligible: boolean;
    rank: number;
    usdt: number;
    psai: number;
    claimed: boolean;
  }>({
    loading: false,
    checked: false,
    eligible: false,
    rank: 1,
    usdt: 0,
    psai: 0,
    claimed: false,
  });

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [claimingTrading, setClaimingTrading] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);

  const CLAIM_START_TIME = 1782997200000; // July 2, 2026, 13:00:00 UTC
  const [countdown, setCountdown] = useState(Math.max(0, Math.floor((CLAIM_START_TIME - Date.now()) / 1000)));

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(Math.max(0, Math.floor((CLAIM_START_TIME - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const checkEligibility = async () => {
    if (!wallet.connected || !wallet.address) return;
    
    setEligibility((prev) => ({ ...prev, loading: true }));
    try {
      const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";
      const res = await fetch(`${API_BASE}/api/rewards/eligibility?address=${wallet.address}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setEligibility({
          loading: false,
          checked: true,
          eligible: data.data.eligible,
          rank: data.data.rank || 1,
          usdt: data.data.usdt || 0,
          psai: data.data.psai || 0,
          claimed: data.data.claimed,
        });
      } else {
        throw new Error(data.error?.message || "Failed to check eligibility");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Could not verify eligibility. Try again later.");
      setEligibility((prev) => ({ ...prev, loading: false, checked: true }));
    }
  };

  const handleClaimTrading = async () => {
    if (!wallet.connected || !wallet.address || !eligibility.eligible || eligibility.claimed) return;

    setClaimingTrading(true);
    try {
      const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";
      const res = await fetch(`${API_BASE}/api/rewards/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      });
      
      const data = await res.json();
      if (data.success) {
        setEligibility((prev) => ({ ...prev, claimed: true }));
        setShowSuccessModal(true);
      } else {
        throw new Error(data.error?.message || "Claim failed");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Claim error: ${err.message}`);
    } finally {
      setClaimingTrading(false);
    }
  };

  useEffect(() => {
    if (wallet.connected && wallet.address) {
      checkEligibility();
    } else {
      setEligibility({
        loading: false,
        checked: false,
        eligible: false,
        rank: 1,
        usdt: 0,
        psai: 0,
        claimed: false,
      });
      setActiveCampaign(null);
    }
  }, [wallet.connected, wallet.address]);

  return (
    <div className="airdrop-container animate-fade-in" style={{ padding: '60px 20px', minHeight: '80vh', maxWidth: '1400px', margin: '0 auto' }}>
      
      <motion.div
        className="hero-text"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ marginBottom: '50px', textAlign: 'center' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏆</div>
        <h2 className="hero-title" style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px' }}>
          User <span className="text-blue">Hub</span>
        </h2>
        <p className="hero-subtitle" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
          Your central dashboard for all ShieldSuite rewards, airdrops, and campaign earnings.
        </p>
      </motion.div>

      {!wallet.connected ? (
        <motion.div 
          className="glass-card text-center" 
          style={{ padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '500px', margin: '0 auto' }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div style={{ fontSize: '3rem' }}>👛</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Connect to View Hub</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            Connect your Web3 wallet to access your personalized rewards and earnings dashboard.
          </p>
          <button 
            className="btn btn-primary"
            onClick={onConnect}
            style={{ padding: '14px 32px', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '10px' }}
          >
            Connect Wallet
          </button>
        </motion.div>
      ) : activeCampaign === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            Active Campaigns
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            
            {/* Trading Campaign Summary Card */}
            <motion.div 
              className="glass-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
              onClick={() => setActiveCampaign('trading')}
              whileHover={{ scale: 1.02 }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(75, 123, 245, 0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.8rem' }}>📈</div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Trading Campaign</h3>
                </div>
                {eligibility.claimed && (
                  <span style={{
                    background: 'rgba(0, 255, 170, 0.15)',
                    color: '#00ffaa',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    border: '1px solid rgba(0, 255, 170, 0.3)'
                  }}>Claimed ✓</span>
                )}
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                Season 1 Trading Volume Campaign. Trade to earn your share of the $500 prize pool and PSAI tokens.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '0.95rem' }}>Check Eligibility →</span>
              </div>
            </motion.div>
          </div>
        </div>
      ) : activeCampaign === 'trading' ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <button 
            onClick={() => setActiveCampaign(null)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', padding: 0, alignSelf: 'flex-start' }}
          >
            ← Back to Campaigns
          </button>
          
          <div 
            className="glass-card"
            style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, width: '180px', height: '180px', background: 'radial-gradient(circle, rgba(75, 123, 245, 0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '2.2rem' }}>📈</div>
              <div>
                <h3 style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>Trading Campaign</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                  Rewards accumulated from the Season 1 Trading Volume Campaign.
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="https://cryptologos.cc/logos/tether-usdt-logo.png" alt="USDT" style={{ width: '26px', height: '26px' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>USDT</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
                  {eligibility.usdt.toLocaleString()}
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/logo.png" alt="PSAI" style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>PSAI</span>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
                  {eligibility.psai.toLocaleString()}
                </div>
              </div>
            </div>

            {countdown > 0 ? (
              <button className="btn" disabled style={{ padding: '14px', fontWeight: 'bold', fontSize: '1.05rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'not-allowed', marginTop: '8px' }}>
                Claims Open In: {formatCountdown(countdown)}
              </button>
            ) : eligibility.claimed ? (
              <button className="btn" disabled style={{ padding: '14px', fontWeight: 'bold', fontSize: '1.05rem', background: 'rgba(75, 123, 245, 0.1)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', cursor: 'not-allowed', marginTop: '8px' }}>
                Rewards Claimed ✓
              </button>
            ) : !eligibility.eligible ? (
              <button className="btn" disabled style={{ padding: '14px', fontWeight: 'bold', fontSize: '1.05rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'not-allowed', marginTop: '8px' }}>
                Not Eligible
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={handleClaimTrading}
                disabled={claimingTrading}
                style={{ padding: '14px', fontWeight: 'bold', fontSize: '1.05rem', marginTop: '8px' }}
              >
                {claimingTrading ? "Processing..." : "Claim Campaign Rewards"}
              </button>
            )}
          </div>

          <ClaimSuccessModal 
            isOpen={showSuccessModal} 
            onClose={() => setShowSuccessModal(false)} 
            rank={eligibility.rank} 
            usdt={eligibility.usdt} 
            psai={eligibility.psai} 
          />
        </motion.div>
      ) : null}
    </div>
  );
};

export default UserHub;
