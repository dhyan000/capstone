import { useEffect, useState } from 'react';
import { getDocuments } from '../services/api';

const CATEGORIES = ['event', 'research', 'syllabus', 'notes', 'circular', 'internal'];
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];

const categoryIcons = {
    event: '🎉', research: '🔬', syllabus: '📘', notes: '📝', circular: '📢', internal: '🔒',
};

export default function Documents() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ category: '', department: '' });

    const fetchDocs = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (filters.category) params.category = filters.category;
            if (filters.department) params.department = filters.department;
            const res = await getDocuments(params);
            setDocs(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDocs(); }, [filters]);

    return (
        <div className="page">
            <h1>Documents</h1>

            <div className="filters">
                <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                    <option value="">All Categories</option>
                    {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                </select>
                <select
                    value={filters.department}
                    onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                >
                    <option value="">All Departments</option>
                    {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {loading ? (
                <div className="loading">Loading documents...</div>
            ) : docs.length === 0 ? (
                <div className="empty-state">
                    <p>📭 No documents found for your access level.</p>
                </div>
            ) : (
                <div className="doc-grid">
                    {docs.map((doc) => (
                        <div key={doc.id} className="card doc-card">
                            <div className="doc-card-header">
                                <span className="doc-icon">{categoryIcons[doc.category] || '📄'}</span>
                                <div>
                                    <h3>{doc.title}</h3>
                                    <div className="doc-meta">
                                        <span className="badge badge-category">{doc.category}</span>
                                        {doc.department && <span className="badge badge-dept">{doc.department}</span>}
                                    </div>
                                </div>
                            </div>
                            {doc.content && (
                                <p className="doc-preview">{doc.content.substring(0, 150)}{doc.content.length > 150 ? '...' : ''}</p>
                            )}
                            <div className="doc-footer">
                                <span className="text-muted">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                                <span className="text-muted">
                                    Roles: {doc.role_access?.join(', ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
