'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils/formatters';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  plan: string;
  credit_balance: number;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  registered: 'bg-blue-100 text-blue-700',
  visitor: 'bg-gray-100 text-gray-700',
};

const PLAN_COLORS: Record<string, string> = {
  pro: 'bg-amber-100 text-amber-700',
  starter: 'bg-blue-100 text-blue-700',
  free: 'bg-gray-100 text-gray-700',
};

export function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creditForm, setCreditForm] = useState<{
    userId: string;
    amount: string;
    description: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback((query: string) => {
    setIsLoading(true);
    const url = query ? `/api/admin/users?search=${encodeURIComponent(query)}` : '/api/admin/users';
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
      })
      .then((data) => {
        setUsers(data.users ?? []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsers('');
  }, [fetchUsers]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(value);
    }, 400);
  }

  async function handleCreditSubmit(userId: string) {
    if (!creditForm) return;
    const amount = parseInt(creditForm.amount, 10);
    if (isNaN(amount) || amount === 0) {
      toast.error('Please enter a valid non-zero amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: creditForm.description || 'Admin adjustment' }),
      });
      if (!res.ok) throw new Error('Failed to adjust credits');
      toast.success('Credits adjusted successfully');
      setCreditForm(null);
      fetchUsers(search);
    } catch {
      toast.error('Failed to adjust credits');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
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

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No users found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.display_name ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ROLE_COLORS[user.role] ?? ''}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={PLAN_COLORS[user.plan] ?? ''}>
                      {user.plan}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{user.credit_balance}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(user.created_at)}
                  </TableCell>
                  <TableCell>
                    {creditForm?.userId === user.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={creditForm.amount}
                          onChange={(e) =>
                            setCreditForm({ ...creditForm, amount: e.target.value })
                          }
                          className="h-8 w-20"
                        />
                        <Input
                          placeholder="Reason"
                          value={creditForm.description}
                          onChange={(e) =>
                            setCreditForm({ ...creditForm, description: e.target.value })
                          }
                          className="h-8 w-32"
                        />
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleCreditSubmit(user.id)}
                        >
                          {submitting ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreditForm(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCreditForm({ userId: user.id, amount: '', description: '' })
                        }
                      >
                        <CreditCard className="mr-1 h-3 w-3" />
                        Adjust Credits
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
