import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDocument } from '../services/api';

const CATEGORIES = ['event', 'research', 'syllabus', 'notes', 'circular', 'internal'];
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];
const ROLES = ['guest', 'student', 'staff', 'hod', 'admin'];

export default function Upload() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        title: '',
        content: '',
        category: 'event',
        department: '',
        role_access: ['student', 'staff', 'hod', 'admin'],
    });
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleRoleToggle = (role) => {
        setForm((prev) => ({
            ...prev,
            role_access: prev.role_access.includes(role)
                ? prev.role_access.filter((r) => r !== role)
                : [...prev.role_access, role],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', form.title);
            formData.append('content', form.content);
            formData.append('category', form.category);
            if (form.department) formData.append('department', form.department);

            // In FormData, append multiple values for the same key for arrays
            form.role_access.forEach((role) => {
                formData.append('role_access', role);
            });

            if (file) {
                formData.append('file', file);
            }

            await createDocument(formData);
            navigate('/documents');
        } catch (err) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <h1>Upload Document</h1>
            <div className="card upload-card">
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Title</label>
                        <input name="title" value={form.title} onChange={handleChange} required placeholder="Document title" />
                    </div>

                    <div className="form-group">
                        <label>Upload File (PDF, DOCX, XLSX, CSV)</label>
                        <div className="file-input-wrapper">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                                className="file-input"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="btn btn-outline">
                                {file ? `📄 ${file.name}` : '📁 Choose File'}
                            </label>
                        </div>
                        <p className="help-text">Max size: 10MB. Text will be extracted for AI Chat.</p>
                    </div>

                    <div className="form-group">
                        <label>Manual Content (Optional)</label>
                        <textarea name="content" value={form.content} onChange={handleChange} rows={5} placeholder="Paste additional text or type details..." />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Category</label>
                            <select name="category" value={form.category} onChange={handleChange}>
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <select name="department" value={form.department} onChange={handleChange}>
                                <option value="">None (Public)</option>
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Role Access</label>
                        <div className="checkbox-group">
                            {ROLES.map((role) => (
                                <label key={role} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={form.role_access.includes(role)}
                                        onChange={() => handleRoleToggle(role)}
                                    />
                                    {role.toUpperCase()}
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Uploading...' : '⬆️ Upload Document'}
                    </button>
                </form>
            </div>
        </div>
    );
}
