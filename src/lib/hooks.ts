'use client';
import { useState, useEffect, useCallback } from 'react';
import { Deal, Retainer } from './types';
import {
  getDealsAsync, saveDeal, deleteDeal as deleteDealFromDb,
  getRetainersAsync, saveRetainer, deleteRetainer as deleteRetainerFromDb,
  saveRetainers, syncProspects, subscribeToDeals, subscribeToRetainers,
} from './store';

function sanitizeDeals(deals: Deal[]): Deal[] {
  return deals.map(d => ({
    ...d,
    estimatedValue: d.estimatedValue ?? (d as any).value ?? 0,
    stage: d.stage ?? 'Prospect',
    activities: d.activities ?? [],
    lastInteraction: d.lastInteraction ?? d.createdAt ?? new Date().toISOString(),
    createdAt: d.createdAt ?? new Date().toISOString(),
    contactPerson: d.contactPerson ?? (d as any).name ?? '',
    service: d.service ?? '',
    website: d.website ?? '',
    phone: d.phone ?? '',
    email: d.email ?? '',
    notes: d.notes ?? '',
    gbpUrl: d.gbpUrl ?? '',
    amountPaid: d.amountPaid ?? 0,
    isRetainer: d.isRetainer ?? false,
  }));
}

function sanitizeRetainers(retainers: Retainer[]): Retainer[] {
  return retainers.map(r => ({
    ...r,
    monthlyAmount: r.monthlyAmount ?? 0,
  }));
}

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getDealsAsync().then(fetchedDeals => {
      setDeals(sanitizeDeals(fetchedDeals));
      setLoaded(true);
    });

    // Real-time subscription
    const unsub = subscribeToDeals((freshDeals) => {
      setDeals(sanitizeDeals(freshDeals));
    });
    return unsub;
  }, []);

  const update = useCallback((fn: (d: Deal[]) => Deal[]) => {
    setDeals(prev => {
      const next = fn(prev);
      // Find changed/new deals and persist them
      const prevMap = new Map(prev.map(d => [d.id, d]));
      const nextMap = new Map(next.map(d => [d.id, d]));

      // Save updated/new deals
      for (const deal of next) {
        const old = prevMap.get(deal.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(deal)) {
          saveDeal(deal);
        }
      }

      // Delete removed deals
      for (const deal of prev) {
        if (!nextMap.has(deal.id)) {
          deleteDealFromDb(deal.id);
        }
      }

      return next;
    });
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncProspects();
      const freshDeals = await getDealsAsync();
      setDeals(sanitizeDeals(freshDeals));
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { deals, update, loaded, sync, syncing };
}

export function useRetainers() {
  const [retainers, setRetainers] = useState<Retainer[]>([]);

  useEffect(() => {
    getRetainersAsync().then(r => setRetainers(sanitizeRetainers(r)));

    const unsub = subscribeToRetainers((freshRetainers) => {
      setRetainers(sanitizeRetainers(freshRetainers));
    });
    return unsub;
  }, []);

  const update = useCallback((fn: (r: Retainer[]) => Retainer[]) => {
    setRetainers(prev => {
      const next = fn(prev);
      const prevMap = new Map(prev.map(r => [r.id, r]));
      const nextMap = new Map(next.map(r => [r.id, r]));

      for (const ret of next) {
        const old = prevMap.get(ret.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(ret)) {
          saveRetainer(ret);
        }
      }

      for (const ret of prev) {
        if (!nextMap.has(ret.id)) {
          deleteRetainerFromDb(ret.id);
        }
      }

      return next;
    });
  }, []);

  return { retainers, update };
}
