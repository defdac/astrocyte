import { useMemo } from 'react';
import type { MindmapModel } from '../types';

interface MindmapCanvasProps {
  model: MindmapModel;
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
}

type GraphNode = {
  id: string;
  name: string;
  subtitle: string;
  preview: string;
  val: number;
  color: string;
  x: number;
  y: number;
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
};

const colorFor = (clusterId: string) => {
  const palette = ['#8ec5fc', '#b5ead7', '#fce38a', '#f6b6c8', '#d4c1ec'];
  let hash = 0;
  for (let i = 0; i < clusterId.length; i++) hash += clusterId.charCodeAt(i);
  return palette[hash % palette.length];
};

export function MindmapCanvas({ model, selectedNoteId, onSelectNote }: MindmapCanvasProps) {
  const graphData = useMemo(() => {
    const width = 960;
    const height = 560;
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
      const links = model.edges.filter((e) => (e.from === note.id || e.to === note.id) && e.w >= 0.55);
      const noteClusters = (clusterByNoteId.get(note.id) ?? []).sort((a, b) => b.size - a.size);
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

      return {
        id: note.id,
        name: label.length > 24 ? `${label.slice(0, 21)}...` : label,
        subtitle,
        preview,
        val,
        color: colorFor(primaryCluster?.id ?? note.id),
        x: baseX + Math.cos(localAngle) * localDistance,
        y: baseY + Math.sin(localAngle) * localDistance
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
  }, [model]);

  const nodeById = useMemo(() => new Map(graphData.nodes.map((node) => [node.id, node])), [graphData.nodes]);

  return (
    <section className="panel mindmap-panel">
      <h2>Mindmap</h2>
      <div className="mindmap-canvas-wrap" role="img" aria-label="Mindmap visualisering">
        <svg viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="mindmap-svg" onClick={() => onSelectNote?.(null)}>
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
      </div>
    </section>
  );
}
