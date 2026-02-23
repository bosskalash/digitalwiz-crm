'use client';
import { useState, useRef } from 'react';
import Image from 'next/image';
import { useDeals, useRetainers } from '@/lib/hooks';
import { Deal, Retainer, Stage, STAGES, Activity } from '@/lib/types';
import { addActivity, exportDataAsync, importData } from '@/lib/store';
import { v4 as uuid } from 'uuid';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type Tab = 'dashboard' | 'pipeline' | 'retainers';

export default function Home() {
  const { deals, update: updateDeals, loaded, sync, syncing } = useDeals();
  const { retainers, update: updateRetainers } = useRetainers();
  const [tab, setTab] = useState<Tab>('pipeline');
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showRetainerAdd, setShowRetainerAdd] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  function handleMoveDeal(dealId: string, newStage: Stage) {
    updateDeals(prev => prev.map(d => d.id === dealId
      ? addActivity({ ...d, stage: newStage }, 'stage_change', `Moved to ${newStage}`)
      : d
    ));
    if (selectedDeal?.id === dealId) {
      setSelectedDeal(prev => prev ? { ...prev, stage: newStage } : null);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <Image src="/images/digitalwiz-logo.png" alt="Digitalwiz" width={32} height={32} className="rounded-lg" />
          <span className="font-semibold text-lg hidden sm:block">Digitalwiz CRM</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1">
          {(['dashboard', 'pipeline', 'retainers'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              {t}
            </button>
          ))}
        </nav>

        {/* Desktop export/import/sync */}
        <div className="hidden sm:flex gap-2">
          <button
            onClick={async () => {
              const result = await sync();
              alert(`Sync complete! Added ${result.added} new prospects. Total: ${result.total}`);
            }}
            disabled={syncing}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded disabled:opacity-50"
          >
            {syncing ? '⟳ Syncing...' : '🔄 Sync'}
          </button>
          <button onClick={async () => { const b = new Blob([await exportDataAsync()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'crm-backup.json'; a.click(); }}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded">Export</button>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-gray-700 rounded">Import</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            f.text().then(async t => { await importData(t); window.location.reload(); });
          }} />
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenuOpen(true)} className="sm:hidden text-2xl text-gray-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
          ☰
        </button>
      </header>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] sm:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute top-0 right-0 w-64 h-full bg-gray-900 border-l border-gray-800 p-4 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold text-lg">Menu</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white text-2xl min-h-[44px] min-w-[44px] flex items-center justify-center">×</button>
            </div>
            <nav className="flex flex-col gap-1">
              {(['dashboard', 'pipeline', 'retainers'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setMobileMenuOpen(false); }}
                  className={`px-4 py-3 rounded-lg text-left text-base capitalize transition min-h-[44px] ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                  {t === 'dashboard' ? '📊 Dashboard' : t === 'pipeline' ? '🔄 Pipeline' : '💼 Retainers'}
                </button>
              ))}
            </nav>
            <div className="border-t border-gray-800 mt-4 pt-4 flex flex-col gap-1">
              <button
                onClick={async () => {
                  const result = await sync();
                  alert(`Sync complete! Added ${result.added} new prospects. Total: ${result.total}`);
                  setMobileMenuOpen(false);
                }}
                disabled={syncing}
                className="px-4 py-3 rounded-lg text-left text-base text-gray-300 hover:bg-gray-800 min-h-[44px] disabled:opacity-50"
              >
                {syncing ? '⟳ Syncing...' : '🔄 Sync Prospects'}
              </button>
              <button onClick={async () => { const b = new Blob([await exportDataAsync()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'crm-backup.json'; a.click(); setMobileMenuOpen(false); }}
                className="px-4 py-3 rounded-lg text-left text-base text-gray-300 hover:bg-gray-800 min-h-[44px]">📤 Export</button>
              <button onClick={() => { fileRef.current?.click(); setMobileMenuOpen(false); }}
                className="px-4 py-3 rounded-lg text-left text-base text-gray-300 hover:bg-gray-800 min-h-[44px]">📥 Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'dashboard' && <Dashboard deals={deals} retainers={retainers} mrr={mrr} totalPipeline={totalPipeline} onSelect={d => { setSelectedDeal(d); }} />}
        {tab === 'pipeline' && (
          <>
            {/* Desktop: Kanban */}
            <div className="hidden sm:block h-full">
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
                                      {deal.stage === 'Won' && (deal.estimatedValue - (deal.amountPaid || 0)) > 0 && (
                                        <div className="text-[10px] text-yellow-400 mt-1">💸 ${(deal.estimatedValue - (deal.amountPaid || 0)).toLocaleString()} owed</div>
                                      )}
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
            </div>

            {/* Mobile: Vertical list grouped by stage */}
            <div className="sm:hidden h-full overflow-y-auto p-3 space-y-2">
              <MobilePipelineView deals={deals} onSelect={d => setSelectedDeal(d)} onMove={handleMoveDeal} />
            </div>
          </>
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
        onDelete={id => { updateDeals(prev => prev.filter(d => d.id !== id)); setSelectedDeal(null); }}
        onMove={handleMoveDeal} />}
    </div>
  );
}

/* ====== MOBILE PIPELINE VIEW ====== */
function MobilePipelineView({ deals, onSelect, onMove }: { deals: Deal[]; onSelect: (d: Deal) => void; onMove: (id: string, stage: Stage) => void }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <>
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage);
        const stageTotal = stageDeals.reduce((s, d) => s + d.estimatedValue, 0);
        const isCollapsed = collapsed[stage] ?? false;

        return (
          <div key={stage} className="rounded-xl bg-gray-900/50 overflow-hidden">
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, [stage]: !isCollapsed }))}
              className="w-full flex items-center justify-between p-4 min-h-[52px] active:bg-gray-800/50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm transform transition-transform" style={{ display: 'inline-block', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                <h3 className="text-sm font-semibold text-gray-300">{stage}</h3>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">{stageDeals.length}</span>
              </div>
              <span className="text-xs text-gray-500">${stageTotal.toLocaleString()}</span>
            </button>

            {!isCollapsed && stageDeals.length > 0 && (
              <div className="px-3 pb-3 space-y-2">
                {stageDeals.map(deal => (
                  <div key={deal.id}
                    onClick={() => onSelect(deal)}
                    className="p-4 rounded-lg bg-gray-800 border border-gray-700 active:border-blue-500/50 transition cursor-pointer"
                  >
                    <div className="font-medium text-sm">{deal.businessName}</div>
                    {deal.contactPerson && <div className="text-xs text-gray-400 mt-0.5">{deal.contactPerson}</div>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs">
                      {deal.phone && (
                        <a href={`tel:${deal.phone}`} onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center">📞 {deal.phone}</a>
                      )}
                      {deal.email && (
                        <a href={`mailto:${deal.email}`} onClick={e => e.stopPropagation()} className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center">✉️ {deal.email}</a>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-blue-400 font-semibold">${deal.estimatedValue.toLocaleString()}</span>
                      {deal.service && <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{deal.service}</span>}
                    </div>
                    {deal.stage === 'Won' && (deal.estimatedValue - (deal.amountPaid || 0)) > 0 && (
                      <div className="text-xs text-yellow-400 mt-1">💸 ${(deal.estimatedValue - (deal.amountPaid || 0)).toLocaleString()} owed</div>
                    )}
                    {/* Mobile move stage */}
                    <div className="mt-3 pt-2 border-t border-gray-700" onClick={e => e.stopPropagation()}>
                      <select
                        value={deal.stage}
                        onChange={e => onMove(deal.id, e.target.value as Stage)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-200 min-h-[44px]"
                      >
                        {STAGES.map(s => <option key={s} value={s}>Move to: {s}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
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

  const currentYear = new Date().getFullYear();
  const wonDeals = deals.filter(d => d.stage === 'Won');
  // Projects = one-time deals (not retainers)
  const projectDeals = wonDeals.filter(d => !d.isRetainer);
  const projectWon = projectDeals.reduce((s, d) => s + d.estimatedValue, 0);
  const projectCollected = projectDeals.reduce((s, d) => s + (d.amountPaid || 0), 0);
  const projectOwed = projectWon - projectCollected;
  // Recurring = retainer deals
  const retainerDeals = wonDeals.filter(d => d.isRetainer);
  const yearlyMRR = mrr * 12;
  // Only projects show in "Who Owes Us"
  const owedDeals = projectDeals.filter(d => (d.estimatedValue - (d.amountPaid || 0)) > 0);

  return (
    <div className="p-4 md:p-6 overflow-y-auto h-full space-y-6">
      {/* Project Revenue */}
      <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/20 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-semibold text-green-400 mb-3">💰 Project Revenue — {currentYear}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white">${projectWon.toLocaleString()}</div>
            <div className="text-xs text-green-400/70">Total Won</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-green-400">${projectCollected.toLocaleString()}</div>
            <div className="text-xs text-green-400/70">Collected</div>
          </div>
          <div>
            <div className={`text-2xl md:text-3xl font-bold ${projectOwed > 0 ? 'text-yellow-400' : 'text-white'}`}>${projectOwed.toLocaleString()}</div>
            <div className="text-xs text-green-400/70">Outstanding</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white">{projectDeals.length}</div>
            <div className="text-xs text-green-400/70">Deals Won</div>
          </div>
        </div>
      </div>

      {/* Recurring Revenue */}
      <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 rounded-xl p-4 md:p-6">
        <h3 className="text-sm font-semibold text-blue-400 mb-3">🔄 Recurring Revenue</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-2xl md:text-3xl font-bold text-blue-400">${mrr.toLocaleString()}<span className="text-sm text-gray-400">/mo</span></div>
            <div className="text-xs text-blue-400/70">MRR</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white">${yearlyMRR.toLocaleString()}<span className="text-sm text-gray-400">/yr</span></div>
            <div className="text-xs text-blue-400/70">Projected Annual</div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-bold text-white">{retainerDeals.length}</div>
            <div className="text-xs text-blue-400/70">Active Retainers</div>
          </div>
        </div>
      </div>

      {/* Outstanding Balances */}
      {owedDeals.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-yellow-400 mb-3">💸 Who Owes Us</h3>
          <div className="space-y-2">
            {owedDeals.map(d => {
              const owed = d.estimatedValue - (d.amountPaid || 0);
              const pct = d.estimatedValue > 0 ? Math.round(((d.amountPaid || 0) / d.estimatedValue) * 100) : 0;
              return (
                <div key={d.id} onClick={() => onSelect(d)} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 cursor-pointer hover:bg-gray-800 transition">
                  <div>
                    <div className="text-sm font-medium text-white">{d.businessName}</div>
                    <div className="text-xs text-gray-400">Paid ${(d.amountPaid || 0).toLocaleString()} of ${d.estimatedValue.toLocaleString()} ({pct}%)</div>
                    <div className="w-32 bg-gray-700 rounded-full h-1.5 mt-1">
                      <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-400">${owed.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">remaining</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Pipeline Value" value={`$${totalPipeline.toLocaleString()}`} />
        <KPI label="MRR" value={`$${mrr.toLocaleString()}`} />
        <KPI label="Active Deals" value={deals.filter(d => !['Won', 'Lost'].includes(d.stage)).length.toString()} />
        <KPI label="Follow Up Needed" value={followUps.length.toString()} accent />
      </div>

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
        <div className="bg-gray-900 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">⚠️ Needs Follow Up (3+ days)</h3>
          {followUps.length === 0 ? <p className="text-xs text-gray-500">All caught up!</p> : (
            <div className="space-y-2">
              {followUps.map(d => (
                <div key={d.id} onClick={() => onSelect(d)} className="flex justify-between items-center p-3 sm:p-2 rounded-lg bg-gray-800 cursor-pointer hover:bg-gray-700 active:bg-gray-700 transition min-h-[44px]">
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
function DealDetail({ deal, onClose, onUpdate, onDelete, onMove }: { deal: Deal; onClose: () => void; onUpdate: (d: Deal) => void; onDelete: (id: string) => void; onMove: (id: string, stage: Stage) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(deal);
  const [actText, setActText] = useState('');

  function logActivity(type: Activity['type']) {
    if (!actText.trim()) return;
    onUpdate(addActivity(deal, type, actText.trim()));
    setActText('');
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 sm:p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold">{deal.businessName}</h2>
            <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded mt-1 inline-block">{deal.stage}</span>
            {deal.isRetainer && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded mt-1 inline-block ml-1">🔄 Retainer</span>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl min-h-[44px] min-w-[44px] flex items-center justify-center">×</button>
        </div>

        {!editing ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Contact" value={deal.contactPerson || '—'} />
              <div>
                <div className="text-xs text-gray-500">Phone</div>
                {deal.phone ? <a href={`tel:${deal.phone}`} className="text-blue-400 hover:text-blue-300">{deal.phone}</a> : <div className="text-gray-200">—</div>}
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                {deal.email ? <a href={`mailto:${deal.email}`} className="text-blue-400 hover:text-blue-300 break-all">{deal.email}</a> : <div className="text-gray-200">—</div>}
              </div>
              <Info label="Service" value={deal.service || '—'} />
              <Info label="Deal Value" value={`$${deal.estimatedValue.toLocaleString()}`} />
              <Info label="Last Contact" value={new Date(deal.lastInteraction).toLocaleDateString()} />
              {deal.stage === 'Won' && (
                <>
                  <Info label="Paid" value={`$${(deal.amountPaid || 0).toLocaleString()}`} />
                  <div>
                    <div className="text-xs text-gray-500">Balance Owed</div>
                    <div className={`font-semibold ${(deal.estimatedValue - (deal.amountPaid || 0)) > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {(deal.estimatedValue - (deal.amountPaid || 0)) > 0 ? `$${(deal.estimatedValue - (deal.amountPaid || 0)).toLocaleString()}` : '✓ Paid in full'}
                    </div>
                  </div>
                  {deal.isRetainer && deal.monthlyRetainer > 0 && (
                    <div>
                      <div className="text-xs text-gray-500">Monthly Retainer</div>
                      <div className="font-semibold text-blue-400">${(deal.monthlyRetainer).toLocaleString()}/mo</div>
                    </div>
                  )}
                </>
              )}
            </div>
            {/* Website & GBP Links */}
            <div className="flex flex-wrap gap-2">
              {deal.website && (
                <a href={deal.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs text-blue-400 hover:text-blue-300 min-h-[44px]">🌐 Website</a>
              )}
              {deal.gbpUrl && (
                <a href={deal.gbpUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-xs text-blue-400 hover:text-blue-300 min-h-[44px]">📍 Google Business</a>
              )}
            </div>
            {deal.notes && <div className="text-sm text-gray-400 bg-gray-800 p-3 rounded-lg">{deal.notes}</div>}

            {/* Quick action buttons - mobile friendly */}
            <div className="grid grid-cols-2 sm:flex gap-2">
              {deal.phone && (
                <a href={`tel:${deal.phone}`} className="flex items-center justify-center gap-1.5 bg-green-900/30 text-green-400 hover:bg-green-900/50 px-3 py-3 sm:py-1.5 rounded-lg text-sm min-h-[44px]">📞 Call</a>
              )}
              {deal.email && (
                <a href={`mailto:${deal.email}`} className="flex items-center justify-center gap-1.5 bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 px-3 py-3 sm:py-1.5 rounded-lg text-sm min-h-[44px]">✉️ Email</a>
              )}
              <button onClick={() => { setForm(deal); setEditing(true); }} className="flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-3 sm:py-1.5 rounded-lg text-sm min-h-[44px]">✏️ Edit</button>
              <button onClick={() => { if (confirm('Delete this deal?')) onDelete(deal.id); }} className="flex items-center justify-center gap-1.5 bg-red-900/30 text-red-400 hover:bg-red-900/50 px-3 py-3 sm:py-1.5 rounded-lg text-sm min-h-[44px]">🗑️ Delete</button>
            </div>

            {/* Move Stage */}
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Move Stage</h4>
              <select
                value={deal.stage}
                onChange={e => onMove(deal.id, e.target.value as Stage)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              >
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Log Activity */}
            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Log Activity</h4>
              <input value={actText} onChange={e => setActText(e.target.value)} placeholder="What happened?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mb-2 min-h-[44px]" />
              <div className="flex gap-2">
                <button onClick={() => logActivity('note')} className="text-xs bg-gray-700 px-3 py-2.5 sm:py-1.5 rounded-lg hover:bg-gray-600 min-h-[44px] flex-1 sm:flex-none">📝 Note</button>
                <button onClick={() => logActivity('call')} className="text-xs bg-gray-700 px-3 py-2.5 sm:py-1.5 rounded-lg hover:bg-gray-600 min-h-[44px] flex-1 sm:flex-none">📞 Call</button>
                <button onClick={() => logActivity('email')} className="text-xs bg-gray-700 px-3 py-2.5 sm:py-1.5 rounded-lg hover:bg-gray-600 min-h-[44px] flex-1 sm:flex-none">✉️ Email</button>
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

// ─── Service Tier Pricing ────────────────────────────────────────────
const SERVICE_TIERS: Record<string, { tiers: { name: string; price: number; label: string }[]; recurring?: boolean }> = {
  'Website': {
    tiers: [
      { name: 'Starter', price: 1200, label: '$1,200' },
      { name: 'Professional', price: 2499, label: '$2,499' },
      { name: 'Enterprise', price: 4499, label: '$4,499' },
      { name: 'Custom', price: 0, label: 'Custom' },
    ],
  },
  'SEO': {
    recurring: true,
    tiers: [
      { name: 'Starter', price: 399, label: '$399/mo' },
      { name: 'Growth', price: 999, label: '$999/mo' },
      { name: 'Domination', price: 2499, label: '$2,499/mo' },
      { name: 'Custom', price: 0, label: 'Custom' },
    ],
  },
  'Google Ads': {
    recurring: true,
    tiers: [
      { name: 'Starter', price: 699, label: '$699/mo' },
      { name: 'Growth', price: 1299, label: '$1,299/mo' },
      { name: 'Enterprise', price: 2499, label: '$2,499/mo' },
      { name: 'Custom', price: 0, label: 'Custom' },
    ],
  },
  'Facebook/IG Ads': {
    recurring: true,
    tiers: [
      { name: 'Starter', price: 499, label: '$499/mo' },
      { name: 'Growth', price: 999, label: '$999/mo' },
      { name: 'Enterprise', price: 1999, label: '$1,999/mo' },
      { name: 'Custom', price: 0, label: 'Custom' },
    ],
  },
  'Hosting': { recurring: true, tiers: [{ name: 'Standard', price: 25, label: '$25/mo' }, { name: 'Premium', price: 50, label: '$50/mo' }, { name: 'Custom', price: 0, label: 'Custom' }] },
  'AI Automation': { tiers: [{ name: 'Custom', price: 0, label: 'Custom' }] },
  'Branding': { tiers: [{ name: 'Custom', price: 0, label: 'Custom' }] },
};

function ServiceTierPicker({ form, setForm }: { form: Deal; setForm: (d: Deal) => void }) {
  // Parse current selections: "Website:Professional, SEO:Growth" or legacy "Website, SEO"
  const parseSelections = (): Record<string, { tier: string; customPrice: number }> => {
    const map: Record<string, { tier: string; customPrice: number }> = {};
    (form.service || '').split(', ').filter(Boolean).forEach(s => {
      const [svc, tier] = s.includes(':') ? s.split(':') : [s, ''];
      if (SERVICE_TIERS[svc]) {
        map[svc] = { tier: tier || SERVICE_TIERS[svc].tiers[0]?.name || '', customPrice: 0 };
      }
    });
    return map;
  };

  const [selections, setSelections] = useState(parseSelections);
  const [customPrices, setCustomPrices] = useState<Record<string, string>>({});

  const updateForm = (newSel: typeof selections) => {
    const services = Object.entries(newSel).map(([svc, s]) => `${svc}:${s.tier}`).join(', ');
    let oneTime = 0;
    let monthly = 0;
    Object.entries(newSel).forEach(([svc, s]) => {
      const config = SERVICE_TIERS[svc];
      const tierDef = config?.tiers.find(t => t.name === s.tier);
      const price = s.tier === 'Custom' ? (Number(customPrices[svc]) || s.customPrice || 0) : (tierDef?.price || 0);
      if (config?.recurring) monthly += price;
      else oneTime += price;
    });
    const hasRecurring = Object.entries(newSel).some(([svc]) => SERVICE_TIERS[svc]?.recurring);
    setForm({ ...form, service: services as any, estimatedValue: oneTime, monthlyRetainer: monthly, isRetainer: hasRecurring });
  };

  const toggleService = (svc: string) => {
    const next = { ...selections };
    if (next[svc]) { delete next[svc]; } else { next[svc] = { tier: SERVICE_TIERS[svc].tiers[0]?.name || '', customPrice: 0 }; }
    setSelections(next);
    updateForm(next);
  };

  const setTier = (svc: string, tier: string) => {
    const next = { ...selections, [svc]: { ...selections[svc], tier } };
    setSelections(next);
    updateForm(next);
  };

  const setCustomPrice = (svc: string, val: string) => {
    setCustomPrices(prev => ({ ...prev, [svc]: val }));
    const next = { ...selections, [svc]: { ...selections[svc], customPrice: Number(val) || 0 } };
    setSelections(next);
    // Recalculate
    let oneTime = 0, monthly = 0;
    Object.entries(next).forEach(([s, sel]) => {
      const config = SERVICE_TIERS[s];
      const tierDef = config?.tiers.find(t => t.name === sel.tier);
      const price = sel.tier === 'Custom' ? (s === svc ? Number(val) || 0 : Number(customPrices[s]) || sel.customPrice || 0) : (tierDef?.price || 0);
      if (config?.recurring) monthly += price; else oneTime += price;
    });
    const hasRecurring = Object.entries(next).some(([s]) => SERVICE_TIERS[s]?.recurring);
    setForm({ ...form, service: Object.entries(next).map(([s, sel]) => `${s}:${sel.tier}`).join(', ') as any, estimatedValue: oneTime, monthlyRetainer: monthly, isRetainer: hasRecurring });
  };

  // Summary
  const oneTimeTotal = Object.entries(selections).reduce((sum, [svc, s]) => {
    if (SERVICE_TIERS[svc]?.recurring) return sum;
    const tierDef = SERVICE_TIERS[svc]?.tiers.find(t => t.name === s.tier);
    return sum + (s.tier === 'Custom' ? (Number(customPrices[svc]) || s.customPrice || 0) : (tierDef?.price || 0));
  }, 0);
  const monthlyTotal = Object.entries(selections).reduce((sum, [svc, s]) => {
    if (!SERVICE_TIERS[svc]?.recurring) return sum;
    const tierDef = SERVICE_TIERS[svc]?.tiers.find(t => t.name === s.tier);
    return sum + (s.tier === 'Custom' ? (Number(customPrices[svc]) || s.customPrice || 0) : (tierDef?.price || 0));
  }, 0);

  return (
    <div>
      <label className="text-xs text-gray-500 block mb-2">Services & Pricing</label>
      <div className="space-y-2">
        {Object.keys(SERVICE_TIERS).map(svc => {
          const active = !!selections[svc];
          return (
            <div key={svc} className={`rounded-lg border transition-colors ${active ? 'border-blue-500 bg-blue-600/10' : 'border-gray-700 bg-gray-800/50'}`}>
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={active} onChange={() => toggleService(svc)} className="sr-only" />
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600 border-blue-500' : 'border-gray-600'}`}>
                  {active && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-blue-400' : 'text-gray-400'}`}>{svc}</span>
                {SERVICE_TIERS[svc].recurring && <span className="text-[10px] text-green-400/70 ml-auto">recurring</span>}
              </label>
              {active && SERVICE_TIERS[svc].tiers.length > 1 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                  {SERVICE_TIERS[svc].tiers.map(t => (
                    <button key={t.name} type="button" onClick={() => setTier(svc, t.name)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition ${selections[svc]?.tier === t.name ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      {t.name} {t.name !== 'Custom' && <span className="opacity-70">{t.label}</span>}
                    </button>
                  ))}
                </div>
              )}
              {active && selections[svc]?.tier === 'Custom' && (
                <div className="px-3 pb-2">
                  <Input label={`Custom ${SERVICE_TIERS[svc].recurring ? '$/mo' : '$'}`} value={customPrices[svc] || ''} onChange={e => setCustomPrice(svc, e.target.value)} type="number" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {(oneTimeTotal > 0 || monthlyTotal > 0) && (
        <div className="mt-3 p-2.5 bg-gray-800/80 rounded-lg flex gap-4">
          {oneTimeTotal > 0 && <div><div className="text-[10px] text-gray-500">One-Time</div><div className="text-sm font-bold text-white">${oneTimeTotal.toLocaleString()}</div></div>}
          {monthlyTotal > 0 && <div><div className="text-[10px] text-gray-500">Monthly</div><div className="text-sm font-bold text-green-400">${monthlyTotal.toLocaleString()}/mo</div></div>}
        </div>
      )}
    </div>
  );
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
      <Input label="Website" value={form.website || ''} onChange={f('website')} />
      <Input label="Google Business URL" value={form.gbpUrl || ''} onChange={f('gbpUrl')} />
      <ServiceTierPicker form={form} setForm={setForm} />
      <Input label="Amount Paid ($)" value={(form.amountPaid || 0).toString()} onChange={e => setForm({ ...form, amountPaid: Number(e.target.value) || 0 })} type="number" />
      <div className="flex items-center gap-3 mt-1">
        <label className="text-xs text-gray-500">Retainer Client</label>
        <button
          type="button"
          onClick={() => setForm({ ...form, isRetainer: !form.isRetainer })}
          className={`w-10 h-6 rounded-full transition ${form.isRetainer ? 'bg-green-500' : 'bg-gray-700'} relative`}
        >
          <span className={`block w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${form.isRetainer ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
        <span className="text-xs text-gray-400">{form.isRetainer ? 'Yes — recurring monthly' : 'No — one-time project'}</span>
      </div>
      {form.isRetainer && <Input label="Monthly Retainer ($)" value={(form.monthlyRetainer || 0).toString()} onChange={e => setForm({ ...form, monthlyRetainer: Number(e.target.value) || 0 })} type="number" />}
      <div>
        <label className="text-xs text-gray-500">Stage</label>
        <select value={form.stage} onChange={f('stage') as any} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 min-h-[44px]">
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Notes</label>
        <textarea value={form.notes} onChange={f('notes')} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm min-h-[44px] flex-1 sm:flex-none">Save</button>
        <button onClick={onCancel} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm min-h-[44px] flex-1 sm:flex-none">Cancel</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input type={type} value={value} onChange={onChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1 min-h-[44px]" />
    </div>
  );
}

/* ====== QUICK ADD ====== */
function QuickAddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Deal) => void }) {
  const [form, setForm] = useState<Deal>({
    id: uuid(), businessName: '', contactPerson: '', phone: '', email: '', website: '', gbpUrl: '',
    service: '' as any, estimatedValue: 0, stage: 'Prospect', lastInteraction: new Date().toISOString(),
    notes: '', activities: [], createdAt: new Date().toISOString(), amountPaid: 0, isRetainer: false, monthlyRetainer: 0,
  });

  function submit() {
    if (!form.businessName.trim()) return;
    onAdd({ ...form, activities: [{ id: uuid(), type: 'created', description: 'Deal created', timestamp: new Date().toISOString() }] });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Quick Add Prospect</h2>
        <div className="space-y-3">
          <Input label="Business Name *" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
          <Input label="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <Input label="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <Input label="Website" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
          <Input label="Google Business URL" value={form.gbpUrl} onChange={e => setForm({...form, gbpUrl: e.target.value})} />
          <ServiceTierPicker form={form} setForm={setForm} />
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm flex-1 min-h-[44px]">Add</button>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm min-h-[44px]">Cancel</button>
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
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
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

          {/* Mobile card layout */}
          <div className="sm:hidden space-y-3">
            {retainers.map(r => (
              <div key={r.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{r.clientName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.serviceType}</div>
                  </div>
                  <button onClick={() => update(prev => prev.filter(x => x.id !== r.id))} className="text-gray-600 hover:text-red-400 min-h-[44px] min-w-[44px] flex items-center justify-center">✕</button>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-blue-400 font-semibold">${r.monthlyAmount.toLocaleString()}/mo</span>
                  <select value={r.paymentStatus} onChange={e => update(prev => prev.map(x => x.id === r.id ? { ...x, paymentStatus: e.target.value as any } : x))}
                    className={`text-xs px-3 py-2 rounded-full border-0 min-h-[44px] ${statusColor[r.paymentStatus]} bg-gray-700`}>
                    {['Paid', 'Pending', 'Overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Start: {r.startDate}</span>
                  <span>Next: {r.nextBillingDate}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAdd && <RetainerAddModal onClose={() => setShowAdd(false)} onAdd={r => update(prev => [...prev, r])} />}
    </div>
  );
}

function RetainerAddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (r: Retainer) => void }) {
  const [name, setName] = useState('');
  const [service, setService] = useState('Website Hosting');
  const [customService, setCustomService] = useState('');
  const [amount, setAmount] = useState('');
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [next, setNext] = useState('');

  function submit() {
    if (!name.trim()) return;
    const svcType = service === 'Custom' ? customService : service;
    onAdd({ id: uuid(), clientName: name.trim(), serviceType: svcType, monthlyAmount: Number(amount) || 0, startDate: start, nextBillingDate: next || start, paymentStatus: 'Pending' });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Add Retainer Client</h2>
        <div className="space-y-3">
          <Input label="Client Name *" value={name} onChange={e => setName(e.target.value)} />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Service Type</label>
            <select value={service} onChange={e => setService(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-h-[44px]">
              <option value="Website Hosting">Website Hosting</option>
              <option value="SEO Monthly">SEO Monthly</option>
              <option value="Ads Management">Ads Management</option>
              <option value="Full Service">Full Service</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          {service === 'Custom' && <Input label="Custom Service" value={customService} onChange={e => setCustomService(e.target.value)} />}
          <Input label="Monthly Amount ($)" value={amount} onChange={e => setAmount(e.target.value)} type="number" />
          <Input label="Start Date" value={start} onChange={e => setStart(e.target.value)} type="date" />
          <Input label="Next Billing Date" value={next} onChange={e => setNext(e.target.value)} type="date" />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={submit} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm flex-1 min-h-[44px]">Add</button>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm min-h-[44px]">Cancel</button>
        </div>
      </div>
    </div>
  );
}
