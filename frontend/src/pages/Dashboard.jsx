import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/api';
import {
    LayoutDashboard, FileText, Upload, Bot,
    Shield, Users, GraduationCap, Briefcase,
    ArrowRight, CheckCircle2, Sparkles, TrendingUp,
    BookOpen, MessageSquare, Star, RefreshCw,
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const ROLE_CONFIG = {
    admin: { label: 'Admin', color: 'badge-red', icon: Shield, access: 'Full access to all documents across all departments.' },
    hod: { label: 'HOD', color: 'badge-amber', icon: GraduationCap, access: 'Full access to your department + all research papers.' },
    staff: { label: 'Staff', color: 'badge-green', icon: Briefcase, access: 'Access to your department documents + research papers.' },
    student: { label: 'Student', color: 'badge-blue', icon: Users, access: 'Access to your department documents + all research papers.' },
    guest: { label: 'Guest', color: 'badge-slate', icon: Users, access: 'Access to events and circulars only.' },
};

const QUICK_LINKS = [
    { to: '/documents', icon: FileText, label: 'Browse Documents', desc: 'View all accessible documents', gradient: 'from-blue-500 to-blue-600', glow: 'rgba(59,130,246,0.3)' },
    { to: '/ai-chat', icon: Bot, label: 'AI Assistant', desc: 'Ask questions about documents', gradient: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.3)' },
    { to: '/upload', icon: Upload, label: 'Upload Document', desc: 'Add new document to system', gradient: 'from-orange-500 to-orange-600', glow: 'rgba(249,115,22,0.3)', roles: ['staff', 'hod', 'admin'] },
];

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/* ── Typing animation hook ─────────────────────────────────────────── */
function useTyping(text, delay = 40) {
    const [displayed, setDisplayed] = useState('');
    useEffect(() => {
        setDisplayed('');
        let i = 0;
        const id = setInterval(() => {
            setDisplayed(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(id);
        }, delay);
        return () => clearInterval(id);
    }, [text, delay]);
    return displayed;
}

/* ── Animated counter ──────────────────────────────────────────────── */
function AnimCount({ to, duration = 1000 }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!to) return;
        let start = null;
        const step = (ts) => {
            if (!start) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            setVal(Math.floor(progress * to));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [to, duration]);
    return <>{val}</>;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);

    const firstName = user?.full_name?.split(' ')[0] || 'there';
    const greeting = `Welcome back, ${firstName} 👋`;
    const typedName = useTyping(greeting, 38);

    useEffect(() => {
        getDashboardStats()
            .then(r => setStats(r.data))
            .catch(() => setStats({ document_count: 0, department_count: 0, ai_query_count: 0 }))
            .finally(() => setLoadingStats(false));
    }, []);

    if (!user) return null;

    const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.guest;
    const RoleIcon = roleConf.icon;
    const visibleLinks = QUICK_LINKS.filter(l => !l.roles || l.roles.includes(user.role));

    const STATS_ROW = [
        { label: 'Documents', value: stats?.document_count, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
        { label: 'AI Queries', value: stats?.ai_query_count, icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
        { label: 'Departments', value: stats?.department_count, icon: Star, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20' },
    ];

    return (
        <motion.div className="space-y-7" variants={stagger} initial="hidden" animate="visible">

            {/* ── Hero banner ──────────────────────────────── */}
            <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl p-6 text-white"
                style={{
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 40%, #2563eb 100%)',
                    boxShadow: '0 8px 32px -8px rgba(249,115,22,0.5)',
                    fontFamily: "'Plus Jakarta Sans', Inter, system-ui, sans-serif",
                }}>
                {/* Decorative blobs */}
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
                <div className="absolute -bottom-6 left-20 w-32 h-32 rounded-full opacity-10 blur-2xl"
                    style={{ background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)' }} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-4 h-4 text-orange-200" />
                            <span className="text-orange-200 text-xs font-semibold uppercase tracking-widest">
                                SKI Document Portal
                            </span>
                        </div>

                        {/* Typing greeting */}
                        <h1 className="text-2xl sm:text-3xl font-black leading-tight min-h-[2.5rem]"
                            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                            {typedName}
                            <span className="animate-pulse ml-0.5 opacity-70">|</span>
                        </h1>

                        <p className="text-white/75 text-sm mt-1">{roleConf.access}</p>
                    </div>

                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30
                                    flex items-center justify-center text-white text-2xl font-black flex-shrink-0"
                        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                        {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                </div>

                {/* Meta chips */}
                <div className="relative z-10 flex flex-wrap gap-2 mt-4">
                    <span className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-white/90 border border-white/20">
                        <RoleIcon className="w-3 h-3" /> {roleConf.label}
                    </span>
                    {user.department && (
                        <span className="bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-semibold text-white/90 border border-white/20">
                            {user.department}
                        </span>
                    )}
                    {user.is_active && (
                        <span className="flex items-center gap-1 bg-emerald-400/20 rounded-full px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                    )}
                    <span className="bg-white/15 rounded-full px-3 py-1 text-xs font-semibold text-white/80 border border-white/20">
                        {user.email}
                    </span>
                </div>
            </motion.div>

            {/* ── Real-time Stats row ───────────────────────── */}
            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
                {STATS_ROW.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="stat-card">
                            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                                <Icon className={`w-4 h-4 ${s.color}`} />
                            </div>
                            <p className="text-xl font-black text-slate-800 dark:text-white leading-none"
                                style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                                {loadingStats ? (
                                    <span className="inline-block w-8 h-5 bg-slate-200 dark:bg-dark-raised rounded animate-pulse" />
                                ) : (
                                    <AnimCount to={s.value || 0} />
                                )}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.label}</p>
                        </div>
                    );
                })}
            </motion.div>

            {/* ── Quick links ───────────────────────────────── */}
            <motion.div variants={fadeUp}>
                <p className="section-title">Quick Access</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <motion.div key={link.to}
                                whileHover={{ y: -3, transition: { duration: 0.18 } }}
                                whileTap={{ scale: 0.98 }}>
                                <Link to={link.to} className="ui-card p-4 flex items-center gap-4 group block relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
                                        style={{ background: `linear-gradient(135deg, ${link.glow.replace('0.3', '0.06')}, transparent)` }} />
                                    <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0 relative">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{link.label}</p>
                                        <p className="text-xs text-slate-400 truncate mt-0.5">{link.desc}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:translate-x-1.5 transition-all duration-200 flex-shrink-0" />
                                </Link>
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* ── Access card ───────────────────────────────── */}
            <motion.div variants={fadeUp}>
                <p className="section-title">Your Access</p>
                <div className="card-accent p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #f97316, #3b82f6)' }}>
                            <RoleIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Level</p>
                            <span className={`${roleConf.color} text-xs`}>{roleConf.label}</span>
                        </div>
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed pl-12">{roleConf.access}</p>
                </div>
            </motion.div>

        </motion.div>
    );
}
