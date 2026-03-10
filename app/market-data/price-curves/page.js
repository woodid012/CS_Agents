'use client';

import { useState, useEffect } from 'react';
import { vintageLabel } from '../../../lib/vintageLabel';

function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// Extract the raw vintage key from the filename so vintageLabel() can format it
function vintageFromFilename(name) {
  // e.g. Aurora_August_24_AUS... → August_24
  //      Aurora_Q1_26_AUS...    → Q1_26
  const m = name.match(/^Aurora_(.+?)_AUS/i);
  return m ? m[1] : '';
}

export default function PriceCurvesPage() {
  const [files, setFiles] = useState(null);

  useEffect(() => {
    fetch('/api/price-curve-files')
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []));
  }, []);

  function download(filename) {
    window.location.href = `/api/price-curve-files?file=${encodeURIComponent(filename)}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Aurora Price Curve Repository</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aurora Energy Research — AUS Power &amp; Renewables Market Forecast files</p>
      </div>

      {!files ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No files found.</div>
      ) : (
        <div className="grid gap-4">
          {files.map((f) => {
            const vintage = vintageFromFilename(f.filename);
            const label = vintageLabel(vintage) || f.title;
            return (
              <div key={f.filename} className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-4 hover:border-blue-200 hover:shadow-sm transition-all">
                {/* Excel icon */}
                <div className="shrink-0 w-10 h-10 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">Aurora AUS Power Market Forecast</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                      {label}
                    </span>
                  </div>
                  {f.description && (
                    <p className="text-xs text-gray-500 mb-2">{f.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-2">
                    {f.release_date && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Released {fmtDate(f.release_date)}
                      </span>
                    )}
                    {f.prepared_by && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {f.prepared_by.split(',')[0].trim()}
                      </span>
                    )}
                    <span>{fmtSize(f.size_bytes)}</span>
                  </div>
                  {/* Available sheets */}
                  <div className="flex flex-wrap gap-1">
                    {(f.sheets || []).map((s) => (
                      <span key={s} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded border border-gray-200">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Download */}
                <button
                  onClick={() => download(f.filename)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
