'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedTransactionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect users from the old transactions page to the new funds page
    router.replace('/funds');
  }, [router]);

  return null; // Render nothing as the redirect happens
}
