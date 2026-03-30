import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CREDIT_PACKAGES } from '@/lib/constants';
import { Check } from 'lucide-react';

export function PricingPreview() {
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Simple credit-based pricing</h2>
        <p className="mt-2 text-center text-muted-foreground">
          3 free analyses on signup. Buy more when you need them.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card key={pkg.id} className="text-center">
              <CardHeader>
                <CardTitle className="text-3xl font-bold">{pkg.credits}</CardTitle>
                <p className="text-sm text-muted-foreground">credits</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-2xl font-semibold">₹{pkg.price_inr}</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center justify-center gap-1">
                    <Check className="h-3 w-3 text-green-600" />
                    {pkg.credits} full analyses
                  </li>
                  <li className="flex items-center justify-center gap-1">
                    <Check className="h-3 w-3 text-green-600" />
                    Evidence + scoring
                  </li>
                </ul>
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">Get started</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground underline">
            View full pricing details
          </Link>
        </div>
      </div>
    </section>
  );
}
