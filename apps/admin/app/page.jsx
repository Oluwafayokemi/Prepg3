// apps/admin/app/page.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminHome() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  
  return null;
}