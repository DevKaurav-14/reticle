/**
 * A run artifact names the episode that produced it and the commit it ran against.
 *
 * Joining a run to the agent's trajectory was guesswork by time and file: the run carried no
 * episode id, and `project.commit` was never filled in. Now the run store stamps both, from the
 * episode the calling agent connection writes (or, outside a call, the newest one in the project).
 */
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RunAgentKind, RunFramework, RunProfile, RunTrigger } from '@reticlehq/core';
import { noteAgentAttached, runAsAgent } from '@/hooks/coding-agents.js';
import { noteEpisode } from '@/hooks/episode-stamp.js';
import { createNodeFileSystem } from '@/memory/project/fs/fs-port.js';
import { buildVerificationRun } from './build-verification-run.js';
import { RunStore } from './run-store.js';

const run = (runId: string, commit?: string) =>
  buildVerificationRun(
    {
      runId,
      durationMs: 1,
      profile: RunProfile.DEV,
      project: {
        name: 'demo',
        framework: RunFramework.REACT,
        ...(commit === undefined ? {} : { commit }),
      },
      agent: { id: 'a', kind: RunAgentKind.CODING_AGENT },
      trigger: { kind: RunTrigger.EDIT },
      changedFiles: [],
      flows: [],
      checks: [],
      risks: [],
      evidence: { consoleErrors: [], networkAnomalies: [], stateAssertions: [], timeline: [] },
    },
    () => 1,
  );

async function written(root: string, runId: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(join(root, 'runs', `${runId}.json`), 'utf8')) as Record<
    string,
    unknown
  >;
}

describe('the episode stamp on a run', () => {
  it("names the calling connection's episode and its HEAD", async () => {
    const root = await mkdtemp(join(tmpdir(), 'run-episode-'));
    noteEpisode(root, 'conn-a', 'aaa111');
    noteEpisode(root, 'conn-b', 'bbb222');
    noteAgentAttached('conn-a', 'claude-code');
    const store = new RunStore(createNodeFileSystem(), root);
    await runAsAgent('conn-a', () => store.write(run('r1')));
    expect(await written(root, 'r1')).toMatchObject({
      episodeId: 'conn-a',
      project: { commit: 'aaa111' },
    });
  });

  it('falls back to the newest episode in the project, and keeps a commit already set', async () => {
    const root = await mkdtemp(join(tmpdir(), 'run-episode-'));
    noteEpisode(root, 'conn-a', 'aaa111');
    noteEpisode(root, 'conn-b');
    const store = new RunStore(createNodeFileSystem(), root);
    await store.write(run('r2', 'given'));
    expect(await written(root, 'r2')).toMatchObject({
      episodeId: 'conn-b',
      project: { commit: 'given' },
    });
  });

  it('stamps nothing where no episode was written', async () => {
    const root = await mkdtemp(join(tmpdir(), 'run-episode-'));
    await new RunStore(createNodeFileSystem(), root).write(run('r3'));
    const out = await written(root, 'r3');
    expect(out['episodeId']).toBeUndefined();
    expect((out['project'] as Record<string, unknown>)['commit']).toBeUndefined();
  });
});
