/**
 * Structured logger (DEC-032).
 * JSON-formatted logs with context. Sentry integration for errors when DSN is configured.
 * Replaces all console.* calls across the codebase.
 */

import * as Sentry from '@sentry/nextjs';

interface LogContext {
  action?: string;
  userId?: string;
  ideaId?: string;
  runId?: string;
  provider?: string;
  eventId?: string;
  sessionId?: string;
  duration?: number;
  [key: string]: unknown;
}

function formatLog(level: string, message: string, context?: LogContext) {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.info(formatLog('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context));
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const errorMessage = error instanceof Error ? error.message : String(error ?? '');
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(formatLog('error', message, {
      ...context,
      errorMessage,
      errorStack,
    }));

    // Forward to Sentry if configured
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context as Record<string, unknown>,
      });
    } else if (error) {
      Sentry.captureMessage(`${message}: ${errorMessage}`, {
        level: 'error',
        extra: context as Record<string, unknown>,
      });
    }
  },
};
