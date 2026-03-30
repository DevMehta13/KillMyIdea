import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingNavbar } from '@/components/layout/marketing-navbar';
import { CREDIT_PACKAGES, FREE_SIGNUP_CREDITS } from '@/lib/constants';
import { Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Credit packages for full startup idea analysis. Start with 3 free analyses.',
};

const FREE_FEATURES = [
  { text: `${FREE_SIGNUP_CREDITS} free analyses on signup`, included: true },
  { text: 'Unlimited quick roasts', included: true },
  { text: 'Basic report', included: true },
  { text: 'Full evidence explorer', included: false },
  { text: 'Comparison tool', included: false },
  { text: 'Share links', included: false },
];

const PAID_FEATURES = [
  { text: 'Everything in free', included: true },
  { text: 'Full evidence explorer', included: true },
  { text: 'Comparison tool', included: true },
  { text: 'Share links', included: true },
  { text: 'Priority analysis', included: true },
];

export default function PricingPage() {
  return (
    <>
    <MarketingNavbar />
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
      <h1 className="text-center text-3xl font-bold sm:text-4xl">Pricing</h1>
      <p className="mt-3 text-center text-lg text-muted-foreground">
        Start free. Pay per analysis when you need more.
      </p>

      {/* Plan comparison */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-3xl font-bold">₹0</p>
            <p className="text-sm text-muted-foreground">forever</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  {f.included ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40" />
                  )}
                  <span className={f.included ? '' : 'text-muted-foreground/60'}>{f.text}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block">
              <Button variant="outline" className="w-full">Sign up free</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-2" style={{ borderColor: 'var(--brand-primary)' }}>
          <CardHeader>
            <CardTitle>Credit Packs</CardTitle>
            <p className="text-3xl font-bold">₹99+</p>
            <p className="text-sm text-muted-foreground">per pack</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              {PAID_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  {f.text}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block">
              <Button className="w-full text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>
                Get started
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Credit packages */}
      <h2 className="mt-16 text-center text-xl font-bold">Credit Packages</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <Card key={pkg.id} className="text-center">
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{pkg.credits}</p>
              <p className="text-sm text-muted-foreground">credits</p>
              <p className="mt-2 text-xl font-semibold">₹{pkg.price_inr}</p>
              <p className="text-xs text-muted-foreground">₹{Math.round(pkg.price_inr / pkg.credits)} per analysis</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </>
  );
}
