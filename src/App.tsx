import { useState } from 'react';
import { BLEND_MODES, DEFAULT_COMPOSITE_CONTROLS, PRESETS, type CompositeControls, type EffectControls, type EffectPreset } from './effects';
import { PATTERN_CONTROL_DEFAULTS, type PoiControls } from './pixelPoi';
import { isPatternId, PATTERN_PRESETS, type PatternCategory } from './pixelPoiPatterns';
import { VideoStage } from './VideoStage';

const INITIAL_PRESET = PRESETS[0];
type PresetCategory = PatternCategory | 'classic';
const PRESET_CATEGORIES: { id: PresetCategory; label: string; description: string }[] = [
  { id: 'geometric', label: 'Geometric', description: '9 structured motion patterns' },
  { id: 'psychedelic', label: 'Psychedelic', description: '6 fluid, high-color patterns' },
  { id: 'classic', label: 'Classic', description: '4 full-frame effects' },
];
const PATTERN_CATEGORY_BY_ID = new Map(PATTERN_PRESETS.map(({ id, category }) => [id, category]));
const HELP: Record<keyof EffectControls, string> = {
  sensitivity: 'How much frame-to-frame change counts as movement. Raise it for subtle motion; lower it if background noise flickers.',
  isolation: 'Brightness gate for tracking. Raise it until your body disappears; lower it if the clubs stop leaving trails.',
  trail: 'How long previous club positions remain visible. Higher values create longer trails.',
  intensity: 'Controls the opacity of the processed trail without changing the original video.',
  glow: 'Adds a soft halo around the trail. The top of the range is deliberately intense.',
  blur: 'Diffuses both new and existing trail frames.',
  expansion: 'Changes trail size every frame. Positive values expand outward; negative values collapse inward.',
  spin: 'Rotates old trail frames around the image center.',
  driftX: 'Moves old trail frames sideways.',
  driftY: 'Moves old trail frames vertically.',
  hue: 'Sets the trail’s starting color.',
  cycle: 'Controls how quickly the trail moves through different colors.',
  saturation: 'Controls color strength.',
  echo: 'Sets the delay between captured trail snapshots.',
};

const POI_HELP: Record<keyof PoiControls, string> = {
  lifetime: 'How long the trails and particles remain visible before fading.',
  brightness: 'Overall intensity of the glowing trail colors.',
  glow: 'Outer soft bloom size around the trails.',
  smoothing: 'Smoothes tracking jitter. Higher values reduce jitter but add input lag.',
  lostReset: 'Time before a lost club is completely untracked.',
  railSeparation: 'Distance between the parallel neon trails.',
  crossbarFrequency: 'Deprecated: Spacing of horizontal ladder lines.',
  ribbonWidth: 'Thickness of the continuous gradient ribbon.',
  cellDensity: 'Spacing of nodes inside the ribbon.',
  echoCount: 'Number of duplicated wireframe echo clones.',
  echoSpacing: 'Distance between echo clones or concentric portals/eyes.',
  branching: 'Controls particle orbit density or electricity splitting.',
  turbulence: 'Wiggle amount of electric lightning arcs.',
  latticeDensity: 'Spacing of lines in the lattice network or tunnel layers.',
  strandCount: 'Number of coiling strands or color bands.',
  waveAmplitude: 'Height of coiling waves, orbit radius, portal ripples, or melting drips.',
  shardCount: 'Number of crystal particles emitted at the apex.',
  shardSpread: 'Explosion velocity of apex crystal particles.',
  tileSpacing: 'Spacing of mosaic nodes, blooms, or spore colonies.',
  shapeMix: 'Scales custom shape sizes or mixes geometries.',
  radialSymmetry: 'Number of mirror segments in the kaleidoscope or star points in the tunnel.',
};

export function App() {
  const [source, setSource] = useState<'camera' | 'upload'>('upload');
  const [preset, setPreset] = useState(INITIAL_PRESET);
  const [controls, setControls] = useState<EffectControls>(INITIAL_PRESET.defaults);
  const [composite, setComposite] = useState<CompositeControls>(DEFAULT_COMPOSITE_CONTROLS);
  const [poiControls, setPoiControls] = useState(PATTERN_CONTROL_DEFAULTS['neon-rails']);
  const [poiImageUrl, setPoiImageUrl] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [activeCategory, setActiveCategory] = useState<PresetCategory>('geometric');
  const clubPreset = isPatternId(preset.id);
  const visiblePresets = PRESETS.filter((item) => activeCategory === 'classic' ? !isPatternId(item.id) : isPatternId(item.id) && PATTERN_CATEGORY_BY_ID.get(item.id) === activeCategory);

  function choosePreset(next: EffectPreset, mode: 'current' | 'defaults' = 'defaults') {
    setPreset(next);
    setActiveCategory(isPatternId(next.id) ? PATTERN_CATEGORY_BY_ID.get(next.id)! : 'classic');
    if (!isPatternId(next.id) || mode === 'defaults') setControls(next.defaults);
    if (isPatternId(next.id) && mode === 'defaults') setPoiControls(PATTERN_CONTROL_DEFAULTS[next.id]);
    setResetKey((key) => key + 1);
  }

  function updateControl(key: keyof EffectControls, value: number) {
    setControls((current) => ({ ...current, [key]: value }));
  }

  function updatePoiControl(key: keyof PoiControls, value: number) {
    setPoiControls((current) => ({ ...current, [key]: value }));
  }

  function resetAll() {
    choosePreset(INITIAL_PRESET);
    setComposite(DEFAULT_COMPOSITE_CONTROLS);
  }

  function loadPoiImage(file?: File) {
    if (!file?.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setPoiImageUrl(String(reader.result));
    reader.readAsDataURL(file);
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
        <button className="reset" onClick={resetAll}>↺&nbsp; Reset</button>
      </header>

      <div className="workspace">
        <VideoStage source={source} preset={preset} controls={controls} composite={composite} resetKey={resetKey} poiControls={poiControls} poiImageUrl={poiImageUrl} onCameraError={(message) => setNotice(`Camera unavailable: ${message}`)} />
        <aside aria-label="Effects">
          <nav className="pattern-categories" aria-label="Pattern categories" role="tablist">
            {PRESET_CATEGORIES.map((category) => (
              <button key={category.id} id={`category-${category.id}`} role="tab" aria-selected={activeCategory === category.id} aria-controls="preset-panel" onClick={() => setActiveCategory(category.id)}>
                {category.label}<span>{category.id === 'geometric' ? 9 : category.id === 'psychedelic' ? 6 : 4}</span>
              </button>
            ))}
          </nav>
          <div className="category-heading">
            <h2>{PRESET_CATEGORIES.find(({ id }) => id === activeCategory)!.label}</h2>
            <p>{PRESET_CATEGORIES.find(({ id }) => id === activeCategory)!.description}</p>
          </div>
          <div className="presets" id="preset-panel" role="tabpanel" aria-labelledby={`category-${activeCategory}`} tabIndex={0}>
            {visiblePresets.map((item) => isPatternId(item.id) ? (
              <PatternCard key={item.id} item={item} active={preset.id === item.id} onActivate={(mode) => choosePreset(item, mode)} />
            ) : (
              <button key={item.id} className={`preset ${item.id} ${preset.id === item.id ? 'active' : ''}`} onClick={() => choosePreset(item)} aria-describedby={`preset-${item.id}-help`}>
                <span className="preset-art" aria-hidden="true" />
                <strong>{item.name}</strong>
                <span className="tooltip" role="tooltip" id={`preset-${item.id}-help`}>{item.description}</span>
              </button>
            ))}
          </div>

          <div className="controls">
            <ControlGroup title="Tracking">
              <Range name="sensitivity" label="Sensitivity" value={controls.sensitivity} onChange={(value) => updateControl('sensitivity', value)} />
              <Range name="isolation" label="Light isolation" value={controls.isolation} onChange={(value) => updateControl('isolation', value)} />
              {clubPreset && <PoiRange name="smoothing" label="Pose smoothing" value={poiControls.smoothing} min={0} max={100} suffix="%" onChange={updatePoiControl} />}
            </ControlGroup>

            {clubPreset ? (
              <>
                <ControlGroup title="Trail material">
                  <PoiRange name="lifetime" label="Lifetime" value={poiControls.lifetime} min={0} max={5000} step={50} suffix=" ms" onChange={updatePoiControl} />
                  <PoiRange name="brightness" label="Brightness" value={poiControls.brightness} min={0} max={100} suffix="%" onChange={updatePoiControl} />
                  <PoiRange name="glow" label="Glow" value={poiControls.glow} suffix="%" onChange={updatePoiControl} />
                </ControlGroup>
                <PatternControls preset={preset.id} controls={poiControls} update={updatePoiControl} loadImage={loadPoiImage} hasImage={Boolean(poiImageUrl)} />
              </>
            ) : (
              <>
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
              </>
            )}

            <ControlGroup title="Compositing">
              <label className="mode-row" htmlFor="invert-effect">
                <input id="invert-effect" type="checkbox" checked={composite.invert} onChange={(event) => setComposite((current) => ({ ...current, invert: event.target.checked }))} />
                <span>Invert effect colors</span>
              </label>
              <label className="select-row" htmlFor="blend-mode">
                <span>Blend mode</span>
                <select id="blend-mode" value={composite.blendMode} onChange={(event) => setComposite((current) => ({ ...current, blendMode: event.target.value as CompositeControls['blendMode'] }))}>
                  {BLEND_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </ControlGroup>
          </div>
          {notice && <p className="notice" role="status">{notice}</p>}
        </aside>
      </div>
    </main>
  );
}

function PatternCard({ item, active, onActivate }: { item: EffectPreset; active: boolean; onActivate: (mode: 'current' | 'defaults') => void }) {
  const helpId = `preset-${item.id}-help`;
  return (
    <section 
      className={`preset-card ${item.id} ${active ? 'active' : ''}`} 
      aria-label={item.name} 
      aria-describedby={helpId}
      style={{ cursor: active ? 'default' : 'pointer' }}
      onClick={(e) => {
        if (!active) {
          onActivate('defaults');
        }
      }}
    >
      <div className="preset-summary">
        <span className="preset-art" aria-hidden="true" />
        <strong>{item.name}</strong>
        {active && <span className="active-mark">Active</span>}
      </div>
      <small className="preset-description" id={helpId}>{item.description}</small>
      <div className="preset-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onActivate('current')} aria-label={`Use ${item.name} with current settings`}>Use current</button>
        <button type="button" className="use-defaults" onClick={() => onActivate('defaults')} aria-label={`Use ${item.name} with default settings`}>Use defaults</button>
      </div>
    </section>
  );
}

function PatternControls({ preset, controls, update, loadImage, hasImage }: { preset: string; controls: PoiControls; update: (key: keyof PoiControls, value: number) => void; loadImage: (file?: File) => void; hasImage: boolean }) {
  if (preset === 'neon-rails') return <ControlGroup title="Rail geometry"><PoiRange name="railSeparation" label="Rail separation" value={controls.railSeparation} min={-30} max={250} suffix="%" onChange={update} /><PoiRange name="crossbarFrequency" label="Crossbar spacing" value={controls.crossbarFrequency} min={1} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'prism-ribbon') return <ControlGroup title="Ribbon geometry"><PoiRange name="ribbonWidth" label="Ribbon width" value={controls.ribbonWidth} min={-30} max={250} suffix="%" onChange={update} /><PoiRange name="cellDensity" label="Cell spacing" value={controls.cellDensity} min={1} max={120} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'chromatic-echoes') return <ControlGroup title="Echo geometry"><PoiRange name="echoCount" label="Echo count" value={controls.echoCount} min={1} max={30} onChange={update} /><PoiRange name="echoSpacing" label="Echo spacing" value={controls.echoSpacing} min={1} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'electric-comets') return <ControlGroup title="Particle geometry"><PoiRange name="branching" label="Branching" value={controls.branching} min={0} max={100} suffix="%" onChange={update} /><PoiRange name="turbulence" label="Turbulence" value={controls.turbulence} min={0} max={100} suffix="%" onChange={update} /></ControlGroup>;
  if (preset === 'kinetic-lattice') return <ControlGroup title="Lattice geometry"><PoiRange name="latticeDensity" label="Pose spacing" value={controls.latticeDensity} min={1} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'psychedelic-serpent') return <ControlGroup title="Serpent geometry"><PoiRange name="strandCount" label="Strand count" value={controls.strandCount} min={1} max={15} onChange={update} /><PoiRange name="waveAmplitude" label="Wave amplitude" value={controls.waveAmplitude} min={0} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'apex-shatter') return <ControlGroup title="Burst geometry"><PoiRange name="shardCount" label="Shard count" value={controls.shardCount} min={1} max={50} onChange={update} /><PoiRange name="shardSpread" label="Shard spread" value={controls.shardSpread} min={0} max={250} suffix="%" onChange={update} /></ControlGroup>;
  if (preset === 'pixel-mosaic') return <ControlGroup title="Mosaic geometry"><PoiRange name="tileSpacing" label="Tile spacing" value={controls.tileSpacing} min={1} max={150} suffix=" px" onChange={update} /><PoiRange name="shapeMix" label="Shape mix" value={controls.shapeMix} min={0} max={100} suffix="%" onChange={update} /></ControlGroup>;
  if (preset === 'radial-pov') return <ControlGroup title="Radial POV"><PoiRange name="radialSymmetry" label="Symmetry" value={controls.radialSymmetry} min={1} max={32} onChange={update} /><label className="file-button">{hasImage ? 'Replace POV image' : 'Upload POV image'}<input type="file" accept="image/*" onChange={(event) => loadImage(event.target.files?.[0])} /></label></ControlGroup>;
  if (preset === 'acid-blooms') return <ControlGroup title="Acid blooms"><PoiRange name="radialSymmetry" label="Petal count" value={controls.radialSymmetry} min={1} max={32} onChange={update} /><PoiRange name="tileSpacing" label="Bloom spacing" value={controls.tileSpacing} min={1} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'liquid-portal') return <ControlGroup title="Liquid portals"><PoiRange name="echoSpacing" label="Portal spacing" value={controls.echoSpacing} min={1} max={150} suffix=" px" onChange={update} /><PoiRange name="waveAmplitude" label="Ripple amount" value={controls.waveAmplitude} min={0} max={150} onChange={update} /></ControlGroup>;
  if (preset === 'kaleido-tunnel') return <ControlGroup title="Kaleido tunnel"><PoiRange name="radialSymmetry" label="Star points" value={controls.radialSymmetry} min={1} max={32} onChange={update} /><PoiRange name="latticeDensity" label="Wheel spacing" value={controls.latticeDensity} min={1} max={150} suffix=" px" onChange={update} /></ControlGroup>;
  if (preset === 'melting-rainbow') return <ControlGroup title="Melting rainbow"><PoiRange name="strandCount" label="Color bands" value={controls.strandCount} min={1} max={20} onChange={update} /><PoiRange name="waveAmplitude" label="Melt amount" value={controls.waveAmplitude} min={0} max={150} onChange={update} /></ControlGroup>;
  if (preset === 'hypno-eyes') return <ControlGroup title="Hypno eyes"><PoiRange name="echoSpacing" label="Eye spacing" value={controls.echoSpacing} min={1} max={150} suffix=" px" onChange={update} /><PoiRange name="shapeMix" label="Eye size" value={controls.shapeMix} min={0} max={100} suffix="%" onChange={update} /></ControlGroup>;
  return <ControlGroup title="Cosmic spores"><PoiRange name="tileSpacing" label="Colony spacing" value={controls.tileSpacing} min={1} max={150} suffix=" px" onChange={update} /><PoiRange name="branching" label="Orbit density" value={controls.branching} min={0} max={100} suffix="%" onChange={update} /><PoiRange name="waveAmplitude" label="Orbit radius" value={controls.waveAmplitude} min={0} max={150} onChange={update} /></ControlGroup>;
}

function PoiRange({ name, label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }: { name: keyof PoiControls; label: string; value: number; onChange: (key: keyof PoiControls, value: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const id = `poi-${name}`;
  return <div className="range-row"><div className="range-label"><span><label htmlFor={id}>{label}</label><Help label={label} text={POI_HELP[name]} /></span><output htmlFor={id}>{value}{suffix}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(name, Number(event.target.value))} /></div>;
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="control-group"><h2>{title}</h2>{children}</section>;
}

function Range({ name, label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }: { name: keyof EffectControls; label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const id = `control-${name}`;
  return <div className="range-row"><div className="range-label"><span><label htmlFor={id}>{label}</label><Help label={label} text={HELP[name]} /></span><output htmlFor={id}>{value}{suffix}</output></div><input id={id} aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}

function Help({ label, text }: { label: string; text: string }) {
  return <button type="button" className="help" aria-label={`Explain ${label}`}>?<span className="tooltip" role="tooltip">{text}</span></button>;
}
