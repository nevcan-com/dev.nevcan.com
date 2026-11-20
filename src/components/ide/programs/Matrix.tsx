/**
 * `matrix`: falling characters in the terminal panel, on a canvas at ~24 fps. q, Esc or Ctrl+C
 * quit. requestAnimationFrame pauses by itself in background tabs; with reduced motion only one
 * still frame is drawn.
 */
import { useEffect, useRef } from 'react';
import { Hint, isQuit, reducedMotion, useKeys, type ProgramProps } from './common';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789NEVCAN<>/{}=';
const SIZE = 15;

export default function Matrix({ exit }: ProgramProps) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useKeys((e) => {
    if (!isQuit(e)) return;
    e.preventDefault();
    exit();
  });

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    // the theme's colors: the panel behind, the accent falling, the strongest text for sparks
    const css = getComputedStyle(c);
    const bg = css.getPropertyValue('--panel').trim() || '#10161e';
    const fg = css.getPropertyValue('--accent').trim() || '#6ff7e0';
    const spark = css.getPropertyValue('--text-strong').trim() || '#e8fffb';
    let drops: number[] = [];
    const resize = () => {
      const { width, height } = c.getBoundingClientRect();
      c.width = width * dpr;
      c.height = height * dpr;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      drops = Array.from({ length: Math.ceil(width / SIZE) }, () => Math.random() * -40);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const frame = () => {
      const { width, height } = c.getBoundingClientRect();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.font = `${SIZE}px 'JetBrains Mono Variable', monospace`;
      drops.forEach((y, i) => {
        const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
        ctx.fillStyle = Math.random() < 0.06 ? spark : fg;
        ctx.fillText(ch, i * SIZE, y * SIZE);
        drops[i] = y * SIZE > height && Math.random() > 0.97 ? 0 : y + 1;
      });
    };

    if (reducedMotion()) {
      for (let i = 0; i < 60; i++) frame();
      return () => ro.disconnect();
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 42) {
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
  }, []);

  return (
    <div className="prog-canvas">
      <canvas ref={canvas} aria-label="Falling green characters" />
      <Hint keys={[['q', 'quit']]} />
    </div>
  );
}
