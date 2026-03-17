import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';
import { register } from '../services/api';

const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];
const ROLES = [
    { value: 'student', label: 'Student' },
    { value: 'staff', label: 'Staff' },
    { value: 'hod', label: 'Head of Department' },
    { value: 'guest', label: 'Guest' },
];

export default function Register() {
    const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'student', department: '' });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { ...form };
            if (!payload.department) delete payload.department;
            await register(payload);
            navigate('/login');
        } catch (err) {
            const detail = err.response?.data?.detail;
            setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : detail || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg">
            {/* Left branding */}
            <div className="hidden lg:flex flex-col justify-between w-[42%] bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-900 p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 -left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-300 rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-white font-bold text-xl">DocPortal</span>
                </div>
                <div className="relative z-10">
                    <h2 className="text-4xl font-bold text-white leading-tight mb-4">
                        Join your<br />college portal
                    </h2>
                    <p className="text-violet-200 text-base leading-relaxed max-w-sm">
                        Create an account and get instant access to documents, circulars, and AI-powered assistance tailored to your role.
                    </p>
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                    {['Students', 'Staff', 'HODs', 'Admins'].map(r => (
                        <div key={r} className="flex items-center gap-2 text-violet-100 text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-300" />
                            Role-based access for {r}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="w-full max-w-[420px]"
                >
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">DocPortal</span>
                    </div>

                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create your account</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Fill in your details to get started</p>
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
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
                            <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="e.g. John Doe" className="ui-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@college.edu" className="ui-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Min 8 characters"
                                    className="ui-input pr-10"
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                                <select name="role" value={form.role} onChange={handleChange} className="ui-select">
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Department</label>
                                <select name="department" value={form.department} onChange={handleChange} className="ui-select">
                                    <option value="">None</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1">
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                            ) : (
                                <>Create Account <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Sign in</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
