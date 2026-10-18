/**
 * The post-tool hook's fast path: answer at once, write in a detached child.
 *
 * Cursor and Gemini CLI wait for a hook to exit, and document no background option. Through the
 * full CLI the hook took p50 ~300 ms per call (100 synthetic payloads each), almost all of it
 * loading modules the hook never uses. `bin/reticle.js` sends `hook tool` here before the CLI
 * loads. This module imports only Node built-ins: it reads the payload, prints the agent's answer,
 * pipes the payload to a detached `hook tool-write` (the real capture, `tool-hook.ts`), and returns.
 *
 * Kept free of `@reticlehq/*` imports on purpose: every import here is paid on every tool call.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** The action the detached writer runs. Not for people: `hook tool` is the public one. */
export const TOOL_WRITE_ACTION = 'tool-write';
const HOOK_COMMAND = 'hook';
const CURSOR = 'cursor';
const GEMINI = 'gemini';
const CODEX = 'codex';
/** Read without parsing: the fast path pays for every byte of work on every call. */
const CODEX_STOP = /"hook_event_name"\s*:\s*"Stop"/;
/** The payload is a few kilobytes. More than this is not a hook payload, and is not read. */
const MAX_STDIN_BYTES = 1024 * 1024;
/** An agent that never closes stdin must still get its answer. */
const STDIN_WAIT_MS = 3_000;
/** `bin/reticle.js`, from `dist/command/cli/hook/hook-fast.js`. */
const BIN = fileURLToPath(new URL('../../../../bin/reticle.js', import.meta.url));

/** What the hook prints. Cursor and Gemini CLI read stdout as JSON; the rest need nothing. */
export function toolHookAck(agent: string, payload = ''): string {
  if (CURSOR === agent || GEMINI === agent) return '{}\n';
  // Codex's Stop rejects plain text and wants JSON when it exits 0; its other hooks need nothing.
  return CODEX === agent && CODEX_STOP.test(payload) ? '{}\n' : '';
}

interface FastIo {
  readStdin: () => Promise<string>;
  write: (text: string) => void;
  /** Start the writer, detached, with `input` on its stdin. Resolves once the input is handed over. */
  spawnWriter: (args: readonly string[], input: string) => Promise<void>;
}

export async function runToolHookFast(argv: readonly string[], io: FastIo): Promise<void> {
  const at = argv.indexOf('--agent');
  const agent = (-1 === at ? undefined : argv[at + 1]) ?? 'claude-code';
  const payload = await io.readStdin();
  io.write(toolHookAck(agent, payload));
  try {
    await io.spawnWriter([HOOK_COMMAND, TOOL_WRITE_ACTION, ...argv], payload);
  } catch {
    // A lost record is better than an agent told its tool failed.
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    const done = (): void => {
      clearTimeout(timer);
      resolve(data);
    };
    const timer = setTimeout(done, STDIN_WAIT_MS);
    timer.unref();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      data += chunk;
      if (MAX_STDIN_BYTES < data.length) {
        data = '';
        done();
      }
    });
    process.stdin.on('end', done);
    process.stdin.on('error', done);
  });
}

function spawnWriter(args: readonly string[], input: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    });
    child.on('error', reject);
    child.stdin.end(input, () => {
      child.unref();
      resolve();
    });
  });
}

/** The process entry `bin/reticle.js` calls. Always exits 0. */
export async function mainToolHookFast(argv: readonly string[]): Promise<void> {
  await runToolHookFast(argv, {
    readStdin,
    write: (text) => process.stdout.write(text),
    spawnWriter,
  });
  // Exit only once the answer is flushed: an exit can drop a pipe write still in flight.
  process.stdout.write('', () => process.exit(0));
}
