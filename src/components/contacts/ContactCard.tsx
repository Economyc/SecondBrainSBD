import { Star, Mail, Phone, Building2 } from 'lucide-react';
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

interface ContactCardProps {
  contact: Contact;
  onToggleFavorite: (id: string) => void;
  onClick: (contact: Contact) => void;
}

export function ContactCard({ contact, onToggleFavorite, onClick }: ContactCardProps) {
  return (
    <div
      className="group border rounded-lg p-4 bg-card hover:shadow-md transition-all duration-200 hover:border-foreground/20 cursor-pointer"
      onClick={() => onClick(contact)}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
          {getInitials(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{contact.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(contact.id); }}
              className="shrink-0"
            >
              <Star className={cn('h-3.5 w-3.5 transition-colors', contact.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400')} />
            </button>
          </div>
          {contact.role && contact.company && (
            <p className="text-xs text-muted-foreground truncate">{contact.role} en {contact.company}</p>
          )}
          {!contact.role && contact.company && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />{contact.company}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0', CATEGORY_COLORS[contact.category])}>
          {CATEGORY_LABELS[contact.category]}
        </Badge>
        {contact.tags.slice(0, 2).map(tag => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">{tag}</Badge>
        ))}
      </div>

      <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
        {contact.email && (
          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(contact.email!); toast('Email copiado'); }} className="flex items-center gap-1 hover:text-foreground truncate">
            <Mail className="h-3 w-3 shrink-0" /><span className="truncate">{contact.email}</span>
          </button>
        )}
        {contact.phone && (
          <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(contact.phone!); toast('Teléfono copiado'); }} className="flex items-center gap-1 hover:text-foreground shrink-0">
            <Phone className="h-3 w-3" />{contact.phone}
          </button>
        )}
      </div>
    </div>
  );
}
