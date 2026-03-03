interface StepState {
  status: 'idle' | 'running' | 'done' | 'failed';
  pct: number;
  detail?: string;
}

interface Props {
  steps: Record<number, StepState>;
}

const STEP_META = [
  { step: 1, label: 'Gathering sources' },
  { step: 2, label: 'Dedup & filter' },
  { step: 3, label: 'Storing items' },
  { step: 4, label: 'Analyzing (LLM)' },
  { step: 5, label: 'Synthesizing brief' },
] as const;

function StatusIcon({ status }: { status: StepState['status'] }) {
  if (status === 'done') {
    return <span className="text-green-500 font-bold text-base leading-none">✓</span>;
  }
  if (status === 'failed') {
    return <span className="text-red-500 font-bold text-base leading-none">✗</span>;
  }
  if (status === 'running') {
    return (
      <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    );
  }
  return <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-300" />;
}

function barColor(status: StepState['status']) {
  if (status === 'done') return 'bg-green-500';
  if (status === 'failed') return 'bg-red-500';
  if (status === 'running') return 'bg-blue-500';
  return 'bg-gray-200';
}

export default function StepList({ steps }: Props) {
  return (
    <div className="space-y-3">
      {STEP_META.map(({ step, label }) => {
        const state: StepState = steps[step] ?? { status: 'idle', pct: 0 };
        return (
          <div key={step} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-100 rounded-full flex-shrink-0">
                {step}
              </span>
              <span className={`flex-1 text-sm font-medium ${state.status === 'idle' ? 'text-gray-400' : 'text-gray-800'}`}>
                {label}
              </span>
              {state.detail && (
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{state.detail}</span>
              )}
              <span className="text-xs font-mono text-gray-500 w-9 text-right flex-shrink-0">
                {state.status === 'idle' ? '' : `${state.pct}%`}
              </span>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <StatusIcon status={state.status} />
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-7">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor(state.status)}`}
                style={{ width: `${state.pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { StepState };
