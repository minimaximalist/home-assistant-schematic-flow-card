# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — initial release

### Added

- P&ID-style schematic flow card with explicit-coordinate authoring.
- Domain-agnostic pipe state bindings: `color` (gradient from entity
  value), `animation` (dash speed from entity value), `gated_by` (any
  entity with custom active states).
- Built-in color scales: `temperature`, `electricity`, `flow`. Custom
  gradients via inline `stops:`.
- Typed node kinds (`source`, `sink`, `process`, `bypass`) with
  kind-specific theming.
- Inline node controls — Material-style toggles rendered inside the node
  tile; call `<domain>.toggle` on click.
- Auto-growing node heights: nodes resize to fit their icon, label,
  value lines, and optional toggle.
- Auto orthogonal pipe routing when `waypoints:` is omitted; explicit
  waypoints when you want to control the path.
- Node anchor auto-detection with `from_anchor` / `to_anchor` /
  `from_offset` / `to_offset` overrides.
- Header chips row bound to any entities.
- Pipe-path labels with `above` / `below` / `start` / `mid` / `end` /
  `along` positioning.
- HA theme-variable styling throughout; no custom chrome on `<ha-card>`.
- `<foreignObject>` + `<ha-icon>` node icons so all MDI glyphs Just Work.
- Sections view grid sizing via `getGridOptions()` (1–48 columns, 3–20
  rows).
- Editor stub (`schematic-flow-card-editor`) that accepts `setConfig`
  and shows a YAML-only notice; real visual editor tracked for a
  future release.
- Click-through: nodes and pipes fire `hass-more-info`; toggles call
  `<domain>.toggle`.
- Vættaborgir hot-water reference example (`example/hot-water-dashboard.yaml`).
- Local demo page (`npm run dev`) with mocked `hass`, state sliders,
  and a theme toggle — no HA instance required.
- Vitest unit tests covering scales, animation clamping, gates,
  geometry, and routing.
