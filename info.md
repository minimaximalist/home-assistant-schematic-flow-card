# Schematic Flow Card

![Hot water schematic](docs/images/hot-water-schematic.png)

A P&ID-style schematic flow card for Home Assistant. Author nodes and pipes
in YAML with explicit coordinates, bind each pipe and node to any entity —
temperature, flow, voltage, amperage, whatever — and get an animated,
theme-aware SVG that reacts to live state.

## Why

Every existing HA flow card hard-codes an electrical grid topology. This
one is topology-agnostic: you describe the nodes, you draw the pipes, and
the card renders exactly what you told it to. Plumbing, HVAC, hydronics,
geothermal, electrical — all with the same primitives.

## Features

- **No auto-layout.** You provide coordinates. The card never rearranges
  your diagram.
- **Domain-agnostic state bindings.** Every pipe takes a `color` entity
  (drives stroke color via a gradient) and an `animation` entity (drives
  flow-dash speed). Built-in scales for temperature, electricity, and
  flow; inline gradient stops for anything else.
- **Home Assistant native aesthetic.** Uses HA theme variables, rounded
  cards, Material-style toggles. Drops into a default dashboard without
  looking out of place.
- **Click-through.** Click a node or a pipe to open HA's more-info dialog
  for the underlying entity. Click a rendered toggle to call the service.
- **Sections grid aware.** Implements `getGridOptions()` so the Layout
  tab in the card editor can resize it across the full 48-column grid.

## Configuration (tiny example)

```yaml
type: custom:schematic-flow-card
title: Hot Water
canvas: { width: 800, height: 400 }
nodes:
  inlet:
    x: 40
    y: 150
    kind: source
    icon: mdi:water
    labels: [sensor.inlet_temp, sensor.inlet_flow]
  outlet:
    x: 620
    y: 150
    kind: sink
    labels: [sensor.outlet_temp]
pipes:
  - id: main
    from: inlet
    to: outlet
    color: { entity: sensor.inlet_temp, scale: temperature }
    animation: { entity: sensor.inlet_flow, min: 0, max: 80 }
```

See the [README](README.md) for the full schema.
