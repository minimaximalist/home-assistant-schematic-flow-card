/**
 * MVP editor stub. HA's card editor calls `setConfig(config)` on this
 * element and expects a `configChanged` CustomEvent whenever the user
 * changes something. Until we build the real visual editor, we accept the
 * config, stash it, and render a friendly "YAML-only" notice.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

import type { HomeAssistant, SchematicFlowCardConfig } from './types.js';

@customElement('schematic-flow-card-editor')
export class SchematicFlowCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  private _config?: SchematicFlowCardConfig;

  setConfig(config: SchematicFlowCardConfig): void {
    this._config = config;
    void this._config;
  }

  static override styles = css`
    .notice {
      padding: 16px;
      border-radius: 8px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--secondary-text-color);
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .notice strong {
      color: var(--primary-text-color);
      display: block;
      margin-bottom: 6px;
    }
  `;

  override render() {
    return html`
      <div class="notice">
        <strong>Visual editor coming soon</strong>
        Edit this card as YAML for now. Use the Layout tab to resize its
        grid cells, and the Visibility tab to gate it on entity state.
      </div>
    `;
  }
}
