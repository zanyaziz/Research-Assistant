import { useEffect, useState } from 'react';
import { topicsApi } from '../lib/api';
import PipelineOverlay from '../components/PipelineOverlay';

export default function TopicList() {
  const [topics, setTopics] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<{ runId: string; topicName: string } | null>(null);

  useEffect(() => {
    topicsApi.list().then(setTopics);
  }, []);

  const toggleEnabled = async (topic: any) => {
    const updated = await topicsApi.update(topic.id, { enabled: !topic.enabled });
    setTopics((prev) => prev.map((t) => (t.id === topic.id ? updated : t)));
  };

  const triggerRun = async (topic: any) => {
    setRunning(topic.id);
    try {
      const { runId } = await topicsApi.runNow(topic.id);
      setActiveRun({ runId, topicName: topic.name });
    } catch (err: any) {
      alert(`Failed to start run: ${err.message}`);
      setRunning(null);
    }
  };

  const handleOverlayClose = () => {
    setRunning(null);
    setActiveRun(null);
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    await topicsApi.delete(id);
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Topics</h1>
        <a href="/topics/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">+ New Topic</a>
      </div>

      {topics.length === 0 ? (
        <div className="text-gray-400 text-center py-16">No topics yet. Create one to start researching.</div>
      ) : (
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="border rounded-lg p-4 flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" checked={topic.enabled} onChange={() => toggleEnabled(topic)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
              </label>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{topic.name}</h3>
                <p className="text-xs text-gray-400">{topic.schedule} · {(topic.sources || []).join(', ')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => triggerRun(topic)}
                  disabled={running !== null}
                  className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                >
                  {running === topic.id ? 'Running…' : 'Run Now'}
                </button>
                <a href={`/topics/${topic.id}`} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Edit</a>
                <button onClick={() => deleteTopic(topic.id)} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeRun && (
        <PipelineOverlay
          runId={activeRun.runId}
          topicName={activeRun.topicName}
          onClose={handleOverlayClose}
        />
      )}
    </div>
  );
}
