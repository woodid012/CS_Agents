'use client';

export default function AIAgentsPage() {
  return (
    <div className="max-w-4xl">
      <h2 className="text-base font-semibold text-gray-700 mb-1">AI Agent Architecture</h2>
      <p className="text-xs text-gray-400 mb-6">
        How autonomous AI agents power the CS Capital CRM platform.
      </p>

      {/* Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Platform Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-700 mb-1">1. Master Bidder List</div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              191 potential acquirers for Australian renewable energy assets. Each bidder is enriched with
              AI-generated insights (recent M&A activity, deal sizes, appetite signals, FIRB risk) and scored
              A-F based on likelihood to transact. Users can accept/reject AI recommendations to build a
              curated shortlist for any transaction.
            </p>
          </div>
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="text-xs font-semibold text-green-700 mb-1">2. Development Pipeline Tracker</div>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              Kanban-style view tracking renewable energy projects from Announcement through to Operating.
              Sources: AEMO Generation Information (quarterly), KCI Connection Register, and OpenNEM.
              Includes timeline chart showing MW capacity and project count by expected commissioning year,
              filterable by region, technology, and stage.
            </p>
          </div>
        </div>
      </div>

      {/* Agent Ontology */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">AI Agent Ontology</h3>
        <p className="text-[11px] text-gray-500 mb-4">
          Each agent operates autonomously on a schedule or trigger, with defined inputs, outputs, and data flows.
        </p>

        <div className="space-y-3">
          {/* Agent 1 */}
          <AgentCard
            name="Market Intelligence Agent"
            schedule="Weekly"
            trigger="New AEMO data release / News trigger"
            color="blue"
            description="Monitors Australian renewable energy news, deal announcements, AEMO updates, and regulatory changes. Enriches bidder profiles with latest M&A activity and appetite signals."
            inputs={['AEMO Generation Information (quarterly Excel)', 'Google News / industry feeds', 'ASX announcements', 'FIRB decisions register']}
            outputs={['Updated AI Insights per bidder', 'New bidder suggestions', 'Deal activity alerts', 'FIRB risk flags']}
            dataFlow="News feeds → NLP extraction → Bidder matching → AI Insights JSON → CRM dashboard"
          />

          {/* Agent 2 */}
          <AgentCard
            name="Bidder Scoring Agent"
            schedule="On-demand (after Market Intelligence Agent runs)"
            trigger="Updated insights or new bidder added"
            color="emerald"
            description="Re-scores all bidders A-F based on weighted factors: recent Aus deal activity, portfolio size, stated appetite, capital availability, FIRB risk, and technology alignment."
            inputs={['AI Insights (enriched text)', 'Deal database (amounts, dates, types)', 'FIRB outcomes', 'Bidder stated preferences']}
            outputs={['AI Score (A-F) per bidder', 'Score reason narrative', 'Tier upgrade/downgrade recommendations']}
            dataFlow="Insights JSON → Factor extraction → Weighted scoring model → ai-tier-scores.json → Dashboard"
          />

          {/* Agent 3 */}
          <AgentCard
            name="Pipeline Tracker Agent"
            schedule="Quarterly (aligned with AEMO releases)"
            trigger="New AEMO Generation Information Excel published"
            color="amber"
            description="Downloads and parses AEMO Generation Information Excel, KCI connection register, and OpenNEM data. Categorises projects by stage, maps developers to bidder list entries, and detects stage transitions."
            inputs={['AEMO Gen Info Excel (quarterly)', 'KCI Connection Application register', 'OpenNEM operating/construction list', 'Previous pipeline snapshot']}
            outputs={['Updated project pipeline (all stages)', 'Stage transition alerts (e.g. Committed → Construction)', 'New project announcements', 'Developer-to-bidder mapping']}
            dataFlow="AEMO Excel → Parser → Stage classification → Delta detection → Pipeline JSON → Kanban + Chart"
          />

          {/* Agent 4 */}
          <AgentCard
            name="Transaction Matchmaker Agent"
            schedule="On-demand (user triggers for a specific asset/transaction)"
            trigger="User names a transaction and defines asset parameters"
            color="purple"
            description="Given a specific asset for sale (technology, capacity, region, stage, price expectations), ranks all bidders by fit. Considers technology preference, geographic focus, capital availability, recent activity, and strategic alignment."
            inputs={['Transaction parameters (tech, MW, region, stage)', 'Bidder profiles + AI scores', 'Bidder stated preferences (from CS Insights)', 'Recent deal patterns']}
            outputs={['Ranked bidder shortlist for the transaction', 'Fit score per bidder', 'Recommended outreach sequence (Tier 1 first)', 'Potential deal structure suggestions']}
            dataFlow="Transaction brief → Bidder filter → Multi-factor ranking → Shortlist export → Outreach tracker"
          />

          {/* Agent 5 */}
          <AgentCard
            name="Outreach & Engagement Agent"
            schedule="Daily (monitors responses)"
            trigger="Transaction shortlist finalised / email sent"
            color="red"
            description="Tracks engagement status for each bidder in an active transaction: outreach sent, receipt acknowledged, interest confirmed, call scheduled. Generates follow-up reminders and escalation alerts."
            inputs={['Transaction shortlist', 'Email send/open/reply events', 'Calendar invites', 'User-logged call notes']}
            outputs={['Engagement status per bidder (pipeline view)', 'Follow-up reminder queue', 'Weekly engagement summary report', 'Drop-off alerts (no response after X days)']}
            dataFlow="Shortlist → Email integration → Event tracking → Status updates → Engagement dashboard"
          />
        </div>
      </div>

      {/* Data Flow Diagram */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Data Flow</h3>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          <FlowBox label="External Sources" sub="AEMO, OpenNEM, News, FIRB" color="gray" />
          <Arrow />
          <FlowBox label="Market Intelligence Agent" sub="Parse, extract, enrich" color="blue" />
          <Arrow />
          <FlowBox label="Data Store" sub="JSON files (insights, scores, pipeline)" color="slate" />
          <Arrow />
          <FlowBox label="Scoring Agent" sub="Weight, rank, classify A-F" color="emerald" />
          <Arrow />
          <FlowBox label="CRM Dashboard" sub="Bidder List + Pipeline + Charts" color="indigo" />
          <Arrow />
          <FlowBox label="Transaction Agent" sub="Match, rank, shortlist" color="purple" />
          <Arrow />
          <FlowBox label="Outreach Agent" sub="Track, remind, report" color="red" />
        </div>
      </div>

      {/* Future Enhancements */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Roadmap</h3>
        <div className="space-y-2">
          <RoadmapItem status="done" label="Master Bidder List with AI Insights + Accept/Reject" />
          <RoadmapItem status="done" label="AI Tier Scoring (A-F) with rationale" />
          <RoadmapItem status="done" label="Development Pipeline Tracker (Kanban + Timeline Chart)" />
          <RoadmapItem status="done" label="CSV/Excel export with AI enrichment" />
          <RoadmapItem status="next" label="Live AEMO data ingestion (replace mock data)" />
          <RoadmapItem status="next" label="Automated bidder re-scoring on new intelligence" />
          <RoadmapItem status="planned" label="Transaction Matchmaker — ranked shortlists per deal" />
          <RoadmapItem status="planned" label="Email integration for outreach tracking" />
          <RoadmapItem status="planned" label="Multi-user access with role-based permissions" />
          <RoadmapItem status="planned" label="OpenNEM API integration for real-time operating data" />
        </div>
      </div>
    </div>
  );
}

function AgentCard({ name, schedule, trigger, color, description, inputs, outputs, dataFlow }) {
  const borderColor = {
    blue: 'border-l-blue-500',
    emerald: 'border-l-emerald-500',
    amber: 'border-l-amber-500',
    purple: 'border-l-purple-500',
    red: 'border-l-red-500',
  }[color] || 'border-l-gray-500';

  return (
    <div className={`border border-gray-200 border-l-4 ${borderColor} rounded-lg p-3`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="text-xs font-bold text-gray-800">{name}</div>
        <div className="flex gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{schedule}</span>
        </div>
      </div>
      <p className="text-[11px] text-gray-600 mb-2">{description}</p>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="font-semibold text-gray-500 mb-0.5">Inputs</div>
          <ul className="text-gray-500 space-y-0.5">
            {inputs.map((i, idx) => <li key={idx} className="leading-tight">&bull; {i}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-500 mb-0.5">Outputs</div>
          <ul className="text-gray-500 space-y-0.5">
            {outputs.map((o, idx) => <li key={idx} className="leading-tight">&bull; {o}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-semibold text-gray-500 mb-0.5">Data Flow</div>
          <p className="text-gray-500 leading-tight">{dataFlow}</p>
        </div>
      </div>
    </div>
  );
}

function FlowBox({ label, sub, color }) {
  const bg = {
    gray: 'bg-gray-50 border-gray-300',
    blue: 'bg-blue-50 border-blue-300',
    slate: 'bg-slate-50 border-slate-300',
    emerald: 'bg-emerald-50 border-emerald-300',
    indigo: 'bg-indigo-50 border-indigo-300',
    purple: 'bg-purple-50 border-purple-300',
    red: 'bg-red-50 border-red-300',
  }[color] || 'bg-gray-50 border-gray-300';

  return (
    <div className={`border rounded-lg px-3 py-2 min-w-[120px] text-center shrink-0 ${bg}`}>
      <div className="text-[11px] font-semibold text-gray-700">{label}</div>
      <div className="text-[9px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center shrink-0 text-gray-300 self-center">
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  );
}

function RoadmapItem({ status, label }) {
  const icon = {
    done: { bg: 'bg-green-100 text-green-600', symbol: '\u2713' },
    next: { bg: 'bg-blue-100 text-blue-600', symbol: '\u2192' },
    planned: { bg: 'bg-gray-100 text-gray-400', symbol: '\u25CB' },
  }[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${icon.bg}`}>
        {icon.symbol}
      </span>
      <span className={`text-xs ${status === 'planned' ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
    </div>
  );
}
