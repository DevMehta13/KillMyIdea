import type { Metadata } from 'next';
import { HeroSectionNew } from '@/components/marketing/hero-section-new';

export const metadata: Metadata = {
  title: 'AI Startup Idea Validator',
  description:
    'Paste your startup idea and get an instant brutally honest analysis. Free Quick Roast available.',
};

export default function LandingPage() {
  return <HeroSectionNew />;
}
