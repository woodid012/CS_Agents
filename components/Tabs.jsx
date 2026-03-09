'use client';

export default function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-0 border-b border-gray-200 mb-6">
      {tabs.map(({ id, label, count }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
            activeTab === id
              ? 'border-blue-600 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {label}
          {count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
              activeTab === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
