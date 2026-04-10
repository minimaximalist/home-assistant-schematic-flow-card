/**
 * Local demo entry point. Imports the card from source so Vite HMR
 * rebuilds on save. Builds a mock Home Assistant state object, renders
 * the Vættaborgir reference config, and wires up the sidebar controls.
 *
 * Everything here is demo scaffolding — do not import this from the card.
 */

import '../src/schematic-flow-card.ts';
import type { HomeAssistant, SchematicFlowCardConfig, HassEntity } from '../src/types.ts';

/* ---------- <ha-icon> shim ----------
 * HA ships its own Material Design icon element. In the demo we stub one
 * that renders a single-letter glyph in an inline SVG — enough to tell the
 * chips and node icons apart without pulling in an icon font.
 */
class HaIconStub extends HTMLElement {
  static observedAttributes = ['icon'];
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  private render() {
    const icon = this.getAttribute('icon') ?? '';
    const glyph = icon.replace(/^mdi:/, '').charAt(0).toUpperCase() || '•';
    this.style.display = 'inline-flex';
    this.style.alignItems = 'center';
    this.style.justifyContent = 'center';
    this.style.width = '18px';
    this.style.height = '18px';
    this.style.fontSize = '11px';
    this.style.fontWeight = '600';
    this.style.color = 'currentColor';
    this.textContent = glyph;
  }
}
if (!customElements.get('ha-icon')) {
  customElements.define('ha-icon', HaIconStub);
}

/* ---------- mock state ---------- */

type MockState = {
  inletTemp: number;
  inletFlow: number;
  radReturn: number;
  drivewayTemp: number;
  outletTemp: number;
  boost: boolean;
  hotTub: boolean;
};

const state: MockState = {
  inletTemp: 60,
  inletFlow: 50,
  radReturn: 21,
  drivewayTemp: 18,
  outletTemp: 14,
  boost: false,
  hotTub: false,
};

function entity(
  id: string,
  value: string | number,
  unit?: string,
  friendly?: string,
): HassEntity {
  return {
    entity_id: id,
    state: String(value),
    attributes: {
      ...(unit ? { unit_of_measurement: unit } : {}),
      ...(friendly ? { friendly_name: friendly } : {}),
    },
  };
}

function buildHass(s: MockState): HomeAssistant {
  return {
    states: {
      'sensor.inlet_temp': entity('sensor.inlet_temp', s.inletTemp, '°C', 'Inlet temp'),
      'sensor.inlet_flow': entity('sensor.inlet_flow', s.inletFlow, 'L/min', 'Inlet flow'),
      'sensor.radiator_return_temp': entity(
        'sensor.radiator_return_temp',
        s.radReturn,
        '°C',
        'Radiator return',
      ),
      'sensor.driveway_loop_temp': entity(
        'sensor.driveway_loop_temp',
        s.drivewayTemp,
        '°C',
        'Driveway loop',
      ),
      'sensor.dhw_flow': entity('sensor.dhw_flow', 18, 'L/min', 'DHW flow'),
      'sensor.hot_tub_temp': entity('sensor.hot_tub_temp', 38, '°C', 'Hot tub'),
      'sensor.hot_tub_outlet_temp': entity(
        'sensor.hot_tub_outlet_temp',
        32,
        '°C',
        'Hot tub return',
      ),
      'sensor.outlet_temp': entity('sensor.outlet_temp', s.outletTemp, '°C', 'Outlet temp'),
      'sensor.outlet_flow': entity('sensor.outlet_flow', 18, 'L/min', 'Outlet flow'),
      'switch.driveway_boost': entity(
        'switch.driveway_boost',
        s.boost ? 'on' : 'off',
        undefined,
        'Driveway boost',
      ),
      'switch.hot_tub_valve': entity(
        'switch.hot_tub_valve',
        s.hotTub ? 'on' : 'off',
        undefined,
        'Hot tub valve',
      ),
    },
    callService: async (domain, service, data) => {
      log(`service ${domain}.${service}`, JSON.stringify(data));
      // Demo behavior: react to `toggle` on our known switches.
      const id = (data as { entity_id?: string } | undefined)?.entity_id;
      if (service === 'toggle') {
        if (id === 'switch.driveway_boost') {
          state.boost = !state.boost;
          (document.getElementById('boost') as HTMLInputElement).checked = state.boost;
        }
        if (id === 'switch.hot_tub_valve') {
          state.hotTub = !state.hotTub;
          (document.getElementById('hot-tub') as HTMLInputElement).checked = state.hotTub;
        }
        push();
      }
    },
  };
}

/* ---------- card config ----------
 * Mirrors example/hot-water-dashboard.yaml. Keep in sync by hand — there's
 * no YAML parser in the demo bundle and it's not worth pulling one in.
 */
const config: SchematicFlowCardConfig = {
  type: 'custom:schematic-flow-card',
  title: 'Hot Water',
  subtitle: 'Vættaborgir · Utility room',
  canvas: { width: 1160, height: 660 },
  header_chips: [
    { entity: 'sensor.inlet_temp', label: 'Inlet', icon: 'mdi:thermometer', color: { scale: 'temperature' } },
    { entity: 'sensor.outlet_temp', label: 'Return', icon: 'mdi:thermometer', color: { scale: 'temperature' } },
    { entity: 'sensor.inlet_flow', label: 'Supply', icon: 'mdi:water' },
  ],
  defaults: {
    pipes: {
      color: { scale: 'temperature' },
      animation: { entity: 'sensor.inlet_flow', min: 0, max: 80 },
    },
  },
  nodes: {
    inlet: {
      x: 40, y: 260, width: 150, height: 140,
      label: 'Hot Water Inlet', kind: 'source', icon: 'mdi:arrow-right-bold',
      primary_entity: 'sensor.inlet_temp',
      color: { entity: 'sensor.inlet_temp', scale: 'temperature' },
      labels: ['sensor.inlet_temp', 'sensor.inlet_flow'],
    },
    radiators: {
      x: 440, y: 80, width: 180, height: 120,
      label: 'House Radiators', kind: 'process', icon: 'mdi:radiator',
      labels: ['sensor.radiator_return_temp'],
    },
    dhw_use: {
      x: 440, y: 440, width: 180, height: 120,
      label: 'Hot Water Usage', kind: 'process', icon: 'mdi:faucet',
      labels: ['sensor.dhw_flow'],
    },
    hot_tub: {
      x: 740, y: 520, width: 160, height: 140,
      label: 'Hot Tub', kind: 'process', icon: 'mdi:hot-tub',
      labels: ['sensor.hot_tub_temp'],
      control: { entity: 'switch.hot_tub_valve', label: 'Valve' },
    },
    driveway: {
      x: 740, y: 320, width: 200, height: 120,
      label: 'Driveway Snow-Melt', kind: 'process', icon: 'mdi:snowflake-melt',
      labels: ['sensor.driveway_loop_temp'],
    },
    boost: {
      x: 440, y: 240, width: 160, height: 120,
      label: 'Bypass Boost', kind: 'bypass', icon: 'mdi:fast-forward',
      control: { entity: 'switch.driveway_boost', label: 'Boost' },
    },
    outlet: {
      x: 1000, y: 260, width: 140, height: 140,
      label: 'Hot Water Outlet', kind: 'sink', icon: 'mdi:arrow-right-bold',
      primary_entity: 'sensor.outlet_temp',
      color: { entity: 'sensor.outlet_temp', scale: 'temperature' },
      labels: ['sensor.outlet_temp', 'sensor.outlet_flow'],
    },
  },
  pipes: [
    {
      id: 'inlet_to_radiators', from: 'inlet', to: 'radiators',
      waypoints: [[300, 330], [300, 140]],
      color: { entity: 'sensor.inlet_temp' },
    },
    {
      id: 'inlet_to_dhw', from: 'inlet', to: 'dhw_use',
      waypoints: [[300, 330], [300, 500]],
      color: { entity: 'sensor.inlet_temp' },
    },
    {
      id: 'radiators_to_driveway', from: 'radiators', to: 'driveway',
      waypoints: [[720, 140], [720, 320]],
      color: { entity: 'sensor.radiator_return_temp' },
      labels: [{ entity: 'sensor.radiator_return_temp', position: 'above' }],
    },
    {
      id: 'boost_tap', from: 'inlet', to: 'boost',
      waypoints: [[300, 330], [300, 305]],
      color: { entity: 'sensor.inlet_temp' },
      gated_by: 'switch.driveway_boost',
    },
    {
      id: 'boost_to_driveway', from: 'boost', to: 'driveway',
      waypoints: [[660, 305], [660, 380]],
      color: { entity: 'sensor.inlet_temp' },
      gated_by: 'switch.driveway_boost',
    },
    {
      id: 'dhw_to_hot_tub', from: 'dhw_use', to: 'hot_tub',
      waypoints: [[700, 500], [700, 580]],
      color: { entity: 'sensor.inlet_temp' },
      gated_by: 'switch.hot_tub_valve',
    },
    {
      id: 'driveway_to_outlet', from: 'driveway', to: 'outlet',
      waypoints: [[970, 380], [970, 330]],
      color: { entity: 'sensor.driveway_loop_temp' },
    },
    {
      id: 'hot_tub_to_outlet', from: 'hot_tub', to: 'outlet',
      waypoints: [[970, 600], [970, 330]],
      color: { entity: 'sensor.hot_tub_outlet_temp' },
      gated_by: 'switch.hot_tub_valve',
    },
    {
      id: 'dhw_to_outlet', from: 'dhw_use', to: 'outlet',
      waypoints: [[970, 500], [970, 330]],
      color: { entity: 'sensor.outlet_temp' },
    },
  ],
};

/* ---------- wire up the card ---------- */

const card = document.getElementById('card') as HTMLElement & {
  setConfig: (c: SchematicFlowCardConfig) => void;
  hass: HomeAssistant;
};
card.setConfig(config);

function push() {
  // Reassigning hass is how HA triggers a re-render; Lit's property setter
  // picks it up and calls render().
  card.hass = buildHass(state);
}
push();

// More-info dialog → log instead of opening the real HA dialog.
card.addEventListener('hass-more-info', (e: Event) => {
  const detail = (e as CustomEvent<{ entityId: string }>).detail;
  log('hass-more-info', detail.entityId);
});

/* ---------- sidebar controls ---------- */

function bindRange(
  inputId: string,
  unit: string,
  apply: (value: number) => void,
) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  const output = document.querySelector<HTMLOutputElement>(`output[for="${inputId}"]`)!;
  const update = () => {
    const v = Number(input.value);
    apply(v);
    output.value = `${v} ${unit}`;
    push();
  };
  input.addEventListener('input', update);
  update();
}

bindRange('inlet-temp', '°C', (v) => (state.inletTemp = v));
bindRange('inlet-flow', 'L/min', (v) => (state.inletFlow = v));
bindRange('rad-return', '°C', (v) => (state.radReturn = v));
bindRange('driveway-temp', '°C', (v) => (state.drivewayTemp = v));
bindRange('outlet-temp', '°C', (v) => (state.outletTemp = v));

(document.getElementById('boost') as HTMLInputElement).addEventListener('change', (e) => {
  state.boost = (e.target as HTMLInputElement).checked;
  push();
});
(document.getElementById('hot-tub') as HTMLInputElement).addEventListener('change', (e) => {
  state.hotTub = (e.target as HTMLInputElement).checked;
  push();
});

/* ---------- theme toggle ---------- */

document.getElementById('toggle-theme')?.addEventListener('click', () => {
  const body = document.body;
  body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
});

/* ---------- event log ---------- */

function log(kind: string, detail: string) {
  const list = document.getElementById('log')!;
  const li = document.createElement('li');
  li.innerHTML = `<strong>${kind}</strong> ${detail}`;
  list.prepend(li);
  while (list.children.length > 20) list.removeChild(list.lastChild!);
}
