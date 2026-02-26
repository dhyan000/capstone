import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login, getMe } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLES = ['guest', 'student', 'staff', 'hod', 'admin'];
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];

export default function Register() {
    const [form, setForm] = useState({
        email: '', password: '', full_name: '', role: 'guest', department: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { loginUser } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { ...form };
            if (!payload.department) delete payload.department; // nullable for guest
            await register(payload);
            // Auto-login after registration
            const res = await login({ email: form.email, password: form.password });
            const { access_token } = res.data;
            localStorage.setItem('access_token', access_token);
            const meRes = await getMe();
            loginUser(access_token, meRes.data);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>📚 AI Docs</h1>
                    <p>College Documentation System</p>
                </div>
                <h2>Register</h2>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Full Name</label>
                        <input name="full_name" value={form.full_name} onChange={handleChange} placeholder="Your full name" />
                    </div>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@college.edu" />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} placeholder="Min 8 characters" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Role</label>
                            <select name="role" value={form.role} onChange={handleChange}>
                                {ROLES.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <select name="department" value={form.department} onChange={handleChange}>
                                <option value="">None (Guest)</option>
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                <p className="auth-switch">
                    Already registered? <Link to="/login">Login</Link>
                </p>
            </div>
        </div>
    );
}
