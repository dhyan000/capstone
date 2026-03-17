import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ForceGraph2D from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, AlertTriangle, ZoomIn, ZoomOut, Maximize2, RotateCcw, Info } from 'lucide-react';
import { getKnowledgeGraph } from '../services/api';

/* ── Per-category colours ─────────────────────────────────────────────── */
const CAT_META = {
    event: { color: '#f59e0b', glow: 'rgba(245,158,11,0.9)', label: 'Event' },
    research: { color: '#a78bfa', glow: 'rgba(167,139,250,0.9)', label: 'Research' },
    syllabus: { color: '#38bdf8', glow: 'rgba(56,189,248,0.9)', label: 'Syllabus' },
    notes: { color: '#34d399', glow: 'rgba(52,211,153,0.9)', label: 'Notes' },
    circular: { color: '#94a3b8', glow: 'rgba(148,163,184,0.7)', label: 'Circular' },
    internal: { color: '#f87171', glow: 'rgba(248,113,113,0.9)', label: 'Internal' },
};
const DEFAULT_META = { color: '#94a3b8', glow: 'rgba(148,163,184,0.5)', label: 'Other' };

function getMeta(category) {
    if (!category) return DEFAULT_META;
    const key = typeof category === 'string' ? category.toLowerCase() : String(category).toLowerCase();
    return CAT_META[key] || DEFAULT_META;
}

/* ── Animated stat badge ─────────────────────────────────────────────── */
function StatBadge({ value, label, color }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
                background: `${color}15`,
                border: `1px solid ${color}30`,
                color,
            }}
        >
            <span className="text-base font-black">{value}</span>
            <span className="opacity-70 font-normal">{label}</span>
        </motion.div>
    );
}

export default function KnowledgeGraph() {
    const navigate = useNavigate();
    const graphRef = useRef(null);
    const wrapRef = useRef(null);
    const [graphWidth, setGraphWidth] = useState(800);
    const [graphHeight, setGraphHeight] = useState(560);
    const [selectedNode, setSelectedNode] = useState(null);

    // Use REFS for hover/click — canvas callbacks see stale closures otherwise
    const hoveredNodeRef = useRef(null);
    const selectedNodeRef = useRef(null);
    const hoveredLinksRef = useRef(new Set());
    const graphDataRef = useRef({ nodes: [], links: [] });

    // Tooltip / info-panel only needs React state
    const [tooltipNode, setTooltipNode] = useState(null);

    /* ── Measure container ───────────────────────────────────────────── */
    useEffect(() => {
        if (!wrapRef.current) return;
        const updateSize = () => {
            if (!wrapRef.current) return;
            const w = wrapRef.current.getBoundingClientRect().width;
            if (w > 0) setGraphWidth(w);
        };
        updateSize();
        const ro = new ResizeObserver(updateSize);
        ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, []);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['knowledge-graph'],
        queryFn: async () => (await getKnowledgeGraph()).data,
        staleTime: 30_000,
    });

    /* ── Build graph data (memoised) ─────────────────────────────────── */
    const graphData = useMemo(() => {
        const nodes = (data?.nodes ?? []).map(n => ({
            id: n.id,
            label: n.label ?? n.id,
            category: (n.category ?? '').toLowerCase(),
        }));
        const links = (data?.edges ?? []).map(e => ({
            source: e.source,
            target: e.target,
            relation: e.relation ?? 'related',
        }));
        graphDataRef.current = { nodes, links };
        return { nodes, links };
    }, [data]);

    /* ── Controls ────────────────────────────────────────────────────── */
    const handleZoomIn = () => graphRef.current?.zoom(1.4, 300);
    const handleZoomOut = () => graphRef.current?.zoom(0.71, 300);
    const handleFit = () => graphRef.current?.zoomToFit(500, 48);
    const handleReset = () => {
        graphRef.current?.zoomToFit(500, 48);
        graphRef.current?.d3ReheatSimulation();
        setSelectedNode(null);
        selectedNodeRef.current = null;
    };

    /* ── Hover ───────────────────────────────────────────────────────── */
    const handleNodeHover = useCallback((node) => {
        // FIX: second arg is `previousNode`, NOT graph data — read links from ref
        hoveredNodeRef.current = node || null;
        setTooltipNode(node || null);

        const linked = new Set();
        if (node) {
            graphDataRef.current.links.forEach(l => {
                const src = l.source?.id ?? l.source;
                const tgt = l.target?.id ?? l.target;
                if (src === node.id || tgt === node.id) {
                    linked.add(`${src}::${tgt}`);
                    linked.add(`${tgt}::${src}`);   // bidirectional for lookup
                }
            });
        }
        hoveredLinksRef.current = linked;

        if (wrapRef.current) {
            wrapRef.current.style.cursor = node ? 'pointer' : 'default';
        }
    }, []);

    /* ── Click ───────────────────────────────────────────────────────── */
    const handleNodeClick = useCallback((node) => {
        if (selectedNodeRef.current?.id === node.id) {
            // Double-click same node → navigate
            navigate('/documents');
        } else {
            selectedNodeRef.current = node;
            setSelectedNode({ ...node });
            // Fly-to
            graphRef.current?.centerAt(node.x, node.y, 600);
            graphRef.current?.zoom(2.5, 600);
        }
    }, [navigate]);

    /* ── Custom node paint ───────────────────────────────────────────── */
    const paintNode = useCallback((node, ctx, globalScale) => {
        const meta = getMeta(node.category);
        const isHovered = hoveredNodeRef.current?.id === node.id;
        const isSelected = selectedNodeRef.current?.id === node.id;
        const isLinked = !isHovered && hoveredNodeRef.current
            ? hoveredLinksRef.current.has(`${node.id}::${hoveredNodeRef.current.id}`) ||
            hoveredLinksRef.current.has(`${hoveredNodeRef.current.id}::${node.id}`)
            : false;

        const r = isSelected ? 11 : isHovered ? 9 : isLinked ? 7.5 : 6;
        const alpha = hoveredNodeRef.current && !isHovered && !isLinked && !isSelected ? 0.3 : 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        // — Outer glow ring ——————————————————————————————
        if (isHovered || isSelected) {
            ctx.shadowColor = meta.glow;
            ctx.shadowBlur = isSelected ? 32 : 20;
        } else if (isLinked) {
            ctx.shadowColor = meta.glow;
            ctx.shadowBlur = 12;
        } else {
            ctx.shadowColor = meta.glow;
            ctx.shadowBlur = 6;
        }

        // — Filled circle —————————————————————————————————
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        if (isSelected) {
            // Radial fill for selected
            const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, r * 0.1, node.x, node.y, r);
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, meta.color);
            grad.addColorStop(1, meta.glow);
            ctx.fillStyle = grad;
        } else if (isHovered) {
            ctx.fillStyle = '#fff';
        } else {
            ctx.fillStyle = meta.color;
        }
        ctx.fill();

        // — Border ring ————————————————————————————————————
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        ctx.strokeStyle = isSelected ? '#fff' : meta.color;
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // — Pulse ring for selected —
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
            ctx.strokeStyle = meta.color + '55';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // — Label below node ————————————————————————————————
        if (globalScale >= 0.5) {
            const label = node.label.length > 22 ? node.label.slice(0, 20) + '…' : node.label;
            const fontSize = Math.max(3, 10 / globalScale);
            ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${fontSize}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            const tw = ctx.measureText(label).width;
            const padX = 3, padY = 2;
            const rectX = node.x - tw / 2 - padX;
            const rectY = node.y + r + 2;
            const rectW = tw + padX * 2;
            const rectH = fontSize + padY * 2;
            const rr = 2; // corner radius

            // pill bg
            ctx.fillStyle = 'rgba(10,12,20,0.82)';
            ctx.beginPath();
            ctx.moveTo(rectX + rr, rectY);
            ctx.lineTo(rectX + rectW - rr, rectY);
            ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + rr);
            ctx.lineTo(rectX + rectW, rectY + rectH - rr);
            ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - rr, rectY + rectH);
            ctx.lineTo(rectX + rr, rectY + rectH);
            ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - rr);
            ctx.lineTo(rectX, rectY + rr);
            ctx.quadraticCurveTo(rectX, rectY, rectX + rr, rectY);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = isHovered || isSelected ? meta.color : 'rgba(255,255,255,0.85)';
            ctx.fillText(label, node.x, rectY + padY);
        }

        ctx.restore();
    }, []);

    /* ── Link helpers (read from refs — no re-creation needed) ───────── */
    const getLinkColor = useCallback((link) => {
        const src = link.source?.id ?? link.source;
        const tgt = link.target?.id ?? link.target;
        const key = `${src}::${tgt}`;
        const rev = `${tgt}::${src}`;
        const active = hoveredLinksRef.current.has(key) || hoveredLinksRef.current.has(rev);

        if (hoveredNodeRef.current && !active) return 'rgba(255,255,255,0.04)';
        if (active) return getMeta(link.source?.category).color;
        return 'rgba(255,255,255,0.18)';
    }, []);

    const getLinkWidth = useCallback((link) => {
        const src = link.source?.id ?? link.source;
        const tgt = link.target?.id ?? link.target;
        const key = `${src}::${tgt}`;
        const rev = `${tgt}::${src}`;
        return (hoveredLinksRef.current.has(key) || hoveredLinksRef.current.has(rev)) ? 2.5 : 1;
    }, []);

    const getLinkParticles = useCallback((link) => {
        const src = link.source?.id ?? link.source;
        const tgt = link.target?.id ?? link.target;
        const key = `${src}::${tgt}`;
        const rev = `${tgt}::${src}`;
        return (hoveredLinksRef.current.has(key) || hoveredLinksRef.current.has(rev)) ? 5 : 0;
    }, []);

    const getLinkParticleColor = useCallback((link) =>
        getMeta(link.source?.category).color, []);

    /* ── Sync selected node (tooltip panel) ──────────────────────────── */
    const connectedDocs = useMemo(() => {
        if (!selectedNode) return [];
        const result = [];
        graphDataRef.current.links.forEach(l => {
            const src = l.source?.id ?? l.source;
            const tgt = l.target?.id ?? l.target;
            if (src === selectedNode.id) {
                const n = graphDataRef.current.nodes.find(x => x.id === tgt);
                if (n) result.push(n);
            } else if (tgt === selectedNode.id) {
                const n = graphDataRef.current.nodes.find(x => x.id === src);
                if (n) result.push(n);
            }
        });
        return result;
    }, [selectedNode]);

    /* ── Loading ─────────────────────────────────────────────────────── */
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-72 gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border border-orange-400 animate-ping opacity-20" />
                    <div className="absolute inset-1 rounded-full border border-blue-400 animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
                    <div className="absolute inset-0 rounded-full border-2 border-t-orange-500 border-r-violet-500 border-b-blue-500 border-l-transparent animate-spin" />
                    <div className="absolute inset-3 rounded-full bg-orange-500 opacity-30 animate-pulse" />
                </div>
                <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">Building knowledge graph…</p>
            </div>
        );
    }

    if (isError) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ui-card p-10 text-center">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Failed to load the knowledge graph.</p>
                <p className="text-sm text-slate-400 mt-1">Please check the backend and refresh.</p>
            </motion.div>
        );
    }

    const nodes = data?.nodes ?? [];
    const edges = data?.edges ?? [];

    if (nodes.length === 0) {
        return (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="ui-card p-14 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <GitFork className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-200">No document relationships found yet.</p>
                <p className="text-sm text-slate-400 mt-1">Upload more documents — shared title keywords build connections.</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Header ────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-start justify-between flex-wrap gap-3"
            >
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white"
                        style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
                        Knowledge Graph
                    </h1>
                    <div className="flex items-center gap-3 mt-1.5">
                        <StatBadge value={nodes.length} label="documents" color="#38bdf8" />
                        <StatBadge value={edges.length} label="connections" color="#a78bfa" />
                    </div>
                </div>

                {/* Legend */}
                <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-wrap gap-2"
                >
                    {Object.entries(CAT_META).map(([cat, m], i) => (
                        <motion.div
                            key={cat}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                            style={{ color: m.color, borderColor: m.color + '40', background: m.color + '10' }}
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ background: m.color, boxShadow: `0 0 6px ${m.glow}` }}
                            />
                            {m.label}
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* ── Canvas + side-panel row ────────────────────────────── */}
            <div className="flex gap-4">
                {/* Canvas */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    ref={wrapRef}
                    className="relative rounded-2xl overflow-hidden flex-1"
                    style={{
                        height: 580,
                        background: 'linear-gradient(135deg, #080b12 0%, #0e1117 50%, #080b12 100%)',
                        border: '1.5px solid rgba(56,189,248,0.15)',
                        boxShadow: '0 8px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                >
                    {/* Grid overlay */}
                    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />

                    {/* Ambient glows */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(ellipse 50% 40% at 20% 30%, rgba(59,130,246,0.08) 0%, transparent 70%),' +
                                'radial-gradient(ellipse 40% 35% at 80% 70%, rgba(249,115,22,0.07) 0%, transparent 70%),' +
                                'radial-gradient(ellipse 35% 30% at 55% 50%, rgba(167,139,250,0.05) 0%, transparent 70%)',
                        }}
                    />

                    {/* Hover Tooltip */}
                    <AnimatePresence>
                        {tooltipNode && !selectedNode && (
                            <motion.div
                                key={tooltipNode.id}
                                initial={{ opacity: 0, scale: 0.88, y: 6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.88, y: 6 }}
                                transition={{ duration: 0.14, ease: 'easeOut' }}
                                className="absolute top-3 left-3 z-20 pointer-events-none px-3.5 py-2.5 rounded-xl text-xs"
                                style={{
                                    background: `linear-gradient(135deg, ${getMeta(tooltipNode.category).color}dd, ${getMeta(tooltipNode.category).color}77)`,
                                    border: `1px solid ${getMeta(tooltipNode.category).color}60`,
                                    backdropFilter: 'blur(12px)',
                                    color: '#fff',
                                    maxWidth: 230,
                                    boxShadow: `0 4px 20px ${getMeta(tooltipNode.category).glow}40`,
                                }}
                            >
                                <p className="truncate font-bold text-sm">{tooltipNode.label}</p>
                                <p className="text-[10px] opacity-75 capitalize mt-0.5">
                                    {getMeta(tooltipNode.category).label} · click to inspect
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Zoom controls */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
                        {[
                            { Icon: ZoomIn, action: handleZoomIn, title: 'Zoom in' },
                            { Icon: ZoomOut, action: handleZoomOut, title: 'Zoom out' },
                            { Icon: Maximize2, action: handleFit, title: 'Fit all' },
                            { Icon: RotateCcw, action: handleReset, title: 'Reheat' },
                        ].map(({ Icon, action, title }) => (
                            <motion.button
                                key={title}
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={action}
                                title={title}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#64748b',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(56,189,248,0.15)';
                                    e.currentTarget.style.color = '#38bdf8';
                                    e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                    e.currentTarget.style.color = '#64748b';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                                }}
                            >
                                <Icon className="w-4 h-4" />
                            </motion.button>
                        ))}
                    </div>

                    {/* Force graph */}
                    <ForceGraph2D
                        ref={graphRef}
                        graphData={graphData}
                        width={graphWidth}
                        height={580}
                        backgroundColor="transparent"
                        nodeLabel={() => ''}              // suppress built-in tooltip
                        nodeRelSize={6}
                        nodeCanvasObjectMode={() => 'replace'}  // FIX: replace, not after
                        nodeCanvasObject={paintNode}
                        linkColor={getLinkColor}
                        linkWidth={getLinkWidth}
                        linkDirectionalArrowLength={5}
                        linkDirectionalArrowRelPos={0.85}
                        linkDirectionalArrowColor={getLinkParticleColor}
                        linkDirectionalParticles={getLinkParticles}
                        linkDirectionalParticleWidth={2.5}
                        linkDirectionalParticleSpeed={0.005}
                        linkDirectionalParticleColor={getLinkParticleColor}
                        linkLabel="relation"
                        onNodeClick={handleNodeClick}
                        onNodeHover={handleNodeHover}
                        cooldownTicks={120}
                        d3AlphaDecay={0.018}
                        d3VelocityDecay={0.35}
                        onEngineStop={() => graphRef.current?.zoomToFit(600, 52)}
                    />
                </motion.div>

                {/* ── Side panel: selected node info ────────────── */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, width: 0 }}
                            animate={{ opacity: 1, x: 0, width: 240 }}
                            exit={{ opacity: 0, x: 20, width: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="flex-shrink-0 rounded-2xl overflow-hidden self-start"
                            style={{
                                height: 580,
                                background: '#0e1117',
                                border: `1.5px solid ${getMeta(selectedNode.category).color}40`,
                                boxShadow: `0 8px 32px ${getMeta(selectedNode.category).glow}20`,
                            }}
                        >
                            {/* Header strip */}
                            <div className="px-4 pt-4 pb-3"
                                style={{
                                    background: `linear-gradient(135deg, ${getMeta(selectedNode.category).color}25, transparent)`,
                                    borderBottom: `1px solid ${getMeta(selectedNode.category).color}25`,
                                }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-widest"
                                        style={{ color: getMeta(selectedNode.category).color }}>
                                        {getMeta(selectedNode.category).label}
                                    </span>
                                    <button
                                        onClick={() => { setSelectedNode(null); selectedNodeRef.current = null; handleFit(); }}
                                        className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
                                    >✕</button>
                                </div>
                                <p className="text-white text-sm font-bold leading-snug line-clamp-3">
                                    {selectedNode.label}
                                </p>
                            </div>

                            {/* Connections */}
                            <div className="px-4 py-3 overflow-y-auto" style={{ maxHeight: 440 }}>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    {connectedDocs.length} connections
                                </p>
                                {connectedDocs.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">No related documents</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {connectedDocs.map(n => (
                                            <motion.div
                                                key={n.id}
                                                initial={{ opacity: 0, x: 8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-150"
                                                style={{
                                                    background: getMeta(n.category).color + '12',
                                                    border: `1px solid ${getMeta(n.category).color}25`,
                                                }}
                                                onClick={() => navigate('/documents')}
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                        style={{ background: getMeta(n.category).color }} />
                                                    <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-tight">
                                                        {n.label}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/documents')}
                                    className="mt-4 w-full py-2 rounded-lg text-xs font-bold transition-colors duration-150"
                                    style={{
                                        background: getMeta(selectedNode.category).color + '20',
                                        border: `1px solid ${getMeta(selectedNode.category).color}40`,
                                        color: getMeta(selectedNode.category).color,
                                    }}
                                >
                                    Open Documents →
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Footer hint ───────────────────────────────────────── */}
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs text-slate-500 text-center flex items-center justify-center gap-1.5"
            >
                <Info className="w-3 h-3" />
                Hover to highlight connections · Click to inspect · Double-click to open Documents · Scroll to zoom
            </motion.p>
        </div>
    );
}
