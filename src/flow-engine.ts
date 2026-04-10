/**
 * Pure helpers for resolving entity state into visual output.
 *
 * Nothing in this file touches the DOM or Lit. Unit-test at will.
 */

import type {
  AnimationBinding,
  ColorBinding,
  ColorStop,
  EntityDisplay,
  EntityDisplayInput,
  GateConfig,
  HassEntity,
  HomeAssistant,
  NamedScale,
  PipeLabel,
  PipeLabelInput,
} from './types.js';

export const INACTIVE_COLOR = 'var(--divider-color, #e0e0e0)';
export const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown', 'none', '']);
export const DEFAULT_ACTIVE_STATES = ['on', 'open', 'home', 'active', 'playing', 'heat', 'cool'];

export const ANIMATION_MIN_DURATION_S = 0.5;
export const ANIMATION_MAX_DURATION_S = 4;

/** Built-in color scales. Authors can override per-binding with inline stops. */
export const BUILT_IN_SCALES: Record<NamedScale, ColorStop[]> = {
  temperature: [
    { at: 10, color: '#3a7bd5' },
    { at: 20, color: '#56b3c7' },
    { at: 30, color: '#f1c40f' },
    { at: 45, color: '#e67e22' },
    { at: 60, color: '#e74c3c' },
  ],
  electricity: [
    { at: 0, color: '#4a90e2' },
    { at: 2000, color: '#27ae60' },
    { at: 5000, color: '#f1c40f' },
    { at: 10000, color: '#e74c3c' },
  ],
  flow: [
    { at: 0, color: 'var(--divider-color, #c0c0c0)' },
    { at: 50, color: '#56b3c7' },
    { at: 100, color: '#3a7bd5' },
  ],
};

export function getEntity(
  hass: HomeAssistant | null | undefined,
  entityId: string | undefined,
): HassEntity | null {
  if (!hass || !entityId) return null;
  return hass.states[entityId] ?? null;
}

/** Numeric state or null if the entity is missing / unavailable / not numeric. */
export function numericState(
  hass: HomeAssistant | null | undefined,
  entityId: string | undefined,
): number | null {
  const entity = getEntity(hass, entityId);
  if (!entity) return null;
  if (UNAVAILABLE_STATES.has(entity.state)) return null;
  const n = Number(entity.state);
  return Number.isFinite(n) ? n : null;
}

export function isEntityAvailable(
  hass: HomeAssistant | null | undefined,
  entityId: string | undefined,
): boolean {
  const entity = getEntity(hass, entityId);
  if (!entity) return false;
  return !UNAVAILABLE_STATES.has(entity.state);
}

export function resolveScale(binding: ColorBinding | undefined): ColorStop[] | null {
  if (!binding) return null;
  if (binding.stops && binding.stops.length > 0) return binding.stops;
  const name: NamedScale =
    binding.scale === 'auto' || binding.scale === undefined ? 'temperature' : binding.scale;
  return BUILT_IN_SCALES[name] ?? null;
}

/**
 * Linearly interpolate between color stops. Values below the first stop clamp
 * to the first color; values above the last stop clamp to the last color.
 *
 * Returns null when there are no stops or the value is not finite.
 */
export function valueToColor(value: number | null, stops: ColorStop[] | null): string | null {
  if (stops == null || stops.length === 0) return null;
  if (value == null || !Number.isFinite(value)) return null;
  if (value <= stops[0]!.at) return stops[0]!.color;
  const last = stops[stops.length - 1]!;
  if (value >= last.at) return last.color;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (value >= a.at && value <= b.at) {
      const t = (value - a.at) / (b.at - a.at);
      return mixColors(a.color, b.color, t);
    }
  }
  return last.color;
}

/**
 * Mix two colors by t in [0,1]. Supports #rrggbb and #rgb. If either color is
 * a CSS variable reference we can't parse, we return the start color — good
 * enough for the "fade from divider-color" case.
 */
export function mixColors(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return t < 0.5 ? a : b;
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function toHex(n: number): string {
  const s = Math.max(0, Math.min(255, n)).toString(16);
  return s.length === 1 ? `0${s}` : s;
}

function parseHex(color: string): [number, number, number] | null {
  if (!color.startsWith('#')) return null;
  const hex = color.slice(1);
  if (hex.length === 3) {
    const r = parseInt(hex[0]! + hex[0]!, 16);
    const g = parseInt(hex[1]! + hex[1]!, 16);
    const b = parseInt(hex[2]! + hex[2]!, 16);
    return Number.isFinite(r + g + b) ? [r, g, b] : null;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return Number.isFinite(r + g + b) ? [r, g, b] : null;
  }
  return null;
}

/**
 * Map a flow-rate-like value to an animation duration (seconds). Higher value
 * → shorter duration. Returns null when there is no meaningful motion (value
 * at-or-below min, non-numeric, or entity unavailable), which the renderer
 * translates into "no animation."
 */
export function valueToAnimationDuration(
  value: number | null,
  binding: AnimationBinding | undefined,
): number | null {
  if (!binding) return null;
  if (value == null || !Number.isFinite(value)) return null;
  const min = binding.min ?? 0;
  const max = binding.max;
  if (max <= min) return null;
  if (value <= min) return null;
  const clamped = Math.min(value, max);
  const t = (clamped - min) / (max - min); // 0..1
  // t=1 → fastest (MIN_DURATION), t→0 → slowest (MAX_DURATION)
  return ANIMATION_MAX_DURATION_S - t * (ANIMATION_MAX_DURATION_S - ANIMATION_MIN_DURATION_S);
}

/** Normalize a gate config into { entity, active_states }. */
export function normalizeGate(
  gate: GateConfig | undefined,
): { entity: string; activeStates: string[] } | null {
  if (!gate) return null;
  if (typeof gate === 'string') {
    return { entity: gate, activeStates: DEFAULT_ACTIVE_STATES };
  }
  return {
    entity: gate.entity,
    activeStates: gate.active_states ?? DEFAULT_ACTIVE_STATES,
  };
}

/** True when the gate is open / permissive / absent. */
export function resolveGate(
  hass: HomeAssistant | null | undefined,
  gate: GateConfig | undefined,
): boolean {
  const g = normalizeGate(gate);
  if (!g) return true;
  const entity = getEntity(hass, g.entity);
  if (!entity) return false;
  if (UNAVAILABLE_STATES.has(entity.state)) return false;
  return g.activeStates.includes(entity.state);
}

export function expandEntityDisplay(input: EntityDisplayInput): EntityDisplay {
  return typeof input === 'string' ? { entity: input } : input;
}

export function expandPipeLabel(input: PipeLabelInput): PipeLabel {
  return typeof input === 'string' ? { entity: input } : input;
}

/** Pick a display unit: explicit override wins, then the entity's UoM. */
export function resolveUnit(
  display: EntityDisplay,
  hass: HomeAssistant | null | undefined,
): string {
  if (display.unit !== undefined) return display.unit;
  const entity = getEntity(hass, display.entity);
  const u = entity?.attributes?.unit_of_measurement;
  return typeof u === 'string' ? u : '';
}

export function resolveFriendlyName(
  display: EntityDisplay,
  hass: HomeAssistant | null | undefined,
): string {
  if (display.label) return display.label;
  const entity = getEntity(hass, display.entity);
  return entity?.attributes?.friendly_name ?? display.entity;
}

/** Raw state string, or `--` placeholder for unavailable entities. */
export function resolveDisplayValue(
  display: EntityDisplay,
  hass: HomeAssistant | null | undefined,
): string {
  const entity = getEntity(hass, display.entity);
  if (!entity || UNAVAILABLE_STATES.has(entity.state)) return '—';
  return entity.state;
}
