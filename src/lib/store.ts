import { Deal, Retainer, Activity } from './types';
import { v4 as uuid } from 'uuid';

const DEALS_KEY = 'dw_crm_deals';
const RETAINERS_KEY = 'dw_crm_retainers';

const DEFAULT_DEALS: Deal[] = [
  {
    id: uuid(), businessName: 'M-TECH Automotive', contactPerson: '', phone: '(704) 882-8996',
    email: 'MTECH001@Hotmail.com', service: 'Website', estimatedValue: 7300, stage: 'Prospect',
    lastInteraction: new Date().toISOString(), notes: '', activities: [], createdAt: new Date().toISOString(),
  },
  {
    id: uuid(), businessName: 'Love Plumbing & AC', contactPerson: '', phone: '(704) 289-4528',
    email: 'info@plumbingacmonroe.com', service: 'Website + SEO', estimatedValue: 14500, stage: 'Prospect',
    lastInteraction: new Date().toISOString(), notes: '', activities: [], createdAt: new Date().toISOString(),
  },
  {
    id: uuid(), businessName: 'Indian Trail Family Dentistry', contactPerson: '', phone: '(704) 821-3019',
    email: '', service: 'Full Package', estimatedValue: 16500, stage: 'Prospect',
    lastInteraction: new Date().toISOString(), notes: '', activities: [], createdAt: new Date().toISOString(),
  },
  {
    id: uuid(), businessName: "Shaunn's Dental Lab", contactPerson: '', phone: '',
    email: '', service: 'Website', estimatedValue: 9300, stage: 'Prospect',
    lastInteraction: new Date().toISOString(), notes: '', activities: [], createdAt: new Date().toISOString(),
  },
  {
    id: uuid(), businessName: 'East Carolina Automotive', contactPerson: '', phone: '',
    email: '', service: 'Website', estimatedValue: 7300, stage: 'Prospect',
    lastInteraction: new Date().toISOString(), notes: '', activities: [], createdAt: new Date().toISOString(),
  },
];

export function getDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(DEALS_KEY);
  if (!raw) {
    localStorage.setItem(DEALS_KEY, JSON.stringify(DEFAULT_DEALS));
    return DEFAULT_DEALS;
  }
  return JSON.parse(raw);
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
