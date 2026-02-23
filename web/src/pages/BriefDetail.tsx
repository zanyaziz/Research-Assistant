import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { briefsApi } from '../lib/api';

export default function BriefDetail() {
  const { id } = useParams<{ id: string }>();
  const [brief, setBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) briefsApi.get(id).then(setBrief).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!brief) return <div className="p-8 text-red-500">Brief not found.</div>;

  const content = brief.content || {};

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-2 text-sm text-gray-400">{brief.brief_date}</div>
      <h1 className="text-2xl font-bold mb-4">{brief.headline}</h1>

      <span className={`text-xs font-semibold px-2 py-1 rounded mb-6 inline-block ${brief.confidence === 'HIGH' ? 'bg-green-100 text-green-700' : brief.confidence === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
        Confidence: {brief.confidence}
      </span>

      {content.keyFindings?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Key Findings</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {content.keyFindings.map((f: string, i: number) => <li key={i}>{f}</li>)}
          </ul>
        </section>
      )}

      {content.analysis && (
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Analysis</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{content.analysis}</p>
        </section>
      )}

      {content.followUpQuestions?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Follow-up Questions</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
            {content.followUpQuestions.map((q: string, i: number) => <li key={i}>{q}</li>)}
          </ul>
        </section>
      )}

      {content.sources?.length > 0 && (
        <section className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Sources</h2>
          <ol className="list-decimal list-inside space-y-1">
            {content.sources.map((url: string, i: number) => (
              <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">{url}</a></li>
            ))}
          </ol>
        </section>
      )}

      {brief.sources?.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-2">Scraped Items ({brief.sources.length})</h2>
          <div className="space-y-3">
            {brief.sources.map((item: any) => (
              <div key={item.id} className="border rounded p-3 text-sm">
                <div className="font-medium mb-1">{item.title}</div>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all text-xs">{item.url}</a>
                <div className="text-gray-500 text-xs mt-1">{item.source_type} · {item.scraped_at}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
