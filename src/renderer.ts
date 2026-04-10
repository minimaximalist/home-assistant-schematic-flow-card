/**
 * Pure rendering functions: (config, hass) → Lit svg / html fragments.
 *
 * Event handlers live here but are passed in by the host element, so this
 * module stays framework-agnostic apart from the Lit template tag.
 */

import { svg, html, nothing, type SVGTemplateResult, type TemplateResult } from 'lit';

import {
  expandEntityDisplay,
  expandPipeLabel,
  getEntity,
  INACTIVE_COLOR,
  isEntityAvailable,
  normalizeGate,
  numericState,
  resolveDisplayValue,
  resolveFriendlyName,
  resolveGate,
  resolveScale,
  resolveUnit,
  valueToAnimationDuration,
  valueToColor,
} from './flow-engine.js';
import type {
  Anchor,
  AnnotationConfig,
  EntityDisplayInput,
  HeaderChipConfig,
  HomeAssistant,
  NodeConfig,
  NodeControl,
  NodeControlInput,
  PipeConfig,
  Point,
  SchematicFlowCardConfig,
} from './types.js';

export type Handlers = {
  onMoreInfo: (entityId: string) => void;
  onToggle: (entityId: string) => void;
};

const NODE_DEFAULT_W = 150;
/** Vertical rhythm constants used by both the fitter and the renderer. */
const NODE_PAD_TOP = 14;
const NODE_PAD_BOTTOM = 14;
const ICON_DIAMETER = 36;
const ICON_GAP = 10;
const TITLE_HEIGHT = 16;
const TITLE_GAP = 4;
const LABEL_LINE_HEIGHT = 14;
const CONTROL_HEIGHT = 28;
const CONTROL_GAP = 8;

// ---------- geometry ----------

/**
 * Compute the minimum height a node needs to fit its icon, label, value
 * lines, and optional toggle. The author can set `height:` explicitly — we
 * take the max of declared and required so content never overflows.
 */
function requiredNodeHeight(node: NodeConfig): number {
  const labelCount = node.labels?.length ?? 0;
  const hasControl = node.control != null;
  return (
    NODE_PAD_TOP +
    ICON_DIAMETER +
    ICON_GAP +
    TITLE_HEIGHT +
    (labelCount > 0 ? TITLE_GAP + labelCount * LABEL_LINE_HEIGHT : 0) +
    (hasControl ? CONTROL_GAP + CONTROL_HEIGHT : 0) +
    NODE_PAD_BOTTOM
  );
}

export function nodeBox(node: NodeConfig): { x: number; y: number; w: number; h: number } {
  const declaredH = node.height;
  const required = requiredNodeHeight(node);
  return {
    x: node.x,
    y: node.y,
    w: node.width ?? NODE_DEFAULT_W,
    h: declaredH != null ? Math.max(declaredH, required) : required,
  };
}

export function anchorPoint(node: NodeConfig, anchor: Anchor): Point {
  const b = nodeBox(node);
  switch (anchor) {
    case 'left':
      return [b.x, b.y + b.h / 2];
    case 'right':
      return [b.x + b.w, b.y + b.h / 2];
    case 'top':
      return [b.x + b.w / 2, b.y];
    case 'bottom':
      return [b.x + b.w / 2, b.y + b.h];
    case 'center':
      return [b.x + b.w / 2, b.y + b.h / 2];
  }
}

/** Pick the node edge closest to a given external point. */
export function autoAnchor(node: NodeConfig, target: Point): Anchor {
  const b = nodeBox(node);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = target[0] - cx;
  const dy = target[1] - cy;
  if (Math.abs(dx) * b.h > Math.abs(dy) * b.w) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'bottom' : 'top';
}

/**
 * Resolve the full polyline for a pipe: anchor_from → [waypoints...] → anchor_to.
 * If no waypoints are given, we draw a simple two-segment orthogonal route.
 */
export function pipePolyline(
  pipe: PipeConfig,
  fromNode: NodeConfig,
  toNode: NodeConfig,
): Point[] {
  const waypoints = pipe.waypoints ?? [];

  const firstTarget: Point = waypoints[0] ?? anchorCenter(toNode);
  const lastTarget: Point = waypoints[waypoints.length - 1] ?? anchorCenter(fromNode);

  const fromAnchor = pipe.from_anchor ?? autoAnchor(fromNode, firstTarget);
  const toAnchor = pipe.to_anchor ?? autoAnchor(toNode, lastTarget);

  let start = anchorPoint(fromNode, fromAnchor);
  let end = anchorPoint(toNode, toAnchor);

  if (pipe.from_offset) {
    start = [start[0] + pipe.from_offset[0], start[1] + pipe.from_offset[1]];
  }
  if (pipe.to_offset) {
    end = [end[0] + pipe.to_offset[0], end[1] + pipe.to_offset[1]];
  }

  if (waypoints.length === 0) {
    // Auto orthogonal: pick an intermediate elbow based on anchor orientations.
    const mid = elbow(start, end, fromAnchor, toAnchor);
    return [start, ...mid, end];
  }

  return [start, ...waypoints, end];
}

function anchorCenter(node: NodeConfig): Point {
  const b = nodeBox(node);
  return [b.x + b.w / 2, b.y + b.h / 2];
}

function elbow(a: Point, b: Point, fromAnchor: Anchor, toAnchor: Anchor): Point[] {
  const fromHorizontal = fromAnchor === 'left' || fromAnchor === 'right';
  const toHorizontal = toAnchor === 'left' || toAnchor === 'right';
  if (fromHorizontal && toHorizontal) {
    const mx = (a[0] + b[0]) / 2;
    return [
      [mx, a[1]],
      [mx, b[1]],
    ];
  }
  if (!fromHorizontal && !toHorizontal) {
    const my = (a[1] + b[1]) / 2;
    return [
      [a[0], my],
      [b[0], my],
    ];
  }
  if (fromHorizontal) {
    return [[b[0], a[1]]];
  }
  return [[a[0], b[1]]];
}

export function polylineToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M ${first![0]} ${first![1]} ` + rest.map((p) => `L ${p[0]} ${p[1]}`).join(' ');
}

/** Linear interpolation along a polyline for labels positioned with `offset`. */
export function pointAlongPolyline(points: Point[], t: number): Point {
  if (points.length === 0) return [0, 0];
  if (points.length === 1) return points[0]!;
  const clamped = Math.max(0, Math.min(1, t));
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1]![0] - points[i]![0];
    const dy = points[i + 1]![1] - points[i]![1];
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return points[0]!;
  let target = clamped * total;
  for (let i = 0; i < lengths.length; i++) {
    if (target <= lengths[i]!) {
      const frac = lengths[i] === 0 ? 0 : target / lengths[i]!;
      return [
        points[i]![0] + (points[i + 1]![0] - points[i]![0]) * frac,
        points[i]![1] + (points[i + 1]![1] - points[i]![1]) * frac,
      ];
    }
    target -= lengths[i]!;
  }
  return points[points.length - 1]!;
}

// ---------- pipes ----------

export function renderPipes(
  config: SchematicFlowCardConfig,
  hass: HomeAssistant | null,
  handlers: Handlers,
): SVGTemplateResult[] {
  const defaults = config.defaults?.pipes ?? {};
  return config.pipes.map((rawPipe) => {
    const pipe: PipeConfig = { ...defaults, ...rawPipe };
    const fromNode = config.nodes[pipe.from];
    const toNode = config.nodes[pipe.to];
    if (!fromNode || !toNode) {
      return svg`<!-- pipe ${pipe.id} references missing node -->`;
    }
    const points = pipePolyline(pipe, fromNode, toNode);
    const d = polylineToPath(points);

    const gateOpen = resolveGate(hass, pipe.gated_by);
    const colorBinding = pipe.color;
    const colorEntity = colorBinding?.entity ?? pipe.animation?.entity;
    const colorValue = numericState(hass, colorEntity);
    const stops = resolveScale(colorBinding);
    const color = gateOpen
      ? (valueToColor(colorValue, stops) ?? 'var(--primary-color)')
      : INACTIVE_COLOR;

    const animValue = numericState(hass, pipe.animation?.entity);
    const duration = gateOpen ? valueToAnimationDuration(animValue, pipe.animation) : null;
    const animate = duration != null;

    const clickTarget =
      colorEntity ?? pipe.animation?.entity ?? normalizeGate(pipe.gated_by)?.entity;

    const onClick = clickTarget
      ? () => handlers.onMoreInfo(clickTarget)
      : undefined;

    const flowStyle = animate
      ? `stroke: ${color}; animation-duration: ${duration!.toFixed(2)}s;`
      : `stroke: ${color};`;

    return svg`
      <g class="pipe ${animate ? 'pipe--animated' : ''} ${gateOpen ? '' : 'pipe--inactive'}"
         @click=${onClick}
         role="button"
         tabindex="0">
        <path class="pipe__track" d=${d} />
        <path class="pipe__flow" d=${d} style=${flowStyle} />
        ${renderPipeLabels(pipe, points, hass)}
      </g>
    `;
  });
}

function renderPipeLabels(
  pipe: PipeConfig,
  points: Point[],
  hass: HomeAssistant | null,
): SVGTemplateResult[] | typeof nothing {
  if (!pipe.labels || pipe.labels.length === 0) return nothing;
  return pipe.labels.map((raw) => {
    const label = expandPipeLabel(raw);
    const position = label.position ?? 'mid';
    const t =
      position === 'start'
        ? 0
        : position === 'end'
          ? 1
          : position === 'along'
            ? (label.offset ?? 0.5)
            : 0.5;
    const [cx, cy] = pointAlongPolyline(points, t);
    const dy = position === 'above' ? -14 : position === 'below' ? 18 : -14;
    const value = resolveDisplayValue(label, hass);
    const unit = resolveUnit(label, hass);
    const text = unit ? `${value} ${unit}` : value;
    return svg`
      <g class="pipe-label" transform="translate(${cx}, ${cy + dy})">
        <rect class="pipe-label__bg" rx="6" ry="6"
              x="-28" y="-11" width="56" height="22" />
        <text class="pipe-label__text" text-anchor="middle" dominant-baseline="central">${text}</text>
      </g>
    `;
  });
}

// ---------- nodes ----------

export function renderNodes(
  config: SchematicFlowCardConfig,
  hass: HomeAssistant | null,
  handlers: Handlers,
): SVGTemplateResult[] {
  return Object.entries(config.nodes).map(([id, node]) => renderNode(id, node, hass, handlers));
}

function renderNode(
  id: string,
  node: NodeConfig,
  hass: HomeAssistant | null,
  handlers: Handlers,
): SVGTemplateResult {
  const b = nodeBox(node);
  const kind = node.kind ?? 'process';

  let tint: string | null = null;
  if (node.color) {
    const val = numericState(hass, node.color.entity);
    tint = valueToColor(val, resolveScale(node.color));
  }

  const control = expandNodeControl(node.control);

  const primary =
    node.primary_entity ??
    (node.labels && node.labels.length > 0
      ? expandEntityDisplay(node.labels[0]!).entity
      : control?.entity);

  const onTileClick = primary ? () => handlers.onMoreInfo(primary) : undefined;

  const labelLines = (node.labels ?? []).map((raw) => {
    const d = expandEntityDisplay(raw);
    const value = resolveDisplayValue(d, hass);
    const unit = resolveUnit(d, hass);
    return unit ? `${value} ${unit}` : value;
  });

  const title = node.label ?? id;
  const cx = b.x + b.w / 2;

  // Lay out vertically from the top of the tile.
  const iconCy = b.y + NODE_PAD_TOP + ICON_DIAMETER / 2;
  const titleY = b.y + NODE_PAD_TOP + ICON_DIAMETER + ICON_GAP + TITLE_HEIGHT / 2;
  const firstValueY = titleY + TITLE_HEIGHT / 2 + TITLE_GAP + LABEL_LINE_HEIGHT / 2;
  const controlCy = b.y + b.h - NODE_PAD_BOTTOM - CONTROL_HEIGHT / 2;

  return svg`
    <g class="node node--${kind}" data-node-id=${id}>
      <rect class="node__tile"
            x=${b.x} y=${b.y} width=${b.w} height=${b.h}
            rx="14" ry="14"
            @click=${onTileClick}
            role="button"
            tabindex="0"
            style=${tint ? `fill: color-mix(in srgb, ${tint} 15%, var(--card-background-color));` : ''} />
      <circle class="node__icon-bg"
              cx=${cx} cy=${iconCy} r=${ICON_DIAMETER / 2}
              style=${tint ? `fill: ${tint};` : ''} />
      ${node.icon
        ? svg`
          <foreignObject
            x=${cx - ICON_DIAMETER / 2}
            y=${iconCy - ICON_DIAMETER / 2}
            width=${ICON_DIAMETER}
            height=${ICON_DIAMETER}
          >
            <div xmlns="http://www.w3.org/1999/xhtml" class="node__icon-wrap">
              <ha-icon icon=${node.icon}></ha-icon>
            </div>
          </foreignObject>`
        : nothing}
      <text class="node__label"
            x=${cx}
            y=${titleY}
            text-anchor="middle"
            dominant-baseline="central">${title}</text>
      ${labelLines.map(
        (line, i) => svg`
          <text class="node__value"
                x=${cx}
                y=${firstValueY + i * LABEL_LINE_HEIGHT}
                text-anchor="middle"
                dominant-baseline="central">${line}</text>
        `,
      )}
      ${control ? renderNodeControl(control, cx, controlCy, hass, handlers) : nothing}
    </g>
  `;
}

function expandNodeControl(input: NodeControlInput | undefined): NodeControl | null {
  if (!input) return null;
  if (typeof input === 'string') return { entity: input };
  return input;
}

function renderNodeControl(
  control: NodeControl,
  cx: number,
  cy: number,
  hass: HomeAssistant | null,
  handlers: Handlers,
): SVGTemplateResult {
  const entity = getEntity(hass, control.entity);
  const on = entity?.state === 'on';
  return svg`
    <g class="control ${on ? 'control--on' : ''}"
       transform="translate(${cx}, ${cy})"
       @click=${(e: Event) => {
         e.stopPropagation();
         handlers.onToggle(control.entity);
       }}
       role="switch"
       aria-checked=${on}
       tabindex="0">
      <rect class="control__track" x="-22" y="-12" width="44" height="24" rx="12" ry="12" />
      <circle class="control__thumb" cx=${on ? 10 : -10} cy="0" r="9" />
      ${control.label
        ? svg`<text class="control__label" x="0" y="26" text-anchor="middle">${control.label}</text>`
        : nothing}
    </g>
  `;
}

// ---------- header chips, controls, annotations ----------

export function renderHeaderChips(
  chips: EntityDisplayInput[] | undefined,
  hass: HomeAssistant | null,
  handlers: Handlers,
): TemplateResult | typeof nothing {
  if (!chips || chips.length === 0) return nothing;
  return html`
    <div class="chips">
      ${chips.map((raw) => {
        const chip = expandEntityDisplay(raw) as HeaderChipConfig;
        const available = isEntityAvailable(hass, chip.entity);
        const value = available ? resolveDisplayValue(chip, hass) : '—';
        const unit = available ? resolveUnit(chip, hass) : '';
        const labelText = chip.label ?? resolveFriendlyName(chip, hass);
        let color: string | null = null;
        if (chip.color) {
          const n = numericState(hass, chip.color.entity ?? chip.entity);
          color = valueToColor(n, resolveScale(chip.color));
        }
        return html`
          <button
            class="chip"
            style=${color ? `--chip-accent: ${color};` : ''}
            @click=${() => handlers.onMoreInfo(chip.entity)}
          >
            ${chip.icon
              ? html`<ha-icon class="chip__icon" icon=${chip.icon}></ha-icon>`
              : nothing}
            <span class="chip__label">${labelText}</span>
            ${chip.hide_value
              ? nothing
              : html`<span class="chip__value">${value}${unit ? ` ${unit}` : ''}</span>`}
          </button>
        `;
      })}
    </div>
  `;
}

export function renderAnnotations(
  annotations: AnnotationConfig[] | undefined,
  hass: HomeAssistant | null,
): SVGTemplateResult[] | typeof nothing {
  if (!annotations || annotations.length === 0) return nothing;
  return annotations.map((a) => {
    const value = resolveDisplayValue(a, hass);
    const unit = resolveUnit(a, hass);
    const text = unit ? `${value} ${unit}` : value;
    return svg`
      <g class="annotation" transform="translate(${a.at[0]}, ${a.at[1]})">
        <rect class="annotation__bg" rx="6" ry="6" x="-30" y="-12" width="60" height="24" />
        <text class="annotation__text" text-anchor="middle" dominant-baseline="central">${text}</text>
      </g>
    `;
  });
}
