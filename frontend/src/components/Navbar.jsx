import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout, isAllowed } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="navbar">
            <div className="nav-brand">
                <Link to="/dashboard">📚 AI Docs</Link>
            </div>
            <div className="nav-links">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/documents">Documents</Link>
                {isAllowed('staff', 'hod', 'admin') && (
                    <Link to="/upload">Upload</Link>
                )}
                <Link to="/ai-chat">AI Chat</Link>
            </div>
            <div className="nav-user">
                <span className="user-badge">{user.role.toUpperCase()}</span>
                <span>{user.full_name || user.email}</span>
                <button onClick={handleLogout} className="btn-logout">Logout</button>
            </div>
        </nav>
    );
}
