/**
 * POST /api/credits/verify — Verify a Stripe Checkout session and add credits
 * Called after redirect from Stripe Checkout success URL.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'credit_verify', RATE_LIMIT_TIERS.creditPayment);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const sessionId = body?.session_id;
    if (!sessionId) {
      return NextResponse.json({ error: 'validation_error', message: 'session_id required' }, { status: 400 });
    }

    // Retrieve the Checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'not_paid', message: 'Payment not completed' }, { status: 400 });
    }

    // Verify this session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'forbidden', message: 'Session does not belong to this user' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Idempotency check — has this session already been processed?
    const { data: existing } = await admin
      .from('credit_transactions')
      .select('id')
      .eq('razorpay_payment_id', session.id) // reusing column for Stripe session ID
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'already_processed', message: 'Payment already processed' }, { status: 409 });
    }

    const packageId = session.metadata?.package_id;
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId) ?? CREDIT_PACKAGES[0];

    // Add credits via DB function
    const { data: newBalance, error: rpcError } = await admin.rpc('add_credits', {
      p_user_id: user.id,
      p_amount: pkg.credits,
      p_description: `Purchased ${pkg.credits} credits`,
      p_razorpay_order_id: session.payment_intent as string, // reusing column for Stripe payment intent
      p_razorpay_payment_id: session.id, // reusing column for Stripe session ID
    });

    if (rpcError) {
      logger.error('Failed to add credits', rpcError, { action: 'credit_verify', userId: user.id });
      return NextResponse.json({ error: 'credit_error', message: 'Failed to add credits' }, { status: 500 });
    }

    return NextResponse.json({
      credits_added: pkg.credits,
      new_balance: newBalance,
      transaction_id: session.id,
    });
  } catch (e) {
    logger.error('Verify error', e, { action: 'credit_verify' });
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
