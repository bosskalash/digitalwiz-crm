import { Deal, Retainer, Activity } from './types';
import { supabase } from './supabase';
import { v4 as uuid } from 'uuid';

// ─── Snake/Camel mapping ─────────────────────────────────────────────
interface DealRow {
  id: string;
  business_name: string;
  contact_person: string;
  phone: string;
  email: string;
  service: string;
  estimated_value: number;
  stage: string;
  last_interaction: string;
  website: string;
  gbp_url: string;
  notes: string;
  activities: Activity[];
  created_at: string;
  amount_paid: number;
  is_retainer: boolean;
  monthly_retainer: number;
}

interface RetainerRow {
  id: string;
  client_name: string;
  service_type: string;
  monthly_amount: number;
  start_date: string;
  next_billing_date: string;
  payment_status: string;
}

function rowToDeal(r: DealRow): Deal {
  return {
    id: r.id,
    businessName: r.business_name || '',
    contactPerson: r.contact_person || '',
    phone: r.phone || '',
    email: r.email || '',
    service: (r.service || '') as Deal['service'],
    estimatedValue: Number(r.estimated_value) || 0,
    stage: (r.stage || 'Prospect') as Deal['stage'],
    lastInteraction: r.last_interaction || r.created_at || new Date().toISOString(),
    website: r.website || '',
    gbpUrl: r.gbp_url || '',
    notes: r.notes || '',
    activities: r.activities || [],
    createdAt: r.created_at || new Date().toISOString(),
    amountPaid: Number(r.amount_paid) || 0,
    isRetainer: r.is_retainer ?? false,
    monthlyRetainer: Number(r.monthly_retainer) || 0,
  };
}

function dealToRow(d: Deal): DealRow {
  return {
    id: d.id,
    business_name: d.businessName,
    contact_person: d.contactPerson,
    phone: d.phone,
    email: d.email,
    service: d.service,
    estimated_value: d.estimatedValue,
    stage: d.stage,
    last_interaction: d.lastInteraction,
    website: d.website,
    gbp_url: d.gbpUrl,
    notes: d.notes,
    activities: d.activities,
    created_at: d.createdAt,
    amount_paid: d.amountPaid,
    is_retainer: d.isRetainer,
    monthly_retainer: d.monthlyRetainer || 0,
  };
}

function rowToRetainer(r: RetainerRow): Retainer {
  return {
    id: r.id,
    clientName: r.client_name || '',
    serviceType: r.service_type || '',
    monthlyAmount: Number(r.monthly_amount) || 0,
    startDate: r.start_date || '',
    nextBillingDate: r.next_billing_date || '',
    paymentStatus: (r.payment_status || 'Pending') as Retainer['paymentStatus'],
  };
}

function retainerToRow(r: Retainer): RetainerRow {
  return {
    id: r.id,
    client_name: r.clientName,
    service_type: r.serviceType,
    monthly_amount: r.monthlyAmount,
    start_date: r.startDate,
    next_billing_date: r.nextBillingDate,
    payment_status: r.paymentStatus,
  };
}

// ─── JSON fallback (until Supabase tables exist) ────────────────────

let jsonFallbackDeals: Deal[] | null = null;
let jsonFallbackRetainers: Retainer[] | null = null;

async function loadJsonFallback(): Promise<{ deals: Deal[]; retainers: Retainer[] }> {
  if (jsonFallbackDeals !== null && jsonFallbackRetainers !== null) {
    return { deals: jsonFallbackDeals, retainers: jsonFallbackRetainers };
  }
  try {
    const res = await fetch('/data/prospects.json');
    if (!res.ok) throw new Error('No JSON fallback');
    const data = await res.json();
    jsonFallbackDeals = data.deals || [];
    jsonFallbackRetainers = data.retainers || [];
    return { deals: jsonFallbackDeals!, retainers: jsonFallbackRetainers! };
  } catch {
    jsonFallbackDeals = [];
    jsonFallbackRetainers = [];
    return { deals: [], retainers: [] };
  }
}

// ─── Deals CRUD ──────────────────────────────────────────────────────

export async function getDealsAsync(): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase deals error:', error.message);
    return [];
  }
  return (data || []).map(rowToDeal);
}

export function getDeals(): Deal[] {
  // Sync getter — returns empty; consumers should use getDealsAsync
  return [];
}

export async function saveDeals(deals: Deal[]): Promise<void> {
  // Upsert all deals
  const rows = deals.map(dealToRow);
  const { error } = await supabase
    .from('deals')
    .upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save deals:', error.message);
}

export async function saveDeal(deal: Deal): Promise<void> {
  const { error } = await supabase
    .from('deals')
    .upsert(dealToRow(deal), { onConflict: 'id' });
  if (error) console.error('Failed to save deal:', error.message);
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from('deals').delete().eq('id', id);
  if (error) console.error('Failed to delete deal:', error.message);
}

// ─── Retainers CRUD ──────────────────────────────────────────────────

export async function getRetainersAsync(): Promise<Retainer[]> {
  const { data, error } = await supabase
    .from('retainers')
    .select('*')
    .order('client_name', { ascending: true });

  if (error) {
    console.error('Supabase retainers error:', error.message);
    return [];
  }
  return (data || []).map(rowToRetainer);
}

export function getRetainers(): Retainer[] {
  return [];
}

export async function saveRetainers(retainers: Retainer[]): Promise<void> {
  const rows = retainers.map(retainerToRow);
  const { error } = await supabase
    .from('retainers')
    .upsert(rows, { onConflict: 'id' });
  if (error) console.error('Failed to save retainers:', error.message);
}

export async function saveRetainer(retainer: Retainer): Promise<void> {
  const { error } = await supabase
    .from('retainers')
    .upsert(retainerToRow(retainer), { onConflict: 'id' });
  if (error) console.error('Failed to save retainer:', error.message);
}

export async function deleteRetainer(id: string): Promise<void> {
  const { error } = await supabase.from('retainers').delete().eq('id', id);
  if (error) console.error('Failed to delete retainer:', error.message);
}

// ─── Sync (no-op now — data is in Supabase) ─────────────────────────

export async function syncProspects(): Promise<{ added: number; total: number }> {
  const deals = await getDealsAsync();
  return { added: 0, total: deals.length };
}

// ─── Activity helper ─────────────────────────────────────────────────

export function addActivity(deal: Deal, type: Activity['type'], description: string): Deal {
  return {
    ...deal,
    lastInteraction: new Date().toISOString(),
    activities: [
      { id: uuid(), type, description, timestamp: new Date().toISOString() },
      ...(deal.activities || []),
    ],
  };
}

// ─── Export/Import ───────────────────────────────────────────────────

export async function exportDataAsync(): Promise<string> {
  const deals = await getDealsAsync();
  const retainers = await getRetainersAsync();
  return JSON.stringify({ deals, retainers }, null, 2);
}

export function exportData(): string {
  // Sync fallback — use exportDataAsync for actual data
  return JSON.stringify({ deals: [], retainers: [] }, null, 2);
}

export async function importData(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.deals) await saveDeals(data.deals);
  if (data.retainers) await saveRetainers(data.retainers);
}

// ─── Real-time subscription ─────────────────────────────────────────

export function subscribeToDeals(callback: (deals: Deal[]) => void) {
  const channel = supabase
    .channel('deals-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, async () => {
      const deals = await getDealsAsync();
      callback(deals);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export function subscribeToRetainers(callback: (retainers: Retainer[]) => void) {
  const channel = supabase
    .channel('retainers-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'retainers' }, async () => {
      const retainers = await getRetainersAsync();
      callback(retainers);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
