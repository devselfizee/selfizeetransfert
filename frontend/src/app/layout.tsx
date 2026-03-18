import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Selfizee Transfer - Envoi de fichiers sécurisé',
  description: 'Envoyez vos fichiers en toute sécurité avec Selfizee Transfer.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
