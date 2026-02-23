import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { topicsApi, adaptersApi } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdapterProp {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  items?: { type: string };
}

interface Adapter {
  name: string;
  description: string;
  configSchema: {
    properties: Record<string, AdapterProp>;
    required?: string[];
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCHEDULE_PRESETS = [
  { label: 'Daily 2 AM', value: '0 2 * * *' },
  { label: 'Daily 8 AM', value: '0 8 * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Weekly Mon', value: '0 8 * * 1' },
];

const ADAPTER_DEFAULTS: Record<string, Record<string, any>> = {
  google: { queries: [], maxResults: 10, dateRestrict: 'm1' },
  reddit: { subreddits: [], sort: 'new', maxPosts: 20 },
  web: { urls: [], respectRobots: true },
  twitter: { usernames: [], hashtags: [] },
  zillow: {},
  loopnet: {},
  bizbuysell: {},
};

const GOOD_OUTPUT_EXAMPLES = [
  'Specific funding amounts (e.g. $50M Series B)',
  'Named investors and lead partners',
  'Company valuations and growth metrics',
  'Price ranges and market data',
  'Expert quotes with attribution',
  'Regulatory or policy changes',
  'Comparative data vs prior period',
  'Deal terms and equity stakes',
];

const BAD_OUTPUT_EXAMPLES = [
  'Generic opinions without supporting data',
  'Duplicate content from multiple sources',
  'Press releases with no third-party analysis',
  'Social media posts with no context',
  'Content older than 30 days',
  'Paywalled articles with no accessible content',
  'Off-topic or tangentially related articles',
  'Unverified speculation or rumour',
];

const TONE_PRESETS = [
  'analytical and data-driven',
  'concise and actionable',
  'neutral and balanced',
  'investment-focused',
  'technical and detailed',
  'executive summary style',
];

const OUTPUT_FORMATS = [
  { value: 'structured_brief', label: 'Structured Brief (default)' },
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'bullet_points', label: 'Bullet Points' },
  { value: 'narrative', label: 'Narrative Report' },
];

const DATE_RESTRICT_OPTIONS = [
  { value: '', label: 'No limit' },
  { value: 'd1', label: 'Past 24 hours' },
  { value: 'w1', label: 'Past week' },
  { value: 'm1', label: 'Past month' },
  { value: 'y1', label: 'Past year' },
];

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

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs cursor-help ml-1 shrink-0"
      title={text}
    >
      ?
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
      {children}
    </label>
  );
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({
  values,
  onChange,
  placeholder,
  monospace = false,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  monospace?: boolean;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft('');
  };

  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${monospace ? 'font-mono' : ''}`}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm hover:bg-blue-100 whitespace-nowrap"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm ${monospace ? 'font-mono text-xs' : ''}`}
            >
              {v}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-400 hover:text-red-500 leading-none font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CriteriaInput ────────────────────────────────────────────────────────────

function CriteriaInput({
  label,
  tooltip,
  values,
  onChange,
  examples,
  variant,
}: {
  label: string;
  tooltip: string;
  values: string[];
  onChange: (v: string[]) => void;
  examples: string[];
  variant: 'good' | 'bad';
}) {
  const dotClass = variant === 'good' ? 'bg-green-400' : 'bg-red-400';
  const pillClass =
    variant === 'good'
      ? 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40'
      : 'border-red-200 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-40';

  return (
    <div>
      <FieldLabel>
        <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${dotClass}`} />
        {label}
        <Tip text={tooltip} />
      </FieldLabel>
      <TagInput values={values} onChange={onChange} placeholder="Type a criterion and press Enter…" />
      <div className="mt-2">
        <p className="text-xs text-gray-400 mb-1.5">Suggestions — click to add:</p>
        <div className="flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={values.includes(ex)}
              onClick={() => onChange([...values, ex])}
              className={`text-xs px-2.5 py-1 rounded-full border ${pillClass}`}
            >
              + {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SourceConfigPanel ────────────────────────────────────────────────────────

function SourceConfigPanel({
  adapter,
  config,
  onChange,
}: {
  adapter: Adapter;
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  const props = adapter.configSchema?.properties || {};
  const required = adapter.configSchema?.required || [];
  const set = (key: string, value: any) => onChange({ ...config, [key]: value });

  return (
    <div className="mt-3 pl-4 border-l-2 border-blue-100 space-y-4 pb-1">
      {Object.entries(props).map(([key, schema]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (c) => c.toUpperCase());
        const isReq = required.includes(key);
        const desc = schema.description || '';

        // Array → TagInput
        if (schema.type === 'array') {
          const isUrl = key.toLowerCase().includes('url');
          const isQuery = key.toLowerCase().includes('quer');
          const isSub = key.toLowerCase().includes('subreddit');
          const placeholder = isUrl
            ? 'https://example.com — press Enter'
            : isQuery
            ? '"Dubai real estate 2026" — press Enter'
            : isSub
            ? 'investing — press Enter (without r/)'
            : `Add ${label.toLowerCase()} and press Enter`;
          return (
            <div key={key}>
              <FieldLabel>
                {label}
                {isReq && <span className="ml-1 text-red-400 text-xs">required</span>}
                {desc && <Tip text={desc} />}
              </FieldLabel>
              <TagInput
                values={config[key] || []}
                onChange={(v) => set(key, v)}
                placeholder={placeholder}
                monospace={isUrl}
              />
            </div>
          );
        }

        // Special: dateRestrict on google adapter
        if (adapter.name === 'google' && key === 'dateRestrict') {
          return (
            <div key={key}>
              <FieldLabel>
                {label}
                <Tip text="Limit results to articles published within this window. 'Past month' is recommended for most topics." />
              </FieldLabel>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={config[key] ?? 'm1'}
                onChange={(e) => set(key, e.target.value)}
              >
                {DATE_RESTRICT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        // Enum → select
        if (schema.enum) {
          return (
            <div key={key}>
              <FieldLabel>
                {label}
                {desc && <Tip text={desc} />}
              </FieldLabel>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={config[key] ?? schema.default ?? ''}
                onChange={(e) => set(key, e.target.value)}
              >
                {schema.enum.map((v: string) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        // Number → input
        if (schema.type === 'number') {
          return (
            <div key={key}>
              <FieldLabel>
                {label}
                {desc && <Tip text={desc} />}
              </FieldLabel>
              <input
                type="number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={config[key] ?? schema.default ?? 0}
                onChange={(e) => set(key, parseInt(e.target.value, 10))}
              />
            </div>
          );
        }

        // Boolean → checkbox
        if (schema.type === 'boolean') {
          return (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded"
                checked={config[key] ?? schema.default ?? false}
                onChange={(e) => set(key, e.target.checked)}
              />
              <span className="text-sm text-gray-700">{label}</span>
              {desc && <Tip text={desc} />}
            </label>
          );
        }

        // Fallback: text input
        return (
          <div key={key}>
            <FieldLabel>
              {label}
              {isReq && <span className="ml-1 text-red-400 text-xs">required</span>}
              {desc && <Tip text={desc} />}
            </FieldLabel>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={config[key] ?? schema.default ?? ''}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── TopicEditor ──────────────────────────────────────────────────────────────

export default function TopicEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();

  const [form, setForm] = useState(BLANK_TOPIC);
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adaptersApi.list().then(setAdapters);
    if (!isNew && id) topicsApi.get(id).then((t: any) => setForm(t));
  }, [id, isNew]);

  const setQC = (patch: Partial<typeof form.quality_criteria>) =>
    setForm((f) => ({ ...f, quality_criteria: { ...f.quality_criteria, ...patch } }));

  const toggleSource = (name: string) => {
    setForm((f) => {
      const active = f.sources.includes(name);
      return {
        ...f,
        sources: active ? f.sources.filter((s) => s !== name) : [...f.sources, name],
        // Initialise defaults the first time an adapter is enabled;
        // preserve existing config when re-enabling.
        source_config: active
          ? f.source_config
          : {
              ...f.source_config,
              [name]: f.source_config[name] ?? ADAPTER_DEFAULTS[name] ?? {},
            },
      };
    });
  };

  const setSourceConfig = (name: string, cfg: Record<string, any>) =>
    setForm((f) => ({ ...f, source_config: { ...f.source_config, [name]: cfg } }));

  const save = async () => {
    if (!form.name.trim()) { setError('Topic name is required.'); return; }
    if (form.sources.length === 0) { setError('Select at least one data source.'); return; }
    setError('');
    setSaving(true);
    try {
      if (isNew) await topicsApi.create(form);
      else await topicsApi.update(id!, form);
      navigate('/topics');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">{isNew ? 'New Topic' : 'Edit Topic'}</h1>

      <div className="space-y-10">

        {/* ── 1. Basic Info ── */}
        <section>
          <SectionHeader
            title="Basic Information"
            subtitle="Give your topic a clear name and describe what the brief should cover."
          />
          <div className="space-y-4">
            <div>
              <FieldLabel>
                Name
                <span className="ml-1 text-red-400 text-xs">required</span>
                <Tip text="A short, recognisable label shown in the topic list and brief archive." />
              </FieldLabel>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Dubai Real Estate Market"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <FieldLabel>
                Research Brief Instructions
                <Tip text="Describe what the AI analyst should focus on and what questions to answer. The more specific, the better the brief." />
              </FieldLabel>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32 resize-y text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Analyse the Dubai residential real estate market for Q1 2026. Focus on price trends, rental yields, flagship project handovers, and investor profiles. Compare against 2024–2025 peak performance."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── 2. Schedule ── */}
        <section>
          <SectionHeader
            title="Schedule"
            subtitle="When should this topic run automatically? Uses standard cron syntax (minute hour day month weekday)."
          />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, schedule: p.value }))}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    form.schedule === p.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div>
              <FieldLabel>
                Cron Expression
                <Tip text="5-field cron: minute hour day-of-month month day-of-week. Example: '0 2 * * *' = daily at 2:00 AM." />
              </FieldLabel>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.schedule}
                onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── 3. Data Sources ── */}
        <section>
          <SectionHeader
            title="Data Sources"
            subtitle="Choose which adapters fetch content for this topic, then configure each one."
          />
          {adapters.length === 0 && (
            <p className="text-sm text-gray-400 italic">Loading adapters…</p>
          )}
          <div className="space-y-3">
            {adapters.map((a) => {
              const active = form.sources.includes(a.name);
              return (
                <div
                  key={a.name}
                  className={`border rounded-xl transition-colors ${
                    active ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  <label className="flex items-start gap-3 p-4 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded"
                      checked={active}
                      onChange={() => toggleSource(a.name)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{a.name}</span>
                        {active && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            enabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                    </div>
                  </label>

                  {active && a.configSchema?.properties && (
                    <div className="px-4 pb-4">
                      <SourceConfigPanel
                        adapter={a}
                        config={form.source_config[a.name] || {}}
                        onChange={(cfg) => setSourceConfig(a.name, cfg)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 4. Quality Criteria ── */}
        <section>
          <SectionHeader
            title="Quality Criteria"
            subtitle="Tell the AI what makes a good or bad result, and how to format the output brief."
          />
          <div className="space-y-6">
            <CriteriaInput
              label="Good Output"
              tooltip="Characteristics the AI should prioritise and reward with a higher quality score during analysis."
              values={form.quality_criteria.goodOutput}
              onChange={(v) => setQC({ goodOutput: v })}
              examples={GOOD_OUTPUT_EXAMPLES}
              variant="good"
            />

            <CriteriaInput
              label="Bad Output"
              tooltip="Characteristics the AI should penalise or skip. Be specific to reduce noise in the brief."
              values={form.quality_criteria.badOutput}
              onChange={(v) => setQC({ badOutput: v })}
              examples={BAD_OUTPUT_EXAMPLES}
              variant="bad"
            />

            <div>
              <FieldLabel>
                Tone
                <Tip text="The writing style of the synthesised brief. Select a preset or type your own." />
              </FieldLabel>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. analytical and data-driven"
                value={form.quality_criteria.tone}
                onChange={(e) => setQC({ tone: e.target.value })}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {TONE_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQC({ tone: t })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.quality_criteria.tone === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>
                  Output Format
                  <Tip text="How the AI structures the final brief. 'Structured Brief' is recommended for most topics." />
                </FieldLabel>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.quality_criteria.outputFormat}
                  onChange={(e) => setQC({ outputFormat: e.target.value })}
                >
                  {OUTPUT_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel>
                  Max Length (words)
                  <Tip text="Target word count for the synthesised brief. 1500–2500 is typical. Increase for deeper reports." />
                </FieldLabel>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.quality_criteria.maxLength}
                  onChange={(e) => setQC({ maxLength: parseInt(e.target.value, 10) })}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
          >
            {saving ? 'Saving…' : isNew ? 'Create Topic' : 'Save Changes'}
          </button>
          <button
            onClick={() => navigate('/topics')}
            className="border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
          >
            Cancel
          </button>
          {error && <p className="text-sm text-red-500 ml-1">{error}</p>}
        </div>

      </div>
    </div>
  );
}
