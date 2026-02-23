import { useEffect, useState } from 'react';
import { settingsApi } from '../lib/api';

export default function Settings() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    settingsApi.get().then(setSettings);
  }, []);

  if (!settings) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-6">
        <section>
          <h2 className="font-semibold text-lg mb-3">LLM</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Provider</dt><dd className="font-mono">{settings.llm.provider}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Model</dt><dd className="font-mono">{settings.llm.model}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Temperature</dt><dd className="font-mono">{settings.llm.temperature}</dd></div>
          </dl>
        </section>
        <section>
          <h2 className="font-semibold text-lg mb-3">Scraping</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Rate Limit</dt><dd className="font-mono">{settings.scraping.rateLimitMs}ms</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">User Agent</dt><dd className="font-mono">{settings.scraping.userAgent}</dd></div>
            <div className="flex gap-2"><dt className="text-gray-500 w-32">Puppeteer</dt><dd className="font-mono">{settings.scraping.puppeteerHeadless ? 'headless' : 'visible'}</dd></div>
          </dl>
        </section>
        <p className="text-xs text-gray-400">Configure API keys and secrets in your .env file.</p>
      </div>
    </div>
  );
}
