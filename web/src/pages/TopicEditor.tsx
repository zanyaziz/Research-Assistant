import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsApi, adaptersApi } from '../lib/api';

const BLANK_TOPIC = {
  name: '',
  description: '',
  enabled: true,
  schedule: '0 2 * * *',
  sources: [] as string[],
  source_config: {} as Record<string, any>,
  quality_criteria: {
    goodOutput: [] as string[],
    badOutput: [] as string[],
    outputFormat: 'structured_brief',
    maxLength: 2000,
    tone: 'analytical and data-driven',
  },
  tags: [] as string[],
};

export default function TopicEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(BLANK_TOPIC);
  const [adapters, setAdapters] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adaptersApi.list().then(setAdapters);
    if (!isNew && id) topicsApi.get(id).then(setForm);
  }, [id, isNew]);

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await topicsApi.create(form);
      } else {
        await topicsApi.update(id!, form);
      }
      navigate('/topics');
    } finally {
      setSaving(false);
    }
  };

  const toggleSource = (name: string) => {
    setForm((f) => ({
      ...f,
      sources: f.sources.includes(name) ? f.sources.filter((s) => s !== name) : [...f.sources, name],
    }));
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{isNew ? 'New Topic' : 'Edit Topic'}</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea className="w-full border rounded-lg px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cron Schedule</label>
          <input className="w-full border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} />
          <p className="text-xs text-gray-400 mt-1">e.g. "0 2 * * *" runs at 2 AM daily</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sources</label>
          <div className="flex flex-wrap gap-2">
            {adapters.map((a) => (
              <label key={a.name} className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={form.sources.includes(a.name)} onChange={() => toggleSource(a.name)} />
                <span className="text-sm font-medium">{a.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Output Tone</label>
          <input className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.quality_criteria.tone} onChange={(e) => setForm((f) => ({ ...f, quality_criteria: { ...f.quality_criteria, tone: e.target.value } }))} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Length (words)</label>
          <input type="number" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={form.quality_criteria.maxLength} onChange={(e) => setForm((f) => ({ ...f, quality_criteria: { ...f.quality_criteria, maxLength: parseInt(e.target.value) } }))} />
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={save} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Topic'}
          </button>
          <button onClick={() => navigate('/topics')} className="border px-6 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
