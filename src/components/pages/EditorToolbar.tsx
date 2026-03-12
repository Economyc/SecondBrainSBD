import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Heading1, Heading2, Heading3, Quote, Minus, Link as LinkIcon,
  Table as TableIcon, Undo, Redo, Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCallback } from 'react';

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const setLink = useCallback(() => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL', previous);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const btn = (active: boolean) =>
    `h-7 w-7 p-0 ${active ? 'bg-accent text-accent-foreground' : ''}`;

  return (
    <div className="flex items-center gap-0.5 flex-wrap border rounded-lg px-2 py-1.5 bg-muted/30">
      <Button variant="ghost" size="icon" className={btn(editor.isActive('bold'))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('italic'))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('strike'))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('code'))} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
        <Code className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('heading', { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
        <Heading3 className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="ghost" size="icon" className={btn(editor.isActive('bulletList'))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('orderedList'))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(editor.isActive('blockquote'))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
        <Quote className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="ghost" size="icon" className={btn(editor.isActive('link'))} onClick={setLink} title="Add link">
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>
      {editor.isActive('link') && (
        <Button variant="ghost" size="icon" className={btn(false)} onClick={() => editor.chain().focus().unsetLink().run()} title="Remove link">
          <Unlink className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className={btn(false)} onClick={addTable} title="Insert table">
        <TableIcon className="h-3.5 w-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      <Button variant="ghost" size="icon" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
        <Undo className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
        <Redo className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
