# Getting started — Vættaborgir hot water example

This walkthrough takes you from a fresh install to the reference schematic
shown in the root README. Replace the placeholder entity IDs with your real
ones as you go.

## 1. Install the card

Drop `dist/schematic-flow-card.js` into `/config/www/` on your Home Assistant
instance, then register it as a Lovelace resource:

```yaml
# Settings → Dashboards → Resources → Add
url: /local/schematic-flow-card.js
type: module
```

(HACS custom-repository install coming soon.)

## 2. Create the sensors the example expects

The example dashboard uses these entity IDs. Either create them as
`template` / `mqtt` / real sensors, or edit the YAML to point at what you
already have.

| Entity ID                       | What it represents                              |
| ------------------------------- | ------------------------------------------------ |
| `sensor.inlet_temp`             | Hot water supply temperature (°C)                |
| `sensor.inlet_flow`             | Hot water supply flow rate (L/min)               |
| `sensor.outlet_temp`            | Combined return temperature (°C)                 |
| `sensor.outlet_flow`            | Combined return flow (L/min)                     |
| `sensor.radiator_return_temp`   | House radiator return (°C)                       |
| `sensor.dhw_flow`               | Domestic hot-water draw (L/min)                  |
| `sensor.driveway_loop_temp`     | Driveway snow-melt loop temperature (°C)         |
| `sensor.hot_tub_temp`           | Hot tub supply temperature (°C)                  |
| `sensor.hot_tub_outlet_temp`    | Hot tub return temperature (°C)                  |
| `switch.driveway_boost`         | Bypass-boost valve on/off                        |
| `switch.hot_tub_valve`          | Hot-tub supply valve on/off                      |

A minimal stub set using `input_number` / `input_boolean` is enough to try
the card out before wiring real hardware:

```yaml
input_number:
  stub_inlet_temp:
    min: 0
    max: 100
    initial: 60
    unit_of_measurement: '°C'
  stub_inlet_flow:
    min: 0
    max: 100
    initial: 50
    unit_of_measurement: 'L/min'

input_boolean:
  stub_driveway_boost:
  stub_hot_tub_valve:

template:
  - sensor:
      - name: Inlet temp
        unique_id: inlet_temp
        state: "{{ states('input_number.stub_inlet_temp') }}"
        unit_of_measurement: '°C'
      - name: Inlet flow
        unique_id: inlet_flow
        state: "{{ states('input_number.stub_inlet_flow') }}"
        unit_of_measurement: 'L/min'
```

## 3. Paste the dashboard YAML

Copy `hot-water-dashboard.yaml` into your dashboard (Raw YAML editor). The
card picker at the top shows "Schematic Flow Card" — you can also add it
interactively, then edit as YAML.

## 4. Tweak coordinates

The `canvas.width`/`canvas.height` defines the SVG user-unit viewport.
Authors work in those units — the card scales to fit whatever container
Lovelace gives it while preserving aspect ratio. Move nodes by editing the
`x` / `y` on each node, move pipes by editing waypoints on each pipe.

Pipe waypoints are absolute canvas coordinates. If a pipe has no
`waypoints:` the card draws a two-segment orthogonal L-route between the
anchor points.
