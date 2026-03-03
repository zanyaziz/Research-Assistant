import { useEffect, useRef } from 'react';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  ts: string;
}

const levelClass: Record<LogEntry['level'], string> = {
  info: 'text-gray-300',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

const levelLabel: Record<LogEntry['level'], string> = {
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

interface Props {
  logs: LogEntry[];
}

export default function LogConsole({ logs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function formatTime(ts: string) {
    try {
      return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
    } catch {
      return ts;
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-y-auto font-mono text-xs leading-relaxed" style={{ height: '220px' }}>
      {logs.length === 0 ? (
        <div className="text-gray-600 p-3">Waiting for output…</div>
      ) : (
        <div className="p-3 space-y-0.5">
          {logs.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 flex-shrink-0">{formatTime(entry.ts)}</span>
              <span className={`flex-shrink-0 font-semibold ${levelClass[entry.level]}`}>
                {levelLabel[entry.level]}
              </span>
              <span className={`${levelClass[entry.level]} break-all`}>{entry.message}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}
