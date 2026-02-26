import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();

    if (!user) return null;

    const roleColors = {
        guest: '#94a3b8', student: '#3b82f6', staff: '#10b981', hod: '#f59e0b', admin: '#ef4444',
    };

    return (
        <div className="page">
            <h1>Dashboard</h1>
            <div className="dashboard-grid">
                <div className="card profile-card">
                    <div className="card-header">
                        <div className="avatar">{(user.full_name || user.email)[0].toUpperCase()}</div>
                        <div>
                            <h2>{user.full_name || 'Unnamed User'}</h2>
                            <p className="text-muted">{user.email}</p>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="info-row">
                            <span className="info-label">Role</span>
                            <span className="role-badge" style={{ background: roleColors[user.role] || '#6b7280' }}>
                                {user.role.toUpperCase()}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Department</span>
                            <span className="info-value">{user.department || 'N/A'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Status</span>
                            <span className={`status-dot ${user.is_active ? 'active' : 'inactive'}`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Member Since</span>
                            <span className="info-value">{new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3>Quick Access</h3>
                    <div className="quick-links">
                        <a href="/documents" className="quick-link">📄 View Documents</a>
                        <a href="/ai-chat" className="quick-link">🤖 AI Chat</a>
                        {['staff', 'hod', 'admin'].includes(user.role) && (
                            <a href="/upload" className="quick-link">⬆️ Upload Document</a>
                        )}
                    </div>
                </div>

                <div className="card">
                    <h3>Access Level</h3>
                    <p className="text-muted">
                        {user.role === 'admin' && 'Full access to all documents across all departments.'}
                        {user.role === 'hod' && `Full access to ${user.department} department documents + research papers.`}
                        {user.role === 'staff' && `Access to ${user.department} department documents + research papers.`}
                        {user.role === 'student' && `Access to ${user.department} department documents + all research papers.`}
                        {user.role === 'guest' && 'Access to events and circulars only.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
