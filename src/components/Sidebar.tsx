interface SidebarProps {
  active: 'notes' | 'editor';
  onNavigate: (view: SidebarProps['active']) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ active, onNavigate, onOpenSettings }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h1>Astrocyte</h1>
      <button className={active === 'notes' ? 'active' : ''} onClick={() => onNavigate('notes')}>Anteckningar</button>
      <button className={active === 'editor' ? 'active' : ''} onClick={() => onNavigate('editor')}>Editor</button>
      <button className="gear" onClick={onOpenSettings} aria-label="Öppna inställningar">⚙</button>
    </aside>
  );
}
