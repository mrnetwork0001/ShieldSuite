import React, { useRef, useCallback, useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { toPng } from 'html-to-image';
import { motion, AnimatePresence } from 'framer-motion';

interface ClaimSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  rank: number;
  usdt: number;
  psai: number;
}

export const ClaimSuccessModal: React.FC<ClaimSuccessModalProps> = ({
  isOpen,
  onClose,
  rank,
  usdt,
  psai
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
  }, [isOpen]);

  const handleShare = useCallback(async () => {
    if (cardRef.current === null) return;

    try {
      // 1. Generate PNG from the card
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      
      // 2. Download the image automatically
      const link = document.createElement('a');
      link.download = `ShieldSwap_Rank_${rank}_Reward.png`;
      link.href = dataUrl;
      link.click();

      // 3. Auto Redirect to X (Twitter) with predefined post
      const postText = `🎉 Just claimed my rewards from the @ShieldSuite_ X Layer Trading Campaign! 🛡️\n\nRanked Top 5 globally and secured my share of the $500 prize pool in USDT & $PSAI. \nSecurity meets DeFi on @XLayerOfficial. 💪\n\n#XLayer #ShieldSwap #PSAI #Web3`;
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;
      window.open(twitterUrl, '_blank');
      
    } catch (err) {
      console.error('Failed to generate image', err);
    }
  }, [cardRef, rank]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          {windowSize.width > 0 && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}

          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              maxWidth: '450px',
              width: '100%',
              alignItems: 'center'
            }}
          >
            {/* The Shareable Card (This is what gets screenshotted) */}
            <div 
              ref={cardRef} 
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
                border: '2px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '24px',
                padding: '40px 30px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(0, 240, 255, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative background elements */}
              <div style={{
                position: 'absolute', top: '-50px', left: '-50px',
                width: '150px', height: '150px',
                background: 'var(--gradient-primary)',
                filter: 'blur(60px)', opacity: 0.3,
                borderRadius: '50%'
              }} />
              
              <img src="/logo.png" alt="ShieldSuite" style={{ width: '64px', height: '64px', marginBottom: '16px', zIndex: 1 }} />
              
              <h2 style={{ fontSize: '1.2rem', color: '#888', margin: '0 0 8px 0', zIndex: 1, textTransform: 'uppercase', letterSpacing: '2px' }}>
                Trading Campaign Season 1
              </h2>
              
              <h1 style={{ fontSize: '2.5rem', color: '#fff', margin: '0 0 24px 0', zIndex: 1, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {rank === 1 ? '1st Place' : rank === 2 ? '2nd Place' : rank === 3 ? '3rd Place' : `${rank}th Place`}
              </h1>

              <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', zIndex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>
                  <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '4px' }}>Secured</div>
                  <div style={{ color: '#00f0ff', fontSize: '1.4rem', fontWeight: 'bold' }}>{usdt} USDT</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', flex: 1 }}>
                  <div style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '4px' }}>Secured</div>
                  <div style={{ color: '#ffb800', fontSize: '1.4rem', fontWeight: 'bold' }}>{psai.toLocaleString()} PSAI</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
              <button 
                onClick={handleShare}
                style={{
                  flex: 1,
                  background: '#000',
                  color: '#fff',
                  border: '1px solid #333',
                  padding: '16px',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#111'}
                onMouseOut={(e) => e.currentTarget.style.background = '#000'}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X
              </button>

              <button 
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  border: 'none',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
