import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface Props {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export default function InlineEdit({
  value,
  onSave,
  placeholder,
  className,
  multiline,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    if (draft.trim() !== value) onSave(draft.trim());
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={clsx(
          'cursor-text rounded px-1 -mx-1 hover:bg-surface2/60 transition-colors min-h-[1.5em]',
          !value && 'text-muted',
          className
        )}
      >
        {value || placeholder || 'Klik om te bewerken'}
      </div>
    );
  }

  const sharedProps = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDraft(value);
        setEditing(false);
      } else if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        commit();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      }
    },
    className: clsx(
      'w-full bg-surface2 rounded px-1 -mx-1 focus:outline-none focus:ring-1 focus:ring-accent/50',
      className
    ),
  };

  if (multiline) {
    return <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} {...sharedProps} />;
  }
  return <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" {...sharedProps} />;
}
