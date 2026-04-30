'use client';

// Counterparty intelligence roster.
//
// This page is read-mostly: an external Claude routine populates the
// counterparty_news table by running periodic key-term searches and
// tabulating the results, and this page surfaces who's been in the news,
// what was said, and which themes (tags) the items touch.
//
// Manual add/edit/delete is also supported for one-off entries.

import { useEffect, useMemo, useState, useCallback, Fragment } from 'react';

const cn = (...xs) => xs.filter(Boolean).join(' ');

const ROLE_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'bidder',   label: 'Bidders' },
  { key: 'offtaker', label: 'Offtakers' },
  { key: 'both',     label: 'Bidder + Offtaker' },
];

const WINDOWS = [
  { key: '7',   label: 'Last 7 days' },
  { key: '30',  label: 'Last 30 days' },
  { key: '90',  label: 'Last 90 days' },
  { key: '365', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function RoleBadge({ row }) {
  if (row.is_bidder && row.is_offtaker) return <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">B+O</span>;
  if (row.is_bidder)   return <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">B</span>;
  if (row.is_offtaker) return <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-medium">O</span>;
  return <span className="text-gray-300 text-[10px]">—</span>;
}

function TagChips({ tags, onClickTag, activeTag, size = 'sm' }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          onClick={(e) => { e.stopPropagation(); onClickTag?.(t); }}
          className={cn(
            'rounded font-medium border transition-colors',
            size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
            activeTag === t
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// News editor (inline, per counterparty)
// ─────────────────────────────────────────────────────────────────────────

function NewsItem({ item, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item);

  useEffect(() => { setDraft(item); }, [item]);

  if (editing) {
    return (
      <div className="bg-white border-2 border-blue-300 rounded p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={draft.published_at ? String(draft.published_at).slice(0, 10) : ''} onChange={(e) => setDraft({ ...draft, published_at: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
          <input placeholder="Source (e.g. AFR)" value={draft.source || ''} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        </div>
        <input placeholder="Headline *" value={draft.headline || ''} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
        <textarea placeholder="Summary" rows={3} value={draft.summary || ''} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs resize-y" />
        <input placeholder="URL" value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
        <input placeholder="Tags (comma separated)" value={(draft.tags || []).join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => { setDraft(item); setEditing(false); }} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={async () => { await onPatch(draft); setEditing(false); }} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded p-3 group hover:border-gray-300">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-700">{fmtDate(item.published_at)}</span>
            {item.source && <span className="text-[11px] text-gray-500">· {item.source}</span>}
          </div>
          <p className="text-sm font-medium text-gray-900 mt-0.5">{item.headline}</p>
          {item.summary && <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{item.summary}</p>}
          {item.url && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">
              {item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}
            </a>
          )}
          {item.tags && item.tags.length > 0 && <div className="mt-2"><TagChips tags={item.tags} /></div>}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="text-[11px] text-blue-600 hover:underline">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[11px] text-red-600 hover:underline">Delete</button>
        </div>
      </div>
    </div>
  );
}

function NewsPanel({ counterpartyId, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/counterparty-news?counterparty_id=${counterpartyId}`);
    const data = await r.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [counterpartyId]);

  useEffect(() => { if (counterpartyId) load(); }, [counterpartyId, load]);

  async function saveDraft() {
    if (!draft || !draft.headline?.trim()) return;
    await fetch('/api/counterparty-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, counterparty_id: counterpartyId }),
    });
    setDraft(null);
    load();
    onChange?.();
  }

  async function patchItem(id, patch) {
    await fetch(`/api/counterparty-news/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    load();
    onChange?.();
  }

  async function deleteItem(id) {
    if (!confirm('Delete this news item?')) return;
    await fetch(`/api/counterparty-news/${id}`, { method: 'DELETE' });
    load();
    onChange?.();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          News {items.length > 0 && <span className="text-gray-400 normal-case font-normal">({items.length})</span>}
        </h4>
        {!draft && (
          <button
            onClick={() => setDraft({ headline: '', summary: '', url: '', source: '', published_at: new Date().toISOString().slice(0, 10), tags: [] })}
            className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add news
          </button>
        )}
      </div>

      {draft && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={draft.published_at || ''} onChange={(e) => setDraft({ ...draft, published_at: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
            <input placeholder="Source" value={draft.source || ''} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
          </div>
          <input placeholder="Headline *" value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
          <textarea placeholder="Summary" rows={3} value={draft.summary || ''} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs resize-y" />
          <input placeholder="URL" value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
          <input placeholder="Tags (comma separated)" value={(draft.tags || []).join(', ')} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setDraft(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button onClick={saveDraft} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Save news</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : items.length === 0 && !draft ? (
        <p className="text-xs text-gray-400 italic py-2">No news items yet.</p>
      ) : (
        items.map((it) => (
          <NewsItem key={it.id} item={it} onPatch={(p) => patchItem(it.id, p)} onDelete={() => deleteItem(it.id)} />
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [counterparties, setCounterparties] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [windowKey, setWindowKey] = useState('90');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
  const [withNewsOnly, setWithNewsOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const sinceDate = windowKey === 'all' ? null : isoDaysAgo(Number(windowKey));

  const load = useCallback(async () => {
    setLoading(true);
    const sinceParam = sinceDate ? `?since=${sinceDate}` : '';
    const [cpRes, newsRes] = await Promise.all([
      fetch('/api/counterparties').then((r) => r.json()).catch(() => []),
      fetch(`/api/counterparty-news${sinceParam}`).then((r) => r.json()).catch(() => []),
    ]);
    setCounterparties(Array.isArray(cpRes) ? cpRes : []);
    setNews(Array.isArray(newsRes) ? newsRes : []);
    setLoading(false);
  }, [sinceDate]);

  useEffect(() => { load(); }, [load]);

  const newsByCp = useMemo(() => {
    const map = new Map();
    for (const n of news) {
      const k = n.counterparty_id;
      if (k == null) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(n);
    }
    return map;
  }, [news]);

  const marketNews = useMemo(() => news.filter((n) => n.counterparty_id == null), [news]);

  const tagCounts = useMemo(() => {
    const m = new Map();
    for (const n of news) for (const t of (n.tags || [])) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [news]);

  const enriched = useMemo(() => {
    return counterparties.map((c) => {
      const its = newsByCp.get(c.id) || [];
      const latest = its[0];
      const allTags = [...new Set(its.flatMap((i) => i.tags || []))];
      return { ...c, news_count: its.length, latest_news: latest, news_tags: allTags };
    });
  }, [counterparties, newsByCp]);

  const filtered = useMemo(() => {
    return enriched.filter((c) => {
      if (roleFilter === 'bidder' && !c.is_bidder) return false;
      if (roleFilter === 'offtaker' && !c.is_offtaker) return false;
      if (roleFilter === 'both' && !(c.is_bidder && c.is_offtaker)) return false;
      if (withNewsOnly && c.news_count === 0) return false;
      if (tagFilter && !(c.news_tags || []).includes(tagFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [c.name, c.parent_owner, c.latest_news?.headline, c.latest_news?.summary]
          .map((s) => (s || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [enriched, roleFilter, withNewsOnly, tagFilter, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ad = a.latest_news?.published_at ? new Date(a.latest_news.published_at).getTime() : 0;
      const bd = b.latest_news?.published_at ? new Date(b.latest_news.published_at).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return (a.name || '').localeCompare(b.name || '');
    });
    return arr;
  }, [filtered]);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const stats = {
    total: counterparties.length,
    withNews: enriched.filter((c) => c.news_count > 0).length,
    newsItems: news.filter((n) => n.counterparty_id != null).length,
    marketItems: marketNews.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">Counterparty Intelligence</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {stats.total} counterparties · {stats.withNews} with news in window · {stats.newsItems} counterparty items · {stats.marketItems} general market items
        </p>
      </div>

      <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search counterparty or headline…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72"
        />
        <select value={windowKey} onChange={(e) => setWindowKey(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
          {WINDOWS.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 rounded p-0.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={cn('px-2.5 py-1 rounded text-xs font-medium transition-colors', roleFilter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-600 hover:text-slate-900')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 px-2 py-1 border border-gray-300 rounded text-xs cursor-pointer bg-white">
          <input type="checkbox" checked={withNewsOnly} onChange={(e) => setWithNewsOnly(e.target.checked)} />
          With news only
        </label>
        {(search || roleFilter !== 'all' || tagFilter || !withNewsOnly || windowKey !== '90') && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setTagFilter(''); setWithNewsOnly(true); setWindowKey('90'); }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-500 ml-auto">{sorted.length} shown</span>
      </div>

      {tagCounts.length > 0 && (
        <div className="px-6 py-2 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-medium mr-1">Tags:</span>
          {tagCounts.slice(0, 20).map(([t, n]) => (
            <button
              key={t}
              onClick={() => setTagFilter(tagFilter === t ? '' : t)}
              className={cn(
                'px-2 py-0.5 text-[11px] rounded border font-medium transition-colors',
                tagFilter === t
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
              )}
            >
              {t} <span className="opacity-60">({n})</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
        <div className="overflow-x-auto bg-white">
          <table className="min-w-full table-fixed">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead className="bg-slate-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Counterparty</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Projects</th>
                <th className="px-4 py-2 text-center font-medium">News</th>
                <th className="px-4 py-2 text-left font-medium">Latest headline</th>
                <th className="px-4 py-2 text-left font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">No counterparties match these filters.</td></tr>
              ) : (
                sorted.map((c) => {
                  const isOpen = expanded.has(c.id);
                  return (
                    <Fragment key={c.id}>
                      <tr
                        onClick={() => toggleExpand(c.id)}
                        className={cn('border-b border-gray-100 cursor-pointer hover:bg-blue-50/40', c.news_count > 0 && 'bg-amber-50/40')}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-xs">{isOpen ? '▾' : '▸'}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{c.name}</div>
                              {c.parent_owner && <div className="text-[11px] text-gray-500">{c.parent_owner}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><RoleBadge row={c} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">{c.status || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">
                          {(c.project_names || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {c.project_names.map((n) => (
                                <span key={n} className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-medium">{n}</span>
                              ))}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {c.news_count > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold">{c.news_count}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-700">
                          {c.latest_news ? (
                            <div>
                              <div className="font-medium text-gray-900 truncate" title={c.latest_news.headline}>{c.latest_news.headline}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{fmtDateShort(c.latest_news.published_at)}{c.latest_news.source ? ` · ${c.latest_news.source}` : ''}</div>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <TagChips tags={c.news_tags} onClickTag={(t) => setTagFilter(tagFilter === t ? '' : t)} activeTag={tagFilter} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 border-b border-gray-200 px-6 py-4">
                            <NewsPanel counterpartyId={c.id} onChange={load} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <aside className="bg-slate-50 border-l border-gray-200 px-4 py-4 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            General market news <span className="text-gray-400 normal-case font-normal">({marketNews.length})</span>
          </h3>
          {marketNews.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No untagged market items in window.</p>
          ) : (
            <div className="space-y-2">
              {marketNews.map((n) => (
                <div key={n.id} className="bg-white border border-gray-200 rounded p-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-semibold text-gray-700">{fmtDateShort(n.published_at)}</span>
                    {n.source && <span className="text-[10px] text-gray-500">· {n.source}</span>}
                  </div>
                  <p className="text-xs font-medium text-gray-900 mt-1">{n.headline}</p>
                  {n.summary && <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">{n.summary}</p>}
                  {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline mt-1 inline-block">Source ↗</a>}
                  {n.tags && n.tags.length > 0 && <div className="mt-1.5"><TagChips tags={n.tags} /></div>}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
