/**
 * POST /api/webhooks/stripe — Stripe webhook handler
 * Processes checkout.session.completed events.
 * Idempotent — won't double-credit.
 * Retry-safe — returns 500 on failure so Stripe retries (DEC-032).
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { CREDIT_PACKAGES } from '@/lib/constants';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Retry wrapper for critical operations (Tier 3 webhook hardening).
 * 3 attempts with exponential backoff: 100ms, 500ms, 1500ms.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  const delays = [100, 500, 1500];
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
  throw new Error('unreachable');
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== 'paid') {
        return NextResponse.json({ status: 'not_paid' });
      }

      const userId = session.metadata?.user_id;
      const packageId = session.metadata?.package_id;

      if (!userId || !packageId) {
        console.warn('[webhook] Missing metadata', { eventId: event.id, sessionId: session.id });
        return NextResponse.json({ status: 'ignored', reason: 'missing metadata' });
      }

      const admin = createAdminClient();

      // Idempotency check
      const { data: existing } = await admin
        .from('credit_transactions')
        .select('id')
        .eq('razorpay_payment_id', session.id) // reusing column for Stripe session ID
        .limit(1)
        .single();

      if (existing) {
        return NextResponse.json({ status: 'already_processed' });
      }

      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      const credits = pkg?.credits ?? 5;

      // Retry credit operation — if all retries fail, return 500 so Stripe retries the webhook
      try {
        await withRetry(async () => {
          const { error: rpcError } = await admin.rpc('add_credits', {
            p_user_id: userId,
            p_amount: credits,
            p_description: `Purchased ${credits} credits`,
            p_razorpay_order_id: session.payment_intent as string,
            p_razorpay_payment_id: session.id,
          });
          if (rpcError) throw new Error(rpcError.message);
        });
      } catch (creditError) {
        console.error('[webhook] Credit operation failed after retries', {
          action: 'stripe_webhook_credit_failure',
          eventId: event.id,
          sessionId: session.id,
          userId,
          packageId,
          credits,
          error: (creditError as Error).message,
        });
        // Return 500 so Stripe retries the webhook
        return NextResponse.json({ error: 'credit_operation_failed' }, { status: 500 });
      }

      console.info('[webhook] Credits added', { userId, credits, sessionId: session.id });
      return NextResponse.json({ status: 'credits_added', credits });
    }

    if (event.type === 'checkout.session.expired') {
      console.info('[webhook] Checkout session expired', {
        sessionId: (event.data.object as Stripe.Checkout.Session).id,
      });
      return NextResponse.json({ status: 'noted', event: event.type });
    }

    return NextResponse.json({ status: 'ignored', event: event.type });
  } catch (e) {
    console.error('[webhook] Unhandled error', { error: (e as Error).message });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
