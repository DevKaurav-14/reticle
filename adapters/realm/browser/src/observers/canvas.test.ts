/**
 * What a canvas shows, as a digest.
 *
 * Canvas pixels never reach the DOM, so a canvas app that drew the wrong colour looked, to a
 * recording, exactly like one that drew the right one.
 */
import { describe, expect, it } from 'vitest';
import { EventType } from '@reticlehq/core';
import { digestPixels, installCanvas, type CanvasSample } from './canvas.js';

const solid = (r: number, g: number, b: number): CanvasSample => {
  const data = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width: 300, height: 150 };
};

describe('the canvas digest', () => {
  it('is the same for the same pixels and different for a different colour', () => {
    const red = digestPixels(solid(255, 0, 0).data);
    expect(digestPixels(solid(255, 0, 0).data)).toEqual(red);
    expect(digestPixels(solid(0, 0, 255).data).digest).not.toBe(red.digest);
    expect(red.mean).toEqual([255, 0, 0]);
  });

  it('emits only when what a canvas shows changes, and stands down where nothing can be read', () => {
    document.body.innerHTML = '<canvas></canvas><canvas></canvas>';
    let frame = solid(255, 0, 0);
    const events: { type: EventType; data: Record<string, unknown> }[] = [];
    let tick: () => void = () => undefined;
    const teardown = installCanvas((type, data) => events.push({ type, data }), {
      sample: (canvas) => (canvas === document.querySelectorAll('canvas')[1] ? undefined : frame),
      every: (run) => {
        tick = run;
        return () => undefined;
      },
    });
    tick();
    tick();
    frame = solid(0, 0, 255);
    tick();
    teardown();
    expect(events.map((e) => e.type)).toEqual([EventType.CANVAS_DIGEST, EventType.CANVAS_DIGEST]);
    expect(events[1]?.data).toMatchObject({ width: 300, height: 150, mean: [0, 0, 255] });
  });
});
