import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTACT_CATEGORIES, type Contact, type ContactCategory } from '@/types';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSave: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function ContactFormDialog({ open, onOpenChange, contact, onSave }: ContactFormDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [category, setCategory] = useState<ContactCategory>('personal');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (contact) {
        setName(contact.name);
        setEmail(contact.email || '');
        setPhone(contact.phone || '');
        setCompany(contact.company || '');
        setRole(contact.role || '');
        setCategory(contact.category);
        setAddress(contact.address || '');
        setNotes(contact.notes || '');
        setWebsite(contact.website || '');
        setTagsStr(contact.tags.join(', '));
        setLinkedin(contact.socialLinks?.linkedin || '');
        setTwitter(contact.socialLinks?.twitter || '');
        setInstagram(contact.socialLinks?.instagram || '');
      } else {
        setName(''); setEmail(''); setPhone(''); setCompany(''); setRole('');
        setCategory('personal'); setAddress(''); setNotes(''); setWebsite('');
        setTagsStr(''); setLinkedin(''); setTwitter(''); setInstagram('');
      }
    }
  }, [open, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
      const socialLinks = (linkedin || twitter || instagram)
        ? { linkedin: linkedin || undefined, twitter: twitter || undefined, instagram: instagram || undefined }
        : undefined;

      await onSave({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        role: role.trim() || undefined,
        category,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        website: website.trim() || undefined,
        tags,
        socialLinks,
        favorite: contact?.favorite ?? false,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Nombre *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Teléfono</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Empresa</label>
              <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Empresa" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cargo</label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Cargo / Rol" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoría</label>
              <Select value={category} onValueChange={v => setCategory(v as ContactCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Sitio web</label>
              <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Dirección</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Dirección" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Etiquetas (separadas por coma)</label>
              <Input value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="amigo, universidad, proyecto" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Notas</label>
              <textarea
                className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-sm"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          {/* Social Links */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">Redes sociales</summary>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="LinkedIn" />
              <Input value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="Twitter/X" />
              <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram" />
            </div>
          </details>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Guardando...' : contact ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
