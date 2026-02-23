const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is missing. Set it, then rerun: npm run stripe:sync');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const dataPath = path.join(__dirname, '..', 'data', 'prospects.json');

function toIsoDate(unixSeconds) {
  if (!unixSeconds) return new Date().toISOString().slice(0, 10);
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function monthlyAmountFromItems(items) {
  let total = 0;
  for (const item of items || []) {
    const unit = item.price?.unit_amount || 0;
    const qty = item.quantity || 1;
    const interval = item.price?.recurring?.interval;
    const intervalCount = item.price?.recurring?.interval_count || 1;

    let monthly = unit * qty;
    if (interval === 'year') monthly = monthly / (12 * intervalCount);
    else if (interval === 'week') monthly = monthly * (52 / 12) / intervalCount;
    else if (interval === 'day') monthly = monthly * (30 / intervalCount);
    else monthly = monthly / intervalCount;

    total += monthly;
  }
  return Math.round(total / 100);
}

function serviceTypeFromItems(items) {
  const names = (items || [])
    .map(i => i.price?.nickname || i.price?.id || '')
    .filter(Boolean);
  return names.length ? names.join(' + ') : 'Stripe Subscription';
}

async function fetchAllSubscriptions() {
  const subs = [];
  let starting_after;

  while (true) {
    const page = await stripe.subscriptions.list({
      limit: 100,
      status: 'all',
      expand: ['data.customer', 'data.items.data.price'],
      ...(starting_after ? { starting_after } : {}),
    });

    subs.push(...page.data);
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1].id;
  }

  return subs;
}

async function main() {
  if (!fs.existsSync(dataPath)) throw new Error(`Missing data file: ${dataPath}`);

  const current = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const existingRetainers = Array.isArray(current.retainers) ? current.retainers : [];
  const subscriptions = await fetchAllSubscriptions();

  // Only keep currently billable subscriptions for CRM MRR view
  const activeSubs = subscriptions
    .filter(sub => ['active', 'trialing'].includes(sub.status))
    .filter(sub => sub.items?.data?.length)
    .sort((a, b) => (b.created || 0) - (a.created || 0));

  // Dedupe by customer: keep the latest active/trialing sub per customer
  const seenCustomers = new Set();
  const dedupedSubs = [];
  for (const sub of activeSubs) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    const key = customerId || sub.id;
    if (seenCustomers.has(key)) continue;
    seenCustomers.add(key);
    dedupedSubs.push(sub);
  }

  const stripeRetainers = dedupedSubs.map(sub => {
    const customer = sub.customer || {};
    const clientName = customer.name || customer.email || `Customer ${typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || sub.id}`;
    return {
      id: `stripe_sub_${sub.id}`,
      clientName,
      serviceType: serviceTypeFromItems(sub.items.data),
      monthlyAmount: monthlyAmountFromItems(sub.items.data),
      startDate: toIsoDate(sub.start_date || sub.created),
      nextBillingDate: toIsoDate(sub.current_period_end),
      paymentStatus: 'Paid',
    };
  });

  const manualRetainers = existingRetainers.filter(r => !String(r.id || '').startsWith('stripe_sub_'));
  current.retainers = [...manualRetainers, ...stripeRetainers];
  current.lastUpdated = new Date().toISOString();

  fs.writeFileSync(dataPath, JSON.stringify(current, null, 2));

  console.log(`✅ Stripe sync complete: ${stripeRetainers.length} active subscription retainer(s) synced.`);
  console.log(`📌 Total retainers now: ${current.retainers.length}`);
}

main().catch(err => {
  console.error('❌ Stripe sync failed:', err.message);
  process.exit(1);
});
