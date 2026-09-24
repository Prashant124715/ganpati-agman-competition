/**
 * Lightweight, high-performance hero interaction.
 * Zero external libraries (Three.js eliminated - saving 600KB+).
 * Mobile-first: disables heavy animations on touch devices/small screens.
 * Uses IntersectionObserver to sleep completely when scrolled offscreen.
 */
(() => {
  const container = document.getElementById("hero3dContainer");
  const card = document.getElementById("hero3dCard");
  const canvasWrap = document.getElementById("hero3dCanvas");
  if (!container || !card) return;

  const isTouchDevice = window.matchMedia("(hover: none)").matches || window.innerWidth < 768;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Touch / Mobile: Keep completely static and lightweight for instant performance
  if (isTouchDevice || prefersReduced) {
    return;
  }

  // Desktop with pointer: Subtle, smooth 3D tilt with zero jank
  let isVisible = true;
  let rafId = null;
  let mouseX = 0;
  let mouseY = 0;
  let currentTiltX = 0;
  let currentTiltY = 0;

  // Sleep when scrolled offscreen to conserve CPU/GPU
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (!isVisible && rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        } else if (isVisible && !rafId) {
          rafId = requestAnimationFrame(updateTilt);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);
  }

  function onMouseMove(e) {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseX = (x / rect.width) * 2 - 1;
    mouseY = (y / rect.height) * 2 - 1;

    if (!rafId && isVisible) {
      rafId = requestAnimationFrame(updateTilt);
    }
  }

  function onMouseLeave() {
    mouseX = 0;
    mouseY = 0;
  }

  function updateTilt() {
    if (!isVisible) {
      rafId = null;
      return;
    }

    // Smooth lerp
    currentTiltX += (mouseY * 8 - currentTiltX) * 0.08;
    currentTiltY += (-mouseX * 8 - currentTiltY) * 0.08;

    const absDiff = Math.abs(currentTiltX) + Math.abs(currentTiltY);

    if (card) {
      card.style.transform = `perspective(1000px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;
    }

    // If resting at center, pause loop
    if (mouseX === 0 && mouseY === 0 && absDiff < 0.05) {
      card.style.transform = "";
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(updateTilt);
  }

  container.addEventListener("mousemove", onMouseMove, { passive: true });
  container.addEventListener("mouseleave", onMouseLeave, { passive: true });

  // Optional: Tiny lightweight ambient gold sparkles (Canvas 2D, ~25 particles, only on desktop)
  if (canvasWrap && window.innerWidth >= 1024) {
    const canvas = document.createElement("canvas");
    canvas.className = "hero-particles-canvas";
    canvasWrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let width = (canvas.width = canvasWrap.clientWidth);
    let height = (canvas.height = canvasWrap.clientHeight);

    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 1,
      speedY: Math.random() * 0.4 + 0.15,
      speedX: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.4 ? "245, 194, 82" : "200, 75, 26",
    }));

    function resizeCanvas() {
      if (!canvasWrap) return;
      width = canvas.width = canvasWrap.clientWidth;
      height = canvas.height = canvasWrap.clientHeight;
    }
    window.addEventListener("resize", resizeCanvas, { passive: true });

    function drawParticles() {
      if (!isVisible) {
        requestAnimationFrame(drawParticles);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speedY;
        p.x += p.speedX;

        if (p.y < 0) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.fill();
      }

      requestAnimationFrame(drawParticles);
    }

    requestAnimationFrame(drawParticles);
  }
})();
