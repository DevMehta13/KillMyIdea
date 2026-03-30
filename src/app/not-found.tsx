import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-6xl font-bold" style={{ color: 'var(--brand-primary)' }}>404</h1>
      <p className="text-lg text-muted-foreground">Page not found</p>
      <Link href="/">
        <Button>Go home</Button>
      </Link>
    </div>
  );
}
