import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_SRC = '/college-logo.png';
const TOTAL_MS = 3000; // total splash duration before fade-out starts
const FADE_MS = 500;  // exit fade duration

/* ─── per-letter spring config ──────────────────────────────────────────── */
const spring = { type: 'spring', stiffness: 260, damping: 22 };

function Letter({ char, delay, color, glow }) {
    return (
        <motion.span
            initial={{ opacity: 0, y: 48, filter: 'blur(10px)', scale: 0.72 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ ...spring, delay }}
            style={{
                color,
                textShadow: glow ? `0 0 32px ${glow}` : undefined,
                display: 'inline-block',
                lineHeight: 1,
            }}
        >
            {char}
        </motion.span>
    );
}

/* ─── 'I' that carries the logo as its dot ──────────────────────────────── */
function LogoLetter({ delay }) {
    /*
     * Technique: position:relative span containing:
     *   1. the letter 'ı' (U+0131 — dotless i) at normal flow
     *   2. the logo absolutely positioned above, centred over the stem
     * Because the parent flex row uses items-end the BOTTOM of the ı aligns
     * perfectly with every other letter's bottom — logo floats freely above.
     */
    return (
        <motion.span
            initial={{ opacity: 0, y: 48, filter: 'blur(10px)', scale: 0.72 }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
            transition={{ ...spring, delay }}
            style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: 1,
                /* leave room above the stem for the logo dot */
                paddingTop: '0.65em',
                color: '#a5b4fc',
                textShadow: '0 0 32px rgba(99,102,241,0.9)',
            }}
        >
            {/* Logo dot — pops in slightly after the letter */}
            <motion.span
                initial={{ opacity: 0, scale: 0, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                    delay: delay + 0.18,
                    type: 'spring',
                    stiffness: 380,
                    damping: 18,
                }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0.62em',
                    height: '0.62em',
                    borderRadius: '0.12em',
                    overflow: 'hidden',
                    background: '#fff',
                    boxShadow: '0 0 14px 3px rgba(165,180,252,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src={LOGO_SRC}
                    alt="College Logo"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '0.04em' }}
                />
            </motion.span>

            {/* Dotless i — keeps baseline identical to S and K */}
            ı
        </motion.span>
    );
}

/* ─── Heart — scale+rotate pop ──────────────────────────────────────────── */
function Heart({ delay }) {
    return (
        <motion.span
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
                delay,
                type: 'spring',
                stiffness: 320,
                damping: 14,
            }}
            style={{
                display: 'inline-block',
                lineHeight: 1,
                fontSize: '0.7em',
                /* nudge heart up slightly so it sits nicely mid-cap-height */
                position: 'relative',
                top: '-0.08em',
            }}
        >
            ❤️
        </motion.span>
    );
}

/* ─── Main export ─────────────────────────────────────────────────────── */
export default function SplashScreen({ onDone }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const t1 = setTimeout(() => setVisible(false), TOTAL_MS);
        const t2 = setTimeout(() => onDone?.(), TOTAL_MS + FADE_MS + 80);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [onDone]);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="splash"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(160deg, #080c14 0%, #0f172a 55%, #070b12 100%)',
                        userSelect: 'none',
                        overflow: 'hidden',
                    }}
                >
                    {/* ── Glow blobs ───────────────────────────────── */}
                    <div style={{
                        position: 'absolute', width: 560, height: 560,
                        borderRadius: '50%', top: '-10%', left: '-8%',
                        background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
                        filter: 'blur(48px)', pointerEvents: 'none',
                    }} />
                    <div style={{
                        position: 'absolute', width: 440, height: 440,
                        borderRadius: '50%', bottom: '-8%', right: '-6%',
                        background: 'radial-gradient(circle, rgba(167,139,250,0.14) 0%, transparent 70%)',
                        filter: 'blur(48px)', pointerEvents: 'none',
                    }} />

                    {/* ── Text row ─────────────────────────────────── */}
                    {/*
                        items-end  →  every child's BOTTOM edge lines up.
                        Because ı is at the very bottom of LogoLetter (logo
                        floats upward via absolute positioning + paddingTop),
                        the baseline of ı, S and K are all identical.
                    */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '0.18em',
                        fontSize: 'clamp(3.5rem, 11vw, 6.5rem)',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                    }}>
                        {/* I */}
                        <Letter char="I" delay={0.05} color="#ffffff"
                            glow="rgba(255,255,255,0.35)" />

                        {/* ❤ */}
                        <Heart delay={0.27} />

                        {/* S */}
                        <Letter char="S" delay={0.50} color="#a5b4fc"
                            glow="rgba(99,102,241,0.85)" />

                        {/* K */}
                        <Letter char="K" delay={0.72} color="#a5b4fc"
                            glow="rgba(99,102,241,0.85)" />

                        {/* i with logo dot */}
                        <LogoLetter delay={0.94} />
                    </div>

                    {/* ── Tagline ───────────────────────────────────── */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5, duration: 0.6, ease: 'easeOut' }}
                        style={{
                            marginTop: '1.4rem',
                            color: 'rgba(148,163,184,0.8)',
                            fontSize: '0.72rem',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontWeight: 500,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                        }}
                    >
                        AI Document Portal
                    </motion.p>

                    {/* ── Progress bar ──────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.0 }}
                        style={{
                            position: 'absolute',
                            bottom: '2.5rem',
                            width: '7rem',
                            height: '2px',
                            borderRadius: '9999px',
                            background: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden',
                        }}
                    >
                        <motion.div
                            initial={{ scaleX: 0, originX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{
                                delay: 1.1,
                                duration: (TOTAL_MS - 1100) / 1000,
                                ease: 'linear',
                            }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #6366f1, #a78bfa, #818cf8)',
                                borderRadius: '9999px',
                            }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
