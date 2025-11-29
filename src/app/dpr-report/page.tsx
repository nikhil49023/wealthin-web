
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedDPRReportPage() {
    const router = useRouter();

    useEffect(() => {
        // This page is no longer used. The functionality has been replaced by
        // a direct HTML generation API. Redirect users back to the brainstorm page.
        router.replace('/brainstorm');
    }, [router]);

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-muted-foreground">Redirecting...</p>
        </div>
    );
}
