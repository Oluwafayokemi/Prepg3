// apps/investor/app/login/page.jsx
'use client';

import LoginPage from '../../../shared/pages/auth/LoginPage';
import { useRouter } from 'next/navigation';

export default function InvestorLogin() {
  const router = useRouter();

  return (
    <LoginPage
      title="PREPG3 Investor Portal"
      subtitle="Sign in to your investor account"
      redirectPath="/dashboard"
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}