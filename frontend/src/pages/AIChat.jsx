import { useState, useRef, useEffect } from 'react';
import { askAI } from '../services/api';

// ─── Error Boundary ────────────────────────────────────────────────────────
import { Component } from 'react';

class ChatErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error('AIChat render error:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="page chat-page">
                    <div className="chat-container">
                        <div className="chat-empty">
                            <p>⚠️ The chat panel encountered an error. Please refresh the page.</p>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeMsg(type, text, sources = []) {
    return { id: Date.now() + Math.random(), type, text, sources };
}

const FALLBACK_MSG = '⚠️ AI service is temporarily unavailable. Please try again later.';

// ─── Main Component ────────────────────────────────────────────────────────
function AIChatInner() {
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        try {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (_) { /* silent */ }
    }, [messages, loading]);

    const handleSend = async (text) => {
        const q = (text ?? question).trim();
        if (!q) return;

        // Append user message using functional update (never stale)
        setMessages((prev) => [...(prev ?? []), makeMsg('user', q)]);
        setQuestion('');
        setLoading(true);

        try {
            const res = await askAI(q);

            // Guard against unexpected response shape
            const answer =
                res?.data?.answer ??
                res?.data?.detail ??
                FALLBACK_MSG;

            const sources = Array.isArray(res?.data?.sources) ? res.data.sources : [];

            setMessages((prev) => [
                ...(prev ?? []),
                makeMsg('ai', answer, sources),
            ]);
        } catch (err) {
            console.error('AI Error:', err?.response?.data || err?.message || err);

            // Never rethrow — always show graceful fallback
            // FastAPI/Pydantic returns `detail` as an array of objects on validation
            // errors — rendering an object as a React child crashes the app.
            // Safely coerce to a string no matter what shape the backend returns.
            const rawDetail = err?.response?.data?.detail;
            const detail =
                typeof rawDetail === 'string'
                    ? rawDetail
                    : Array.isArray(rawDetail)
                        ? rawDetail.map((e) => e?.msg || JSON.stringify(e)).join(' | ')
                        : typeof rawDetail === 'object' && rawDetail !== null
                            ? JSON.stringify(rawDetail)
                            : err?.message || FALLBACK_MSG;

            setMessages((prev) => [
                ...(prev ?? []),
                makeMsg('error', detail || FALLBACK_MSG),
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        handleSend();
    };

    return (
        <div className="page chat-page">
            <h1>🤖 AI Document Assistant</h1>
            <p className="text-muted">Ask questions about documents you have access to.</p>

            <div className="chat-container">
                <div className="chat-messages">
                    {/* Empty state */}
                    {(messages?.length ?? 0) === 0 && !loading && (
                        <div className="chat-empty">
                            <p>💬 Ask a question to get started</p>
                            <div className="suggestions">
                                <button onClick={() => handleSend('What events are happening?')}>
                                    What events are happening?
                                </button>
                                <button onClick={() => handleSend('Show me recent circulars')}>
                                    Show me recent circulars
                                </button>
                                <button onClick={() => handleSend('Summarize research papers')}>
                                    Summarize research papers
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message list */}
                    {(messages ?? []).map((msg) => (
                        <div key={msg?.id ?? Math.random()} className={`chat-msg chat-${msg?.type ?? 'ai'}`}>
                            <div className="msg-avatar">
                                {msg?.type === 'user' ? '👤' : msg?.type === 'error' ? '⚠️' : '🤖'}
                            </div>
                            <div className="msg-content">
                                <p>{msg?.text || ''}</p>
                                {Array.isArray(msg?.sources) && msg.sources.length > 0 && (
                                    <div className="msg-sources">
                                        <span>Sources:</span>
                                        {msg.sources.map((s, j) => (
                                            <span key={j} className="source-tag">{s ?? ''}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading / Thinking indicator */}
                    {loading && (
                        <div className="chat-msg chat-ai">
                            <div className="msg-avatar">🤖</div>
                            <div className="msg-content">
                                <p className="typing">Thinking...</p>
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={bottomRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleSubmit} className="chat-input">
                    <input
                        value={question ?? ''}
                        onChange={(e) => setQuestion(e?.target?.value ?? '')}
                        placeholder="Ask a question about your documents..."
                        disabled={loading}
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading || !(question ?? '').trim()}
                    >
                        {loading ? 'Sending…' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ─── Export wrapped in error boundary ─────────────────────────────────────
export default function AIChat() {
    return (
        <ChatErrorBoundary>
            <AIChatInner />
        </ChatErrorBoundary>
    );
}
