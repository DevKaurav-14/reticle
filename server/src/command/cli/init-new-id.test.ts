/**
 * A copied repository keeps its `.reticle.json`, so the copy declares the original's project id and
 * every session it serves is refused as ambiguous. `reticle init` kept the id on disk, so the
 * refusal had no command to offer. `--new-id` is that command.
 */
import { describe, expect, it } from 'vitest';
import { parseCliArgs } from './cli-parse.js';

const newId = (argv: string[]): unknown => {
  const parsed = parseCliArgs(argv, 4400);
  return 'init' === parsed.kind ? parsed.newId : parsed;
};

describe('init --new-id', () => {
  it('asks init for a project id of its own', () => {
    expect(newId(['init', '--new-id'])).toBe(true);
  });

  it('is off for a plain init', () => {
    expect(newId(['init'])).toBe(false);
  });
});
