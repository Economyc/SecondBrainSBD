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

interface ContactItemProps {
  contact: Contact;
  onToggleFavorite: (id: string) => void;
  onClick: (contact: Contact) => void;
}

export function ContactItem({ contact, onToggleFavorite, onClick }: ContactItemProps) {
  return (
    <div
      className="flex items-center gap-3 border rounded-lg px-4 py-3 bg-card hover:shadow-sm transition-all duration-200 hover:border-foreground/20 cursor-pointer"
      onClick={() => onClick(contact)}
    >
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
        {getInitials(contact.name)}
      </div>

      <div className="flex-1 min-w-0 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{contact.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(contact.id); }}
              className="shrink-0"
            >
              <Star className={cn('h-3.5 w-3.5 transition-colors', contact.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-400')} />
            </button>
          </div>
          {contact.company && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Building2 className="h-3 w-3" />{contact.company}
              {contact.role && <span>· {contact.role}</span>}
            </p>
          )}
        </div>

        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 shrink-0', CATEGORY_COLORS[contact.category])}>
          {CATEGORY_LABELS[contact.category]}
        </Badge>

        <div className="hidden sm:flex gap-3 text-xs text-muted-foreground shrink-0">
          {contact.email && (
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(contact.email!); toast('Email copiado'); }} className="flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" /><span className="max-w-[150px] truncate">{contact.email}</span>
            </button>
          )}
          {contact.phone && (
            <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(contact.phone!); toast('Teléfono copiado'); }} className="flex items-center gap-1 hover:text-foreground">
              <Phone className="h-3 w-3" />{contact.phone}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
