export type Stage = 'Prospect' | 'Contacted' | 'Replied' | 'Meeting' | 'Proposal Sent' | 'Won' | 'Lost';
export type ServiceType = 'Website' | 'SEO' | 'Ads' | 'Website + SEO' | 'Website + Ads' | 'Full Package' | '';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

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
