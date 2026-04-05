import { useMemo } from 'react';
import type { MindmapModel } from '../types';

interface MindmapCanvasProps {
  model: MindmapModel;
}

type GraphNode = {
  id: string;
  name: string;
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

export function MindmapCanvas({ model }: MindmapCanvasProps) {
  const graphData = useMemo(() => {
    const width = 960;
    const height = 560;
    const centerX = width / 2;
    const centerY = height / 2;

    const nodes: GraphNode[] = model.topics.map((topic, index) => {
      const links = model.edges.filter((e) => e.to === topic.id && e.w >= 0.55);
      const cluster = model.clusters.find((c) => c.children.includes(topic.id) || c.root_topic === topic.id);
      const val = 16 + links.length * 5 + links.reduce((sum, edge) => sum + edge.w, 0) * 7;

      const angle = (index / Math.max(model.topics.length, 1)) * Math.PI * 2;
      const distance = 120 + (index % 6) * 32;

      return {
        id: topic.id,
        name: topic.label,
        val,
        color: colorFor(cluster?.id ?? topic.id),
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance
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
    <section className="panel">
      <h2>Mindmap</h2>
      <div className="mindmap-canvas-wrap" role="img" aria-label="Mindmap visualisering">
        <svg viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="mindmap-svg">
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
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="mindmap-node">
              <circle r={node.val} fill={node.color} fillOpacity={0.95} />
              <text y={2} textAnchor="middle">
                {node.name}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
