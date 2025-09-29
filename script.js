(() => {
  const overlay = document.getElementById('entry-overlay');
  const canvas = document.getElementById('orbits');
  const btn = document.getElementById('enter-btn');
  const site = document.getElementById('site');
  const ctx = canvas.getContext('2d');

  let dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0, h = 0, cx = 0, cy = 0;
  const rings = [90, 170, 260, 360];
  const particles = [];
  const stars = [];
  const arcs = [];
  const comets = [];
  const shapes = ['diamond', 'triangle', 'square'];
  let mouse = { x: 0, y: 0, vx: 0, vy: 0 };

  function resize() {
    w = canvas.clientWidth = overlay.clientWidth;
    h = canvas.clientHeight = overlay.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h / 2 - Math.min(120, h * 0.06);
  }

  window.addEventListener('resize', resize);
  resize();

  // Initialize particles
  const MAX = 140;
  for (let i = 0; i < MAX; i++) {
    const ringIndex = Math.floor(Math.random() * rings.length);
    const baseR = rings[ringIndex] + (Math.random() * 22 - 11);
    particles.push({
      angle: Math.random() * Math.PI * 2,
      speed: (0.002 + Math.random() * 0.004) * (ringIndex % 2 === 0 ? 1 : -1),
      radius: baseR,
      size: 2 + Math.random() * 2.5,
      hue: 190 + Math.random() * 120,
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    });
  }

  // Subtle background stars
  const STAR_MAX = 80;
  for (let i = 0; i < STAR_MAX; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.2 + 0.4,
      tw: Math.random() * 2 * Math.PI,
      sp: 0.005 + Math.random() * 0.01
    });
  }

  // Arc segments that rotate slowly
  for (let i = 0; i < rings.length; i++) {
    const segCount = 6 + i * 2;
    for (let s = 0; s < segCount; s++) {
      arcs.push({
        r: rings[i] - 12,
        start: (s / segCount) * Math.PI * 2,
        len: Math.PI / (8 + i),
        speed: (i % 2 === 0 ? 1 : -1) * (0.0006 + i * 0.0003)
      });
    }
  }

  function spawnComet() {
    const r = rings[rings.length - 1] + 40 + Math.random() * 60;
    comets.push({
      angle: Math.random() * Math.PI * 2,
      r,
      speed: -0.02 - Math.random() * 0.02,
      life: 1
    });
    if (comets.length > 3) comets.shift();
  }

  function drawBackground() {
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);

    // Concentric glow rings (not perfect circles for uniqueness)
    rings.forEach((r, idx) => {
      ctx.beginPath();
      const steps = 120;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2;
        const wobble = Math.sin(t * (1.5 + idx * 0.25)) * 4 * (idx + 1) * 0.25;
        const rr = r + wobble;
        const x = Math.cos(t) * rr;
        const y = Math.sin(t) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const alpha = 0.4 - idx * 0.07;
      ctx.strokeStyle = `rgba(160, 220, 255, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // Center bloom
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 110);
    gradient.addColorStop(0, 'rgba(120, 240, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(120, 240, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.fill();
    // Arc segments
    ctx.save();
    ctx.strokeStyle = 'rgba(140, 220, 255, 0.35)';
    ctx.lineWidth = 2;
    arcs.forEach(a => {
      a.start += a.speed;
      ctx.beginPath();
      ctx.arc(0, 0, a.r, a.start, a.start + a.len);
      ctx.stroke();
    });
    ctx.restore();

    ctx.restore();
  }

  function drawShape(x, y, size, shape, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((x + y) * 0.0008);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.25;
    switch (shape) {
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size, 0);
        ctx.lineTo(0, size);
        ctx.lineTo(-size, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.95, size);
        ctx.lineTo(-size * 0.95, size);
        ctx.closePath();
        ctx.stroke();
        break;
      default:
        ctx.strokeRect(-size, -size, size * 2, size * 2);
    }
    ctx.restore();
  }

  function step(t) {
    // background field and rotating orbits
    drawBackground();

    // twinkle stars (screen space)
    ctx.save();
    stars.forEach(s => {
      s.tw += s.sp;
      const alpha = 0.3 + Math.sin(s.tw) * 0.3;
      ctx.fillStyle = `rgba(180, 240, 255, ${alpha})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
      s.x += 0.02; // slow drift
      if (s.x > w) s.x = 0;
    });
    ctx.restore();
    const parallaxX = (mouse.x - w / 2) * 0.02;
    const parallaxY = (mouse.y - h / 2) * 0.02;

    ctx.save();
    ctx.translate(cx + parallaxX, cy + parallaxY);

    for (let p of particles) {
      p.angle += p.speed;
      const x = Math.cos(p.angle) * p.radius;
      const y = Math.sin(p.angle) * p.radius;
      const color = `hsla(${p.hue}, 85%, 70%, 0.8)`;
      drawShape(x, y, p.size, p.shape, color);
    }

    // Comets with trails
    if (Math.random() < 0.01) spawnComet();
    comets.forEach(c => {
      c.angle += c.speed;
      c.life *= 0.985;
      const x = Math.cos(c.angle) * c.r;
      const y = Math.sin(c.angle) * c.r;
      const tx = Math.cos(c.angle + 0.4) * c.r * 0.96;
      const ty = Math.sin(c.angle + 0.4) * c.r * 0.96;
      const g = ctx.createLinearGradient(tx, ty, x, y);
      g.addColorStop(0, 'rgba(120, 240, 255, 0)');
      g.addColorStop(1, `rgba(120, 240, 255, ${0.6 * c.life})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    // Star in the center (squircle-ish)
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const x = Math.cos(a) * 14;
      const y = Math.sin(a) * 14;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(180, 245, 255, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.restore();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  // Interactivity
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  }, { passive: true });

  // Click or key to enter
  const exit = () => {
    if (!overlay) return;
    overlay.classList.add('overlay-exit');
    setTimeout(() => {
      overlay.remove();
      site.hidden = false;
      // trigger page entrance animations
      requestAnimationFrame(() => {
        const targets = [
          ...document.querySelectorAll('.nav, .hero > :not(.name-zoom), .section-title, .section p, .cta-row, .socials, .quote')
        ];
        targets.forEach((el, i) => {
          el.classList.add('will-reveal');
          setTimeout(() => el.classList.add('reveal'), 80 + i * 60);
        });

        // Ensure avatar loads: try common file names if the default fails
        const avatar = document.querySelector('.avatar-ring img');
        if (avatar) {
          const candidates = [
            'assets/avatar.jpg',
            'assets/avatar.jpeg',
            'assets/avatar.png',
          ];
          const tryNext = (idx) => {
            if (idx >= candidates.length) return; // fallback remains
            const test = new Image();
            test.onload = () => { avatar.src = candidates[idx]; };
            test.onerror = () => tryNext(idx + 1);
            test.src = candidates[idx] + '?v=' + Date.now();
          };
          // If current src is not loaded image, start probing
          if (!avatar.complete || avatar.naturalWidth === 0) tryNext(0);
        }
      });
    }, 620);
  };
  overlay.addEventListener('click', exit);
  btn && btn.addEventListener('click', exit);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') exit();
  });
})();


