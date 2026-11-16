/**
 * `matrix`: falling characters in the terminal panel, on a canvas at ~24 fps. Space pauses, q /
 * Esc / Ctrl+C quit. requestAnimationFrame pauses by itself in background tabs; with reduced
 * motion only one still frame is drawn.
 */
import { useEffect, useRef, useState } from 'react';
import { Hint, isQuit, isSpace, reducedMotion, useKeys, type ProgramProps } from './common';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789NEVCAN<>/{}=';
const SIZE = 15;

export default function Matrix({ exit }: ProgramProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const still = reducedMotion();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useKeys((e) => {
    if (isQuit(e)) {
      e.preventDefault();
      exit();
    } else if (isSpace(e) && !still) {
      e.preventDefault();
      setPaused((p) => !p);
    }
  });

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let drops: number[] = [];
    const resize = () => {
      const { width, height } = c.getBoundingClientRect();
      c.width = width * dpr;
      c.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#10161e';
      ctx.fillRect(0, 0, width, height);
      drops = Array.from({ length: Math.ceil(width / SIZE) }, () => Math.random() * -40);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const frame = () => {
      const { width, height } = c.getBoundingClientRect();
      ctx.fillStyle = 'rgba(16, 22, 30, 0.14)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${SIZE}px 'JetBrains Mono Variable', monospace`;
      drops.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        ctx.fillStyle = Math.random() < 0.06 ? '#e8fffb' : '#6ff7e0';
        ctx.fillText(ch, i * SIZE, y * SIZE);
        drops[i] = y * SIZE > height && Math.random() > 0.97 ? 0 : y + 1;
      });
    };

    if (still) {
      for (let i = 0; i < 60; i++) frame();
      return () => ro.disconnect();
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 42 && !pausedRef.current) {
        frame();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [still]);

  return (
    <div className="prog-canvas">
      <canvas ref={canvas} aria-label="Falling green characters" />
      <Hint
        keys={
          still
            ? [['q', 'quit']]
            : [
                ['space', paused ? 'go on' : 'pause'],
                ['q', 'quit'],
              ]
        }
      />
    </div>
  );
}
