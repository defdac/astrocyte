import { useState } from 'react';

interface NoteEditorProps {
  onGenerateMetadata: (text: string) => Promise<{ title: string; tags: string[] }>;
  onSave: (text: string) => Promise<{ title: string; tags: string[] }>;
}

export function NoteEditor({ onGenerateMetadata, onSave }: NoteEditorProps) {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

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
      <h2>Ny anteckning</h2>
      <input value={title} placeholder="Titel (autogenereras vid sparning)" readOnly />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          const start = e.currentTarget.selectionStart ?? text.length;
          const end = e.currentTarget.selectionEnd ?? text.length;
          const nextText = `${text.slice(0, start)}${pasted}${text.slice(end)}`;
          void fillGeneratedMetadata(nextText);
        }}
        placeholder="Skriv din anteckning"
        rows={10}
      />
      <input value={tags} placeholder="Taggar (autogenereras vid sparning)" readOnly />
      <button
        onClick={async () => {
          if (!text || isSaving) return;
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
        disabled={!text || isSaving || isGeneratingMetadata}
      >
        {isSaving ? 'Sparar…' : 'Spara'}
      </button>
      {isGeneratingMetadata && <small>Genererar rubrik och taggar från inklistrad text…</small>}
    </section>
  );
}
