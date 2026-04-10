import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
  }

  /* Let <ha-card> keep its own background, border-radius, and box-shadow
     so the card visually matches the rest of the dashboard. We only lay
     out inner content. */
  ha-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--primary-text-color);
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    flex: 1;
    min-height: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary-color) 18%, transparent);
    color: var(--primary-color);
    --mdc-icon-size: 22px;
  }

  .header__text {
    flex: 1;
    min-width: 0;
  }

  .header__title {
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.2;
    color: var(--primary-text-color);
  }

  .header__subtitle {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    line-height: 1.2;
    margin-top: 2px;
  }

  .chips {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .chips::-webkit-scrollbar { display: none; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--ha-card-background, var(--card-background-color));
    border: 1px solid var(--divider-color);
    color: var(--primary-text-color);
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    transition: background 200ms ease, border-color 200ms ease;
    --chip-accent: var(--primary-color);
  }

  .chip:hover {
    border-color: var(--chip-accent);
    background: color-mix(in srgb, var(--chip-accent) 8%, transparent);
  }

  .chip__icon {
    --mdc-icon-size: 16px;
    color: var(--chip-accent);
  }

  .chip__label {
    color: var(--secondary-text-color);
  }

  .chip__value {
    font-weight: 500;
    color: var(--primary-text-color);
  }

  .diagram {
    width: 100%;
    flex: 1;
    min-height: 0;
    overflow: visible;
    font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
  }

  /* <foreignObject> wrapper around HA's <ha-icon> inside a node tile. */
  .node__icon-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-color);
    --mdc-icon-size: 22px;
  }

  .node--source .node__icon-wrap {
    color: var(--warning-color, #ff9800);
  }

  .node--sink .node__icon-wrap {
    color: var(--info-color, #039be5);
  }

  /* ---------- pipes ---------- */

  .pipe {
    cursor: pointer;
  }

  .pipe__track {
    fill: none;
    stroke: var(--divider-color);
    stroke-width: 10;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .pipe__flow {
    fill: none;
    stroke: var(--primary-color);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 6 12;
    transition: stroke 200ms ease, opacity 200ms ease;
  }

  .pipe--animated .pipe__flow {
    animation: flow 2s linear infinite;
  }

  .pipe--inactive .pipe__flow {
    stroke: var(--divider-color) !important;
    animation: none !important;
    opacity: 0.5;
  }

  @keyframes flow {
    to { stroke-dashoffset: -36; }
  }

  .pipe-label__bg {
    fill: var(--card-background-color);
    stroke: var(--divider-color);
    stroke-width: 1;
  }

  .pipe-label__text {
    fill: var(--primary-text-color);
    font-size: 11px;
    font-weight: 500;
  }

  /* ---------- nodes ---------- */

  .node {
    cursor: pointer;
  }

  .node__tile {
    fill: var(--card-background-color);
    stroke: var(--divider-color);
    stroke-width: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.08));
    transition: stroke 200ms ease, fill 200ms ease;
  }

  .node:hover .node__tile {
    stroke: var(--primary-color);
  }

  .node__icon-bg {
    fill: color-mix(in srgb, var(--primary-color) 18%, var(--card-background-color));
    transition: fill 200ms ease;
  }

  .node__icon {
    fill: var(--primary-color);
    font-size: 14px;
  }

  .node__label {
    fill: var(--primary-text-color);
    font-size: 13px;
    font-weight: 500;
  }

  .node__value {
    fill: var(--secondary-text-color);
    font-size: 11px;
  }

  .node--source .node__tile {
    fill: color-mix(in srgb, var(--warning-color, #ff9800) 10%, var(--card-background-color));
  }

  .node--sink .node__tile {
    fill: color-mix(in srgb, var(--info-color, #039be5) 10%, var(--card-background-color));
  }

  /* ---------- controls ---------- */

  .control {
    cursor: pointer;
  }

  .control__track {
    fill: var(--divider-color);
    transition: fill 200ms ease;
  }

  .control--on .control__track {
    fill: var(--primary-color);
  }

  .control__thumb {
    fill: #ffffff;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.25));
    transition: cx 200ms ease;
  }

  .control__label {
    fill: var(--secondary-text-color);
    font-size: 11px;
  }

  /* ---------- annotations ---------- */

  .annotation__bg {
    fill: var(--card-background-color);
    stroke: var(--divider-color);
  }

  .annotation__text {
    fill: var(--primary-text-color);
    font-size: 11px;
    font-weight: 500;
  }
`;
