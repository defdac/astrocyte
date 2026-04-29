import type { Note } from '../types';
import { useRef, useState } from 'react';
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
    <section className="panel note-editor-panel">
      <h2>{isPreviewing ? 'Förhandsvisning av anteckning' : 'Ny anteckning'}</h2>
      <input value={displayedTitle} placeholder="Titel (autogenereras vid sparning)" readOnly />
      <div className="note-editor-md">
        <MDEditor
          value={displayedText}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (isPreviewing) return;
            const isPasteShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v';
            if (isPasteShortcut) {
              isPasteShortcutPending.current = true;
            }
          }}
          onChange={(value: string | undefined) => {
            if (isPreviewing) return;
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
              if (isPreviewing) return;
              isPasteShortcutPending.current = false;
              const pasted = e.clipboardData.getData('text');
              const target = e.currentTarget;
              const start = target.selectionStart ?? displayedText.length;
              const end = target.selectionEnd ?? displayedText.length;
              const nextText = `${displayedText.slice(0, start)}${pasted}${displayedText.slice(end)}`;
              void fillGeneratedMetadata(nextText);
            }
          }}
          preview={isPreviewing ? 'preview' : 'live'}
          hideToolbar={isPreviewing}
          height="100%"
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
