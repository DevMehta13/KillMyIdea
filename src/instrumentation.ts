/**
 * Next.js instrumentation hook — runs once on server startup.
 * Initializes Sentry and validates environment variables.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
    // Validate env vars on server startup
    const { validateEnv } = await import('@/lib/utils/env');
    try {
      validateEnv();
    } catch (e) {
      console.error('[startup]', (e as Error).message);
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
