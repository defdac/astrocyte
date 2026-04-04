import { useMemo, useState } from 'react';
import type { Note } from '../types';

interface NotesListProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

export function NotesList({ notes, onDelete }: NotesListProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => notes.filter((n) => `${n.title} ${n.text} ${n.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
    [notes, query]
  );

  return (
    <section className="panel">
      <h2>Anteckningar</h2>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök / filtrera" />
      <ul className="notes-list">
        {filtered.map((note) => (
          <li key={note.id}>
            <strong>{note.title}</strong>
            <p>{note.text.slice(0, 160)}</p>
            <small>{note.tags.join(', ')}</small>
            <button onClick={() => onDelete(note.id)}>Ta bort</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
