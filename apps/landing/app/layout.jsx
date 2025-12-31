// apps/landing/app/layout.jsx (was .tsx)
import RootLayout from '../../components/RootLayout';
import '../../lib/amplify-config';

export const metadata = {
  title: 'PREPG3 - Property Investment Platform',
  description: 'Invest in premium UK property developments',
};

export default function LandingLayout({ children }) {
  return (
    <RootLayout
      title={metadata.title}
      description={metadata.description}
    >
      {children}
    </RootLayout>
  );
}