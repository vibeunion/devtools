import {
  createDevtoolsSnapshot,
  redactDevtoolsRecord,
  type DevtoolsDiagnostic,
  type DevtoolsEvent,
  type DevtoolsSnapshot,
  type DevtoolsTraceContext,
} from '@vibeunion/devtools-protocol';

export type SupaCloudCompilerDiagnostic = {
  severity: 'error' | 'warn';
  code: string;
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
  errorCode?: string;
  docsUrl?: string;
  fix?: Record<string, unknown>;
};

export type SupaCloudTaskLifecycleEvent = {
  event_type: string;
  task_id: string;
  project_ref: string;
  task_type: string;
  attempt: number;
  max_attempts: number;
  status: string;
  error: string | null;
  correlation_id: string | null;
  timestamp: string;
};

export type SupaCloudSnapshotInput = DevtoolsTraceContext & {
  diagnostics?: readonly SupaCloudCompilerDiagnostic[];
  tasks?: readonly SupaCloudTaskLifecycleEvent[];
  events?: readonly DevtoolsEvent[];
};

function traceContext(input: DevtoolsTraceContext): DevtoolsTraceContext {
  return {
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.traceId ? { traceId: input.traceId } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
  };
}

export function mapCompilerDiagnostic(
  diagnostic: SupaCloudCompilerDiagnostic,
  context: DevtoolsTraceContext = {},
): DevtoolsDiagnostic {
  return redactDevtoolsRecord({
    ...traceContext(context),
    code: diagnostic.errorCode ?? diagnostic.code,
    source: 'compiler',
    severity: diagnostic.severity === 'warn' ? 'warning' : 'error',
    message: diagnostic.message,
    ...(diagnostic.file || diagnostic.line
      ? { location: { file: diagnostic.file, line: diagnostic.line } }
      : {}),
    ...(diagnostic.fix
      ? { fix: { kind: diagnostic.fix.type ?? 'compiler-fix', safe: false, input: diagnostic.fix } }
      : {}),
  }) as DevtoolsDiagnostic;
}

export function mapTaskLifecycleEvent(
  event: SupaCloudTaskLifecycleEvent,
  context: DevtoolsTraceContext = {},
): DevtoolsEvent {
  return redactDevtoolsRecord({
    type: 'task.updated',
    ...traceContext(context),
    taskId: event.task_id,
    status: event.status,
    metadata: {
      eventType: event.event_type,
      projectRef: event.project_ref,
      taskType: event.task_type,
      attempt: event.attempt,
      maxAttempts: event.max_attempts,
      error: event.error,
      timestamp: event.timestamp,
    },
  }) as DevtoolsEvent;
}

export function createSupaCloudSnapshot(input: SupaCloudSnapshotInput): DevtoolsSnapshot {
  return createDevtoolsSnapshot({
    ...traceContext(input),
    source: 'supacloud',
    diagnostics: (input.diagnostics ?? []).map((item) => mapCompilerDiagnostic(item, input)),
    events: [
      ...(input.events ?? []),
      ...(input.tasks ?? []).map((item) => mapTaskLifecycleEvent(item, input)),
    ],
  });
}
