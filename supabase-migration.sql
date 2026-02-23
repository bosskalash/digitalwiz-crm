-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/axhenezqpakelsfwzalj/sql/new

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT '',
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  service TEXT DEFAULT '',
  estimated_value NUMERIC DEFAULT 0,
  stage TEXT DEFAULT 'Prospect',
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  website TEXT DEFAULT '',
  gbp_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  activities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  amount_paid NUMERIC DEFAULT 0,
  is_retainer BOOLEAN DEFAULT FALSE
);

-- Retainers table
CREATE TABLE IF NOT EXISTS retainers (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT '',
  service_type TEXT DEFAULT '',
  monthly_amount NUMERIC DEFAULT 0,
  start_date TEXT DEFAULT '',
  next_billing_date TEXT DEFAULT '',
  payment_status TEXT DEFAULT 'Pending'
);

-- Disable RLS (single-user CRM)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON deals FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON retainers FOR ALL USING (true) WITH CHECK (true);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at DESC);
