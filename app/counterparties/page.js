'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

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
  geography: '', states: [], tier: null, archetype: '', status: '', notes: '',
};

const cn = (...xs) => xs.filter(Boolean).join(' ');

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────────────────
// Reusable form bits
// ─────────────────────────────────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function StatesPicker({ value, onChange }) {
  const set = new Set(value || []);
  return (
    <div className="flex flex-wrap gap-1.5">
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
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded border transition-colors',
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600',
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Meetings panel (used inside the drawer)
// ─────────────────────────────────────────────────────────────────────────

function MeetingCard({ meeting, onPatch, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(meeting);

  useEffect(() => { setDraft(meeting); }, [meeting]);

  if (editing) {
    return (
      <div className="bg-white border-2 border-blue-300 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={draft.meeting_date ? String(draft.meeting_date).slice(0, 10) : ''}
            onChange={(e) => setDraft({ ...draft, meeting_date: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs"
          />
          <input
            placeholder="Attendees"
            value={draft.attendees || ''}
            onChange={(e) => setDraft({ ...draft, attendees: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs"
          />
        </div>
        <textarea
          placeholder="Notes"
          rows={3}
          value={draft.notes || ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs resize-y"
        />
        <input
          placeholder="Next steps"
          value={draft.next_steps || ''}
          onChange={(e) => setDraft({ ...draft, next_steps: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => { setDraft(meeting); setEditing(false); }}
            className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={async () => { await onPatch(draft); setEditing(false); }}
            className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 group hover:border-gray-300">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-gray-900">{fmtDate(meeting.meeting_date)}</span>
          {meeting.attendees && (
            <span className="text-xs text-gray-500">· {meeting.attendees}</span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="text-[11px] text-blue-600 hover:underline">Edit</button>
          <button onClick={onDelete} className="text-[11px] text-red-600 hover:underline">Delete</button>
        </div>
      </div>
      {meeting.notes && (
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{meeting.notes}</p>
      )}
      {meeting.next_steps && (
        <p className="text-xs text-amber-700 mt-1.5 italic">→ {meeting.next_steps}</p>
      )}
    </div>
  );
}

function MeetingsSection({ counterpartyId }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/counterparties/${counterpartyId}/meetings`);
    const data = await r.json();
    setMeetings(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [counterpartyId]);

  useEffect(() => { if (counterpartyId) load(); }, [counterpartyId, load]);

  async function saveDraft() {
    if (!draft) return;
    const res = await fetch(`/api/counterparties/${counterpartyId}/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft(null);
      load();
    }
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

  if (!counterpartyId) {
    return <p className="text-xs text-gray-400 italic">Save the counterparty first to add meetings.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Meetings {meetings.length > 0 && <span className="text-gray-400 font-normal normal-case">({meetings.length})</span>}
        </h3>
        {!draft && (
          <button
            onClick={() => setDraft({ meeting_date: new Date().toISOString().slice(0, 10), attendees: '', notes: '', next_steps: '' })}
            className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add meeting
          </button>
        )}
      </div>

      {draft && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={draft.meeting_date || ''} onChange={(e) => setDraft({ ...draft, meeting_date: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
            <input placeholder="Attendees" value={draft.attendees || ''} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
          </div>
          <textarea placeholder="Notes" rows={3} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs resize-y" />
          <input placeholder="Next steps" value={draft.next_steps || ''} onChange={(e) => setDraft({ ...draft, next_steps: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setDraft(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button onClick={saveDraft} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Save meeting</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : meetings.length === 0 && !draft ? (
        <p className="text-xs text-gray-400 italic py-3 text-center bg-gray-50 rounded">No meetings yet.</p>
      ) : (
        meetings.map((m) => (
          <MeetingCard
            key={m.id}
            meeting={m}
            onPatch={(p) => patchMeeting(m.id, p)}
            onDelete={() => deleteMeeting(m.id)}
          />
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────────────────────────────────

function CounterpartyDrawer({ open, initial, isNew, onClose, onSaved, onDeleted }) {
  const [draft, setDraft] = useState(initial || EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(initial || EMPTY_DRAFT);
    setError('');
    setDirty(false);
  }, [initial, open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function update(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  async function save() {
    setError('');
    if (!draft.name?.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? '/api/counterparties' : `/api/counterparties/${draft.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `${method} failed`);
      }
      const saved = await res.json();
      setDirty(false);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function del() {
    if (isNew) return;
    if (!confirm(`Delete "${draft.name}" and all its meetings? This cannot be undone.`)) return;
    await fetch(`/api/counterparties/${draft.id}`, { method: 'DELETE' });
    onDeleted();
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity"
        onClick={() => {
          if (dirty && !confirm('You have unsaved changes. Discard?')) return;
          onClose();
        }}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-[520px] bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <input
              autoFocus={isNew}
              value={draft.name || ''}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Counterparty name *"
              className="w-full bg-transparent text-lg font-semibold text-gray-900 border-0 outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 py-0.5"
            />
            <input
              value={draft.parent_owner || ''}
              onChange={(e) => update({ parent_owner: e.target.value })}
              placeholder="Parent / owner (optional)"
              className="w-full bg-transparent text-xs text-gray-500 border-0 outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 py-0.5 mt-1"
            />
          </div>
          <button
            onClick={() => {
              if (dirty && !confirm('You have unsaved changes. Discard?')) return;
              onClose();
            }}
            className="text-gray-400 hover:text-gray-700 p-1"
            title="Close (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Role */}
          <Field label="Role">
            <div className="flex gap-2">
              <label className={cn(
                'flex items-center gap-2 px-3 py-1.5 border rounded cursor-pointer text-sm flex-1',
                draft.is_bidder ? 'bg-blue-50 border-blue-400 text-blue-800' : 'bg-white border-gray-300 text-gray-600',
              )}>
                <input type="checkbox" checked={!!draft.is_bidder} onChange={(e) => update({ is_bidder: e.target.checked })} className="rounded" />
                Bidder
              </label>
              <label className={cn(
                'flex items-center gap-2 px-3 py-1.5 border rounded cursor-pointer text-sm flex-1',
                draft.is_offtaker ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-gray-300 text-gray-600',
              )}>
                <input type="checkbox" checked={!!draft.is_offtaker} onChange={(e) => update({ is_offtaker: e.target.checked })} className="rounded" />
                Offtaker
              </label>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Geography">
              <input
                value={draft.geography || ''}
                onChange={(e) => update({ geography: e.target.value })}
                placeholder="Australia, UK, US…"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Archetype">
              <select
                value={draft.archetype || ''}
                onChange={(e) => update({ archetype: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          <Field label="States looked at" hint={(draft.states || []).length > 0 ? `${draft.states.length} selected` : 'click to toggle'}>
            <StatesPicker value={draft.states || []} onChange={(v) => update({ states: v })} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Tier" hint="bidder context">
              <select
                value={draft.tier ?? ''}
                onChange={(e) => update({ tier: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                value={draft.status || ''}
                onChange={(e) => update({ status: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">—</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={draft.notes || ''}
              onChange={(e) => update({ notes: e.target.value })}
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y leading-relaxed"
              placeholder="Commentary, background, key context…"
            />
          </Field>

          {/* Meetings */}
          {!isNew && (
            <div className="pt-3 border-t border-gray-200">
              <MeetingsSection counterpartyId={draft.id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-slate-50 flex items-center justify-between gap-2">
          {!isNew ? (
            <button onClick={del} className="text-xs text-red-600 hover:underline">Delete</button>
          ) : <span />}
          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-600">{error}</span>}
            {dirty && !error && <span className="text-xs text-amber-600">Unsaved changes</span>}
            <button
              onClick={() => {
                if (dirty && !confirm('Discard changes?')) return;
                onClose();
              }}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────

function RoleBadge({ row }) {
  if (row.is_bidder && row.is_offtaker) {
    return <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">B+O</span>;
  }
  if (row.is_bidder) {
    return <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">B</span>;
  }
  if (row.is_offtaker) {
    return <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-medium">O</span>;
  }
  return <span className="text-gray-300 text-[10px]">—</span>;
}

export default function CounterpartiesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInitial, setDrawerInitial] = useState(null);
  const [drawerIsNew, setDrawerIsNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/counterparties');
    const data = await r.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setDrawerInitial(EMPTY_DRAFT);
    setDrawerIsNew(true);
    setDrawerOpen(true);
  }

  function openEdit(row) {
    setDrawerInitial(row);
    setDrawerIsNew(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
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
    total: rows.length,
    bidders: rows.filter((r) => r.is_bidder).length,
    offtakers: rows.filter((r) => r.is_offtaker).length,
    both: rows.filter((r) => r.is_bidder && r.is_offtaker).length,
  }), [rows]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Counterparties</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {counts.total} total · {counts.bidders} bidders · {counts.offtakers} offtakers · {counts.both} both
            </p>
          </div>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            + New counterparty
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 bg-white border-b border-gray-200 flex flex-wrap items-center gap-2 sticky top-0 z-10">
        <input
          placeholder="Search name, owner, notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="flex gap-1 bg-slate-100 rounded p-0.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                roleFilter === f.key ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-600 hover:text-slate-900',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
          <option value="">All states</option>
          {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={archetypeFilter} onChange={(e) => setArchetypeFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
          <option value="">All archetypes</option>
          {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-xs bg-white">
          <option value="">All tiers</option>
          <option value="1">Tier 1</option>
          <option value="2">Tier 2</option>
          <option value="3">Tier 3</option>
        </select>
        {(search || roleFilter !== 'all' || stateFilter || archetypeFilter || tierFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter('all'); setStateFilter(''); setArchetypeFilter(''); setTierFilter(''); }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} of {counts.total} shown</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead className="bg-slate-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Role</th>
              <th className="px-4 py-2 text-left font-medium">Geography</th>
              <th className="px-4 py-2 text-left font-medium">States</th>
              <th className="px-4 py-2 text-left font-medium">Tier</th>
              <th className="px-4 py-2 text-left font-medium">Archetype</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-left font-medium">Last meeting</th>
              <th className="px-4 py-2 text-center font-medium">Mtgs</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                {counts.total === 0 ? 'No counterparties yet. Click "+ New counterparty" to add one.' : 'No counterparties match these filters.'}
              </td></tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openEdit(row)}
                  className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                >
                  <td className="px-4 py-2.5">
                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                    {row.parent_owner && <div className="text-[11px] text-gray-500">{row.parent_owner}</div>}
                  </td>
                  <td className="px-4 py-2.5"><RoleBadge row={row} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{row.geography || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">
                    {(row.states || []).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.states.map((s) => (
                          <span key={s} className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">{s}</span>
                        ))}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{row.tier ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{row.archetype || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{row.status || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{fmtDateShort(row.last_meeting_date) || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-xs text-center text-gray-600">{row.meeting_count || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CounterpartyDrawer
        open={drawerOpen}
        initial={drawerInitial}
        isNew={drawerIsNew}
        onClose={closeDrawer}
        onSaved={() => { closeDrawer(); load(); }}
        onDeleted={() => { closeDrawer(); load(); }}
      />
    </div>
  );
}
