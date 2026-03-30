/**
 * Next.js robots.txt generation.
 * Allows public marketing pages, disallows app/admin/api.
 */

import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://killmyidea.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/signup', '/signin'],
        disallow: ['/dashboard', '/ideas', '/settings', '/admin', '/api', '/compare'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
