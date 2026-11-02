export type DevtoolsSource = 'frontend' | 'supacloud' | 'compiler';
export type DevtoolsSeverity = 'info' | 'warning' | 'error';

export type DevtoolsTraceContext = {
  requestId?: string;
  traceId?: string;
  correlationId?: string;
};

export type DevtoolsLocation = {
  file?: string;
  line?: number;
  column?: number;
};

export type DevtoolsDiagnostic = DevtoolsTraceContext & {
  code: string;
  source: DevtoolsSource;
  severity: DevtoolsSeverity;
  message: string;
  location?: DevtoolsLocation;
  fix?: {
    kind: string;
    safe: boolean;
    input?: Record<string, unknown>;
  };
};

export type DevtoolsEvent =
  | (DevtoolsTraceContext & {
      type: 'request.started' | 'request.finished' | 'request.failed';
      durationMs?: number;
    })
  | (DevtoolsTraceContext & {
      type: 'query.started' | 'query.finished' | 'query.failed';
      provider: string;
      resource?: string;
      operation: string;
    })
  | (DevtoolsTraceContext & {
      type: 'task.updated';
      taskId: string;
      status: string;
    })
  | {
      type: 'diagnostic.emitted';
      diagnostic: DevtoolsDiagnostic;
    }
  | (DevtoolsTraceContext & {
      type: 'vibe.inspect';
      component: string;
      resource?: string;
      field?: string;
      prompt?: string;
    })
  | (DevtoolsTraceContext & {
      type: 'vibe.patch';
      resource: string;
      action: ResourcePatchAction;
      field?: string;
      column?: string;
      value?: unknown;
      prompt?: string;
    });

export type DevtoolsSnapshot = DevtoolsTraceContext & {
  version: 1;
  source: DevtoolsSource;
  diagnostics: DevtoolsDiagnostic[];
  events: DevtoolsEvent[];
};

// ─── Unified Vibe Coding & Self-Healing Contracts ────────────

export type SelfHealingIssueCategory =
  | 'PERMISSION_DENIED'
  | 'SCHEMA_MISMATCH'
  | 'NETWORK_ERROR'
  | 'RUNTIME_EXCEPTION';

export type SelfHealingIssue = {
  category: SelfHealingIssueCategory;
  code: string;
  message: string;
  resource?: string;
  operation?: string;
  suggestedAction: string;
  location?: DevtoolsLocation;
};

export type SelfHealingReport = {
  hasErrors: boolean;
  errorCount: number;
  issues: SelfHealingIssue[];
  agentPrompt: string;
};

export type ResourcePatchAction =
  | 'updateField'
  | 'toggleColumnVisibility'
  | 'updateColumnTitle'
  | 'updatePageSize'
  | 'reorderColumns';

export type ResourcePatch = {
  resource: string;
  action: ResourcePatchAction;
  field?: string;
  column?: string;
  value: unknown;
  targetComponent?: string;
};

export type ResourcePatchResult = {
  success: boolean;
  patch: ResourcePatch;
  summary: string;
  suggestedPatchCode: string;
  agentPrompt: string;
};

export type DevtoolsCacheSelector = {
  provider?: string;
  resource?: string;
  operation?: string;
  queryHash?: string;
  mutationKey?: string;
};

export type DevtoolsCacheMutation =
  | 'cancel'
  | 'invalidate'
  | 'refetch'
  | 'remove'
  | 'reset'
  | 'clear'
  | 'clearMutations'
  | 'cancelMutations'
  | 'removeMutations'
  | 'resetMutations';

export type DevtoolsCacheCapabilities = {
  query: DevtoolsCacheMutation[];
  mutation: DevtoolsCacheMutation[];
};

export type DevtoolsCacheActionRequest = {
  action: DevtoolsCacheMutation;
  selector?: DevtoolsCacheSelector;
  confirmation?: string;
};

export type DevtoolsCacheActionResult = {
  action: DevtoolsCacheMutation;
  matched: number;
  changed: number;
};

export type DevtoolsCacheDiagnostics = {
  queries: { total: number; fetching: number; stale: number; errors: number };
  mutations: { total: number; pending: number; paused: number; errors: number };
};

export type DevtoolsProviderDiagnostic = {
  name: string;
  configured: boolean;
  capabilities: string;
};

export type DevtoolsQueryDiagnostic = {
  provider: string;
  resource: string;
  operation: string;
  status: string;
  retries: number;
  duration: string;
  cacheAge: string;
  invalidation: string;
};

/**
 * Svadmin-specific devtools snapshot shape. It extends the shared versioned
 * snapshot vocabulary while staying JSON-safe and dependency-free so the same
 * contract can be consumed by frontend adapters and SupaCloud tooling.
 */
export type SvadminDevtoolsSnapshot = {
  version: 1;
  environment: 'development';
  route: string;
  locale: string;
  theme: string;
  colorTheme: string;
  resourceCount: number;
  providers: DevtoolsProviderDiagnostic[];
  cache: DevtoolsCacheDiagnostics;
  queries: DevtoolsQueryDiagnostic[];
};

const SECRET_KEY =
  /token|secret|password|credential|authorization|cookie|signed.?url|service.?role|api.?key|private.?key|jwt/i;

export function redactDevtoolsRecord(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDevtoolsRecord);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY.test(key) ? '[redacted]' : redactDevtoolsRecord(entry),
    ]));
  }
  return value;
}

export function createDevtoolsSnapshot(
  input: Omit<DevtoolsSnapshot, 'version'>,
): DevtoolsSnapshot {
  return redactDevtoolsRecord({ version: 1, ...input }) as DevtoolsSnapshot;
}
