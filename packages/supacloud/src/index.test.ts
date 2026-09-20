import { describe, expect, test } from 'bun:test';
import { createSupaCloudSnapshot, mapCompilerDiagnostic, mapTaskLifecycleEvent } from './index.js';

describe('SupaCloud adapter', () => {
  test('maps compiler diagnostics and redacts fix input', () => {
    expect(mapCompilerDiagnostic({
      severity: 'error',
      code: 'secret-found',
      message: 'secret',
      fix: { type: 'replace', token: 'private-value' },
    }, { traceId: 'trace-1' })).toMatchObject({
      code: 'secret-found',
      source: 'compiler',
      severity: 'error',
      traceId: 'trace-1',
      fix: { input: { token: '[redacted]' } },
    });
  });

  test('maps task lifecycle with correlation metadata', () => {
    expect(mapTaskLifecycleEvent({
      event_type: 'task.failed',
      task_id: 'task-1',
      project_ref: 'project-1',
      task_type: 'edge_function',
      attempt: 1,
      max_attempts: 3,
      status: 'failed',
      error: 'failed',
      correlation_id: 'workflow-1',
      timestamp: '2026-09-20T00:00:00.000Z',
    }, { correlationId: 'workflow-1' })).toMatchObject({
      type: 'task.updated',
      taskId: 'task-1',
      status: 'failed',
      correlationId: 'workflow-1',
    });
  });

  test('creates a JSON-safe SupaCloud snapshot', () => {
    const snapshot = createSupaCloudSnapshot({
      traceId: 'trace-1',
      diagnostics: [],
      tasks: [],
    });
    expect(snapshot).toMatchObject({ version: 1, source: 'supacloud', traceId: 'trace-1' });
    expect(JSON.stringify(snapshot)).toContain('"version":1');
  });
});
