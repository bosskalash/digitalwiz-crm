'use client';
import { useState, useEffect, useCallback } from 'react';
import { Deal, Retainer } from './types';
import { getDeals, getDealsAsync, saveDeals, getRetainers, saveRetainers, syncProspects } from './store';

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Load deals asynchronously (fetches from JSON + merges with localStorage)
    getDealsAsync().then(fetchedDeals => {
      setDeals(fetchedDeals);
      setLoaded(true);
    });
  }, []);

  const update = useCallback((fn: (d: Deal[]) => Deal[]) => {
    setDeals(prev => { const next = fn(prev); saveDeals(next); return next; });
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncProspects();
      // Reload deals after sync
      const freshDeals = getDeals();
      setDeals(freshDeals);
      return result;
    } finally {
      setSyncing(false);
    }
  }, []);

  return { deals, update, loaded, sync, syncing };
}

export function useRetainers() {
  const [retainers, setRetainers] = useState<Retainer[]>([]);

  useEffect(() => { setRetainers(getRetainers()); }, []);

  const update = useCallback((fn: (r: Retainer[]) => Retainer[]) => {
    setRetainers(prev => { const next = fn(prev); saveRetainers(next); return next; });
  }, []);

  return { retainers, update };
}
