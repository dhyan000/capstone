import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import { login, getMe } from '../services/api';
import { useAuth } from '../context/AuthContext';
const collegeLogo = '/college-logo.png';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login({ email, password });
            const { access_token } = res.data;
            localStorage.setItem('access_token', access_token);
            const meRes = await getMe();
            loginUser(access_token, meRes.data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg">
            {/* Left branding panel — visible on lg+ */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-12 relative overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 -left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-300 rounded-full blur-3xl" />
                </div>

                {/* College Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-white shadow-lg flex items-center justify-center border-2 border-white/30">
                        <img
                            src={collegeLogo}
                            alt="College Logo"
                            className="w-full h-full object-contain p-1"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                    <span className="text-white font-bold text-xl">DocPortal</span>
                </div>

                {/* Hero text */}
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-primary-200" />
                        <span className="text-primary-200 text-sm font-medium">AI-Powered Documentation</span>
                    </div>
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        Your College's<br />Knowledge Hub
                    </h2>
                    <p className="text-primary-200 text-base leading-relaxed max-w-sm">
                        Access circulars, research papers, syllabi, and more — all searchable through our AI assistant.
                    </p>
                </div>

                {/* Feature list */}
                <div className="relative z-10 flex flex-col gap-3">
                    {['Role-based document access', 'AI-powered search & Q&A', 'Documents for every department'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-primary-100 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-300" />
                            {f}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-full max-w-[400px]"
                >
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                            <img
                                src={collegeLogo}
                                alt="College Logo"
                                className="w-full h-full object-contain p-0.5"
                                onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">DocPortal</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to your account to continue</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-2.5 p-3 mb-5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                        >
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="you@college.edu"
                                className="ui-input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="ui-input pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full justify-center py-2.5 mt-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                            Create one
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
