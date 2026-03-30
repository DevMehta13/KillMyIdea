/**
 * POST /api/credits/purchase — Create a Stripe Checkout session
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { purchaseCreditsSchema } from '@/lib/utils/validators';
import { CREDIT_PACKAGES, RATE_LIMIT_TIERS } from '@/lib/constants';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'credit_purchase', RATE_LIMIT_TIERS.creditPayment);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = purchaseCreditsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: 'Invalid package' }, { status: 400 });
    }

    const pkg = CREDIT_PACKAGES.find((p) => p.id === parsed.data.package_id);
    if (!pkg) {
      return NextResponse.json({ error: 'invalid_package', message: 'Package not found' }, { status: 400 });
    }

    const origin = request.headers.get('origin') ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${pkg.credits} Analysis Credits`,
              description: `Kill My Idea — ${pkg.credits} credits for deep idea analysis`,
            },
            unit_amount: pkg.price_inr * 100, // Stripe expects paise
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
      },
      success_url: `${origin}/settings/billing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    logger.error('Purchase error', e, { action: 'credit_purchase' });
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
