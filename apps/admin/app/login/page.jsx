// apps/admin/app/login/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import { LoginPage } from '../../../shared/pages';

export default function AdminLogin() {
  const router = useRouter();

  return (
    <LoginPage
      title="PREPG3 Admin Panel"
      subtitle="Sign in to admin dashboard"
      redirectPath="/dashboard"
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}