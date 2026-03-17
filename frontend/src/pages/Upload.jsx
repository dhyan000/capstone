import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    UploadCloud, FileText, X, CheckCircle, AlertCircle,
    Loader2, FileUp, Image, Sparkles,
} from 'lucide-react';
import { createDocument } from '../services/api';
import { cn } from '../lib/utils';

const CATEGORIES = ['event', 'research', 'syllabus', 'notes', 'circular', 'internal'];
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];
const ROLES = ['guest', 'student', 'staff', 'hod', 'admin'];

const ROLE_COLORS = {
    guest: 'bg-slate-100 dark:bg-dark-raised text-slate-600 dark:text-slate-400',
    student: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
    staff: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    hod: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
    admin: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
};

const CAT_COLORS = {
    event: 'from-orange-500 to-orange-600',
    research: 'from-blue-500 to-blue-700',
    syllabus: 'from-violet-500 to-purple-600',
    notes: 'from-emerald-500 to-emerald-600',
    circular: 'from-amber-500 to-yellow-500',
    internal: 'from-slate-500 to-slate-700',
};

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Section header ─────────────────────────────────────────────────── */
function SectionCard({ title, children, accent }) {
    return (
        <div className="ui-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-dark-border flex items-center gap-2">
                <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${accent}`} />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function Upload() {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const thumbRef = useRef(null);

    const [form, setForm] = useState({
        title: '', content: '', category: 'notes', department: '',
        role_access: ['student', 'staff', 'hod', 'admin'],
    });
    const [file, setFile] = useState(null);
    const [thumbnail, setThumbnail] = useState(null);  // { file, previewUrl }
    const [dragging, setDrag] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleRoleToggle = role => {
        setForm(f => ({
            ...f,
            role_access: f.role_access.includes(role)
                ? f.role_access.filter(r => r !== role)
                : [...f.role_access, role],
        }));
    };

    // Main document file
    const applyFile = useCallback((f) => {
        if (!f) return;
        const allowed = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt'];
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { toast.error(`File type "${ext}" not supported`); return; }
        if (f.size > 10 * 1024 * 1024) { toast.error('File exceeds 10 MB limit'); return; }
        setFile(f);
    }, []);

    // Thumbnail image
    const applyThumbnail = useCallback((f) => {
        if (!f) return;
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) { toast.error('Thumbnail must be an image (JPG, PNG, WEBP)'); return; }
        if (f.size > 2 * 1024 * 1024) { toast.error('Thumbnail exceeds 2 MB'); return; }
        const url = URL.createObjectURL(f);
        setThumbnail({ file: f, previewUrl: url });
    }, []);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDrag(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped) applyFile(dropped);
    }, [applyFile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!file && !form.content.trim()) { toast.error('Please upload a file or enter content'); return; }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('title', form.title);
            fd.append('content', form.content);
            fd.append('category', form.category);
            if (form.department) fd.append('department', form.department);
            form.role_access.forEach(r => fd.append('role_access', r));
            if (file) fd.append('file', file);
            if (thumbnail?.file) fd.append('thumbnail', thumbnail.file);
            await createDocument(fd);
            toast.success('Document uploaded successfully!');
            navigate('/documents');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Upload failed';
            setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
            toast.error('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const catGrad = CAT_COLORS[form.category] || 'from-slate-500 to-slate-700';

    return (
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${catGrad} flex items-center justify-center shadow-md`}>
                    <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white"
                        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                        Upload Document
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">Text is extracted automatically for AI search</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Document Details ── */}
                <SectionCard title="Document Details" accent="from-orange-400 to-orange-600">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                                Title <span className="text-orange-500">*</span>
                            </label>
                            <input name="title" value={form.title} onChange={handleChange} required
                                placeholder="e.g. CSE Syllabus 2024" className="ui-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Category</label>
                                <select name="category" value={form.category} onChange={handleChange} className="ui-select">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Department</label>
                                <select name="department" value={form.department} onChange={handleChange} className="ui-select">
                                    <option value="">None (Public)</option>
                                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* ── File Upload ── */}
                <SectionCard title="Document File" accent="from-blue-400 to-blue-600">
                    <AnimatePresence mode="wait">
                        {!file ? (
                            <motion.div key="dropzone"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                                onDragLeave={() => setDrag(false)}
                                onDrop={onDrop}
                                onClick={() => fileRef.current?.click()}
                                className={cn(
                                    'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                                    dragging
                                        ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/20'
                                        : 'border-slate-200 dark:border-dark-border hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/10'
                                )}>
                                <input ref={fileRef} type="file" hidden
                                    onChange={e => applyFile(e.target.files[0])}
                                    accept=".pdf,.docx,.xlsx,.xls,.csv,.txt" />
                                <UploadCloud className={cn('w-8 h-8 mx-auto mb-3', dragging ? 'text-orange-500' : 'text-slate-300')} />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {dragging ? 'Drop to upload' : 'Drag & drop or click to browse'}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, CSV, TXT · Max 10 MB</p>
                            </motion.div>
                        ) : (
                            <motion.div key="preview"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                                    <FileUp className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</p>
                                    <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                                </div>
                                <button type="button" onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </SectionCard>

                {/* ── Thumbnail ── */}
                <SectionCard title="Cover Thumbnail" accent="from-violet-400 to-purple-600">
                    <p className="text-xs text-slate-400 mb-3">
                        Optional image shown as this document's preview card. (JPG, PNG, WEBP · Max 2 MB)
                    </p>
                    <AnimatePresence mode="wait">
                        {!thumbnail ? (
                            <motion.div key="thumb-drop"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => thumbRef.current?.click()}
                                className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200
                                           border-slate-200 dark:border-dark-border hover:border-violet-300 hover:bg-violet-50/50 dark:hover:bg-violet-950/10">
                                <input ref={thumbRef} type="file" hidden
                                    onChange={e => applyThumbnail(e.target.files[0])}
                                    accept=".jpg,.jpeg,.png,.webp,.gif" />
                                <Image className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                <p className="text-xs font-medium text-slate-500">Click to add thumbnail</p>
                            </motion.div>
                        ) : (
                            <motion.div key="thumb-preview"
                                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900">
                                <img src={thumbnail.previewUrl} alt="thumbnail"
                                    className="w-14 h-14 rounded-lg object-cover border border-violet-200 shadow-sm flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{thumbnail.file.name}</p>
                                    <p className="text-xs text-slate-500">{formatSize(thumbnail.file.size)}</p>
                                </div>
                                <button type="button"
                                    onClick={() => { URL.revokeObjectURL(thumbnail.previewUrl); setThumbnail(null); }}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </SectionCard>

                {/* ── Manual Content ── */}
                <SectionCard title="Additional Notes" accent="from-emerald-400 to-emerald-600">
                    <textarea name="content" value={form.content} onChange={handleChange} rows={3}
                        placeholder="Paste additional text or type details..." className="ui-input resize-none" />
                </SectionCard>

                {/* ── Role Access ── */}
                <SectionCard title="Who Can See This?" accent="from-amber-400 to-orange-500">
                    <div className="flex flex-wrap gap-2">
                        {ROLES.map(role => {
                            const selected = form.role_access.includes(role);
                            return (
                                <button key={role} type="button" onClick={() => handleRoleToggle(role)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 border',
                                        selected
                                            ? `${ROLE_COLORS[role]} border-transparent ring-2 ring-current ring-offset-1`
                                            : 'bg-slate-50 dark:bg-dark-raised text-slate-400 border-slate-200 dark:border-dark-border hover:border-slate-300'
                                    )}>
                                    {selected && <CheckCircle className="w-3 h-3 inline mr-1" />}
                                    {role.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* ── Submit ── */}
                <button type="submit" disabled={loading}
                    className="btn-primary w-full justify-center py-3 text-sm font-bold"
                    style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                    {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                    ) : (
                        <><Sparkles className="w-4 h-4" />Upload Document</>
                    )}
                </button>
            </form>
        </div>
    );
}
