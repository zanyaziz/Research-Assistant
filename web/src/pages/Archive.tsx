import { useEffect, useState } from 'react';
import { briefsApi, searchApi } from '../lib/api';

export default function Archive() {
  const [briefs, setBriefs] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    briefsApi.list().then(setBriefs).finally(() => setLoading(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      briefsApi.list().then(setBriefs);
      return;
    }
    setLoading(true);
    searchApi.search(query).then(setBriefs).finally(() => setLoading(false));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Research Archive</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Search briefs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Search</button>
      </form>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : briefs.length === 0 ? (
        <div className="text-gray-400 text-center py-16">No briefs found.</div>
      ) : (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <a key={brief.id} href={`/briefs/${brief.id}`} className="block border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{brief.brief_date}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${brief.confidence === 'HIGH' ? 'bg-green-100 text-green-700' : brief.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {brief.confidence}
                </span>
              </div>
              <h3 className="font-semibold">{brief.headline}</h3>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
