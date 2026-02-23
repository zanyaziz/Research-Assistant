import { useEffect, useState } from 'react';
import { briefsApi, digestsApi } from '../lib/api';

export default function Dashboard() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [digest, setDigest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([briefsApi.today(), digestsApi.latest().catch(() => null)])
      .then(([b, d]) => { setBriefs(b); setDigest(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Daily Research Brief</h1>
      <p className="text-gray-500 mb-6">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      {digest && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-blue-800 mb-2">Today's Digest</h2>
          <pre className="text-sm text-blue-700 whitespace-pre-wrap">{digest.summary}</pre>
        </div>
      )}

      {briefs.length === 0 ? (
        <div className="text-gray-400 text-center py-16">No briefs for today yet. Trigger a topic run to generate one.</div>
      ) : (
        <div className="space-y-6">
          {briefs.map((brief) => (
            <div key={brief.id} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${brief.confidence === 'HIGH' ? 'bg-green-100 text-green-700' : brief.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {brief.confidence}
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-3">{brief.headline}</h2>
              {brief.content?.keyFindings && (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-3">
                  {brief.content.keyFindings.map((f: string, i: number) => <li key={i}>{f}</li>)}
                </ul>
              )}
              <a href={`/briefs/${brief.id}`} className="text-blue-600 text-sm hover:underline">View full brief →</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
