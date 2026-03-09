'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const UPDATE_TYPES = [
  'Meeting Notes',
  'News/Market Update',
  'Call Summary',
  'Relationship Update',
  'Financial Update',
];

const UPDATE_TYPE_COLORS = {
  'Meeting Notes':      { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200' },
  'News/Market Update': { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-200' },
  'Call Summary':       { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'Relationship Update':{ bg: 'bg-emerald-100',text: 'text-emerald-800',border: 'border-emerald-200' },
  'Financial Update':   { bg: 'bg-rose-100',   text: 'text-rose-800',   border: 'border-rose-200' },
};

function StepIndicator({ step }) {
  const steps = [
    { n: 1, label: 'Raw Input' },
    { n: 2, label: 'AI Draft Review' },
    { n: 3, label: 'Confirmed' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step > s.n
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : step === s.n
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {step > s.n ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                s.n
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                step === s.n ? 'text-blue-700' : step > s.n ? 'text-emerald-700' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-3 ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function UpdateTypeButton({ type, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(type)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        selected
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
          : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      {type}
    </button>
  );
}

export default function SubmitInsightPage() {
  const [step, setStep] = useState(1);

  // Step 1 form
  const [bidders, setBidders] = useState([]);
  const [loadingBidders, setLoadingBidders] = useState(true);
  const [selectedOfftaker, setselectedOfftaker] = useState('');
  const [updateType, setUpdateType] = useState('Meeting Notes');
  const [infoDate, setInfoDate] = useState(new Date().toISOString().slice(0, 10));
  const [analystName, setAnalystName] = useState('');
  const [rawNotes, setRawNotes] = useState('');
  const [step1Error, setStep1Error] = useState('');

  // Step 2
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [rawExpanded, setRawExpanded] = useState(false);

  // Step 3
  const [savedInsight, setSavedInsight] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/offtakers')
      .then((r) => r.json())
      .then((data) => {
        setBidders(Array.isArray(data) ? data : []);
        setLoadingBidders(false);
      })
      .catch(() => setLoadingBidders(false));
  }, []);

  const selectedOfftakerObj = bidders.find((b) => String(b.no) === selectedOfftaker) || null;

  async function handleGenerateDraft() {
    if (!rawNotes.trim()) { setStep1Error('Please enter your raw notes.'); return; }
    setStep1Error('');
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/offtaker-insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offtakerName: selectedOfftakerObj?.name || '',
          updateType,
          rawNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft(data.draft || '');
      setStep(2);
    } catch (err) {
      setGenerateError(err.message);
    }
    setGenerating(false);
  }

  async function handleRegenerate() {
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch('/api/offtaker-insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offtakerName: selectedOfftakerObj?.name || '',
          updateType,
          rawNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setDraft(data.draft || '');
    } catch (err) {
      setGenerateError(err.message);
    }
    setGenerating(false);
  }

  async function handleSave() {
    if (!draft.trim()) { setSaveError('Draft insight cannot be empty.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offtakerNo: selectedOfftakerObj?.no || null,
          offtakerName: selectedOfftakerObj?.name || '',
          updateType,
          rawNotes,
          csInsight: draft,
          analystName,
          infoDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSavedInsight(data);
      setStep(3);
    } catch (err) {
      setSaveError(err.message);
    }
    setSaving(false);
  }

  function handleSubmitAnother() {
    setStep(1);
    setselectedOfftaker('');
    setUpdateType('Meeting Notes');
    setInfoDate(new Date().toISOString().slice(0, 10));
    setAnalystName('');
    setRawNotes('');
    setDraft('');
    setSavedInsight(null);
    setStep1Error('');
    setGenerateError('');
    setSaveError('');
  }

  const typeColors = UPDATE_TYPE_COLORS[updateType] || UPDATE_TYPE_COLORS['Meeting Notes'];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-white">Submit Analyst Insight</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Capture raw notes and generate an AI-refined CS Insight for the bidder record
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <StepIndicator step={step} />

        {/* â”€â”€ STEP 1: Raw Input â”€â”€ */}
        {step === 1 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">Raw Input</h2>

            {/* Offtaker selector */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bidder</label>
              <select
                value={selectedOfftaker}
                onChange={(e) => setselectedOfftaker(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                disabled={loadingBidders}
              >
                <option value="">{loadingBidders ? 'Loadingâ€¦' : 'â€” Select bidder â€”'}</option>
                {bidders.map((b) => (
                  <option key={b.no} value={String(b.no)}>
                    {b.name}{b.tier ? ` (Tier ${b.tier})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Update type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Update Type</label>
              <div className="flex flex-wrap gap-2">
                {UPDATE_TYPES.map((t) => (
                  <UpdateTypeButton
                    key={t}
                    type={t}
                    selected={updateType === t}
                    onClick={setUpdateType}
                  />
                ))}
              </div>
            </div>

            {/* Date + analyst */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date of Information</label>
                <input
                  type="date"
                  value={infoDate}
                  onChange={(e) => setInfoDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Analyst Name</label>
                <input
                  type="text"
                  value={analystName}
                  onChange={(e) => setAnalystName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Raw notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Raw Notes</label>
              <textarea
                rows={8}
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Paste your raw notes, meeting summary, or update hereâ€¦"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
              />
            </div>

            {step1Error && <p className="text-red-600 text-sm">{step1Error}</p>}
            {generateError && <p className="text-red-600 text-sm">{generateError}</p>}

            <div className="flex justify-end">
              <button
                onClick={handleGenerateDraft}
                disabled={generating}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generatingâ€¦
                  </>
                ) : (
                  'Generate CS Insight Draft'
                )}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ STEP 2: AI Draft Review â”€â”€ */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Raw notes collapsible */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setRawExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">Raw Notes</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${rawExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {rawExpanded && (
                <div className="px-5 pb-4 border-t border-gray-100">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed mt-3 font-sans">
                    {rawNotes}
                  </pre>
                </div>
              )}
            </div>

            {/* AI Draft */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-gray-900">AI Draft Insight</h2>
                  {selectedOfftakerObj && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}>
                      {updateType}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-60 transition-colors font-medium"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Regeneratingâ€¦
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Regenerate
                    </>
                  )}
                </button>
              </div>

              {selectedOfftakerObj && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{selectedOfftakerObj.name}</span>
                  {selectedOfftakerObj.tier && <span> Â· Tier {selectedOfftakerObj.tier}</span>}
                  {analystName && <span> Â· {analystName}</span>}
                  {infoDate && <span> Â· {new Date(infoDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                </div>
              )}

              <textarea
                rows={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y bg-blue-50 text-gray-900 leading-relaxed"
              />

              <p className="text-xs text-gray-400">Edit the draft directly before confirming.</p>

              {generateError && <p className="text-red-600 text-sm">{generateError}</p>}
              {saveError && <p className="text-red-600 text-sm">{saveError}</p>}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  â† Back to input
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Savingâ€¦
                    </>
                  ) : (
                    'Confirm & Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ STEP 3: Confirmation â”€â”€ */}
        {step === 3 && savedInsight && (
          <div className="bg-white border border-emerald-200 rounded-xl shadow-sm p-8 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">Insight Saved</h2>
              <p className="text-sm text-gray-500 mt-1">
                {savedInsight.offtaker_name || 'offtaker'} Â· {savedInsight.update_type}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-4 text-left">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">CS Insight</p>
              <p className="text-sm text-gray-800 leading-relaxed">{savedInsight.cs_insight}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/insights"
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
              >
                View All Insights
              </Link>
              <button
                onClick={handleSubmitAnother}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Submit Another
              </button>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Offtaker List
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

