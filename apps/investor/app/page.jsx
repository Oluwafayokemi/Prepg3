// apps/investor/app/page.jsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestorHome() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  
  return null;
}