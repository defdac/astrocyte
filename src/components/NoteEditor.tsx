import type { Note } from '../types';
import { useState } from 'react';
import MDEditor from '@uiw/react-md-editor';

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
      <div
        onPaste={(e) => {
          if (isPreviewing) return;
          const pasted = e.clipboardData.getData('text');
          const nextText = `${displayedText}${displayedText ? '\n' : ''}${pasted}`;
          void fillGeneratedMetadata(nextText);
        }}
      >
        <MDEditor
          value={displayedText}
          onChange={(value: string | undefined) => {
            if (isPreviewing) return;
            setText(value ?? '');
          }}
          textareaProps={{
            placeholder: 'Skriv din anteckning'
          }}
          preview={isPreviewing ? 'preview' : 'edit'}
          hideToolbar={isPreviewing}
          height={280}
        />
      </div>
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
