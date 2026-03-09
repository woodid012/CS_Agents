import marketData from '../../../data/australia-market.json';
import capexData from '../../../data/capex-data.json';

export async function GET() {
  const payload = {
    market: marketData,
    capex: capexData,
    meta: {
      generatedAt: new Date().toISOString(),
      sources: [
        'australia-market.json (last enriched March 2026)',
        'capex-data.json (last enriched March 2026)',
      ],
    },
  };

  return Response.json(payload);
}
