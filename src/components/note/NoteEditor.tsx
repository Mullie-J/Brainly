import { useEffect, useMemo, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { nl as nlDict } from '@blocknote/core/locales';
import '@blocknote/mantine/style.css';
import { useUI } from '@/store/ui';

interface Props {
  initialContent: unknown | null;
  onChange: (content: unknown) => void;
}

export default function NoteEditor({ initialContent, onChange }: Props) {
  const debounceRef = useRef<number | null>(null);
  const theme = useUI((s) => s.theme);

  const initial = useMemo(() => {
    if (initialContent && Array.isArray(initialContent) && initialContent.length > 0) {
      return initialContent as any;
    }
    return undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({ initialContent: initial, dictionary: nlDict as any });

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);


  const effectiveTheme: 'light' | 'dark' =
    theme === 'system'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return (
    <BlockNoteView
      editor={editor}
      theme={effectiveTheme}
      onChange={() => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          onChange(editor.document);
        }, 500);
      }}
    />
  );
}
