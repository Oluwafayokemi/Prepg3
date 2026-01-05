// apps/investor/app/layout.jsx
import RootLayout from "../../components/RootLayout";
import AuthProvider from "../../shared/components/AuthProvider";
import AmplifyInitializer from "@/shared/components/AmplifyInitializer";

export const metadata = {
  title: "PREPG3 Investor Portal",
  description: "Manage your property investments",
};

export default function InvestorLayout({ children }) {
  return (
    <RootLayout title={metadata.title} description={metadata.description}>
      <AmplifyInitializer>
        <AuthProvider requiredGroup="Investor" loginPath="/login">
          {children}
        </AuthProvider>
      </AmplifyInitializer>
    </RootLayout>
  );
}
