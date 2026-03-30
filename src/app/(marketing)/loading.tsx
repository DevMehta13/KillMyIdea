import { Skeleton } from '@/components/ui/skeleton';

export default function MarketingLoading() {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-20">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96" />
      <Skeleton className="h-48 w-full max-w-lg rounded-lg" />
    </div>
  );
}
