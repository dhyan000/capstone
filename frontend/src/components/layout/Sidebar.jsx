import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, FileText, Upload, Bot,
    LogOut, ChevronLeft, GitFork,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

const collegeLogo = '/college-logo.png';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/upload', label: 'Upload', icon: Upload, roles: ['staff', 'hod', 'admin'] },
    { to: '/ai-chat', label: 'AI Assistant', icon: Bot },
    { to: '/knowledge-graph', label: 'Knowledge Graph', icon: GitFork },
];

/* ── colour per route for the active glow / icon tint ─── */
const ROUTE_ACCENT = {
    '/dashboard': { icon: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', bar: '#f97316' },
    '/documents': { icon: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', bar: '#3b82f6' },
    '/upload': { icon: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', bar: '#10b981' },
    '/ai-chat': { icon: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30', bar: '#8b5cf6' },
    '/knowledge-graph': { icon: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30', bar: '#06b6d4' },
};

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => { logout(); navigate('/login'); };

    const filteredNav = navItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    const SidebarContent = ({ isCollapsed }) => (
        <div className="flex flex-col h-full">

            {/* ── Logo ───────────────────────────────────────── */}
            <div className={cn(
                'flex items-center gap-3 px-3 py-3.5 border-b border-slate-100 dark:border-dark-border relative overflow-hidden',
                isCollapsed && 'justify-center px-2'
            )}>
                {/* Subtle gradient streak behind logo */}
                <div className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(59,130,246,0.08) 100%)' }} />

                {/* College logo badge */}
                <div className={cn(
                    'relative flex-shrink-0 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-dark-border shadow-sm transition-all duration-300',
                    isCollapsed ? 'w-9 h-9' : 'w-10 h-10'
                )}
                    style={{ boxShadow: '0 0 0 2px rgba(249,115,22,0.18)' }}
                >
                    <img src={collegeLogo} alt="College Logo"
                        className="w-full h-full object-contain p-0.5"
                        onError={e => { e.currentTarget.style.display = 'none'; }} />
                </div>

                {!isCollapsed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }} className="relative">
                        <span className="font-black text-sm" style={{
                            background: 'linear-gradient(135deg, #f97316, #3b82f6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>DocPortal</span>
                        <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-medium tracking-wide uppercase">AI System</p>
                    </motion.div>
                )}
            </div>

            {/* ── Nav links ──────────────────────────────────── */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
                {filteredNav.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    const accent = ROUTE_ACCENT[item.to] || ROUTE_ACCENT['/dashboard'];

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
                                isCollapsed && 'justify-center px-2',
                                isActive
                                    ? `${accent.bg} font-semibold`
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-raised hover:text-slate-800 dark:hover:text-slate-100'
                            )}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {/* Active left bar */}
                            {isActive && (
                                <motion.span layoutId="navBar"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5/6 rounded-r-full"
                                    style={{ background: accent.bar }}
                                    transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                />
                            )}

                            <Icon className={cn(
                                'w-4 h-4 flex-shrink-0 transition-all duration-200',
                                isActive
                                    ? accent.icon
                                    : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:scale-110'
                            )} />

                            {!isCollapsed && (
                                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }} transition={{ duration: 0.1 }}
                                    className={isActive ? 'text-slate-800 dark:text-slate-100' : ''}>
                                    {item.label}
                                </motion.span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* ── User + Logout ──────────────────────────────── */}
            <div className="p-2 border-t border-slate-100 dark:border-dark-border space-y-0.5">
                {/* Avatar row */}
                <div className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl',
                    isCollapsed && 'justify-center px-2'
                )}>
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, #f97316, #3b82f6)' }}>
                        {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    {!isCollapsed && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {user?.full_name || user?.email || 'User'}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                        </motion.div>
                    )}
                </div>

                <button onClick={handleLogout}
                    className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                        'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200 group',
                        isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? 'Logout' : undefined}>
                    <LogOut className="w-4 h-4 flex-shrink-0 group-hover:rotate-12 transition-transform duration-200" />
                    {!isCollapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>Logout</motion.span>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 64 : 240 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-30 bg-white dark:bg-dark-surface border-r border-slate-100 dark:border-dark-border overflow-hidden"
            >
                <SidebarContent isCollapsed={collapsed} />

                {/* Collapse toggle */}
                <button onClick={() => setCollapsed(!collapsed)}
                    className="absolute top-4 -right-3 w-6 h-6 rounded-full bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border flex items-center justify-center shadow-sm hover:shadow-md hover:border-orange-300 transition-all z-50">
                    <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.25 }}>
                        <ChevronLeft className="w-3 h-3 text-orange-500" />
                    </motion.div>
                </button>
            </motion.aside>

            {/* Mobile drawer */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                            onClick={() => setMobileOpen(false)} />
                        <motion.aside
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed left-0 top-0 h-full w-60 z-50 lg:hidden bg-white dark:bg-dark-surface border-r border-slate-100 dark:border-dark-border">
                            <SidebarContent isCollapsed={false} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
