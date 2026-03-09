'use client';

import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  'Deal Opportunity',
  'CRM Improvement',
  'Market Intelligence',
  'Process Improvement',
  'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUSES = ['New', 'Under Review', 'In Progress', 'Done'];

const STATUS_API = {
  New: 'new',
  'Under Review': 'under_review',
  'In Progress': 'in_progress',
  Done: 'done',
};

const API_STATUS_LABEL = {
  new: 'New',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  done: 'Done',
};

const CATEGORY_COLORS = {
  'Deal Opportunity':    { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  'CRM Improvement':     { bg: 'bg-purple-100',  text: 'text-purple-800', border: 'border-purple-200' },
  'Market Intelligence': { bg: 'bg-emerald-100', text: 'text-emerald-800',border: 'border-emerald-200' },
  'Process Improvement': { bg: 'bg-amber-100',   text: 'text-amber-800',  border: 'border-amber-200' },
  'Other':               { bg: 'bg-slate-100',   text: 'text-slate-600',  border: 'border-slate-200' },
};

const PRIORITY_COLORS = {
  high:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  low:    { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400' },
};

const STATUS_COLORS = {
  new:          { bg: 'bg-sky-100',     text: 'text-sky-700' },
  under_review: { bg: 'bg-violet-100',  text: 'text-violet-700' },
  in_progress:  { bg: 'bg-amber-100',   text: 'text-amber-700' },
  done:         { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const EMPTY_FORM = {
  title: '',
  category: 'Deal Opportunity',
  description: '',
  submitted_by: '',
  priority: 'Medium',
};

function CategoryTag({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {category}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const p = PRIORITY_COLORS[priority?.toLowerCase()] || PRIORITY_COLORS.medium;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${p.bg} ${p.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'Medium'}
    </span>
  );
}

function StatusBadge({ status }) {
  const label = API_STATUS_LABEL[status] || 'New';
  const s = STATUS_COLORS[status] || STATUS_COLORS.new;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
      {label}
    </span>
  );
}

function IdeaCard({ idea, onUpvote, onStatusChange }) {
  const [upvoting, setUpvoting] = useState(false);
  const [votes, setVotes] = useState(idea.upvotes ?? 0);

  async function handleUpvote() {
    if (upvoting) return;
    setUpvoting(true);
    setVotes((v) => v + 1);
    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idea.id, action: 'upvote' }),
      });
      onUpvote(idea.id);
    } catch (_) {}
    setUpvoting(false);
  }

  async function handleStatusChange(e) {
    const newStatus = STATUS_API[e.target.value];
    try {
      await fetch('/api/ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: idea.id, status: newStatus }),
      });
      onStatusChange(idea.id, newStatus);
    } catch (_) {}
  }

  const dateStr = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const preview = idea.description
    ? idea.description.length > 140
      ? idea.description.slice(0, 140) + '…'
      : idea.description
    : '';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1">{idea.title}</h3>
        <button
          onClick={handleUpvote}
          disabled={upvoting}
          className="flex flex-col items-center gap-0.5 min-w-[40px] text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-60"
          title="Upvote"
        >
          <span className="text-base leading-none">👍</span>
          <span className="text-xs font-semibold text-gray-600">{votes}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 items-center">
        <CategoryTag category={idea.category} />
        <PriorityBadge priority={idea.priority} />
        <StatusBadge status={idea.status} />
      </div>

      {preview && (
        <p className="text-xs text-gray-500 leading-relaxed">{preview}</p>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          <span className="font-medium text-gray-500">{idea.submitted_by || 'Anonymous'}</span>
          {dateStr && <span> · {dateStr}</span>}
        </div>
        <select
          value={API_STATUS_LABEL[idea.status] || 'New'}
          onChange={handleStatusChange}
          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ideas');
      const data = await res.json();
      setIdeas(Array.isArray(data) ? data : []);
    } catch (_) {
      setIdeas([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, priority: form.priority.toLowerCase() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const newIdea = await res.json();
      setIdeas((prev) => [newIdea, ...prev]);
      setForm(EMPTY_FORM);
      setSuccess('Idea submitted!');
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  function handleUpvote(id) {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, upvotes: (i.upvotes ?? 0) + 1 } : i))
    );
  }

  function handleStatusChange(id, newStatus) {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i))
    );
  }

  const filtered = ideas.filter((i) => {
    if (filterCategory !== 'All' && i.category !== filterCategory) return false;
    if (filterStatus !== 'All' && (API_STATUS_LABEL[i.status] || 'New') !== filterStatus) return false;
    if (filterPriority !== 'All' && i.priority?.toLowerCase() !== filterPriority.toLowerCase()) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Ideas Board</h1>
            <p className="text-slate-400 text-sm mt-0.5">Internal idea submission and tracking for the CS Capital team</p>
          </div>
          <button
            onClick={() => { setShowForm((v) => !v); setError(''); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            {showForm ? 'Cancel' : 'Submit Idea'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Success toast */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Submit Form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Submit a New Idea</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Brief, descriptive title"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Provide context, rationale, or steps needed…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Submitted by</label>
                  <input
                    type="text"
                    value={form.submitted_by}
                    onChange={(e) => setForm((f) => ({ ...f, submitted_by: e.target.value }))}
                    placeholder="Your name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Idea'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Filter:</span>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option>All</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option>All</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
            >
              <option>All</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>

          <span className="ml-auto text-xs text-gray-400">{filtered.length} idea{filtered.length !== 1 ? 's' : ''}</span>

          {(filterCategory !== 'All' || filterStatus !== 'All' || filterPriority !== 'All') && (
            <button
              onClick={() => { setFilterCategory('All'); setFilterStatus('All'); setFilterPriority('All'); }}
              className="text-xs text-blue-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Ideas Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading ideas…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            {ideas.length === 0 ? 'No ideas yet. Be the first to submit one!' : 'No ideas match the current filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onUpvote={handleUpvote}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
