'use client';

import AuthGuard from '@/components/AuthGuard';
import FederatedLayout from '@/components/FederatedLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <FederatedLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </FederatedLayout>
    </AuthGuard>
  );
}
