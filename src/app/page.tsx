'use client';
import { useState, useRef } from 'react';
import { useDeals, useRetainers } from '@/lib/hooks';
import { Deal, Retainer, Stage, STAGES, Activity } from '@/lib/types';
import { addActivity, exportData, importData } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Tab = 'dashboard' | 'pipeline' | 'retainers';

export default function Home() {
  const { deals, update: updateDeals, loaded } = useDeals();
  const { retainers, update: updateRetainers } = useRetainers();
  const [tab, setTab] = useState<Tab>('pipeline');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showRetainerAdd, setShowRetainerAdd] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!loaded) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;

  const totalPipeline = deals.filter(d => !['Won', 'Lost'].includes(d.stage)).reduce((s, d) => s + d.estimatedValue, 0);
  const mrr = retainers.reduce((s, r) => s + r.monthlyAmount, 0);

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const stage = result.destination.droppableId as Stage;
    updateDeals(prev => prev.map(d => d.id === result.draggableId
      ? addActivity({ ...d, stage }, 'stage_change', `Moved to ${stage}`)
      : d
    ));
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">DW</div>
          <span className="font-semibold text-lg hidden sm:block">Digitalwiz CRM</span>
        </div>
        <nav className="flex gap-1">
          {(['dashboard', 'pipeline', 'retainers'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div className="flex gap-2">
          <button onClick={() => { const b = new Blob([exportData()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'crm-backup.json'; a.click(); }}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded">Export</button>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded">Import</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            f.text().then(t => { importData(t); window.location.reload(); });
          }} />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'dashboard' && <Dashboard deals={deals} retainers={retainers} mrr={mrr} totalPipeline={totalPipeline} onSelect={d => { setSelectedDeal(d); }} />}
        {tab === 'pipeline' && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 p-4 overflow-x-auto h-full">
              {STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const stageTotal = stageDeals.reduce((s, d) => s + d.estimatedValue, 0);
                return (
                  <Droppable droppableId={stage} key={stage}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}
                        className={`flex flex-col min-w-[260px] w-[260px] rounded-xl ${snapshot.isDraggingOver ? 'bg-gray-800/80' : 'bg-gray-900/50'} transition`}>
                        <div className="p-3 border-b border-gray-800">
                          <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-300">{stage}</h3>
                            <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">{stageDeals.length}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">${stageTotal.toLocaleString()}</div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                          {stageDeals.map((deal, i) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={i}>
                              {(prov, snap) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                  onClick={() => setSelectedDeal(deal)}
                                  className={`p-3 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-blue-500/50 transition ${snap.isDragging ? 'shadow-xl shadow-blue-500/10' : ''}`}>
                                  <div className="font-medium text-sm">{deal.businessName}</div>
                                  {deal.contactPerson && <div className="text-xs text-gray-400 mt-0.5">{deal.contactPerson}</div>}
                                  <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                    {deal.phone && <span>📞 {deal.phone}</span>}
                                  </div>
                                  {deal.email && <div className="text-xs text-gray-500 mt-0.5">✉️ {deal.email}</div>}
                                  <div className="flex justify-between items-center mt-2">
                                    <span className="text-xs text-blue-400 font-semibold">${deal.estimatedValue.toLocaleString()}</span>
                                    {deal.service && <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{deal.service}</span>}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
        {tab === 'retainers' && <RetainersView retainers={retainers} update={updateRetainers} showAdd={showRetainerAdd} setShowAdd={setShowRetainerAdd} />}
      </main>

      {/* Quick Add FAB */}
      <button onClick={() => tab === 'retainers' ? setShowRetainerAdd(true) : setShowQuickAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-blue-600/30 transition z-40">+</button>

      {/* Modals */}
      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} onAdd={deal => updateDeals(prev => [...prev, deal])} />}
      {selectedDeal && <DealDetail deal={selectedDeal} onClose={() => setSelectedDeal(null)}
        onUpdate={updated => { updateDeals(prev => prev.map(d => d.id === updated.id ? updated : d)); setSelectedDeal(updated); }}
        onDelete={id => { updateDeals(prev => prev.filter(d => d.id !== id)); setSelectedDeal(null); }} />}
    </div>
  );
}

/* ====== DASHBOARD ====== */
function Dashboard({ deals, mrr, totalPipeline, onSelect }: { deals: Deal[]; retainers: Retainer[]; mrr: number; totalPipeline: number; onSelect: (d: Deal) => void }) {
  const stageCounts = STAGES.map(s => ({ stage: s, count: deals.filter(d => d.stage === s).length, value: deals.filter(d => d.stage === s).reduce((a, d) => a + d.estimatedValue, 0) }));
  const maxCount = Math.max(...stageCounts.map(s => s.count), 1);
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const followUps = deals.filter(d => !['Won', 'Lost'].includes(d.stage) && d.lastInteraction < threeDaysAgo);
  const recentActivities = deals.flatMap(d => d.activities.map(a => ({ ...a, businessName: d.businessName, dealId: d.id })))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10);

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Pipeline Value" value={`$${totalPipeline.toLocaleString()}`} />
        <KPI label="MRR" value={`$${mrr.toLocaleString()}`} />
        <KPI label="Active Deals" value={deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length.toString()} />
        <KPI label="Follow Up Needed" value={followUps.length.toString()} accent />
      </div>

      {/* Deals by Stage */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Deals by Stage</h3>
        <div className="space-y-2">
          {stageCounts.map(s => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-28 shrink-0">{s.stage}</span>
              <div className="flex-1 bg-gray-800 rounded-full h-6 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full flex items-center px-2 text-xs font-medium transition-all"
                  style={{ width: `${Math.max((s.count / maxCount) * 100, 8)}%` }}>
                  {s.count}
                </div>
              </div>
              <span className="text-xs text-gray-500 w-20 text-right">${s.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Follow Ups */}
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">⚠️ Needs Follow Up (3+ days)</h3>
          {followUps.length === 0 ? <p className="text-xs text-gray-500">All caught up!</p> : (
            <div className="space-y-2">
              {followUps.map(d => (
                <div key={d.id} onClick={() => onSelect(d)} className="flex justify-between items-center p-2 rounded-lg bg-gray-800 cursor-pointer hover:bg-gray-700 transition">
                  <div>
                    <div className="text-sm font-medium">{d.businessName}</div>
                    <div className="text-xs text-gray-500">Last: {new Date(d.lastInteraction).toLocaleDateString()}</div>
                  </div>
                  <span className="text-xs text-yellow-400">{d.stage}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
          {recentActivities.length === 0 ? <p className="text-xs text-gray-500">No activity yet.</p> : (
            <div className="space-y-2">
              {recentActivities.map(a => (
                <div key={a.id} className="flex gap-2 text-xs">
                  <span className="text-gray-600 shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
                  <span className="text-gray-400"><b className="text-gray-300">{a.businessName}</b> — {a.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-yellow-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

/* ====== DEAL DETAIL ====== */
function DealDetail({ deal, onClose, onUpdate, onDelete }: { deal: Deal; onClose: () => void; onUpdate: (d: Deal) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(deal);
  const [actText, setActText] = useState('');

  function logActivity(type: Activity['type']) {
    if (!actText.trim()) return;
    onUpdate(addActivity(deal, type, actText.trim()));
    setActText('');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold">{deal.businessName}</h2>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded mt-1 inline-block">{deal.stage}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">×</button>
        </div>

        {!editing ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Contact" value={deal.contactPerson || '—'} />
              <Info label="Phone" value={deal.phone || '—'} />
              <Info label="Email" value={deal.email || '—'} />
              <Info label="Service" value={deal.service || '—'} />
              <Info label="Deal Value" value={`$${deal.estimatedValue.toLocaleString()}`} />
              <Info label="Last Contact" value={new Date(deal.lastInteraction).toLocaleDateString()} />
            </div>
            {deal.notes && <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">{deal.notes}</div>}

            <div className="flex gap-2">
              <button onClick={() => { setForm(deal); setEditing(true); }} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg">Edit</button>
              <button onClick={() => { if (confirm('Delete this deal?')) onDelete(deal.id); }} className="text-xs bg-red-900/30 text-red-400 hover:bg-red-900/50 px-3 py-1.5 rounded-lg">Delete</button>
            </div>

            {/* Log Activity */}
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Log Activity</h4>
              <input value={actText} onChange={e => setActText(e.target.value)} placeholder="What happened?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-2" />
              <div className="flex gap-2">
                <button onClick={() => logActivity('note')} className="text-xs bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-600">📝 Note</button>
                <button onClick={() => logActivity('call')} className="text-xs bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-600">📞 Call</button>
                <button onClick={() => logActivity('email')} className="text-xs bg-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-600">✉️ Email</button>
              </div>
            </div>

            {/* Timeline */}
            {deal.activities.length > 0 && (
              <div className="border-t border-gray-800 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Activity Timeline</h4>
                <div className="space-y-2">
                  {deal.activities.map(a => (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <span className="text-gray-600 shrink-0 w-28">{new Date(a.timestamp).toLocaleString()}</span>
                      <span className="text-gray-400">{a.type === 'call' ? '📞' : a.type === 'email' ? '✉️' : a.type === 'stage_change' ? '🔄' : '📝'} {a.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EditForm form={form} setForm={setForm} onSave={() => { onUpdate(form); setEditing(false); }} onCancel={() => setEditing(false)} />
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs text-gray-500">{label}</div><div className="text-gray-200">{value}</div></div>;
}

function EditForm({ form, setForm, onSave, onCancel }: { form: Deal; setForm: (d: Deal) => void; onSave: () => void; onCancel: () => void }) {
  const f = (field: keyof Deal) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [field]: field === 'estimatedValue' ? Number(e.target.value) || 0 : e.target.value });

  return (
    <div className="p-5 space-y-3">
      <Input label="Business Name" value={form.businessName} onChange={f('businessName')} />
      <Input label="Contact Person" value={form.contactPerson} onChange={f('contactPerson')} />
      <Input label="Phone" value={form.phone} onChange={f('phone')} />
      <Input label="Email" value={form.email} onChange={f('email')} />
      <div>
        <label className="text-xs text-gray-500">Service</label>
        <select value={form.service} onChange={f('service')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1">
          {['', 'Website', 'SEO', 'Ads', 'Website + SEO', 'Website + Ads', 'Full Package'].map(s => <option key={s} value={s}>{s || 'Select...'}</option>)}
        </select>
      </div>
      <Input label="Est. Value ($)" value={form.estimatedValue.toString()} onChange={f('estimatedValue')} type="number" />
      <div>
        <label className="text-xs text-gray-500">Stage</label>
        <select value={form.stage} onChange={f('stage') as any} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1">
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm">Save</button>
        <button onClick={onCancel} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} value={value} onChange={onChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
    </div>
  );
}

/* ====== QUICK ADD ====== */
function QuickAddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Deal) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [value, setValue] = useState('');

  function submit() {
    if (!name.trim()) return;
    const deal: Deal = {
      id: uuid(), businessName: name.trim(), contactPerson: '', phone, email, service: '',
      estimatedValue: Number(value) || 0, stage: 'Prospect', lastInteraction: new Date().toISOString(),
      notes, activities: [{ id: uuid(), type: 'created', description: 'Deal created', timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    onAdd(deal);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Quick Add Prospect</h2>
        <div className="space-y-3">
          <Input label="Business Name *" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Est. Value ($)" value={value} onChange={e => setValue(e.target.value)} type="number" />
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm flex-1">Add</button>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ====== RETAINERS ====== */
function RetainersView({ retainers, update, showAdd, setShowAdd }: { retainers: Retainer[]; update: (fn: (r: Retainer[]) => Retainer[]) => void; showAdd: boolean; setShowAdd: (v: boolean) => void }) {
  const mrr = retainers.reduce((s, r) => s + r.monthlyAmount, 0);
  const statusColor = { Paid: 'text-green-400 bg-green-400/10', Pending: 'text-yellow-400 bg-yellow-400/10', Overdue: 'text-red-400 bg-red-400/10' };

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">Retainer Tracker</h2>
          <div className="text-sm text-gray-400">Total MRR: <span className="text-green-400 font-bold">${mrr.toLocaleString()}/mo</span></div>
        </div>
      </div>

      {retainers.length === 0 ? (
        <div className="text-center text-gray-500 mt-20">
          <p className="text-4xl mb-2">💼</p>
          <p>No retainers yet. Add your first client!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 font-medium">Monthly</th>
                <th className="pb-2 font-medium">Start Date</th>
                <th className="pb-2 font-medium">Next Billing</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {retainers.map(r => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-3 font-medium">{r.clientName}</td>
                  <td className="py-3 text-gray-400">{r.serviceType}</td>
                  <td className="py-3">${r.monthlyAmount.toLocaleString()}</td>
                  <td className="py-3 text-gray-400">{r.startDate}</td>
                  <td className="py-3 text-gray-400">{r.nextBillingDate}</td>
                  <td className="py-3">
                    <select value={r.paymentStatus} onChange={e => update(prev => prev.map(x => x.id === r.id ? { ...x, paymentStatus: e.target.value as any } : x))}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${statusColor[r.paymentStatus]} bg-gray-800`}>
                      {['Paid', 'Pending', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3">
                    <button onClick={() => update(prev => prev.filter(x => x.id !== r.id))} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <RetainerAddModal onClose={() => setShowAdd(false)} onAdd={r => update(prev => [...prev, r])} />}
    </div>
  );
}

function RetainerAddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: Retainer) => void }) {
  const [name, setName] = useState('');
  const [service, setService] = useState('');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [next, setNext] = useState('');

  function submit() {
    if (!name.trim()) return;
    onAdd({ id: uuid(), clientName: name.trim(), serviceType: service, monthlyAmount: Number(amount) || 0, startDate: start, nextBillingDate: next || start, paymentStatus: 'Pending' });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Add Retainer Client</h2>
        <div className="space-y-3">
          <Input label="Client Name *" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Service Type" value={service} onChange={e => setService(e.target.value)} />
          <Input label="Monthly Amount ($)" value={amount} onChange={e => setAmount(e.target.value)} type="number" />
          <Input label="Start Date" value={start} onChange={e => setStart(e.target.value)} type="date" />
          <Input label="Next Billing Date" value={next} onChange={e => setNext(e.target.value)} type="date" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm flex-1">Add</button>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
