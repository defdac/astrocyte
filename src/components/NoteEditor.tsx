import { useState } from 'react';
import type { Note } from '../types';

interface NoteEditorProps {
  onSave: (note: Omit<Note, 'id' | 'ts'>) => void;
}

export function NoteEditor({ onSave }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');

  return (
    <section className="panel">
      <h2>Ny anteckning</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv din anteckning" rows={10} />
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Taggar, kommaseparerade" />
      <button
        onClick={() => {
          if (!title || !text) return;
          onSave({ title, text, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) });
          setTitle('');
          setText('');
          setTags('');
        }}
      >
        Spara
      </button>
    </section>
  );
}
