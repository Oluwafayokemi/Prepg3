// apps/investor/app/forgot-password/page.jsx
'use client';

import { useRouter } from 'next/navigation';
import { ForgotPasswordPage } from '../../../shared/pages';

export default function ForgotPassword() {
  const router = useRouter();

  return (
    <ForgotPasswordPage
      onBackToLogin={() => router.push('/login')}
    />
  );
}