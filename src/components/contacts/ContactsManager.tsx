import { useState, useMemo } from 'react';
import { Plus, Search, LayoutGrid, List, SlidersHorizontal, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContacts } from '@/hooks/useContacts';
import { ContactCard } from './ContactCard';
import { ContactItem } from './ContactItem';
import { ContactFormDialog } from './ContactFormDialog';
import { ContactDetailSheet } from './ContactDetailSheet';
import { CONTACT_CATEGORIES } from '@/types';
import type { Contact, ContactCategory } from '@/types';

type SortKey = 'name' | 'date' | 'category' | 'company';

export function ContactsManager() {
  const { contacts, loading, addContact, updateContact, deleteContact, toggleFavorite } = useContacts();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = contacts;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter(c => c.category === filterCategory);
    }

    if (filterFavorites) {
      result = result.filter(c => c.favorite);
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'date': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'category': return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        case 'company': return (a.company || '').localeCompare(b.company || '') || a.name.localeCompare(b.name);
        default: return 0;
      }
    });

    return result;
  }, [contacts, search, filterCategory, filterFavorites, sortBy]);

  const handleSave = async (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingContact) {
      await updateContact(editingContact.id, data);
    } else {
      await addContact(data);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDialogOpen(true);
  };

  const handleOpenDetail = (contact: Contact) => {
    setDetailContact(contact);
    setDetailOpen(true);
  };

  const handleNewContact = () => {
    setEditingContact(null);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contactos</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} contactos</p>
        </div>
        <Button onClick={handleNewContact} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />Nuevo
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, empresa..."
            className="pl-8"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[140px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CONTACT_CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nombre</SelectItem>
            <SelectItem value="date">Fecha</SelectItem>
            <SelectItem value="category">Categoría</SelectItem>
            <SelectItem value="company">Empresa</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={filterFavorites ? 'default' : 'outline'}
          size="icon"
          className="h-9 w-9"
          onClick={() => setFilterFavorites(!filterFavorites)}
        >
          <Star className={`h-4 w-4 ${filterFavorites ? 'fill-current' : ''}`} />
        </Button>

        <div className="flex border rounded-md">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode('list')}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
              <div className="h-3 w-20 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          {contacts.length === 0 ? (
            <>
              <p className="text-muted-foreground text-sm">No tienes contactos aún.</p>
              <p className="text-muted-foreground/60 text-xs">Crea tu primer contacto para empezar.</p>
              <Button onClick={handleNewContact} size="sm" variant="outline" className="mt-2">
                <Plus className="h-4 w-4 mr-1.5" />Crear contacto
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No se encontraron contactos con los filtros actuales.</p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(contact => (
            <ContactCard key={contact.id} contact={contact} onToggleFavorite={toggleFavorite} onClick={handleOpenDetail} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(contact => (
            <ContactItem key={contact.id} contact={contact} onToggleFavorite={toggleFavorite} onClick={handleOpenDetail} />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSave={handleSave}
      />

      {/* Detail Sheet */}
      <ContactDetailSheet
        contact={detailContact}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEdit}
        onDelete={deleteContact}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
