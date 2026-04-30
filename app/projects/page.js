'use client';

import { useEffect, useState, useCallback } from 'react';

const STATUSES = ['Active', 'On hold', 'Closed'];
const cn = (...xs) => xs.filter(Boolean).join(' ');

const STATUS_COLORS = {
  'Active':  'bg-emerald-100 text-emerald-800',
  'On hold': 'bg-amber-100 text-amber-800',
  'Closed':  'bg-slate-200 text-slate-700',
};

function ProjectRow({ project, onPatch, onDelete }) {
  const [editing, setEditing] = useState(project.__isDraft || false);
  const [draft, setDraft] = useState(project);
  const [error, setError] = useState('');

  useEffect(() => { if (!editing) setDraft(project); }, [project, editing]);

  async function save() {
    setError('');
    if (!draft.name?.trim()) { setError('Name is required.'); return; }
    const ok = await onPatch(draft);
    if (ok) setEditing(false);
    else setError('Save failed (name may already exist).');
  }

  if (editing) {
    return (
      <tr className="bg-blue-50 border-b border-blue-200">
        <td className="px-4 py-2">
          <input
            autoFocus
            value={draft.name || ''}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Project name *"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
        </td>
        <td className="px-4 py-2">
          <input
            value={draft.description || ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Description"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <select
            value={draft.status || 'Active'}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td className="px-4 py-2 text-xs text-gray-400 text-center">—</td>
        <td className="px-4 py-2">
          <div className="flex gap-1 justify-end">
            <button onClick={() => { if (project.__isDraft) onDelete(true); else { setDraft(project); setEditing(false); } }} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button onClick={save} className="px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">Save</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-slate-50">
      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{project.name}</td>
      <td className="px-4 py-2.5 text-xs text-gray-600">{project.description || <span className="text-gray-300">—</span>}</td>
      <td className="px-4 py-2.5">
        <span className={cn('inline-block px-2 py-0.5 rounded text-[10px] font-medium', STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-700')}>
          {project.status || 'Active'}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-center text-gray-600">{project.counterparty_count || 0}</td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1 justify-end">
          <button onClick={() => setEditing(true)} className="px-3 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</button>
          <button onClick={() => onDelete(false)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Delete</button>
        </div>
      </td>
    </tr>
  );
}

export default function ProjectsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/projects');
    const data = await r.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function addDraft() {
    setRows((prev) => [
      { id: `draft-${Date.now()}`, __isDraft: true, name: '', description: '', status: 'Active', counterparty_count: 0 },
      ...prev,
    ]);
  }

  async function patchRow(draft) {
    if (draft.__isDraft) {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.name, description: draft.description, status: draft.status }),
      });
      if (!res.ok) return false;
      load();
      return true;
    }
    const res = await fetch(`/api/projects/${draft.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: draft.name, description: draft.description, status: draft.status }),
    });
    if (!res.ok) return false;
    load();
    return true;
  }

  async function deleteRow(row, isDraftDiscard) {
    if (isDraftDiscard || row.__isDraft) {
      setRows((prev) => prev.filter((r) => r !== row));
      return;
    }
    const msg = row.counterparty_count
      ? `Delete project "${row.name}"? It is linked to ${row.counterparty_count} counterparties — those links will be removed.`
      : `Delete project "${row.name}"?`;
    if (!confirm(msg)) return;
    await fetch(`/api/projects/${row.id}`, { method: 'DELETE' });
    load();
  }

  const totalAssigned = rows.reduce((sum, r) => sum + (r.counterparty_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Projects / Deals</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {rows.filter((r) => !r.__isDraft).length} projects · {totalAssigned} counterparty assignments
            </p>
          </div>
          <button
            onClick={addDraft}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 shadow-sm"
          >
            + New project
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '46%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead className="bg-slate-50 border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Description</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
              <th className="px-4 py-2 text-center font-medium">Counterparties</th>
              <th className="px-4 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                No projects yet. Click "+ New project" to add one.
              </td></tr>
            ) : (
              rows.map((row) => (
                <ProjectRow
                  key={row.id}
                  project={row}
                  onPatch={patchRow}
                  onDelete={(isDraftDiscard) => deleteRow(row, isDraftDiscard)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
