import type { Note } from '../types';
import { useEffect, useRef, useState } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
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
  const isPasteShortcutPending = useRef(false);
  const displayedTitle = title;
  const displayedText = text;
  const displayedTags = tags;

  useEffect(() => {
    if (!previewNote) return;
    setTitle(previewNote.title);
    setText(previewNote.text);
    setTags(previewNote.tags.join(', '));
  }, [previewNote]);

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
    <section className="panel note-editor-panel">
      <h2>Ny anteckning</h2>
      <input value={displayedTitle} placeholder="Titel (autogenereras vid sparning)" readOnly />
      <div className="note-editor-md">
        <MDEditor
          value={displayedText}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            const isPasteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v';
            if (isPasteShortcut) {
              isPasteShortcutPending.current = true;
            }
          }}
          onChange={(value: string | undefined) => {
            const nextText = value ?? '';
            setText(nextText);
            if (isPasteShortcutPending.current) {
              isPasteShortcutPending.current = false;
              void fillGeneratedMetadata(nextText);
            }
          }}
          textareaProps={{
            placeholder: 'Skriv din anteckning',
            onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => {
                isPasteShortcutPending.current = false;
              const pasted = e.clipboardData.getData('text');
              const target = e.currentTarget;
              const start = target.selectionStart ?? displayedText.length;
              const end = target.selectionEnd ?? displayedText.length;
              const nextText = `${displayedText.slice(0, start)}${pasted}${displayedText.slice(end)}`;
              void fillGeneratedMetadata(nextText);
            }
          }}
          preview="live"
          hideToolbar={false}
          height="100%"
        />
      </div>
      <input value={displayedTags} placeholder="Taggar (autogenereras vid sparning)" readOnly />
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
