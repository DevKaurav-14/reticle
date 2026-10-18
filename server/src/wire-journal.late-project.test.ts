/**
 * An app that calls `connect()` itself sends its first HELLO without a project id, and the build
 * plugin's `connect({ projectId })` comes after. The session then kept the `.reticle` it was stamped
 * with at create, the origin bucket under `unmatched/`, for its whole life. A later id re-stamps it.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { Bridge } from './portal/bridge/bridge.js';
import { FakeBrowser, waitUntil } from './portal/bridge/bridge.test-harness.js';
import { attachJournal } from './wire-journal.js';
import { createNodeFileSystem } from './memory/project/fs/fs-port.js';

describe('a project id that arrives after the first hello', () => {
  let bridge: Bridge | undefined;
  afterEach(async () => {
    await bridge?.close();
  });

  it("moves the session's artifact root to the named project", async () => {
    bridge = new Bridge({ port: 0 });
    const reticleRoot = join(mkdtempSync(join(tmpdir(), 'late-project-')), '.reticle');
    attachJournal(bridge, { fs: createNodeFileSystem(), reticleRoot, enabled: false });
    const port = await bridge.ready;
    const browser = new FakeBrowser(port, 'late-root', false);
    await browser.open();
    await waitUntil(() => undefined !== bridge?.sessions.get('late-root')?.artifactRoot);
    const before = bridge.sessions.get('late-root')?.artifactRoot ?? '';
    expect(before).toContain(`${sep}origin-`);

    browser.reannounce({ projectId: 'shop' });
    await waitUntil(() => before !== bridge?.sessions.get('late-root')?.artifactRoot);

    expect(bridge.sessions.get('late-root')?.artifactRoot).toMatch(/shop$/);
    browser.close();
  });
});
