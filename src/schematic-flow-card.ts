import { LitElement, html, svg, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import './editor.js';
import { styles } from './styles.js';
import type { HomeAssistant, SchematicFlowCardConfig } from './types.js';
import {
  renderAnnotations,
  renderHeaderChips,
  renderNodes,
  renderPipes,
  type Handlers,
} from './renderer.js';

/* Replaced at build time by rollup with the `version` field from package.json. */
const CARD_VERSION = '__CARD_VERSION__';

/* Announce the card to HA's custom card picker. */
const w = window as unknown as {
  customCards?: Array<{
    type: string;
    name: string;
    description: string;
    preview?: boolean;
  }>;
};
w.customCards = w.customCards || [];
w.customCards.push({
  type: 'schematic-flow-card',
  name: 'Schematic Flow Card',
  description:
    'Author P&ID-style flow diagrams with explicit coordinates; works for plumbing, HVAC, electrical, and other domains.',
  preview: true,
});

/* Nice console banner — standard convention for HA custom cards. */
console.info(
  `%c SCHEMATIC-FLOW-CARD %c v${CARD_VERSION} `,
  'color: white; background: #3a7bd5; font-weight: 700;',
  'color: #3a7bd5; background: transparent; font-weight: 700;',
);

@customElement('schematic-flow-card')
export class SchematicFlowCard extends LitElement {
  static override styles = styles;

  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: SchematicFlowCardConfig;

  setConfig(config: SchematicFlowCardConfig): void {
    if (!config) throw new Error('Invalid configuration');
    if (!config.canvas || !config.canvas.width || !config.canvas.height) {
      throw new Error('canvas.width and canvas.height are required');
    }
    if (!config.nodes || typeof config.nodes !== 'object') {
      throw new Error('nodes must be a map of node id → node config');
    }
    if (!Array.isArray(config.pipes)) {
      throw new Error('pipes must be an array');
    }
    this._config = config;
  }

  getCardSize(): number {
    if (!this._config) return 3;
    return Math.max(3, Math.round(this._config.canvas.height / 100));
  }

  /**
   * Sections view grid sizing. HA's Sections grid supports up to 48
   * sub-columns (4 master columns × 12 sub-cells with Precise mode) and
   * up to 12+ rows. We advertise full width by default and leave the
   * ceilings as wide as possible so the user can drag the Layout
   * handle all the way across the dashboard.
   */
  getGridOptions(): {
    columns: number | 'full';
    rows: number | 'auto';
    min_columns: number;
    min_rows: number;
    max_columns: number;
    max_rows: number;
  } {
    const canvas = this._config?.canvas;
    const aspect = canvas ? canvas.height / canvas.width : 0.55;
    // Rough row count so a full-width card roughly preserves canvas
    // aspect on a typical ~56 px grid row.
    const rows = Math.max(4, Math.min(20, Math.round(aspect * 12) + 2));
    return {
      columns: 'full',
      rows,
      min_columns: 6,
      min_rows: 3,
      max_columns: 48,
      max_rows: 20,
    };
  }

  /**
   * Older HA versions (pre-2024.8-ish) used getLayoutOptions instead of
   * getGridOptions. We expose both so the card works on either.
   */
  getLayoutOptions(): {
    grid_columns: number | 'full';
    grid_rows: number | 'auto';
    grid_min_columns: number;
    grid_min_rows: number;
    grid_max_columns: number;
    grid_max_rows: number;
  } {
    const opts = this.getGridOptions();
    return {
      grid_columns: opts.columns,
      grid_rows: opts.rows,
      grid_min_columns: opts.min_columns,
      grid_min_rows: opts.min_rows,
      grid_max_columns: opts.max_columns,
      grid_max_rows: opts.max_rows,
    };
  }

  static getConfigElement(): HTMLElement {
    return document.createElement('schematic-flow-card-editor');
  }

  static getStubConfig(): Partial<SchematicFlowCardConfig> {
    return {
      type: 'custom:schematic-flow-card',
      title: 'Flow',
      canvas: { width: 600, height: 300 },
      nodes: {
        source: { x: 40, y: 110, label: 'Source', kind: 'source', icon: 'mdi:water' },
        sink: { x: 420, y: 110, label: 'Sink', kind: 'sink', icon: 'mdi:water-off' },
      },
      pipes: [{ id: 'main', from: 'source', to: 'sink' }],
    };
  }

  private _handlers: Handlers = {
    onMoreInfo: (entityId: string) => this._fireMoreInfo(entityId),
    onToggle: (entityId: string) => {
      if (!this.hass) return;
      // Use the entity's own domain so switch/light/input_boolean/etc. all
      // work without a per-domain mapping.
      const domain = entityId.split('.')[0] ?? 'homeassistant';
      this.hass.callService(domain, 'toggle', { entity_id: entityId });
    },
  };

  private _fireMoreInfo(entityId: string): void {
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId },
    });
    this.dispatchEvent(event);
  }

  override render(): TemplateResult {
    if (!this._config) return html`<ha-card></ha-card>`;
    const config = this._config;
    const hass = this.hass ?? null;
    const { width, height } = config.canvas;

    return html`
      <ha-card>
        <div class="content">
          ${this._renderHeader(config)}
          ${renderHeaderChips(config.header_chips, hass, this._handlers)}
          <svg
            class="diagram"
            viewBox="0 0 ${width} ${height}"
            preserveAspectRatio="xMidYMid meet"
            xmlns="http://www.w3.org/2000/svg"
          >
            ${svg`
              ${renderPipes(config, hass, this._handlers)}
              ${renderNodes(config, hass, this._handlers)}
              ${renderAnnotations(config.annotations, hass)}
            `}
          </svg>
        </div>
      </ha-card>
    `;
  }

  private _renderHeader(
    config: SchematicFlowCardConfig,
  ): TemplateResult | typeof nothing {
    if (!config.title && !config.subtitle) return nothing;
    return html`
      <div class="header">
        <div class="header__icon">
          <ha-icon icon="mdi:pipe"></ha-icon>
        </div>
        <div class="header__text">
          ${config.title ? html`<div class="header__title">${config.title}</div>` : nothing}
          ${config.subtitle
            ? html`<div class="header__subtitle">${config.subtitle}</div>`
            : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'schematic-flow-card': SchematicFlowCard;
  }
}
