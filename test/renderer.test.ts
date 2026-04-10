import { describe, it, expect } from 'vitest';

import {
  anchorPoint,
  autoAnchor,
  nodeBox,
  pipePolyline,
  pointAlongPolyline,
  polylineToPath,
} from '../src/renderer.js';
import type { NodeConfig, PipeConfig } from '../src/types.js';

const nodeA: NodeConfig = { x: 0, y: 0, width: 100, height: 100, label: 'A' };
const nodeB: NodeConfig = { x: 400, y: 0, width: 100, height: 100, label: 'B' };

describe('nodeBox', () => {
  it('applies default width/height', () => {
    const b = nodeBox({ x: 10, y: 20, label: '' });
    expect(b.x).toBe(10);
    expect(b.y).toBe(20);
    expect(b.w).toBeGreaterThan(0);
    expect(b.h).toBeGreaterThan(0);
  });
});

describe('anchorPoint', () => {
  it('returns right-midpoint for right anchor', () => {
    expect(anchorPoint(nodeA, 'right')).toEqual([100, 50]);
  });
  it('returns left-midpoint for left anchor', () => {
    expect(anchorPoint(nodeA, 'left')).toEqual([0, 50]);
  });
});

describe('autoAnchor', () => {
  it('picks right edge when target is to the right', () => {
    expect(autoAnchor(nodeA, [500, 50])).toBe('right');
  });
  it('picks left edge when target is to the left', () => {
    expect(autoAnchor(nodeA, [-50, 50])).toBe('left');
  });
  it('picks bottom edge when target is below', () => {
    expect(autoAnchor(nodeA, [50, 500])).toBe('bottom');
  });
  it('picks top edge when target is above', () => {
    expect(autoAnchor(nodeA, [50, -500])).toBe('top');
  });
});

describe('pipePolyline', () => {
  it('auto-routes between two horizontally-separated nodes', () => {
    const pipe: PipeConfig = { id: 'p', from: 'a', to: 'b' };
    const pts = pipePolyline(pipe, nodeA, nodeB);
    expect(pts.length).toBeGreaterThanOrEqual(2);
    expect(pts[0]).toEqual([100, 50]); // right of A
    expect(pts[pts.length - 1]).toEqual([400, 50]); // left of B
  });

  it('honors explicit waypoints', () => {
    const pipe: PipeConfig = {
      id: 'p',
      from: 'a',
      to: 'b',
      waypoints: [[250, 200]],
    };
    const pts = pipePolyline(pipe, nodeA, nodeB);
    expect(pts).toContainEqual([250, 200]);
    expect(pts[0]).toEqual([100, 50]);
    expect(pts[pts.length - 1]).toEqual([400, 50]);
  });

  it('applies from_offset and to_offset', () => {
    const pipe: PipeConfig = {
      id: 'p',
      from: 'a',
      to: 'b',
      from_offset: [0, 10],
      to_offset: [0, -10],
    };
    const pts = pipePolyline(pipe, nodeA, nodeB);
    expect(pts[0]).toEqual([100, 60]);
    expect(pts[pts.length - 1]).toEqual([400, 40]);
  });
});

describe('polylineToPath', () => {
  it('returns an SVG path string', () => {
    expect(
      polylineToPath([
        [0, 0],
        [10, 10],
        [20, 0],
      ]),
    ).toBe('M 0 0 L 10 10 L 20 0');
  });
});

describe('pointAlongPolyline', () => {
  const poly: [number, number][] = [
    [0, 0],
    [100, 0],
    [100, 100],
  ];

  it('returns start at t=0', () => {
    expect(pointAlongPolyline(poly, 0)).toEqual([0, 0]);
  });

  it('returns end at t=1', () => {
    expect(pointAlongPolyline(poly, 1)).toEqual([100, 100]);
  });

  it('returns the elbow at t=0.5 for an L-shape of equal legs', () => {
    const p = pointAlongPolyline(poly, 0.5);
    expect(p[0]).toBe(100);
    expect(p[1]).toBe(0);
  });

  it('clamps out-of-range t', () => {
    expect(pointAlongPolyline(poly, -1)).toEqual([0, 0]);
    expect(pointAlongPolyline(poly, 2)).toEqual([100, 100]);
  });
});
