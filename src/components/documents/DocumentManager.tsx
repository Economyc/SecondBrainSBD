import { useState, useRef, useEffect } from 'react';
import {
  FolderPlus, Grid, List, ChevronRight, Home,
  File, Folder, Trash2, Upload, Eye, Download, Image, FileText as FileTextIcon,
  FileText, Plus, ArrowLeft, Pencil, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDocuments } from '@/hooks/useDocuments';
import { usePages } from '@/hooks/usePages';
import { PageEditor } from '@/components/pages/PageEditor';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { NotePage } from '@/types';

type ViewMode = 'grid' | 'list';

export function DocumentManager() {
  const docs = useDocuments();
  const { pages, addPage, updatePage, deletePage } = usePages();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [newFolderName, setNewFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<typeof docs.files[number] | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<NotePage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameCancelledRef = useRef(false);
  const [localTitle, setLocalTitle] = useState('');

  const { subfolders, files } = docs.getFolderContents(currentFolder);
  const breadcrumbs = docs.getBreadcrumbs(currentFolder);
  const pagesInFolder = pages.filter(p => {
    const pageFolderId = p.folderId || null;
    if (pageFolderId === currentFolder) return true;
    // Show orphaned pages (folder deleted) at root level
    if (currentFolder === null && pageFolderId !== null && !docs.folders.some(f => f.id === pageFolderId)) return true;
    return false;
  });

  // Escape to go back from editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activePage) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable'))) {
          (active as HTMLElement).blur();
          return;
        }
        setActivePage(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePage]);

  // Sync title into local state when a page is opened
  useEffect(() => {
    if (activePage) {
      const p = pages.find(p => p.id === activePage.id) || activePage;
      setLocalTitle(p.title);
    }
  }, [activePage?.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    for (let i = 0; i < fileList.length; i++) {
      await docs.uploadFile(fileList[i], currentFolder);
    }
    e.target.value = '';
  };

  const handleDeleteFolder = async (folderId: string) => {
    const toDelete = new Set<string>();
    const queue = [folderId];
    while (queue.length) {
      const current = queue.shift()!;
      toDelete.add(current);
      docs.folders.filter(f => f.parentId === current).forEach(f => queue.push(f.id));
    }
    const orphanedPages = pages.filter(p => p.folderId && toDelete.has(p.folderId));
    await Promise.all(orphanedPages.map(p => deletePage(p.id)));
    await docs.deleteFolder(folderId);
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      docs.createFolder(newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setFolderDialogOpen(false);
    }
  };

  const handleCreatePage = async () => {
    const page = await addPage('', currentFolder);
    setActivePage(page);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolder(null);
    const fileId = e.dataTransfer.getData('fileId');
    if (fileId) {
      docs.moveFile(fileId, targetFolderId);
    }
    const pageId = e.dataTransfer.getData('pageId');
    if (pageId) {
      updatePage(pageId, { folderId: targetFolderId });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const isImage = (type: string) => type.startsWith('image/');
  const isPdf = (type: string) => type === 'application/pdf';

  const handleDownload = (file: typeof docs.files[number]) => {
    const link = document.createElement('a');
    link.href = file.downloadUrl;
    link.download = file.name;
    link.click();
  };

  // ── Page Editor View ──
  if (activePage) {
    const current = pages.find(p => p.id === activePage.id) || activePage;
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
            updatePage(current.id, { title: localTitle });
            setActivePage(null);
          }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="text-xl font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Título"
          />
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 shrink-0 btn-press"
            onClick={() => updatePage(current.id, { title: localTitle })}
          >
            <Save className="h-3.5 w-3.5" />
            Guardar
          </Button>
        </div>
        <PageEditor page={current} onUpdate={updatePage} />
      </div>
    );
  }

  // ── Drive View ──
  return (
    <div className="p-6 space-y-6" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, currentFolder)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {docs.folders.length} carpetas · {docs.files.length} archivos · {pages.length} páginas
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 btn-press" onClick={() => setViewMode('grid')}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 btn-press" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentFolder(null)}
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Home className="h-3.5 w-3.5" />
          Raíz
        </button>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1 animate-in-fade">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button onClick={() => setCurrentFolder(crumb.id)} className="text-muted-foreground hover:text-foreground transition-colors">
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 btn-press">
              <FolderPlus className="h-4 w-4" />
              Nueva carpeta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear carpeta</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} className="flex gap-2">
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nombre de la carpeta..." autoFocus />
              <Button type="submit" className="btn-press">Crear</Button>
            </form>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 btn-press">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleCreatePage} className="gap-2">
              <FileText className="h-4 w-4" />
              Documento (Página)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Subir archivo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
      </div>

      {/* Content */}
      <div
        className={cn(
          viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 stagger-children' : 'space-y-1',
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, currentFolder)}
      >
        {/* Folders */}
        {subfolders.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              'group cursor-pointer rounded-lg border transition-all duration-200 card-hover relative',
              viewMode === 'grid' ? 'p-4 text-center' : 'p-3 flex items-center gap-3',
              dragOverFolder === folder.id && 'drop-target'
            )}
            onClick={() => { if (renamingFolderId !== folder.id) setCurrentFolder(folder.id); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(folder.id); }}
            onDragLeave={() => setDragOverFolder(null)}
            onDrop={(e) => { e.stopPropagation(); handleDrop(e, folder.id); }}
          >
            <Folder className={cn('text-muted-foreground', viewMode === 'grid' ? 'h-10 w-10 mx-auto mb-2' : 'h-5 w-5 shrink-0')} />
            {renamingFolderId === folder.id ? (
              <Input
                autoFocus
                value={renameValue}
                className="h-6 text-sm px-1 py-0"
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => {
                  if (!renameCancelledRef.current && renameValue.trim()) docs.renameFolder(folder.id, renameValue.trim());
                  renameCancelledRef.current = false;
                  setRenamingFolderId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (renameValue.trim()) docs.renameFolder(folder.id, renameValue.trim());
                    renameCancelledRef.current = true;
                    setRenamingFolderId(null);
                  }
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    renameCancelledRef.current = true;
                    setRenamingFolderId(null);
                  }
                }}
              />
            ) : (
              <span
                className="text-sm truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingFolderId(folder.id);
                  setRenameValue(folder.name);
                }}
              >
                {folder.name}
              </span>
            )}
            <div className={cn('flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity', viewMode === 'grid' ? 'absolute top-1 right-1' : 'ml-auto')}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 btn-press"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingFolderId(folder.id);
                  setRenameValue(folder.name);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 btn-press"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        {/* Pages (rich-text documents) */}
        {pagesInFolder.map((page) => (
          <div
            key={page.id}
            className={cn(
              'group cursor-pointer rounded-lg border transition-all duration-200 card-hover relative',
              viewMode === 'grid' ? 'p-4 text-center' : 'p-3 flex items-center gap-3'
            )}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('pageId', page.id)}
            onClick={() => setActivePage(page)}
          >
            <FileText className={cn('text-primary/70', viewMode === 'grid' ? 'h-10 w-10 mx-auto mb-2' : 'h-5 w-5 shrink-0')} />
            <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
              <p className="text-sm truncate">{page.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(page.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity btn-press', viewMode === 'grid' ? 'absolute top-1 right-1' : 'ml-auto')}
              onClick={(e) => { e.stopPropagation(); deletePage(page.id); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        {/* Uploaded Files */}
        {files.map((file) => (
          <div
            key={file.id}
            className={cn(
              'group relative rounded-lg border transition-all duration-200 card-hover cursor-grab active:cursor-grabbing',
              viewMode === 'grid' ? 'p-4 text-center' : 'p-3 flex items-center gap-3'
            )}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('fileId', file.id)}
          >
            {viewMode === 'grid' && isImage(file.type) ? (
              <div className="w-full aspect-square mb-2 rounded overflow-hidden bg-muted flex items-center justify-center">
                <img src={file.downloadUrl} alt={file.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={cn(
                'flex items-center justify-center text-muted-foreground',
                viewMode === 'grid' ? 'h-10 w-10 mx-auto mb-2' : ''
              )}>
                {isImage(file.type) ? <Image className={viewMode === 'grid' ? 'h-10 w-10' : 'h-5 w-5 shrink-0'} /> :
                  isPdf(file.type) ? <FileTextIcon className={viewMode === 'grid' ? 'h-10 w-10' : 'h-5 w-5 shrink-0'} /> :
                    <File className={viewMode === 'grid' ? 'h-10 w-10' : 'h-5 w-5 shrink-0'} />}
              </div>
            )}
            <div className={viewMode === 'list' ? 'flex-1 min-w-0' : ''}>
              <p className="text-sm truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <div className={cn(
              'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
              viewMode === 'grid' ? 'absolute top-1 right-1' : 'ml-auto shrink-0'
            )}>
              {(isImage(file.type) || isPdf(file.type)) && (
                <Button variant="ghost" size="icon" className="h-6 w-6 btn-press" onClick={() => setPreviewFile(file)}>
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-6 w-6 btn-press" onClick={() => handleDownload(file)}>
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 btn-press" onClick={() => docs.deleteFile(file.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {subfolders.length === 0 && files.length === 0 && pagesInFolder.length === 0 && (
        <div
          className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-lg"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, currentFolder)}
        >
          <Upload className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>Esta carpeta está vacía.</p>
          <p className="text-xs mt-1">Crea un documento, sube archivos o añade subcarpetas.</p>
        </div>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(o) => !o && setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{previewFile?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh] rounded-lg bg-muted/30 flex items-center justify-center p-4">
            {previewFile && isImage(previewFile.type) && (
              <img src={previewFile.downloadUrl} alt={previewFile.name} className="max-w-full max-h-[65vh] object-contain rounded" />
            )}
            {previewFile && isPdf(previewFile.type) && (
              <iframe src={previewFile.downloadUrl} className="w-full h-[65vh] rounded" title={previewFile.name} />
            )}
          </div>
          {previewFile && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatSize(previewFile.size)} · {previewFile.type}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 btn-press" onClick={() => handleDownload(previewFile)}>
                <Download className="h-3 w-3" /> Descargar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
