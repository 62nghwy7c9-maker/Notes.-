import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from 'd3-force';

/**
 * Force-Layout im Web Worker (F-22): hält die UI auch bei 1 000 Knoten
 * flüssig. Meldet Zwischenstände (tick) und das Endlayout (end).
 */

export interface LayoutNodeIn {
  id: string;
  linkCount: number;
}
export interface LayoutEdgeIn {
  source: string;
  target: string;
}
export interface LayoutPosition {
  id: string;
  x: number;
  y: number;
}
export type LayoutMessage =
  | { type: 'tick'; positions: LayoutPosition[] }
  | { type: 'end'; positions: LayoutPosition[] };

interface SimNode extends LayoutNodeIn {
  x?: number;
  y?: number;
}

const ctx = self as unknown as {
  postMessage: (msg: LayoutMessage) => void;
  onmessage: ((e: MessageEvent<{ nodes: LayoutNodeIn[]; edges: LayoutEdgeIn[] }>) => void) | null;
};

ctx.onmessage = (e) => {
  const nodes: SimNode[] = e.data.nodes.map((n) => ({ ...n }));
  const edges = e.data.edges.map((l) => ({ ...l }));

  const simulation = forceSimulation(nodes)
    .force(
      'link',
      forceLink<SimNode, { source: string; target: string }>(edges)
        .id((d) => d.id)
        .distance(70)
        .strength(0.4),
    )
    .force('charge', forceManyBody().strength(-140))
    .force('center', forceCenter(0, 0))
    .force(
      'collide',
      forceCollide<SimNode>().radius((d) => 8 + Math.sqrt(d.linkCount + 1) * 4),
    )
    .stop();

  const positions = (): LayoutPosition[] =>
    nodes.map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0 }));

  // Weniger Ticks bei sehr großen Graphen, damit das Layout schnell steht.
  const ticks = nodes.length > 600 ? 200 : 300;
  for (let i = 0; i < ticks; i++) {
    simulation.tick();
    if (i % 25 === 0) ctx.postMessage({ type: 'tick', positions: positions() });
  }
  ctx.postMessage({ type: 'end', positions: positions() });
};
