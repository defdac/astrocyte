import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d';
import type { MindmapModel } from '../types';

interface MindmapCanvasProps {
  model: MindmapModel;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onHoverNote?: (noteId: string | null) => void;
}

type GraphNode = {
  id: string;
  name: string;
  subtitle: string;
  preview: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
};

const DEFAULT_CANVAS_SIZE = { width: 960, height: 560 };
const MIN_CANVAS_HEIGHT = 320;

const colorFor = (clusterId: string) => {
  const palette = ['#8ec5fc', '#b5ead7', '#fce38a', '#f6b6c8', '#d4c1ec'];
  let hash = 0;
  for (let i = 0; i < clusterId.length; i++) hash += clusterId.charCodeAt(i);
  return palette[hash % palette.length];
};

class GraphErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('Mindmap force-graph failed, falling back to SVG renderer.', error);
  }

  override render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function buildGraphData(
  model: MindmapModel,
  positions: Map<string, { x: number; y: number; vx?: number; vy?: number }>
) {
  const width = DEFAULT_CANVAS_SIZE.width;
  const height = DEFAULT_CANVAS_SIZE.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const clusterCount = Math.max(model.clusters.length, 1);
  const clusterRadius = Math.min(width, height) * 0.28;
  const clusterCenters = new Map<string, { x: number; y: number }>();

  model.clusters.forEach((cluster, index) => {
    const angle = (index / clusterCount) * Math.PI * 2 - Math.PI / 2;
    clusterCenters.set(cluster.id, {
      x: centerX + Math.cos(angle) * clusterRadius,
      y: centerY + Math.sin(angle) * clusterRadius
    });
  });

  const clusterByNoteId = new Map<string, (typeof model.clusters)[number][]>();
  model.clusters.forEach((cluster) => {
    cluster.note_ids.forEach((noteId) => {
      const existing = clusterByNoteId.get(noteId) ?? [];
      existing.push(cluster);
      clusterByNoteId.set(noteId, existing);
    });
  });

  const nodes: GraphNode[] = model.notes.map((note, index) => {
    const links = model.edges.filter((edge) => (edge.from === note.id || edge.to === note.id) && edge.w >= 0.55);
    const noteClusters = (clusterByNoteId.get(note.id) ?? []).sort((left, right) => right.size - left.size);
    const primaryCluster = noteClusters[0];
    const clusterCenter = primaryCluster ? clusterCenters.get(primaryCluster.id) : undefined;
    const clusterIndex = primaryCluster ? model.clusters.findIndex((cluster) => cluster.id === primaryCluster.id) : -1;
    const group = primaryCluster ? primaryCluster.note_ids : model.notes.map((entry) => entry.id);
    const positionInGroup = Math.max(group.indexOf(note.id), 0);
    const angleSeed = clusterIndex >= 0 ? clusterIndex : index;
    const localAngle = ((positionInGroup + 1) / (group.length + 1)) * Math.PI * 2 + angleSeed * 0.4;
    const localDistance = 24 + (positionInGroup % 5) * 18 + Math.min(group.length, 6) * 6;
    const val = 26 + links.length * 5 + Math.min(note.tags.length, 5) * 3;
    const label = note.title.trim() || 'Untitled note';
    const subtitle = note.tags.slice(0, 2).join(' • ');
    const preview = note.text.trim().replace(/\s+/g, ' ').slice(0, 220);

    const fallbackAngle = (index / Math.max(model.notes.length, 1)) * Math.PI * 2;
    const fallbackDistance = 90 + (index % 6) * 28;
    const baseX = clusterCenter ? clusterCenter.x : centerX + Math.cos(fallbackAngle) * fallbackDistance;
    const baseY = clusterCenter ? clusterCenter.y : centerY + Math.sin(fallbackAngle) * fallbackDistance;
    const savedPosition = positions.get(note.id);

    return {
      id: note.id,
      name: label.length > 24 ? `${label.slice(0, 21)}...` : label,
      subtitle,
      preview,
      val,
      color: colorFor(primaryCluster?.id ?? note.id),
      x: savedPosition?.x ?? baseX + Math.cos(localAngle) * localDistance,
      y: savedPosition?.y ?? baseY + Math.sin(localAngle) * localDistance,
      vx: savedPosition?.vx,
      vy: savedPosition?.vy
    };
  });

  const links: GraphLink[] = model.edges
    .filter((edge) => edge.w >= 0.55)
    .map((edge) => ({
      source: edge.from,
      target: edge.to,
      value: edge.w
    }));

  return { nodes, links, width, height };
}

function SvgFallback({
  graphData,
  selectedNoteId,
  onSelectNote,
  onHoverNote
}: {
  graphData: ReturnType<typeof buildGraphData>;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onHoverNote?: (noteId: string | null) => void;
}) {
  const nodeById = useMemo(() => new Map(graphData.nodes.map((node) => [node.id, node])), [graphData.nodes]);

  return (
    <svg
      viewBox={`0 0 ${graphData.width} ${graphData.height}`}
      className="mindmap-svg"
      onClick={() => onSelectNote?.(null)}
      onMouseLeave={() => onHoverNote?.(null)}
    >
      <defs>
        <linearGradient id="edgeGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#6f8ce8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4dc3ff" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {graphData.links.map((link) => {
        const source = nodeById.get(link.source);
        const target = nodeById.get(link.target);
        if (!source || !target) return null;

        return (
          <line
            key={`${link.source}-${link.target}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="url(#edgeGradient)"
            strokeWidth={1 + link.value * 3}
            strokeDasharray="5 7"
            className="mindmap-link"
          />
        );
      })}

      {graphData.nodes.map((node) => (
        <g
          key={node.id}
          transform={`translate(${node.x}, ${node.y})`}
          className={`mindmap-node${selectedNoteId === node.id ? ' is-selected' : ''}`}
          onMouseEnter={() => onHoverNote?.(node.id)}
          onMouseLeave={() => onHoverNote?.(null)}
          onClick={(event) => {
            event.stopPropagation();
            onSelectNote?.(selectedNoteId === node.id ? null : node.id);
          }}
        >
          <title>{`${node.name}${node.preview ? `\n\n${node.preview}` : ''}`}</title>
          <circle r={node.val} fill={node.color} fillOpacity={0.95} />
          <text y={-4} textAnchor="middle">
            {node.name}
          </text>
          {node.subtitle && (
            <text y={12} textAnchor="middle" fontSize="11" opacity="0.7">
              {node.subtitle}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function ForceMindmap({
  graphData,
  selectedNoteId,
  onSelectNote,
  onHoverNote
}: {
  graphData: ReturnType<typeof buildGraphData>;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onHoverNote?: (noteId: string | null) => void;
}) {
  const graphRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitFrameRef = useRef<number | null>(null);
  const fitInnerFrameRef = useRef<number | null>(null);
  const previousNodeCountRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);

  const scheduleViewportFit = (durationMs = 250) => {
    if (fitFrameRef.current !== null) window.cancelAnimationFrame(fitFrameRef.current);
    if (fitInnerFrameRef.current !== null) window.cancelAnimationFrame(fitInnerFrameRef.current);

    fitFrameRef.current = window.requestAnimationFrame(() => {
      fitInnerFrameRef.current = window.requestAnimationFrame(() => {
        const graph = graphRef.current;
        if (!graph || !graphData.nodes.length) return;
        graph.zoomToFit(durationMs, 70);
      });
    });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const nextWidth = Math.max(Math.round(container.clientWidth), 320);
      const nextHeight = Math.max(Math.round(container.clientHeight), MIN_CANVAS_HEIGHT);
      setCanvasSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      );
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    return () => {
      if (fitFrameRef.current !== null) window.cancelAnimationFrame(fitFrameRef.current);
      if (fitInnerFrameRef.current !== null) window.cancelAnimationFrame(fitInnerFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const chargeForce = graph.d3Force('charge') as { strength?: (value: number) => void } | undefined;
    chargeForce?.strength?.(-240);

    const linkForce = graph.d3Force('link') as
      | { distance?: (distanceAccessor: (link: GraphLink) => number) => void }
      | undefined;
    linkForce?.distance?.((link) => 145 - link.value * 55);
  }, [graphData.links.length]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !graphData.nodes.length) {
      previousNodeCountRef.current = graphData.nodes.length;
      return;
    }

    scheduleViewportFit(previousNodeCountRef.current === 0 ? 0 : 250);

    if (graphData.nodes.length > previousNodeCountRef.current) {
      graph.d3ReheatSimulation();
    }

    previousNodeCountRef.current = graphData.nodes.length;
  }, [canvasSize.height, canvasSize.width, graphData]);

  return (
    <div className="mindmap-canvas-wrap" ref={containerRef}>
      <ForceGraph2D
        ref={graphRef}
        width={canvasSize.width}
        height={canvasSize.height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={6}
        nodeVal="val"
        nodeLabel={(node) => `${node.name}${node.subtitle ? `\n${node.subtitle}` : ''}${node.preview ? `\n\n${node.preview}` : ''}`}
        nodeCanvasObject={(node, context, globalScale) => {
          const radius = Math.max(node.val ?? 8, 7);
          const labelFontSize = 13 / globalScale;
          const subtitleFontSize = 10 / globalScale;
          const isSelected = selectedNoteId === node.id;

          context.save();
          context.beginPath();
          context.arc(node.x ?? 0, node.y ?? 0, radius, 0, Math.PI * 2);
          context.fillStyle = node.color;
          context.shadowColor = isSelected ? 'rgba(61, 99, 221, 0.5)' : 'rgba(61, 99, 221, 0.18)';
          context.shadowBlur = isSelected ? 18 : 10;
          context.fill();

          if (isSelected) {
            context.lineWidth = 3 / globalScale;
            context.strokeStyle = 'rgba(36, 63, 135, 0.9)';
            context.stroke();
          }

          context.shadowBlur = 0;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillStyle = '#1d2430';
          context.font = `600 ${labelFontSize}px Inter, system-ui, sans-serif`;
          context.fillText(node.name, node.x ?? 0, (node.y ?? 0) - labelFontSize * 0.15);

          if (node.subtitle) {
            context.fillStyle = 'rgba(29, 36, 48, 0.7)';
            context.font = `500 ${subtitleFontSize}px Inter, system-ui, sans-serif`;
            context.fillText(node.subtitle, node.x ?? 0, (node.y ?? 0) + subtitleFontSize * 1.2);
          }

          context.restore();
        }}
        linkColor={() => 'rgba(93, 127, 219, 0.4)'}
        linkLineDash={() => [6, 8]}
        linkWidth={(link) => 1 + link.value * 2.5}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link) => 1.2 + link.value * 1.8}
        linkDirectionalParticleSpeed={(link) => 0.002 + link.value * 0.003}
        linkDirectionalParticleColor={() => 'rgba(77, 195, 255, 0.85)'}
        enableNodeDrag={false}
        d3AlphaDecay={0.055}
        d3VelocityDecay={0.24}
        cooldownTicks={80}
        onEngineStop={() => scheduleViewportFit(180)}
        onNodeHover={(node) => onHoverNote?.(node?.id ?? null)}
        onNodeClick={(node) => onSelectNote?.(selectedNoteId === node.id ? null : node.id)}
        onBackgroundClick={() => onSelectNote?.(null)}
        showPointerCursor={(obj) => Boolean(obj && 'id' in obj)}
      />
    </div>
  );
}

export function MindmapCanvas({ model, selectedNoteId, onSelectNote, onHoverNote }: MindmapCanvasProps) {
  const positionsRef = useRef(new Map<string, { x: number; y: number; vx?: number; vy?: number }>());

  const graphData = useMemo(() => buildGraphData(model, positionsRef.current), [model]);

  useEffect(() => {
    for (const node of graphData.nodes) {
      if (typeof node.x !== 'number' || typeof node.y !== 'number') continue;
      positionsRef.current.set(node.id, {
        x: node.x,
        y: node.y,
        vx: node.vx,
        vy: node.vy
      });
    }
  }, [graphData]);

  const fallback = (
    <div className="mindmap-canvas-wrap" role="img" aria-label="Mindmap visualisering">
      <SvgFallback
        graphData={graphData}
        selectedNoteId={selectedNoteId}
        onSelectNote={onSelectNote}
        onHoverNote={onHoverNote}
      />
    </div>
  );

  return (
    <section className="panel mindmap-panel">
      <h2>Mindmap</h2>
      <GraphErrorBoundary fallback={fallback}>
        <ForceMindmap
          graphData={graphData}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onHoverNote={onHoverNote}
        />
      </GraphErrorBoundary>
    </section>
  );
}
