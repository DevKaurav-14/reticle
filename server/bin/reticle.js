#!/usr/bin/env node
// The post-tool hook runs on every tool call, and some agents wait for it: answer it before the
// CLI loads. See src/command/cli/hook/hook-fast.ts.
if ('hook' === process.argv[2] && 'tool' === process.argv[3]) {
  const { mainToolHookFast } = await import('../dist/command/cli/hook/hook-fast.js');
  await mainToolHookFast(process.argv.slice(4));
} else {
  const { main } = await import('../dist/command/cli.js');
  main();
}
