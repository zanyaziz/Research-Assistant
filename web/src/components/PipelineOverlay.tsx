import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StepList, { type StepState } from './StepList';
import LogConsole from './LogConsole';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  ts: string;
}

interface Props {
  runId: string;
  topicName: string;
  onClose: () => void;
}

// Weighted contribution of each step to the overall 0-100% bar
const WEIGHTS: Record<number, number> = { 1: 25, 2: 5, 3: 5, 4: 55, 5: 10 };

function computeOverall(steps: Record<number, StepState>): number {
  return Object.entries(WEIGHTS).reduce((acc, [stepStr, weight]) => {
    const pct = steps[Number(stepStr)]?.pct ?? 0;
    return acc + (weight * pct) / 100;
  }, 0);
}

export default function PipelineOverlay({ runId, topicName, onClose }: Props) {
  const [steps, setSteps] = useState<Record<number, StepState>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [overall, setOverall] = useState(0);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/runs/${runId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === 'step') {
          setSteps((prev) => {
            const next = {
              ...prev,
              [event.step]: {
                status: event.status,
                pct: event.pct,
                detail: event.detail,
              } as StepState,
            };
            setOverall(Math.round(computeOverall(next)));
            return next;
          });
        } else if (event.type === 'log') {
          setLogs((prev) => [...prev, { level: event.level, message: event.message, ts: event.ts }]);
        } else if (event.type === 'done') {
          setOverall(100);
          setIsDone(true);
          // If briefId is empty (fast-run race), fetch from run record
          if (event.briefId) {
            setBriefId(event.briefId);
          } else {
            fetch(`/api/runs/${runId}`)
              .then((r) => r.json())
              .then((run) => {
                if (run.brief_id) setBriefId(run.brief_id);
              })
              .catch(() => {});
          }
          es.close();
        } else if (event.type === 'error') {
          setErrorMsg(event.message);
          setLogs((prev) => [...prev, { level: 'error', message: event.message, ts: new Date().toISOString() }]);
          es.close();
        }
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource will auto-reconnect — don't surface transient errors
    };

    return () => {
      es.close();
    };
  }, [runId]);

  const overallBarColor = errorMsg ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-blue-500';

  const panel = (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Pipeline Progress</h2>
            <p className="text-xs text-gray-500 truncate max-w-[320px]">{topicName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none font-bold px-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Overall bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span className="font-medium">
                {errorMsg ? 'Failed' : isDone ? 'Complete' : 'Running…'}
              </span>
              <span className="font-mono">{overall}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overallBarColor}`}
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>

          {/* Step list */}
          <StepList steps={steps} />

          {/* Console */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Console</h3>
            <LogConsole logs={logs} />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex gap-3 justify-end bg-gray-50">
          {isDone && briefId && (
            <a
              href={`/briefs/${briefId}`}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              View Brief →
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
