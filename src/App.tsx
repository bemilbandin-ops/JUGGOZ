import { useState } from 'react';
import { PRESETS, presetsForEffectType, type EffectControls, type EffectPreset } from './effects';
import { EFFECT_TYPES, getEffectType, type EffectType } from './effectTypes';
import { VideoStage } from './VideoStage';

const INITIAL_PRESET = PRESETS[0];
const HELP: Record<keyof EffectControls, string> = {
  sensitivity: 'How much frame-to-frame change counts as movement. Raise it for subtle motion; lower it if background noise flickers.',
  isolation: 'Brightness gate for tracking. Raise it until your body disappears; lower it if the clubs stop leaving trails.',
  trail: 'How long previous club positions remain visible. Higher values create longer trails.',
  intensity: 'Controls the opacity of the processed trail without changing the original video.',
  glow: 'Adds a soft halo around the trail. The top of the range is deliberately intense.',
  blur: 'Diffuses both new and existing trail frames. High values turn sharp props into clouds.',
  expansion: 'Changes trail size every frame. Positive values expand outward; negative values collapse inward.',
  spin: 'Rotates old trail frames around the image center. Positive and negative values spin in opposite directions.',
  driftX: 'Moves old trail frames sideways. Negative values move left; positive values move right.',
  driftY: 'Moves old trail frames vertically. Negative values rise; positive values fall.',
  hue: 'Sets the trail’s starting color.',
  cycle: 'Controls how quickly the trail moves through different colors. Zero keeps one color.',
  saturation: 'Controls color strength. Zero is monochrome; 100 is highly saturated.',
  echo: 'Sets the delay between captured trail snapshots. Zero is continuous; higher values create separated echoes.',
};

export function App() {
  const [source, setSource] = useState<'camera' | 'upload'>('upload');
  const [preset, setPreset] = useState(INITIAL_PRESET);
  const [controls, setControls] = useState<EffectControls>(INITIAL_PRESET.defaults);
  const [resetKey, setResetKey] = useState(0);
  const [notice, setNotice] = useState('');
  const activeEffectType = getEffectType(preset.effectTypeId);
  const visiblePresets = presetsForEffectType(activeEffectType.id);

  function choosePreset(next: EffectPreset) {
    setPreset(next);
    setControls(next.defaults);
    setResetKey((key) => key + 1);
  }

  function chooseEffectType(next: EffectType) {
    const firstPreset = presetsForEffectType(next.id)[0];
    if (firstPreset) choosePreset(firstPreset);
  }

  function updateControl(key: keyof EffectControls, value: number) {
    setControls((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell">
      <header>
        <h1>After<span>image</span></h1>
        <div className="source-switch" aria-label="Video source">
          {(['camera', 'upload'] as const).map((item) => (
            <button key={item} className={source === item ? 'active' : ''} onClick={() => { setSource(item); setNotice(''); }}>{item === 'camera' ? 'Camera' : 'Upload'}</button>
          ))}
        </div>
        <button className="reset" onClick={() => choosePreset(INITIAL_PRESET)}>↺&nbsp; Reset</button>
      </header>

      <div className="workspace">
        <VideoStage source={source} effectTypeId={activeEffectType.id} controls={controls} resetKey={resetKey} onCameraError={(message) => setNotice(`Camera unavailable: ${message}`)} />
        <aside aria-label="Effects">
          <section className="effect-type-picker" aria-labelledby="effect-type-title">
            <div className="section-heading">
              <h2 id="effect-type-title">Effect type</h2>
              <span>Different drawing code</span>
            </div>
            <div className="effect-types">
              {EFFECT_TYPES.map((item) => (
                <button key={item.id} className={`effect-type ${activeEffectType.id === item.id ? 'active' : ''}`} onClick={() => chooseEffectType(item)}>
                  <span className="effect-type-badge">Base effect</span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="preset-picker" aria-labelledby="preset-title">
            <div className="section-heading">
              <h2 id="preset-title">Looks</h2>
              <span>Settings for {activeEffectType.name}</span>
            </div>
            <div className="presets">
              {visiblePresets.map((item) => (
                <button key={item.id} className={`preset ${item.id} ${preset.id === item.id ? 'active' : ''}`} onClick={() => choosePreset(item)} aria-describedby={`preset-${item.id}-help`}>
                  <span className="preset-art" aria-hidden="true" />
                  <strong>{item.name}</strong>
                  <span className="tooltip" role="tooltip" id={`preset-${item.id}-help`}>{item.description}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="controls">
            <ControlGroup title="Tracking">
              <Range name="sensitivity" label="Sensitivity" value={controls.sensitivity} onChange={(value) => updateControl('sensitivity', value)} />
              <Range name="isolation" label="Light isolation" value={controls.isolation} onChange={(value) => updateControl('isolation', value)} />
            </ControlGroup>
            <ControlGroup title="Trail shape">
              <Range name="trail" label="Trail" value={controls.trail} onChange={(value) => updateControl('trail', value)} />
              <Range name="intensity" label="Intensity" value={controls.intensity} onChange={(value) => updateControl('intensity', value)} />
              <Range name="glow" label="Glow" value={controls.glow} onChange={(value) => updateControl('glow', value)} />
              <Range name="blur" label="Blur" value={controls.blur} max={20} step={0.5} onChange={(value) => updateControl('blur', value)} />
            </ControlGroup>
            <ControlGroup title="Motion">
              <Range name="expansion" label="Expansion" value={controls.expansion} min={-100} onChange={(value) => updateControl('expansion', value)} />
              <Range name="spin" label="Spin" value={controls.spin} min={-100} onChange={(value) => updateControl('spin', value)} />
              <Range name="driftX" label="Horizontal drift" value={controls.driftX} min={-100} onChange={(value) => updateControl('driftX', value)} />
              <Range name="driftY" label="Vertical drift" value={controls.driftY} min={-100} onChange={(value) => updateControl('driftY', value)} />
            </ControlGroup>
            <ControlGroup title="Color & rhythm">
              <Range name="hue" label="Hue" value={controls.hue} max={360} onChange={(value) => updateControl('hue', value)} />
              <Range name="cycle" label="Color cycle" value={controls.cycle} onChange={(value) => updateControl('cycle', value)} />
              <Range name="saturation" label="Saturation" value={controls.saturation} onChange={(value) => updateControl('saturation', value)} />
              <Range name="echo" label="Echo gap" value={controls.echo} max={500} step={10} suffix=" ms" onChange={(value) => updateControl('echo', value)} />
            </ControlGroup>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </aside>
      </div>
    </main>
  );
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="control-group"><h2>{title}</h2>{children}</section>;
}

function Range({ name, label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }: { name: keyof EffectControls; label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const id = `control-${name}`;
  return (
    <div className="range-row">
      <div className="range-label">
        <span><label htmlFor={id}>{label}</label><Help label={label} text={HELP[name]} /></span>
        <output htmlFor={id}>{value}{suffix}</output>
      </div>
      <input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function Help({ label, text }: { label: string; text: string }) {
  return <button type="button" className="help" aria-label={`Explain ${label}`}>?<span className="tooltip" role="tooltip">{text}</span></button>;
}
