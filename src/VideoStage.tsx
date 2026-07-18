import { useEffect, useRef, useState } from 'react';
import { effectLayerFilter, extractMotion, lightThreshold, motionThreshold, trailFade, trailTransform, type CompositeControls, type EffectControls, type EffectPreset } from './effects';
import { detectClubs, drawPoiLayer, updateTracks, type PoiControls, type PoiTrack } from './pixelPoi';
import { isPatternId } from './pixelPoiPatterns';

type Props = {
  source: 'camera' | 'upload';
  preset: EffectPreset;
  controls: EffectControls;
  composite: CompositeControls;
  resetKey: number;
  poiControls: PoiControls;
  poiImageUrl: string;
  onCameraError: (message: string) => void;
};

export function VideoStage({ source, preset, controls, composite, resetKey, poiControls, poiImageUrl, onCameraError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [fileName, setFileName] = useState('');
  const [startingCamera, setStartingCamera] = useState(false);
  const effectRef = useRef({ preset, controls, composite });
  const poiSettingsRef = useRef(poiControls);
  const poiImageRef = useRef<ImageData | null>(null);

  useEffect(() => {
    effectRef.current = { preset, controls, composite };
  }, [preset, controls, composite]);

  useEffect(() => {
    poiSettingsRef.current = poiControls;
  }, [poiControls]);

  useEffect(() => {
    poiImageRef.current = null;
    if (poiImageUrl) {
      const image = new Image();
      image.onload = () => {
        const pattern = document.createElement('canvas');
        pattern.width = 300;
        pattern.height = 180;
        const patternCtx = pattern.getContext('2d')!;
        const scale = Math.min(pattern.width / image.width, pattern.height / image.height);
        patternCtx.drawImage(image, (pattern.width - image.width * scale) / 2, (pattern.height - image.height * scale) / 2, image.width * scale, image.height * scale);
        poiImageRef.current = patternCtx.getImageData(0, 0, pattern.width, pattern.height);
      };
      image.src = poiImageUrl;
    }
  }, [poiImageUrl]);

  useEffect(() => {
    setReady(false);
    setPlaying(false);
    setStartingCamera(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    }
    return () => streamRef.current?.getTracks().forEach((track) => track.stop());
  }, [source]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return;

    const ctx = canvas.getContext('2d', { alpha: false })!;
    const trackCanvas = document.createElement('canvas');
    const trackCtx = trackCanvas.getContext('2d', { willReadFrequently: true })!;
    const trailCanvas = document.createElement('canvas');
    const trailCtx = trailCanvas.getContext('2d')!;
    const transformed = document.createElement('canvas');
    const transformedCtx = transformed.getContext('2d')!;
    const poiCanvas = document.createElement('canvas');
    const poiCtx = poiCanvas.getContext('2d')!;
    let tracks: PoiTrack[] = [];
    let nextTrackId = 1;
    let background: Float32Array | null = null;
    let mask: ImageData | null = null;
    let frame = 0;
    let lastSample = 0;
    let quality = 400;
    let slowFrames = 0;
    let lastFrameAt = performance.now();
    let lastUiUpdate = 0;

    const resize = () => {
      const aspect = video.videoWidth / video.videoHeight || 16 / 9;
      const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.min(1920, Math.round(Math.max(video.videoWidth || 0, canvas.clientWidth * pixelRatio || 1280)));
      const height = Math.round(width / aspect);
      canvas.width = width;
      canvas.height = height;
      trackCanvas.width = quality;
      trackCanvas.height = Math.round(quality / aspect);
      trailCanvas.width = transformed.width = trackCanvas.width;
      trailCanvas.height = transformed.height = trackCanvas.height;
      poiCanvas.width = canvas.width;
      poiCanvas.height = canvas.height;
      tracks = [];
      background = null;
      mask = null;
    };
    resize();

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (video.paused || video.ended || video.readyState < 2) return;

      const frameMs = now - lastFrameAt;
      lastFrameAt = now;
      slowFrames = frameMs > 27 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 45 && quality > 280) {
        quality = 280;
        slowFrames = 0;
        resize();
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'contrast(1.05) saturate(1.08)';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      trackCtx.drawImage(video, 0, 0, trackCanvas.width, trackCanvas.height);
      const current = trackCtx.getImageData(0, 0, trackCanvas.width, trackCanvas.height);
      if (!background) background = Float32Array.from(current.data);
      if (!mask) mask = new ImageData(trackCanvas.width, trackCanvas.height);
      const active = effectRef.current;
      const settings = active.controls;
      const compositing = active.composite;
      const activePreset = active.preset;
      extractMotion(current, background, mask, motionThreshold(settings.sensitivity), lightThreshold(settings.isolation));
      trackCtx.putImageData(mask, 0, 0);

      if (isPatternId(activePreset.id)) {
        const image = poiImageRef.current;
        const poi = poiSettingsRef.current;
        tracks = updateTracks(tracks, detectClubs(mask), now, poi, activePreset.id, () => nextTrackId++);
        poiCtx.setTransform(1, 0, 0, 1, 0, 0);
        poiCtx.clearRect(0, 0, poiCanvas.width, poiCanvas.height);
        poiCtx.save();
        poiCtx.scale(poiCanvas.width / trackCanvas.width, poiCanvas.height / trackCanvas.height);
        drawPoiLayer(poiCtx, tracks, now, poi, activePreset.id, activePreset.id === 'radial-pov' ? image : null);
        poiCtx.restore();
        ctx.globalCompositeOperation = compositing.blendMode;
        if (poi.glow > 0) {
          ctx.save();
          ctx.globalAlpha = poi.glow / 150;
          ctx.filter = effectLayerFilter(compositing.invert, `blur(${Math.max(2, poi.glow * 0.065)}px)`);
          ctx.drawImage(poiCanvas, 0, 0);
          ctx.restore();
        }
        ctx.globalAlpha = Math.min(1, poi.brightness / 82);
        ctx.filter = effectLayerFilter(compositing.invert);
        ctx.drawImage(poiCanvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (source === 'upload' && now - lastUiUpdate > 200) {
          lastUiUpdate = now;
          setTime(video.currentTime);
        }
        return;
      }

      transformedCtx.clearRect(0, 0, transformed.width, transformed.height);
      transformedCtx.filter = settings.blur > 0 ? `blur(${settings.blur * 0.08}px)` : 'none';
      transformedCtx.drawImage(trailCanvas, 0, 0);
      transformedCtx.filter = 'none';
      trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailCtx.save();
      const transform = trailTransform(settings);
      trailCtx.translate(trailCanvas.width / 2, trailCanvas.height / 2);
      trailCtx.rotate(transform.rotation);
      trailCtx.scale(transform.zoom, transform.zoom);
      trailCtx.translate(
        -trailCanvas.width / 2 + transform.dx,
        -trailCanvas.height / 2 + transform.dy,
      );
      trailCtx.drawImage(transformed, 0, 0);
      trailCtx.restore();

      trailCtx.globalCompositeOperation = 'destination-out';
      trailCtx.fillStyle = `rgba(0,0,0,${trailFade(settings.trail)})`;
      trailCtx.fillRect(0, 0, trailCanvas.width, trailCanvas.height);
      trailCtx.globalCompositeOperation = 'source-over';

      if (!settings.echo || now - lastSample >= settings.echo) {
        lastSample = now;
        const hue = (settings.hue + now * settings.cycle * 0.0006) % 360;
        const blur = Math.max(0.35, settings.blur);
        trailCtx.filter = `brightness(.7) contrast(1.45) sepia(1) saturate(${settings.saturation / 8}) hue-rotate(${hue}deg) blur(${blur}px)`;
        trailCtx.drawImage(trackCanvas, 0, 0);
        trailCtx.filter = 'none';
      }

      ctx.globalCompositeOperation = compositing.blendMode;
      if (settings.glow > 0) {
        ctx.save();
        ctx.globalAlpha = settings.glow / 100 * settings.intensity / 100;
        ctx.filter = effectLayerFilter(compositing.invert, `blur(${settings.glow / 10}px)`);
        ctx.drawImage(trailCanvas, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      ctx.globalAlpha = settings.intensity / 100;
      ctx.filter = effectLayerFilter(compositing.invert);
      ctx.drawImage(trailCanvas, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      if (source === 'upload' && now - lastUiUpdate > 200) {
        lastUiUpdate = now;
        setTime(video.currentTime);
      }
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [ready, resetKey, source]);

  async function startCamera() {
    if (startingCamera) return;
    setStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setReady(true);
      setPlaying(true);
    } catch (error) {
      onCameraError(error instanceof Error ? error.message : 'Camera unavailable');
    } finally {
      setStartingCamera(false);
    }
  }

  function loadFile(file?: File) {
    if (!file?.type.startsWith('video/')) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    const video = videoRef.current!;
    video.srcObject = null;
    video.src = objectUrlRef.current;
    video.loop = true;
    video.onloadedmetadata = async () => {
      setDuration(video.duration);
      setReady(true);
      setFileName(file.name);
      await video.play();
      setPlaying(true);
    };
  }

  function togglePlayback() {
    const video = videoRef.current!;
    if (video.paused) void video.play(); else video.pause();
  }

  return (
    <section className="stage" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); }}>
      <video ref={videoRef} muted playsInline hidden onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <canvas ref={canvasRef} className={ready ? 'is-ready' : ''} aria-label="Processed video output" />
      {!ready && (
        <button className="empty-stage" disabled={startingCamera} onClick={() => source === 'upload' ? fileRef.current?.click() : void startCamera()}>
          <span className="upload-mark" aria-hidden="true">↑</span>
          <strong>{startingCamera ? 'Waiting for camera permission…' : source === 'camera' ? 'Start camera' : 'Drop a video or choose a file'}</strong>
          <small>{source === 'camera' ? 'Your camera stays in this browser' : 'MP4, WebM or MOV'}</small>
        </button>
      )}
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={(event) => loadFile(event.target.files?.[0])} />
      {source === 'upload' && ready && (
        <div className="transport">
          <button onClick={togglePlayback} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? 'Ⅱ' : '▶'}</button>
          <span>{formatTime(time)} / {formatTime(duration)}</span>
          <input aria-label="Video position" type="range" min="0" max={duration || 0} step="0.01" value={time} onChange={(event) => { videoRef.current!.currentTime = Number(event.target.value); setTime(Number(event.target.value)); }} />
          <span className="filename">{fileName}</span>
        </div>
      )}
    </section>
  );
}

function formatTime(seconds: number) {
  const value = Number.isFinite(seconds) ? seconds : 0;
  return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`;
}
