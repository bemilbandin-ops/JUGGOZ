import { useEffect, useRef, useState } from 'react';
import { extractMotion, lightThreshold, motionThreshold, type EffectControls } from './effects';
import { createEffectRenderer } from './effectTypes';
import type { EffectTypeId } from './effectModel';

type Props = {
  source: 'camera' | 'upload';
  effectTypeId: EffectTypeId;
  controls: EffectControls;
  resetKey: number;
  onCameraError: (message: string) => void;
};

export function VideoStage({ source, effectTypeId, controls, resetKey, onCameraError }: Props) {
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
  const effectRef = useRef({ effectTypeId, controls });

  useEffect(() => {
    effectRef.current = { effectTypeId, controls };
  }, [effectTypeId, controls]);

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
    const renderer = createEffectRenderer(effectTypeId);
    let background: Float32Array | null = null;
    let mask: ImageData | null = null;
    let frame = 0;
    let quality = 400;
    let slowFrames = 0;
    let lastFrameAt = performance.now();
    let lastUiUpdate = 0;

    const resize = () => {
      const aspect = video.videoWidth / video.videoHeight || 16 / 9;
      const width = Math.min(1280, video.videoWidth || 1280);
      const height = Math.round(width / aspect);
      canvas.width = width;
      canvas.height = height;
      trackCanvas.width = quality;
      trackCanvas.height = Math.round(quality / aspect);
      renderer.resize(trackCanvas.width, trackCanvas.height);
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
      const settings = effectRef.current.controls;
      extractMotion(current, background, mask, motionThreshold(settings.sensitivity), lightThreshold(settings.isolation));
      trackCtx.putImageData(mask, 0, 0);

      renderer.render({
        now,
        output: ctx,
        mask: trackCanvas,
        displayWidth: canvas.width,
        displayHeight: canvas.height,
        controls: settings,
      });

      if (source === 'upload' && now - lastUiUpdate > 200) {
        lastUiUpdate = now;
        setTime(video.currentTime);
      }
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [ready, resetKey, source, effectTypeId]);

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
