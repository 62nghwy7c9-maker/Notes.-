import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GraphEdge, GraphNode, LinkType } from '@notes/shared';
import { useUiStore } from '../../app/store.js';
import { useFolderTree } from '../folders/api.js';
import { flattenTree } from '../folders/util.js';
import { useGraph, useTags } from './api.js';
import type { LayoutMessage, LayoutPosition } from './layout.worker.js';

/** 8er-Palette für Wurzelordner (07-ui-ux-design.md). */
const PALETTE = [
  '#4f6ef7', // Indigo
  '#14b8a6', // Teal
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#8b5cf6', // Violett
  '#22c55e', // Grün
  '#06b6d4', // Cyan
  '#f97316', // Orange
];
const INBOX_COLOR = '#9ca3af';

function edgeStyle(ctx: CanvasRenderingContext2D, type: LinkType): void {
  ctx.setLineDash(type === 'reference' || type === 'part_of' ? [5, 4] : []);
  if (type === 'contradicts') {
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = '#dc2626';
  }
}

function nodeRadius(n: GraphNode): number {
  return 5 + Math.sqrt(n.linkCount + 1) * 2.5;
}

/** Umfeld-Modus (F-23): Knoten bis Tiefe 2 um den Fokusknoten. */
export function neighborhood(
  edges: Pick<GraphEdge, 'source' | 'target'>[],
  focusId: string,
  depth: number,
): Set<string> {
  const adjacent = new Map<string, string[]>();
  for (const e of edges) {
    (adjacent.get(e.source) ?? adjacent.set(e.source, []).get(e.source)!).push(e.target);
    (adjacent.get(e.target) ?? adjacent.set(e.target, []).get(e.target)!).push(e.source);
  }
  const seen = new Set([focusId]);
  let frontier = [focusId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of adjacent.get(id) ?? []) {
        if (!seen.has(other)) {
          seen.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

interface Preview {
  node: GraphNode;
  screenX: number;
  screenY: number;
}

export function GraphView() {
  const { openNote, select } = useUiStore();
  const [folderId, setFolderId] = useState('');
  const [tag, setTag] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const graph = useGraph({ folderId: folderId || undefined, tag: tag || undefined });
  const tags = useTags();
  const tree = useFolderTree();
  const flatFolders = useMemo(() => flattenTree(tree.data?.tree ?? []), [tree.data]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const positionsRef = useRef(new Map<string, LayoutPosition>());
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);
  const hoverRef = useRef<string | null>(null);

  // Sichtbare Teilmenge (Umfeld-Modus)
  const visible = useMemo(() => {
    if (!graph.data) return null;
    if (!localOnly || !focusId) return null;
    return neighborhood(graph.data.edges, focusId, 2);
  }, [graph.data, localOnly, focusId]);

  const rootColor = useMemo(() => {
    const map = new Map<string, string>();
    if (!graph.data) return map;
    const roots = [...new Set(graph.data.nodes.map((n) => n.folderRootId).filter(Boolean))] as string[];
    roots.sort();
    roots.forEach((r, i) => map.set(r, PALETTE[i % PALETTE.length]!));
    return map;
  }, [graph.data]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const data = graph.data;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const t = transformRef.current;
    const pos = positionsRef.current;
    const styles = getComputedStyle(canvas);
    const textColor = styles.getPropertyValue('--text').trim() || '#1c1917';
    const borderColor = styles.getPropertyValue('--border').trim() || '#e7e5e4';

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + t.x, height / 2 + t.y);
    ctx.scale(t.k, t.k);

    // Kanten
    ctx.lineWidth = 1;
    for (const edge of data.edges) {
      if (visible && !(visible.has(edge.source) && visible.has(edge.target))) continue;
      const s = pos.get(edge.source);
      const e = pos.get(edge.target);
      if (!s || !e) continue;
      ctx.strokeStyle = borderColor;
      edgeStyle(ctx, edge.type);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Knoten
    for (const node of data.nodes) {
      if (visible && !visible.has(node.id)) continue;
      const p = pos.get(node.id);
      if (!p) continue;
      const r = nodeRadius(node);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = node.folderRootId
        ? (rootColor.get(node.folderRootId) ?? INBOX_COLOR)
        : INBOX_COLOR;
      ctx.fill();
      if (node.id === hoverRef.current || node.id === focusId) {
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // Labels ab Zoom ≥ 0,8 (oder bei Hover)
      if (t.k >= 0.8 || node.id === hoverRef.current) {
        ctx.fillStyle = textColor;
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(node.title.slice(0, 30) || 'Ohne Titel', p.x + r + 4, p.y + 3);
      }
    }
    ctx.restore();
  }, [graph.data, visible, rootColor, focusId]);

  const drawRef = useRef(draw);
  drawRef.current = draw;

  // Layout im Worker berechnen – nur bei neuen Graph-Daten, nicht bei Hover/Fokus.
  useEffect(() => {
    if (!graph.data) return;
    const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<LayoutMessage>) => {
      positionsRef.current = new Map(e.data.positions.map((p) => [p.id, p]));
      requestAnimationFrame(() => drawRef.current());
    };
    worker.postMessage({
      nodes: graph.data.nodes.map((n) => ({ id: n.id, linkCount: n.linkCount })),
      edges: graph.data.edges.map((e) => ({ source: e.source, target: e.target })),
    });
    return () => worker.terminate();
  }, [graph.data]);

  useEffect(() => {
    requestAnimationFrame(draw);
  }, [draw]);

  // Canvas an Containergröße anpassen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      requestAnimationFrame(draw);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [draw]);

  /** Bildschirm- → Weltkoordinaten. */
  const toWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - canvas.width / 2 - t.x) / t.k,
      y: (clientY - rect.top - canvas.height / 2 - t.y) / t.k,
    };
  };

  const hitTest = (clientX: number, clientY: number): GraphNode | null => {
    const data = graph.data;
    if (!data) return null;
    const { x, y } = toWorld(clientX, clientY);
    for (const node of data.nodes) {
      if (visible && !visible.has(node.id)) continue;
      const p = positionsRef.current.get(node.id);
      if (!p) continue;
      const r = nodeRadius(node) + 3;
      if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r * r) return node;
    }
    return null;
  };

  const hoveredNode = hoverId ? graph.data?.nodes.find((n) => n.id === hoverId) : null;

  return (
    <section className="relative col-span-2 flex min-h-0 flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <h2 className="text-[13px] font-medium text-muted">◈ Ideen-Graph</h2>
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-[12px]"
          aria-label="Ordner-Filter"
        >
          <option value="">Alle Ordner</option>
          {flatFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.path}
            </option>
          ))}
        </select>
        {(tags.data?.tags.length ?? 0) > 0 && (
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-lg border border-border bg-bg px-2 py-1 text-[12px]"
            aria-label="Tag-Filter"
          >
            <option value="">Alle Tags</option>
            {tags.data!.tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        <label
          className={`flex items-center gap-1 text-[12px] ${focusId ? 'text-text' : 'text-muted'}`}
          title={focusId ? 'Nur Nachbarn (Tiefe 2) des gewählten Knotens' : 'Erst einen Knoten anklicken'}
        >
          <input
            type="checkbox"
            checked={localOnly}
            disabled={!focusId}
            onChange={(e) => setLocalOnly(e.target.checked)}
          />
          Nur Umfeld
        </label>
        <span className="ml-auto text-[12px] text-muted">
          {graph.data?.nodes.length ?? 0} Notizen · {graph.data?.edges.length ?? 0}{' '}
          Verknüpfungen
        </span>
      </header>

      <div className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-grab active:cursor-grabbing"
          onWheel={(e) => {
            const t = transformRef.current;
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            t.k = Math.min(4, Math.max(0.15, t.k * factor));
            requestAnimationFrame(draw);
          }}
          onMouseDown={(e) => {
            dragRef.current = {
              startX: e.clientX - transformRef.current.x,
              startY: e.clientY - transformRef.current.y,
            };
          }}
          onMouseMove={(e) => {
            if (dragRef.current) {
              transformRef.current.x = e.clientX - dragRef.current.startX;
              transformRef.current.y = e.clientY - dragRef.current.startY;
              requestAnimationFrame(draw);
              return;
            }
            const hit = hitTest(e.clientX, e.clientY);
            const id = hit?.id ?? null;
            if (id !== hoverRef.current) {
              hoverRef.current = id;
              setHoverId(id);
              requestAnimationFrame(draw);
            }
          }}
          onMouseUp={() => (dragRef.current = null)}
          onMouseLeave={() => {
            dragRef.current = null;
            hoverRef.current = null;
            setHoverId(null);
          }}
          onClick={(e) => {
            const hit = hitTest(e.clientX, e.clientY);
            if (hit) {
              setFocusId(hit.id);
              const rect = canvasRef.current!.getBoundingClientRect();
              setPreview({
                node: hit,
                screenX: e.clientX - rect.left,
                screenY: e.clientY - rect.top,
              });
            } else {
              setPreview(null);
            }
          }}
          onDoubleClick={(e) => {
            const hit = hitTest(e.clientX, e.clientY);
            if (hit) {
              select({ kind: 'inbox' });
              openNote(hit.id);
            }
          }}
        />

        {/* Hover-Karte */}
        {hoveredNode && !preview && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-sm">
            <b>{hoveredNode.title || 'Ohne Titel'}</b>
            <span className="ml-2 text-muted">{hoveredNode.linkCount} Verknüpfungen</span>
          </div>
        )}

        {/* Klick-Vorschau */}
        {preview && (
          <div
            className="absolute z-10 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg"
            style={{
              left: Math.min(preview.screenX + 12, (canvasRef.current?.width ?? 400) - 240),
              top: Math.min(preview.screenY + 12, (canvasRef.current?.height ?? 300) - 120),
            }}
          >
            <h3 className="truncate text-[13px] font-medium">
              {preview.node.title || 'Ohne Titel'}
            </h3>
            <p className="mt-0.5 text-[12px] text-muted">
              {preview.node.linkCount} Verknüpfungen
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  select({ kind: 'inbox' });
                  openNote(preview.node.id);
                }}
                className="rounded-lg bg-accent px-2 py-1 text-[12px] text-white hover:opacity-90"
              >
                Öffnen
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-border px-2 py-1 text-[12px] text-muted hover:bg-accent-soft"
              >
                Schließen
              </button>
            </div>
          </div>
        )}

        {/* Legende */}
        {rootColor.size > 0 && (
          <div className="absolute bottom-3 right-3 rounded-lg border border-border bg-surface px-3 py-2 text-[12px]">
            {[...rootColor.entries()].map(([rootId, color]) => (
              <div key={rootId} className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: color }}
                />
                {flatFolders.find((f) => f.id === rootId)?.path.split('/')[0] ?? '–'}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: INBOX_COLOR }}
              />
              Eingang
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
