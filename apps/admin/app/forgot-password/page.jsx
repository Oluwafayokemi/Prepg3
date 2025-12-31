// apps/admin/app/forgot-password/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import { ForgotPasswordPage } from '../../../shared/pages';

export default function AdminForgotPassword() {
  const router = useRouter();

  return (
    <ForgotPasswordPage
      onBackToLogin={() => router.push('/login')}
    />
  );
}