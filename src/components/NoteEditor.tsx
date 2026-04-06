import type { Note } from '../types';
import { useState } from 'react';

interface NoteEditorProps {
  onGenerateMetadata: (text: string) => Promise<{ title: string; tags: string[] }>;
  onSave: (text: string) => Promise<{ title: string; tags: string[] }>;
  previewNote?: Note | null;
}

export function NoteEditor({ onGenerateMetadata, onSave, previewNote }: NoteEditorProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const isPreviewing = Boolean(previewNote);
  const displayedTitle = previewNote?.title ?? title;
  const displayedText = previewNote?.text ?? text;
  const displayedTags = previewNote?.tags.join(', ') ?? tags;

  const fillGeneratedMetadata = async (nextText: string) => {
    if (!nextText.trim()) return;
    setIsGeneratingMetadata(true);
    try {
      const generated = await onGenerateMetadata(nextText);
      setTitle(generated.title);
      setTags(generated.tags.join(', '));
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  return (
    <section className="panel">
      <h2>{isPreviewing ? 'Förhandsvisning av anteckning' : 'Ny anteckning'}</h2>
      <input value={displayedTitle} placeholder="Titel (autogenereras vid sparning)" readOnly />
      <textarea
        value={displayedText}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          if (isPreviewing) return;
          const pasted = e.clipboardData.getData('text');
          const start = e.currentTarget.selectionStart ?? text.length;
          const end = e.currentTarget.selectionEnd ?? text.length;
          const nextText = `${text.slice(0, start)}${pasted}${text.slice(end)}`;
          void fillGeneratedMetadata(nextText);
        }}
        placeholder="Skriv din anteckning"
        rows={10}
        readOnly={isPreviewing}
      />
      <input value={displayedTags} placeholder="Taggar (autogenereras vid sparning)" readOnly />
      <button
        onClick={async () => {
          if (!text || isSaving || isPreviewing) return;
          setIsSaving(true);
          try {
            const generated = await onSave(text);
            setTitle(generated.title);
            setTags(generated.tags.join(', '));
            setText('');
          } finally {
            setIsSaving(false);
          }
        }}
        disabled={!text || isSaving || isGeneratingMetadata || isPreviewing}
      >
        {isSaving ? 'Sparar…' : 'Spara'}
      </button>
      {isGeneratingMetadata && !isPreviewing && <small>Genererar rubrik och taggar från inklistrad text…</small>}
    </section>
  );
}
