// apps/admin/app/layout.jsx
import RootLayout from '../../components/RootLayout';
import AuthProvider from '../../shared/components/AuthProvider';
import '../../lib/amplify-config';

export const metadata = {
  title: 'PREPG3 Admin Panel',
  description: 'Manage properties and investors',
};

export default function AdminLayout({ children }) {
  return (
    <RootLayout title={metadata.title} description={metadata.description}>
      <AuthProvider requiredGroup="Admin" loginPath="/login">
        {children}
      </AuthProvider>
    </RootLayout>
  );
}