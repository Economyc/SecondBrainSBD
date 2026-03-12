import { Star, Mail, Phone, Globe, MapPin, Building2, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Contact, ContactCategory } from '@/types';

const CATEGORY_COLORS: Record<ContactCategory, string> = {
  personal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  corporate: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  provider: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  client: 'bg-green-500/10 text-green-600 dark:text-green-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  personal: 'Personal',
  corporate: 'Corporativo',
  provider: 'Proveedor',
  client: 'Cliente',
  other: 'Otro',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

interface ContactDetailSheetProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function ContactDetailSheet({ contact, open, onOpenChange, onEdit, onDelete, onToggleFavorite }: ContactDetailSheetProps) {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-medium shrink-0">
              {getInitials(contact.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="truncate">{contact.name}</SheetTitle>
                <button onClick={() => onToggleFavorite(contact.id)}>
                  <Star className={cn('h-4 w-4 transition-colors', contact.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400')} />
                </button>
              </div>
              <SheetDescription className="truncate">
                {contact.role && contact.company ? `${contact.role} en ${contact.company}` : contact.company || contact.role || ''}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Category & Tags */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className={cn('text-xs', CATEGORY_COLORS[contact.category])}>
              {CATEGORY_LABELS[contact.category]}
            </Badge>
            {contact.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            {contact.email && (
              <button onClick={() => { navigator.clipboard.writeText(contact.email!); toast('Email copiado'); }} className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                <Mail className="h-4 w-4 shrink-0" />{contact.email}
              </button>
            )}
            {contact.phone && (
              <button onClick={() => { navigator.clipboard.writeText(contact.phone!); toast('Teléfono copiado'); }} className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                <Phone className="h-4 w-4 shrink-0" />{contact.phone}
              </button>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 shrink-0" />{contact.company}
              </div>
            )}
            {contact.website && (
              <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-foreground text-muted-foreground transition-colors">
                <Globe className="h-4 w-4 shrink-0" />{contact.website}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {contact.address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />{contact.address}
              </div>
            )}
          </div>

          {/* Social Links */}
          {contact.socialLinks && (contact.socialLinks.linkedin || contact.socialLinks.twitter || contact.socialLinks.instagram) && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Redes sociales</p>
              <div className="flex gap-2">
                {contact.socialLinks.linkedin && (
                  <a href={contact.socialLinks.linkedin.startsWith('http') ? contact.socialLinks.linkedin : `https://linkedin.com/in/${contact.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    LinkedIn
                  </a>
                )}
                {contact.socialLinks.twitter && (
                  <a href={contact.socialLinks.twitter.startsWith('http') ? contact.socialLinks.twitter : `https://x.com/${contact.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Twitter/X
                  </a>
                )}
                {contact.socialLinks.instagram && (
                  <a href={contact.socialLinks.instagram.startsWith('http') ? contact.socialLinks.instagram : `https://instagram.com/${contact.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notas</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
            </div>
          )}

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Creado: {new Date(contact.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Actualizado: {new Date(contact.updatedAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => { onOpenChange(false); onEdit(contact); }}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
            </Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { onDelete(contact.id); onOpenChange(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
