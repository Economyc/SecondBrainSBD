import { AppLayout } from '@/components/layout/AppLayout';
import { ContactsManager } from '@/components/contacts/ContactsManager';

export default function Contacts() {
  return (
    <AppLayout>
      <ContactsManager />
    </AppLayout>
  );
}
