/**
 * Public config schema for schematic-flow-card.
 *
 * Coordinates are in SVG user units. The card scales its viewBox to fit the
 * container while preserving aspect ratio.
 */

export type HomeAssistant = {
  states: Record<string, HassEntity>;
  callService: (
    domain: string,
    service: string,
    data?: Record<string, unknown>,
  ) => Promise<unknown>;
  themes?: unknown;
  locale?: unknown;
};

export type HassEntity = {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown> & {
    friendly_name?: string;
    unit_of_measurement?: string;
    icon?: string;
  };
  last_changed?: string;
  last_updated?: string;
};

export type Point = [number, number];

/** Built-in color scale presets. Authors can also supply inline stops. */
export type NamedScale = 'temperature' | 'electricity' | 'flow';

export interface ColorStop {
  /** Entity value at this stop. */
  at: number;
  /** Any valid CSS color. */
  color: string;
}

export interface ColorBinding {
  /**
   * Entity whose numeric state drives the color. If omitted, the parent
   * object's entity (e.g. the pipe's animation entity) is used.
   */
  entity?: string;
  /** Named preset or the literal string 'auto' (alias of named 'temperature'). */
  scale?: NamedScale | 'auto';
  /** Explicit stops — overrides `scale` if present. Must be sorted ascending by `at`. */
  stops?: ColorStop[];
}

export interface AnimationBinding {
  /** Entity whose numeric state drives the dash animation speed. */
  entity: string;
  /** Value at which the animation is effectively stopped. Default 0. */
  min?: number;
  /** Value at which the animation runs at max speed. Required. */
  max: number;
}

/**
 * Anywhere an entity is displayed (node labels, pipe labels, header chips,
 * free annotations), we use this shape. A bare string is shorthand for
 * `{ entity: <string> }`.
 */
export interface EntityDisplay {
  entity: string;
  /** Override the entity's friendly_name. */
  label?: string;
  /** MDI icon (e.g. "mdi:thermometer"). */
  icon?: string;
  /** Override the entity's unit_of_measurement. Use '' to hide. */
  unit?: string;
  /** Optionally color the display value from this entity's state. */
  color?: ColorBinding;
}

export type EntityDisplayInput = string | EntityDisplay;

export type LabelPosition = 'above' | 'below' | 'start' | 'mid' | 'end' | 'along';

/** A value rendered along a pipe path. */
export interface PipeLabel extends EntityDisplay {
  position?: LabelPosition;
  /** 0..1 along the path. Only used when position === 'along'. */
  offset?: number;
}

export type PipeLabelInput = string | PipeLabel;

/** Gate accepts a bare entity_id (active when state === 'on') or an object. */
export type GateConfig =
  | string
  | {
      entity: string;
      /** States considered "active". Default: ['on', 'open', 'home', 'active']. */
      active_states?: string[];
    };
export type NormalizedGateConfig =
  {
    entity: string;
    active_states?: string[];
  };

export type NodeKind = 'source' | 'sink' | 'process' | 'bypass';

export type Anchor = 'left' | 'right' | 'top' | 'bottom' | 'center';

/** An on/off control rendered inside a node tile. String shorthand = entity id. */
export type NodeControlInput = string | { entity: string; label?: string };

export interface NodeControl {
  entity: string;
  label?: string;
}

export interface NodeConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  kind?: NodeKind;
  icon?: string;
  /** Entity opened on click. Defaults to the first label's entity. */
  primary_entity?: string;
  /** Optional background tint driven by an entity. */
  color?: ColorBinding & { entity: string };
  /** Entity readings rendered inside the node tile. */
  labels?: EntityDisplayInput[];
  /** Optional Material-style toggle rendered at the bottom of the tile. */
  control?: NodeControlInput;
}

export interface PipeConfig {
  id: string;
  from: string;
  to: string;
  /** Absolute canvas coordinates between the two node anchors. Empty → auto orthogonal route. */
  waypoints?: Point[];
  from_anchor?: Anchor;
  to_anchor?: Anchor;
  /** Offset from the resolved `from` anchor point (relative, in SVG units). */
  from_offset?: Point;
  to_offset?: Point;
  /** Drives stroke color. */
  color?: ColorBinding;
  /** Drives dash animation speed. */
  animation?: AnimationBinding;
  /** Pipe is inactive (dimmed, no animation) when gate evaluates inactive. */
  gated_by?: GateConfig | GateConfig[];
  /** Values rendered along the pipe path. */
  labels?: PipeLabelInput[];
}

export interface HeaderChipConfig extends EntityDisplay {
  /** Hide the numeric value — icon + label only. */
  hide_value?: boolean;
}

/** A free-floating annotation not tied to any pipe. */
export interface AnnotationConfig extends EntityDisplay {
  at: Point;
}

export interface CanvasConfig {
  width: number;
  height: number;
}

export interface SchematicFlowCardConfig {
  type: string;
  title?: string;
  subtitle?: string;
  icon?: string;
  canvas: CanvasConfig;
  header_chips?: EntityDisplayInput[];
  /** Map from node id → node config. */
  nodes: Record<string, NodeConfig>;
  pipes: PipeConfig[];
  annotations?: AnnotationConfig[];
  /** Fallback values merged into every pipe. */
  defaults?: {
    pipes?: Partial<Omit<PipeConfig, 'id' | 'from' | 'to'>>;
  };
}

/** Normalized config: shorthand expanded, defaults applied. */
export interface NormalizedConfig extends SchematicFlowCardConfig {
  nodes: Record<string, Required<Pick<NodeConfig, 'x' | 'y' | 'width' | 'height'>> & NodeConfig>;
}
