'use client';
import { useState, useEffect, useCallback } from 'react';
import { Deal, Retainer } from './types';
import { getDeals, saveDeals, getRetainers, saveRetainers } from './store';

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setDeals(getDeals()); setLoaded(true); }, []);

  const update = useCallback((fn: (d: Deal[]) => Deal[]) => {
    setDeals(prev => { const next = fn(prev); saveDeals(next); return next; });
  }, []);

  return { deals, update, loaded };
}

export function useRetainers() {
  const [retainers, setRetainers] = useState<Retainer[]>([]);

  useEffect(() => { setRetainers(getRetainers()); }, []);

  const update = useCallback((fn: (r: Retainer[]) => Retainer[]) => {
    setRetainers(prev => { const next = fn(prev); saveRetainers(next); return next; });
  }, []);

  return { retainers, update };
}
