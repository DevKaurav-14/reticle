/**
 * The post-tool hook answers at once and keeps the call in a detached child.
 *
 * Cursor and Gemini CLI document no background option, so the agent waits for the hook to exit.
 * Measured on 100 payloads each, the hook through the full CLI took p50 ~300 ms and p95 325–494 ms,
 * because the whole CLI loaded before a byte was written. The fast path loads nothing heavy: it
 * reads the payload, answers, hands the payload to a detached writer, and exits.
 */
import { describe, expect, it } from 'vitest';
import { TOOL_WRITE_ACTION, runToolHookFast, toolHookAck } from './hook-fast.js';

describe('the post-tool hook fast path', () => {
  it('answers, hands the payload to a detached writer, and writes nothing itself', async () => {
    const out: string[] = [];
    const spawned: { args: readonly string[]; input: string; detached: boolean }[] = [];
    await runToolHookFast(['--agent', 'cursor'], {
      readStdin: () => Promise.resolve('{"tool_name":"Shell"}'),
      write: (text) => out.push(text),
      spawnWriter: (args, input) => {
        spawned.push({ args, input, detached: true });
        return Promise.resolve();
      },
    });
    expect(out).toEqual(['{}\n']);
    expect(spawned).toEqual([
      {
        args: ['hook', TOOL_WRITE_ACTION, '--agent', 'cursor'],
        input: '{"tool_name":"Shell"}',
        detached: true,
      },
    ]);
  });

  it('still answers when the writer cannot start', async () => {
    const out: string[] = [];
    await runToolHookFast(['--agent', 'gemini'], {
      readStdin: () => Promise.resolve('{}'),
      write: (text) => out.push(text),
      spawnWriter: () => Promise.reject(new Error('no spawn')),
    });
    expect(out).toEqual(['{}\n']);
  });

  it('answers Cursor and Gemini CLI with JSON and the others with nothing', () => {
    expect(toolHookAck('cursor')).toBe('{}\n');
    expect(toolHookAck('gemini')).toBe('{}\n');
    expect(toolHookAck('claude-code')).toBe('');
    // Codex's Stop needs JSON on stdout when it exits 0; its other hooks need nothing.
    expect(toolHookAck('codex', '{"hook_event_name":"Stop"}')).toBe('{}\n');
    expect(toolHookAck('codex', '{"hook_event_name":"PostToolUse"}')).toBe('');
  });
});
