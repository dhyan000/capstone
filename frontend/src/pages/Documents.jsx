import { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Search, SlidersHorizontal, Trash2, Eye, FileText,
    ChevronLeft, ChevronRight, X, AlertTriangle, Bot, Send, Loader2,
    BookOpen, FlaskConical, GraduationCap, Bell, Lock, Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocuments, deleteDocument, getDocumentFile, askDocumentAI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn, formatDate } from '../lib/utils';

const CATEGORIES = ['event', 'research', 'syllabus', 'notes', 'circular', 'internal'];
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'MBA', 'ADMIN'];
const PAGE_SIZE = 12;

/* ── Per-category visual identity ────────────────────────────────────── */
const CAT_META = {
    event: { badge: 'badge-amber', gradient: 'from-amber-400  to-orange-500', icon: Calendar, glow: '#f97316' },
    research: { badge: 'badge-purple', gradient: 'from-violet-500 to-purple-600', icon: FlaskConical, glow: '#8b5cf6' },
    syllabus: { badge: 'badge-blue', gradient: 'from-blue-500   to-blue-600', icon: GraduationCap, glow: '#3b82f6' },
    notes: { badge: 'badge-green', gradient: 'from-emerald-400 to-green-500', icon: BookOpen, glow: '#10b981' },
    circular: { badge: 'badge-slate', gradient: 'from-slate-400  to-slate-600', icon: Bell, glow: '#64748b' },
    internal: { badge: 'badge-red', gradient: 'from-rose-500   to-red-600', icon: Lock, glow: '#ef4444' },
};

/* ── Skeleton card ───────────────────────────────────────────────────── */
function SkeletonCard() {
    return (
        <div className="ui-card p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 rounded-lg w-3/4" />
                    <div className="skeleton h-3 rounded-lg w-1/2" />
                </div>
            </div>
            <div className="skeleton h-3 rounded-lg" />
            <div className="skeleton h-3 rounded-lg w-2/3" />
            <div className="flex justify-between items-center pt-1">
                <div className="skeleton h-3 rounded-lg w-20" />
                <div className="skeleton h-7 rounded-xl w-16" />
            </div>
        </div>
    );
}

/* ── Delete confirmation dialog ──────────────────────────────────────── */
function DeleteDialog({ doc, onConfirm, onCancel, loading }) {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}
                className="ui-card p-6 max-w-sm w-full" style={{ border: '1.5px solid #fca5a5' }}>
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white"
                        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                        Delete Document
                    </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                    Delete <span className="font-semibold text-slate-700 dark:text-slate-200">"{doc?.title}"</span>? This cannot be undone.
                </p>
                <div className="flex gap-2 justify-end">
                    <button onClick={onCancel} className="btn-outline">Cancel</button>
                    <button onClick={onConfirm} disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

/* ── AI Ask modal ────────────────────────────────────────────────────── */
function DocAskModal({ doc, onClose }) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState(null);
    const [loading, setLoading] = useState(false);
    const meta = CAT_META[doc.category] || CAT_META.notes;

    const handleAsk = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;
        setLoading(true); setAnswer(null);
        try {
            const res = await askDocumentAI(doc.id, question.trim());
            setAnswer(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to get AI answer');
        } finally { setLoading(false); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.92, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0 }} onClick={e => e.stopPropagation()}
                className="ui-card w-full max-w-lg max-h-[80vh] flex flex-col gap-4 overflow-hidden">
                {/* Header strip */}
                <div className={`px-5 py-4 bg-gradient-to-r ${meta.gradient} flex items-center justify-between rounded-t-2xl`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm"
                                style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                                Ask AI About This Doc
                            </p>
                            <p className="text-white/70 text-xs truncate max-w-[220px]">{doc.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Answer area */}
                <div className="flex-1 overflow-y-auto px-5">
                    {answer ? (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="rounded-xl p-4 border"
                                style={{ background: 'rgba(249,115,22,0.04)', borderColor: 'rgba(249,115,22,0.20)' }}>
                                <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2">Answer</p>
                                <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{answer.answer}</p>
                            </div>
                            <p className="text-xs text-slate-400">Source: <span className="font-semibold">{answer.source_document}</span></p>
                        </motion.div>
                    ) : !loading ? (
                        <div className="text-center py-8 text-slate-400">
                            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Ask anything about this document</p>
                        </div>
                    ) : null}
                    {loading && (
                        <div className="flex items-center gap-2 py-8 justify-center">
                            <div className="w-5 h-5 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                            <span className="text-sm text-slate-400">Thinking…</span>
                        </div>
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleAsk} className="flex gap-2 px-5 pb-5">
                    <input value={question} onChange={e => setQuestion(e.target.value)}
                        placeholder="e.g. What methodology is used?"
                        className="ui-input flex-1 text-sm" disabled={loading} autoFocus />
                    <button type="submit" disabled={loading || !question.trim()} className="btn-primary !px-3">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

/* ── Animated document card ──────────────────────────────────────────── */
function DocCard({ doc, index, isAdmin, onView, onAsk, onDelete, viewingId }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const meta = CAT_META[doc.category] || CAT_META.notes;
    const Icon = meta.icon;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={inView
                ? { opacity: 1, y: 0, scale: 1, transition: { delay: (index % 6) * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] } }
                : {}}
            whileHover={{ y: -4, transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.98 }}
            className="ui-card flex flex-col gap-0 overflow-hidden group"
        >
            {/* Gradient top bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient} flex-shrink-0`} />

            <div className="p-4 flex flex-col gap-3 flex-1">
                {/* Icon + title */}
                <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
                        style={{ boxShadow: `0 4px 12px -4px ${meta.glow}55` }}>
                        <Icon className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-snug"
                            title={doc.title}
                            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                            {doc.title}
                        </h3>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className={meta.badge}>{doc.category}</span>
                            {doc.department && <span className="badge-slate">{doc.department}</span>}
                        </div>
                    </div>
                </div>

                {/* Content preview */}
                {doc.content && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 flex-1">
                        {doc.content}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2.5 border-t"
                    style={{ borderColor: '#e8ddd5' }}>
                    <div>
                        <p className="text-[11px] text-slate-400 font-medium">{formatDate(doc.created_at)}</p>
                        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">
                            {doc.role_access?.join(', ')}
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                                       text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100"
                            title="View document"
                            onClick={() => onView(doc)}
                            disabled={viewingId === doc.id}>
                            {viewingId === doc.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                                       text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-100"
                            title="Ask AI"
                            onClick={() => onAsk(doc)}>
                            <Bot className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && (
                            <button
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                                           text-red-600 bg-red-50 hover:bg-red-100 border border-red-100"
                                onClick={() => onDelete(doc)}
                                title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

/* ── Main Documents page ─────────────────────────────────────────────── */
export default function Documents() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [catFilter, setCat] = useState([]);
    const [deptFilter, setDept] = useState('');
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [askTarget, setAskTarget] = useState(null);
    const [viewingId, setViewingId] = useState(null);

    const isAdmin = user?.role === 'admin';

    const { data: docs = [], isLoading, isError } = useQuery({
        queryKey: ['documents', catFilter, deptFilter],
        queryFn: async () => {
            const params = {};
            if (catFilter.length > 0) params.category = catFilter.join(',');
            if (deptFilter) params.department = deptFilter;
            const res = await getDocuments(params);
            return res.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteDocument(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Document deleted');
            setDeleteTarget(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.detail || 'Failed to delete');
            setDeleteTarget(null);
        },
    });

    const filtered = useMemo(() => {
        if (!search.trim()) return docs;
        const q = search.toLowerCase();
        return docs.filter(d => d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q));
    }, [docs, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleFilterChange = useCallback((setter) => (e) => { setter(e.target.value); setPage(1); }, []);

    const toggleCategory = useCallback((cat) => {
        setCat(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
        setPage(1);
    }, []);

    const handleViewDocument = async (doc) => {
        setViewingId(doc.id);
        try {
            const res = await getDocumentFile(doc.id);
            const contentType = res.headers['content-type'] || 'application/pdf';
            if (contentType.includes('application/json')) {
                const text = await res.data.text();
                const json = JSON.parse(text);
                toast.error(json.error === 'document_not_available'
                    ? 'Document not available as soft copy.'
                    : json.message || 'Could not open document.');
                return;
            }

            // Explicitly set the blob type so the browser knows to render it (e.g. PDF view)
            const fileBlob = new Blob([res.data], { type: contentType });
            const url = URL.createObjectURL(fileBlob);
            const tab = window.open(url, '_blank');
            if (!tab) toast.error('Pop-up blocked. Please allow pop-ups.');
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            toast.error('Failed to fetch document.');
        } finally {
            setViewingId(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Page header ──────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white"
                        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                        Documents
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {isLoading ? 'Loading…' : `${filtered.length} document${filtered.length !== 1 ? 's' : ''} available`}
                    </p>
                </div>
                {/* Category pill strip */}
                <div className="flex gap-1.5 flex-wrap justify-start sm:justify-end max-w-full sm:max-w-md mt-3 sm:mt-0">
                    {Object.entries(CAT_META).map(([cat, m]) => {
                        const active = catFilter.includes(cat);
                        return (
                            <button key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={cn(
                                    'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                                    active
                                        ? `bg-gradient-to-r ${m.gradient} text-white border-transparent shadow-sm`
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300 hover:text-orange-600'
                                )}>
                                {cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Search + Filters ─────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <input value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search documents…"
                        className="ui-input pl-9" />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    <SlidersHorizontal className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <select value={deptFilter} onChange={handleFilterChange(setDept)} className="ui-select text-sm min-w-[130px]">
                        <option value="">All Depts</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
            </div>

            {/* ── Content ──────────────────────────────────── */}
            {isError ? (
                <div className="ui-card p-8 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    Failed to load documents. Please refresh.
                </div>
            ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : paginated.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card p-12 text-center">
                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">No documents found</p>
                    <p className="text-sm text-slate-400 mt-1">Try adjusting the filters or search term</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {paginated.map((doc, i) => (
                            <DocCard
                                key={doc.id}
                                doc={doc}
                                index={i}
                                isAdmin={isAdmin}
                                viewingId={viewingId}
                                onView={handleViewDocument}
                                onAsk={setAskTarget}
                                onDelete={setDeleteTarget}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Page {page} of {totalPages} · {filtered.length} total
                    </p>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                            return (
                                <button key={pg} onClick={() => setPage(pg)}
                                    className={cn(
                                        'w-8 h-8 rounded-xl text-sm font-semibold transition-all duration-150',
                                        pg === page
                                            ? 'text-white shadow-sm'
                                            : 'btn-outline !px-0'
                                    )}
                                    style={pg === page ? { background: 'linear-gradient(135deg,#f97316,#ea580c)' } : {}}>
                                    {pg}
                                </button>
                            );
                        })}
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="btn-outline !px-2 !py-1.5 disabled:opacity-40">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modals ───────────────────────────────────── */}
            <AnimatePresence>
                {deleteTarget && (
                    <DeleteDialog doc={deleteTarget}
                        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
                        onCancel={() => setDeleteTarget(null)}
                        loading={deleteMutation.isPending} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {askTarget && (
                    <DocAskModal doc={askTarget} onClose={() => setAskTarget(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
