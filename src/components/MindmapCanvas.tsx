import type { MindmapModel } from '../types';

interface MindmapCanvasProps {
  model: MindmapModel;
}

const colorFor = (clusterId: string) => {
  const palette = ['#8ec5fc', '#b5ead7', '#fce38a', '#f6b6c8', '#d4c1ec'];
  let hash = 0;
  for (let i = 0; i < clusterId.length; i++) hash += clusterId.charCodeAt(i);
  return palette[hash % palette.length];
};

export function MindmapCanvas({ model }: MindmapCanvasProps) {
  const topicWeights = model.topics.map((topic) => {
    const links = model.edges.filter((e) => e.to === topic.id && e.w >= 0.55);
    const size = 16 + links.length * 4 + Math.round(links.reduce((sum, e) => sum + e.w, 0) * 6);
    const cluster = model.clusters.find((c) => c.children.includes(topic.id) || c.root_topic === topic.id);
    return { topic, size, color: colorFor(cluster?.id ?? topic.id) };
  });

  return (
    <section className="panel">
      <h2>Mindmap</h2>
      <div className="mindmap-grid">
        {topicWeights.map(({ topic, size, color }) => (
          <div key={topic.id} className="bubble" style={{ width: size * 3, height: size * 3, backgroundColor: color }}>
            <span>{topic.label}</span>
            <small>{Math.round(topic.score * 100)}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}
