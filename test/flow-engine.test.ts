import { describe, it, expect } from 'vitest';

import {
  ANIMATION_MAX_DURATION_S,
  ANIMATION_MIN_DURATION_S,
  BUILT_IN_SCALES,
  expandEntityDisplay,
  expandPipeLabel,
  isEntityAvailable,
  normalizeGate,
  numericState,
  resolveGate,
  resolveScale,
  valueToAnimationDuration,
  valueToColor,
} from '../src/flow-engine.js';
import type { HomeAssistant } from '../src/types.js';

const hass = (states: Record<string, string>): HomeAssistant => ({
  states: Object.fromEntries(
    Object.entries(states).map(([id, state]) => [
      id,
      { entity_id: id, state, attributes: { unit_of_measurement: '°C' } },
    ]),
  ),
  callService: async () => undefined,
});

describe('numericState', () => {
  it('parses numeric entity states', () => {
    expect(numericState(hass({ 'sensor.t': '42.5' }), 'sensor.t')).toBe(42.5);
  });

  it('returns null for missing entities', () => {
    expect(numericState(hass({}), 'sensor.missing')).toBeNull();
  });

  it('returns null for unavailable state', () => {
    expect(numericState(hass({ 'sensor.t': 'unavailable' }), 'sensor.t')).toBeNull();
  });

  it('returns null for non-numeric state', () => {
    expect(numericState(hass({ 'sensor.t': 'on' }), 'sensor.t')).toBeNull();
  });
});

describe('isEntityAvailable', () => {
  it('is false when state is unavailable', () => {
    expect(isEntityAvailable(hass({ 'sensor.t': 'unavailable' }), 'sensor.t')).toBe(false);
  });
  it('is true for a real state', () => {
    expect(isEntityAvailable(hass({ 'sensor.t': '21' }), 'sensor.t')).toBe(true);
  });
});

describe('valueToColor — temperature scale', () => {
  const stops = BUILT_IN_SCALES.temperature;

  it('clamps below the lowest stop', () => {
    expect(valueToColor(-5, stops)).toBe(stops[0]!.color);
  });

  it('clamps above the highest stop', () => {
    expect(valueToColor(200, stops)).toBe(stops[stops.length - 1]!.color);
  });

  it('returns the hot color at 60°C', () => {
    expect(valueToColor(60, stops)).toBe('#e74c3c');
  });

  it('returns the cool color at 10°C', () => {
    expect(valueToColor(10, stops)).toBe('#3a7bd5');
  });

  it('interpolates between stops', () => {
    const mid = valueToColor(25, stops);
    expect(mid).not.toBe(stops[1]!.color);
    expect(mid).not.toBe(stops[2]!.color);
    expect(mid).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('returns null on null value', () => {
    expect(valueToColor(null, stops)).toBeNull();
  });
});

describe('resolveScale', () => {
  it('uses inline stops when provided', () => {
    const stops = [
      { at: 0, color: '#000000' },
      { at: 10, color: '#ffffff' },
    ];
    expect(resolveScale({ entity: 'x', stops })).toBe(stops);
  });

  it('resolves named presets', () => {
    expect(resolveScale({ entity: 'x', scale: 'electricity' })).toBe(BUILT_IN_SCALES.electricity);
    expect(resolveScale({ entity: 'x', scale: 'flow' })).toBe(BUILT_IN_SCALES.flow);
  });

  it("defaults to 'temperature' when no scale is given", () => {
    expect(resolveScale({ entity: 'x' })).toBe(BUILT_IN_SCALES.temperature);
  });

  it('treats scale:auto as temperature', () => {
    expect(resolveScale({ entity: 'x', scale: 'auto' })).toBe(BUILT_IN_SCALES.temperature);
  });
});

describe('valueToAnimationDuration', () => {
  const binding = { entity: 'sensor.f', min: 0, max: 80 };

  it('returns null without a binding', () => {
    expect(valueToAnimationDuration(50, undefined)).toBeNull();
  });

  it('returns null when value is null', () => {
    expect(valueToAnimationDuration(null, binding)).toBeNull();
  });

  it('returns null at or below min (no flow → no animation)', () => {
    expect(valueToAnimationDuration(0, binding)).toBeNull();
    expect(valueToAnimationDuration(-5, binding)).toBeNull();
  });

  it('returns MIN_DURATION at/above max', () => {
    expect(valueToAnimationDuration(80, binding)).toBeCloseTo(ANIMATION_MIN_DURATION_S);
    expect(valueToAnimationDuration(200, binding)).toBeCloseTo(ANIMATION_MIN_DURATION_S);
  });

  it('returns a value inside the clamped range for mid flow', () => {
    const d = valueToAnimationDuration(40, binding)!;
    expect(d).toBeGreaterThan(ANIMATION_MIN_DURATION_S);
    expect(d).toBeLessThan(ANIMATION_MAX_DURATION_S);
  });

  it('higher flow → shorter duration', () => {
    const low = valueToAnimationDuration(10, binding)!;
    const high = valueToAnimationDuration(60, binding)!;
    expect(high).toBeLessThan(low);
  });
});

describe('normalizeGate / resolveGate', () => {
  it('returns null for undefined gates', () => {
    expect(normalizeGate(undefined)).toBeNull();
  });

  it('expands a string shorthand to default active states', () => {
    const g = normalizeGate('switch.foo');
    expect(g?.[0].entity).toBe('switch.foo');
    expect(g?.[0].active_states).toContain('on');
  });

  it('open by default when no gate is set', () => {
    expect(resolveGate(hass({}), undefined)).toBe(true);
  });

  it('open when gate entity is on', () => {
    expect(resolveGate(hass({ 'switch.foo': 'on' }), 'switch.foo')).toBe(true);
  });

  it('closed when gate entity is off', () => {
    expect(resolveGate(hass({ 'switch.foo': 'off' }), 'switch.foo')).toBe(false);
  });

  it('closed when gate entity is unavailable', () => {
    expect(resolveGate(hass({ 'switch.foo': 'unavailable' }), 'switch.foo')).toBe(false);
  });

  it('honors custom active_states', () => {
    expect(
      resolveGate(hass({ 'cover.v': 'open' }), {
        entity: 'cover.v',
        active_states: ['open'],
      }),
    ).toBe(true);
    expect(
      resolveGate(hass({ 'cover.v': 'closed' }), {
        entity: 'cover.v',
        active_states: ['open'],
      }),
    ).toBe(false);
  });
});

describe('EntityDisplay shorthand expansion', () => {
  it('expands a bare string into { entity }', () => {
    expect(expandEntityDisplay('sensor.t')).toEqual({ entity: 'sensor.t' });
  });

  it('passes through an object', () => {
    const o = { entity: 'sensor.t', unit: 'K' };
    expect(expandEntityDisplay(o)).toBe(o);
  });

  it('expands pipe labels', () => {
    expect(expandPipeLabel('sensor.t')).toEqual({ entity: 'sensor.t' });
  });
});
