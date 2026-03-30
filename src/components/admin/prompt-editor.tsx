'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface AdminSetting {
  key: string;
  value: unknown;
  updated_at: string;
}

export function PromptEditor() {
  const [settings, setSettings] = useState<AdminSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/prompts')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch settings');
        return res.json();
      })
      .then((data) => {
        const items: AdminSetting[] = data.settings ?? [];
        setSettings(items);
        const initial: Record<string, string> = {};
        for (const s of items) {
          initial[s.key] = JSON.stringify(s.value, null, 2);
        }
        setEditedValues(initial);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  async function handleSave(key: string) {
    const raw = editedValues[key];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error('Invalid JSON. Please fix syntax errors before saving.');
      return;
    }

    setSaving(key);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: parsed }),
      });
      if (!res.ok) throw new Error('Failed to save setting');
      toast.success(`Setting "${key}" saved successfully`);
    } catch {
      toast.error(`Failed to save setting "${key}"`);
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (settings.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No settings found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {settings.map((setting) => (
        <Card key={setting.key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-mono">{setting.key}</CardTitle>
            <Button
              size="sm"
              disabled={saving === setting.key}
              onClick={() => handleSave(setting.key)}
            >
              <Save className="mr-1 h-3 w-3" />
              {saving === setting.key ? 'Saving...' : 'Save'}
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={editedValues[setting.key] ?? ''}
              onChange={(e) =>
                setEditedValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
              }
              className="min-h-[120px] font-mono text-xs"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
