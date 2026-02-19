import { Deal, Retainer, Activity } from './types';
import { v4 as uuid } from 'uuid';

const DEALS_KEY = 'dw_crm_deals';
const RETAINERS_KEY = 'dw_crm_retainers';
const SYNC_TIMESTAMP_KEY = 'dw_crm_last_sync';

interface ProspectsData {
  deals: Deal[];
  retainers: Retainer[];
  lastUpdated: string;
}

let cachedProspectsData: ProspectsData | null = null;

/**
 * Fetch prospects data from JSON file
 */
async function fetchProspectsData(): Promise<ProspectsData> {
  if (cachedProspectsData) return cachedProspectsData;
  
  try {
    const response = await fetch('/data/prospects.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch prospects: ${response.statusText}`);
    }
    cachedProspectsData = await response.json();
    return cachedProspectsData!;
  } catch (error) {
    console.warn('Failed to load prospects.json, using empty data:', error);
    return { deals: [], retainers: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Merge JSON deals with localStorage deals
 * Strategy: localStorage wins for existing deals (by ID), new deals from JSON are added
 */
function mergeDeals(jsonDeals: Deal[], localDeals: Deal[]): Deal[] {
  const localDealsMap = new Map(localDeals.map(d => [d.id, d]));
  const mergedDeals: Deal[] = [];
  
  // Start with all local deals (these have user edits)
  for (const deal of localDeals) {
    mergedDeals.push(deal);
  }
  
  // Add new deals from JSON that aren't in localStorage
  for (const jsonDeal of jsonDeals) {
    if (!localDealsMap.has(jsonDeal.id)) {
      mergedDeals.push(jsonDeal);
    }
  }
  
  return mergedDeals;
}

/**
 * Get deals with async JSON fetch on first load
 */
export async function getDealsAsync(): Promise<Deal[]> {
  if (typeof window === 'undefined') return [];
  
  const localRaw = localStorage.getItem(DEALS_KEY);
  const localDeals = localRaw ? JSON.parse(localRaw) : [];
  
  // Fetch JSON data
  const prospectsData = await fetchProspectsData();
  
  // Merge JSON deals with local deals
  const mergedDeals = mergeDeals(prospectsData.deals, localDeals);
  
  // Save merged result to localStorage
  localStorage.setItem(DEALS_KEY, JSON.stringify(mergedDeals));
  
  return mergedDeals;
}

/**
 * Synchronous get deals (for compatibility with existing code)
 * Returns localStorage data immediately, may be stale
 */
export function getDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(DEALS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

/**
 * Sync button: Re-fetch JSON and merge new prospects
 */
export async function syncProspects(): Promise<{ added: number; total: number }> {
  if (typeof window === 'undefined') return { added: 0, total: 0 };
  
  // Clear cache to force fresh fetch
  cachedProspectsData = null;
  
  const localRaw = localStorage.getItem(DEALS_KEY);
  const localDeals = localRaw ? JSON.parse(localRaw) : [];
  const localDealsMap = new Map(localDeals.map((d: Deal) => [d.id, d]));
  
  // Fetch fresh JSON data
  const prospectsData = await fetchProspectsData();
  
  // Count how many new deals we're adding
  let addedCount = 0;
  for (const jsonDeal of prospectsData.deals) {
    if (!localDealsMap.has(jsonDeal.id)) {
      addedCount++;
    }
  }
  
  // Merge and save
  const mergedDeals = mergeDeals(prospectsData.deals, localDeals);
  localStorage.setItem(DEALS_KEY, JSON.stringify(mergedDeals));
  localStorage.setItem(SYNC_TIMESTAMP_KEY, new Date().toISOString());
  
  return { added: addedCount, total: mergedDeals.length };
}

export function saveDeals(deals: Deal[]) {
  localStorage.setItem(DEALS_KEY, JSON.stringify(deals));
}

export function getRetainers(): Retainer[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(RETAINERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveRetainers(retainers: Retainer[]) {
  localStorage.setItem(RETAINERS_KEY, JSON.stringify(retainers));
}

export function addActivity(deal: Deal, type: Activity['type'], description: string): Deal {
  return {
    ...deal,
    lastInteraction: new Date().toISOString(),
    activities: [{ id: uuid(), type, description, timestamp: new Date().toISOString() }, ...deal.activities],
  };
}

export function exportData() {
  return JSON.stringify({ deals: getDeals(), retainers: getRetainers() }, null, 2);
}

export function importData(json: string) {
  const data = JSON.parse(json);
  if (data.deals) saveDeals(data.deals);
  if (data.retainers) saveRetainers(data.retainers);
}
