'use client';

import { useEffect, useMemo, useState } from 'react';

const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];
const ARCHETYPES = ['Gentailer', 'IPP', 'Fund', 'Corporate', 'Retailer', 'Utility', 'Developer', 'Other'];
const STATUSES = ['Active', 'Passed', 'Not engaged'];
const ROLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'bidder', label: 'Bidders' },
  { key: 'offtaker', label: 'Offtakers' },
  { key: 'both', label: 'Bidder + Offtaker' },
];

const EMPTY_DRAFT = {
  name: '', parent_owner: '', is_bidder: true, is_offtaker: false,
  geography: '', states: [], tier: '', archetype: '', status: '', notes: '',
};

function classNames(...xs) { return xs.filter(Boolean).join(' '); }

function StatesEditor({ value, onChange }) {
  const set = new Set(value || []);
  return (
    <div className="flex flex-wrap gap-1">
      {AU_STATES.map((s) => {
        const active = set.has(s);
        return (
          <button
            key={s}
            type="button"
            onClick={() => {
              const next = new Set(set);
              active ? next.delete(s) : next.add(s);
              onChange([...next]);
            }}
            className={classNames(
              'px-2 py-0.5 text-[11px] rounded border',
              active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400',
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

function MeetingsPanel({ counterpartyId }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/counterparties/${counterpartyId}/meetings`);
    const data = await r.json();
    setMeetings(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [counterpartyId]);

  async function saveDraft() {
    if (!draft) return;
    await fetch(`/api/counterparties/${counterpartyId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setDraft(null);
    load();
  }

  async function patchMeeting(id, patch) {
    await fetch(`/api/meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function deleteMeeting(id) {
    if (!confirm('Delete this meeting?')) return;
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="bg-slate-50 border-t border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Meetings</h4>
        <button
          onClick={() => setDraft({ meeting_date: new Date().toISOString().slice(0, 10), attendees: '', notes: '', next_steps: '' })}
          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add meeting
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : (
        <>
          {draft && (
            <div className="bg-white border border-blue-200 rounded p-3 mb-2 grid grid-cols-12 gap-2 text-xs">
              <input type="date" value={draft.meeting_date || ''} onChange={(e) => setDraft({ ...draft, meeting_date: e.target.value })} className="col-span-2 border border-gray-300 rounded px-2 py-1" />
              <input placeholder="Attendees" value={draft.attendees || ''} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} className="col-span-3 border border-gray-300 rounded px-2 py-1" />
              <input placeholder="Notes" value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="col-span-4 border border-gray-300 rounded px-2 py-1" />
              <input placeholder="Next steps" value={draft.next_steps || ''} onChange={(e) => setDraft({ ...draft, next_steps: e.target.value })} className="col-span-2 border border-gray-300 rounded px-2 py-1" />
              <div className="col-span-1 flex gap-1">
                <button onClick={saveDraft} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">✓</button>
                <button onClick={() => setDraft(null)} className="px-2 py-1 bg-gray-200 rounded text-xs hover:bg-gray-300">✕</button>
              </div>
            </div>
          )}

          {meetings.length === 0 && !draft && (
            <p className="text-xs text-gray-500 italic">No meetings yet.</p>
          )}

          {meetings.map((m) => (
            <MeetingRow key={m.id} meeting={m} onPatch={(p) => patchMeeting(m.id, p)} onDelete={() => deleteMeeting(m.id)} />
          ))}
        </>
      )}
    </div>
  );
}

function MeetingRow({ meeting, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meeting);

  useEffect(() => { setDraft(meeting); }, [meeting]);

  if (!editing) {
    const dateStr = meeting.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    return (
      <div className="bg-white border border-gray-200 rounded p-3 mb-2 grid grid-cols-12 gap-2 text-xs">
        <div className="col-span-2 font-medium text-gray-700">{dateStr}</div>
        <div className="col-span-3 text-gray-600">{meeting.attendees || '—'}</div>
        <div className="col-span-4 text-gray-600 whitespace-pre-wrap">{meeting.notes || '—'}</div>
        <div className="col-span-2 text-gray-600 italic">{meeting.next_steps || '—'}</div>
        <div className="col-span-1 flex gap-1">
          <button onClick={() => setEditing(true)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</button>
          <button onClick={onDelete} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Del</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-blue-300 rounded p-3 mb-2 grid grid-cols-12 gap-2 text-xs">
      <input type="date" value={draft.meeting_date ? draft.meeting_date.slice(0, 10) : ''} onChange={(e) => setDraft({ ...draft, meeting_date: e.target.value })} className="col-span-2 border border-gray-300 rounded px-2 py-1" />
      <input value={draft.attendees || ''} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} className="col-span-3 border border-gray-300 rounded px-2 py-1" />
      <input value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="col-span-4 border border-gray-300 rounded px-2 py-1" />
      <input value={draft.next_steps || ''} onChange={(e) => setDraft({ ...draft, next_steps: e.target.value })} className="col-span-2 border border-gray-300 rounded px-2 py-1" />
      <div className="col-span-1 flex gap-1">
        <button onClick={async () => { await onPatch(draft); setEditing(false); }} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">✓</button>
        <button onClick={() => { setDraft(meeting); setEditing(false); }} className="px-2 py-1 bg-gray-200 rounded text-xs">✕</button>
      </div>
    </div>
  );
}

function CounterpartyRow({ row, onPatch, onDelete, onToggleExpand, expanded }) {
  const [editing, setEditing] = useState(row.__isDraft || false);
  const [draft, setDraft] = useState(row);

  useEffect(() => {
    if (!editing) setDraft(row);
  }, [row, editing]);

  async function save() {
    await onPatch(draft);
    setEditing(false);
  }

  function cancel() {
    if (row.__isDraft) onDelete(true); // discard draft
    setDraft(row);
    setEditing(false);
  }

  if (!editing) {
    return (
      <>
        <tr className="border-b border-gray-100 hover:bg-slate-50">
          <td className="px-3 py-2 text-xs">
            <button onClick={onToggleExpand} className="text-gray-400 hover:text-blue-600">
              {expanded ? '▾' : '▸'}
            </button>
          </td>
          <td className="px-3 py-2 text-sm font-medium text-gray-900">{row.name}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{row.parent_owner || '—'}</td>
          <td className="px-3 py-2 text-xs">
            {row.is_bidder && <span className="inline-block px-1.5 py-0.5 mr-1 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">B</span>}
            {row.is_offtaker && <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-medium">O</span>}
          </td>
          <td className="px-3 py-2 text-xs text-gray-600">{row.geography || '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{(row.states || []).join(', ') || '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{row.tier ?? '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{row.archetype || '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{row.status || '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-600 max-w-[260px] truncate" title={row.notes || ''}>{row.notes || '—'}</td>
          <td className="px-3 py-2 text-xs text-gray-500 text-center">
            {row.meeting_count || 0}
            {row.last_meeting_date ? <div className="text-[10px] text-gray-400">{new Date(row.last_meeting_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div> : null}
          </td>
          <td className="px-3 py-2 text-xs flex gap-1">
            <button onClick={() => setEditing(true)} className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded">Edit</button>
            <button onClick={() => onDelete(false)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">Del</button>
          </td>
        </tr>
        {expanded && (
          <tr>
            <td colSpan={12} className="p-0">
              <MeetingsPanel counterpartyId={row.id} />
            </td>
          </tr>
        )}
      </>
    );
  }

  // Edit mode
  return (
    <tr className="border-b border-blue-200 bg-blue-50">
      <td className="px-3 py-2"></td>
      <td className="px-2 py-1"><input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-sm" placeholder="Name *" /></td>
      <td className="px-2 py-1"><input value={draft.parent_owner || ''} onChange={(e) => setDraft({ ...draft, parent_owner: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></td>
      <td className="px-2 py-1">
        <div className="flex flex-col gap-0.5 text-[11px]">
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.is_bidder} onChange={(e) => setDraft({ ...draft, is_bidder: e.target.checked })} /> Bidder</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={!!draft.is_offtaker} onChange={(e) => setDraft({ ...draft, is_offtaker: e.target.checked })} /> Offtaker</label>
        </div>
      </td>
      <td className="px-2 py-1"><input value={draft.geography || ''} onChange={(e) => setDraft({ ...draft, geography: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></td>
      <td className="px-2 py-1"><StatesEditor value={draft.states || []} onChange={(v) => setDraft({ ...draft, states: v })} /></td>
      <td className="px-2 py-1">
        <select value={draft.tier ?? ''} onChange={(e) => setDraft({ ...draft, tier: e.target.value === '' ? null : Number(e.target.value) })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">—</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <select value={draft.archetype || ''} onChange={(e) => setDraft({ ...draft, archetype: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">—</option>
          {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </td>
      <td className="px-2 py-1">
        <select value={draft.status || ''} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">—</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-2 py-1"><textarea value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" /></td>
      <td className="px-2 py-1 text-xs text-gray-400 text-center">—</td>
      <td className="px-2 py-1 text-xs flex gap-1">
        <button onClick={save} className="px-2 py-1 bg-emerald-600 text-white rounded">Save</button>
        <button onClick={cancel} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
      </td>
    </tr>
  );
}

export default function CounterpartiesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  async function load() {
    setLoading(true);
    const r = await fetch('/api/counterparties');
    const data = await r.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function toggleExpand(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function patchRow(draft) {
    if (draft.__isDraft) {
      const res = await fetch('/api/counterparties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Save failed: ${err.error || res.statusText}`);
        return;
      }
    } else {
      await fetch(`/api/counterparties/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
    }
    load();
  }

  async function deleteRow(row, isDraftDiscard) {
    if (isDraftDiscard || row.__isDraft) {
      setRows((prev) => prev.filter((r) => r !== row));
      return;
    }
    if (!confirm(`Delete "${row.name}" and all its meetings?`)) return;
    await fetch(`/api/counterparties/${row.id}`, { method: 'DELETE' });
    load();
  }

  function addDraft() {
    setRows((prev) => [{ ...EMPTY_DRAFT, __isDraft: true, id: `draft-${Date.now()}` }, ...prev]);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.__isDraft) return true;
      if (roleFilter === 'bidder' && !r.is_bidder) return false;
      if (roleFilter === 'offtaker' && !r.is_offtaker) return false;
      if (roleFilter === 'both' && !(r.is_bidder && r.is_offtaker)) return false;
      if (stateFilter && !(r.states || []).includes(stateFilter)) return false;
      if (archetypeFilter && r.archetype !== archetypeFilter) return false;
      if (tierFilter && String(r.tier) !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [r.name, r.parent_owner, r.notes].map((s) => (s || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, roleFilter, stateFilter, archetypeFilter, tierFilter]);

  const counts = useMemo(() => ({
    total: rows.filter((r) => !r.__isDraft).length,
    bidders: rows.filter((r) => r.is_bidder).length,
    offtakers: rows.filter((r) => r.is_offtaker).length,
    both: rows.filter((r) => r.is_bidder && r.is_offtaker).length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Counterparties</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {counts.total} total · {counts.bidders} bidders · {counts.offtakers} offtakers · {counts.both} both
            </p>
          </div>
          <button onClick={addDraft} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
            + New counterparty
          </button>
        </div>
      </div>

      <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-2">
        <input
          placeholder="Search name, owner, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64"
        />
        <div className="flex gap-1">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={classNames(
                'px-2.5 py-1 rounded text-xs font-medium border',
                roleFilter === f.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300 hover:border-slate-400',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">All states</option>
          {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={archetypeFilter} onChange={(e) => setArchetypeFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">All archetypes</option>
          {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs">
          <option value="">All tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} shown</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Parent / Owner</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Geography</th>
              <th className="px-3 py-2 text-left">States</th>
              <th className="px-3 py-2 text-left">Tier</th>
              <th className="px-3 py-2 text-left">Archetype</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-center">Mtgs</th>
              <th className="px-3 py-2 text-left w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr><td colSpan={12} className="px-6 py-8 text-center text-sm text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} className="px-6 py-8 text-center text-sm text-gray-500">No counterparties match these filters.</td></tr>
            ) : (
              filtered.map((row) => (
                <CounterpartyRow
                  key={row.id}
                  row={row}
                  onPatch={patchRow}
                  onDelete={(isDraftDiscard) => deleteRow(row, isDraftDiscard)}
                  expanded={expanded.has(row.id)}
                  onToggleExpand={() => toggleExpand(row.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
