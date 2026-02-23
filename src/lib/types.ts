export type Stage = 'Prospect' | 'Contacted' | 'Replied' | 'Meeting' | 'Proposal Sent' | 'Won' | 'Lost';
export type ServiceOption = 'Website' | 'SEO' | 'Google Ads' | 'Facebook/IG Ads' | 'Hosting' | 'AI Automation' | 'Branding';
export type ServiceType = string; // comma-joined ServiceOptions for backward compat
export const SERVICE_OPTIONS: ServiceOption[] = ['Website', 'SEO', 'Google Ads', 'Facebook/IG Ads', 'Hosting', 'AI Automation', 'Branding'];
export type RetainerType = 'Website Hosting' | 'SEO Monthly' | 'Ads Management' | 'Full Service' | 'Custom';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export const RETAINER_TYPES: RetainerType[] = ['Website Hosting', 'SEO Monthly', 'Ads Management', 'Full Service', 'Custom'];

export interface Activity {
  id: string;
  type: 'note' | 'call' | 'email' | 'stage_change' | 'created';
  description: string;
  timestamp: string;
}

export interface Deal {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email: string;
  service: ServiceType;
  estimatedValue: number;
  stage: Stage;
  lastInteraction: string;
  website: string;
  gbpUrl: string;
  notes: string;
  activities: Activity[];
  createdAt: string;
  amountPaid: number;
  isRetainer: boolean;
  monthlyRetainer: number;
}

export interface Retainer {
  id: string;
  clientName: string;
  serviceType: string;
  monthlyAmount: number;
  startDate: string;
  nextBillingDate: string;
  paymentStatus: PaymentStatus;
}

export const STAGES: Stage[] = ['Prospect', 'Contacted', 'Replied', 'Meeting', 'Proposal Sent', 'Won', 'Lost'];
