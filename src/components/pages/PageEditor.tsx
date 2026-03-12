import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef } from 'react';
import type { NotePage } from '@/types';
import { EditorToolbar } from './EditorToolbar';

interface PageEditorProps {
  page: NotePage;
  onUpdate: (id: string, updates: Partial<NotePage>) => void;
}

export function PageEditor({ page, onUpdate }: PageEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2 cursor-pointer' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: 'Start writing… Use the toolbar to add headings, tables, and links.',
      }),
    ],
    content: page.content ? JSON.parse(page.content) : undefined,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(page.id, { content: JSON.stringify(editor.getJSON()) });
      }, 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-1 py-2',
      },
    },
  }, [page.id]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div className="space-y-3">
      <EditorToolbar editor={editor} />
      <div className="border rounded-lg p-4 bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
