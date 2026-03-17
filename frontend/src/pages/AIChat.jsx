import { useState, useRef, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, Copy, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { askAI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { cn, getInitials } from '../lib/utils';

// ── Error Boundary ─────────────────────────────────────────────────────────
class ChatErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(e, i) { console.error('AIChat error:', e, i); }
    render() {
        if (this.state.hasError) return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400">Chat panel encountered an error. Please refresh.</p>
                </div>
            </div>
        );
        return this.props.children;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────
const FALLBACK = 'AI service is temporarily unavailable. Please try again later.';
const make = (type, text, sources = []) => ({ id: crypto.randomUUID(), type, text, sources });

const SUGGESTIONS = [
    'What events are happening this month?',
    'Show me recent circulars',
    'Summarize research papers',
    'What is in the CSE syllabus?',
];

// ── Copy Button ────────────────────────────────────────────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-dark-raised text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="Copy response"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );
}

// ── Typing Indicator ───────────────────────────────────────────────────────
function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-1 py-1">
            {[0, 1, 2].map(i => (
                <span
                    key={i}
                    className={`w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 inline-block dot-${i + 1}`}
                    style={{ animationDelay: `${i * 0.2}s` }}
                />
            ))}
        </div>
    );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, userInitials }) {
    const isUser = msg.type === 'user';
    const isError = msg.type === 'error';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn('flex gap-2.5 group', isUser && 'flex-row-reverse')}
        >
            {/* Avatar */}
            <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                isUser
                    ? 'text-white'
                    : isError
                        ? 'bg-red-100 dark:bg-red-950/30'
                        : 'text-white'
            )}
                style={isUser
                    ? { background: 'linear-gradient(135deg, #f97316, #ea580c)' }
                    : isError ? {} : { background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }
                }>
                {isUser
                    ? userInitials
                    : isError
                        ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        : <Bot className="w-3.5 h-3.5" />
                }
            </div>

            {/* Bubble */}
            <div className={cn(
                'max-w-[75%] relative',
                isUser ? 'items-end' : 'items-start'
            )}>
                <div className={cn(
                    'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                    isUser
                        ? 'text-white rounded-tr-sm'
                        : isError
                            ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-tl-sm'
                            : 'bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-soft'
                )}
                    style={isUser ? { background: 'linear-gradient(135deg, #f97316, #ea580c)' } : {}}>
                    {isUser ? (
                        <p>{msg.text}</p>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-pre:bg-slate-100 dark:prose-pre:bg-dark-raised prose-pre:text-xs prose-code:text-primary-600 dark:prose-code:text-primary-400 prose-code:bg-slate-100 dark:prose-code:bg-dark-raised prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-headings:mt-2 prose-headings:mb-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Sources */}
                {msg.sources?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 ml-1">
                        <span className="text-xs text-slate-400">Sources:</span>
                        {msg.sources.map((s, i) => (
                            <span key={i} className="badge-slate text-xs">{s}</span>
                        ))}
                    </div>
                )}

                {/* Copy button for AI messages */}
                {!isUser && !isError && (
                    <div className="absolute -top-2 right-0">
                        <CopyButton text={msg.text} />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ── Main Chat Component ────────────────────────────────────────────────────
function AIChatInner() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const userInitials = getInitials(user?.full_name || user?.email || 'U');

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const handleSend = async (text) => {
        const q = (text ?? input).trim();
        if (!q || loading) return;
        setMessages(prev => [...prev, make('user', q)]);
        setInput('');
        setLoading(true);
        try {
            const res = await askAI(q);
            const answer = res?.data?.answer ?? res?.data?.detail ?? FALLBACK;
            const sources = Array.isArray(res?.data?.sources) ? res.data.sources : [];
            setMessages(prev => [...prev, make('ai', answer, sources)]);
        } catch (err) {
            const raw = err?.response?.data?.detail;
            const msg = typeof raw === 'string' ? raw
                : Array.isArray(raw) ? raw.map(e => e?.msg || JSON.stringify(e)).join(' | ')
                    : err?.message || FALLBACK;
            setMessages(prev => [...prev, make('error', msg)]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-60px-2rem-2rem)] min-h-[500px]">
            {/* Chat area */}
            <div className="ui-card flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-dark-border"
                    style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.06) 0%, rgba(59,130,246,0.06) 100%)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ background: 'linear-gradient(135deg, #f97316, #3b82f6)' }}>
                        <Bot className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white"
                            style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>AI Document Assistant</p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-slate-400">Online · SKI Portal</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Empty state */}
                    {messages.length === 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center h-full text-center py-12"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950/40 dark:to-primary-900/20 flex items-center justify-center mb-4">
                                <Sparkles className="w-7 h-7 text-primary-500" />
                            </div>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Ask me anything</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
                                I can answer questions about documents you have access to in your department.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleSend(s)}
                                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-dark-raised text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700 dark:hover:text-orange-400 transition-colors border border-transparent hover:border-orange-200 dark:hover:border-orange-900"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Message list */}
                    <AnimatePresence>
                        {messages.map(msg => (
                            <MessageBubble key={msg.id} msg={msg} userInitials={userInitials} />
                        ))}
                    </AnimatePresence>

                    {/* Typing indicator */}
                    {loading && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #f97316, #3b82f6)' }}>
                                <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div className="px-3 py-2 rounded-2xl rounded-tl-sm bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border shadow-soft">
                                <TypingDots />
                            </div>
                        </motion.div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-slate-100 dark:border-dark-border">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question about your documents…"
                            disabled={loading}
                            rows={1}
                            className={cn(
                                'ui-input resize-none flex-1 min-h-[40px] max-h-[120px] overflow-y-auto py-2 leading-5',
                                'scrollbar-thin'
                            )}
                            style={{ height: 'auto' }}
                            onInput={e => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !input.trim()}
                            className="btn-primary !px-3 !py-2 flex-shrink-0 self-end"
                            title="Send (Enter)"
                            aria-label="Send message"
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                : <Send className="w-4 h-4" />
                            }
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 ml-1">Press Enter to send · Shift+Enter for newline</p>
                </div>
            </div>
        </div>
    );
}

export default function AIChat() {
    return (
        <ChatErrorBoundary>
            <AIChatInner />
        </ChatErrorBoundary>
    );
}
