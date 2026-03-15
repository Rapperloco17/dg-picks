'use client';

import dynamic from 'next/dynamic';

// Importar dinámicamente para evitar prerendering
const LocalDataAdminContent = dynamic(
  () => import('./LocalDataAdminContent'),
  { ssr: false }
);

export default function LocalDataAdminPage() {
  return <LocalDataAdminContent />;
}
