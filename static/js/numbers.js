// The numbers row: when it scrolls into view, each figure rolls in digit by digit, like the
// hero ledger's odometer. The real figure stays in the HTML for screen readers and without
// JavaScript; the wheels are decoration and hidden from assistive technology.
(() => {
  const row = document.querySelector("[data-numbers]");
  if (!row) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return;

  // Critically damped, so each wheel lands cleanly without bouncing past its digit.
  const STIFFNESS = 56;
  const DAMPING = 2 * Math.sqrt(STIFFNESS);
  const COLUMN_LAG = 140;
  const DIGIT_LAG = 90;
  const START_DELAY = 250;

  const element = (tag, className, parent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.append(node);
    return node;
  };

  const digits = [];

  [...row.querySelectorAll("[data-number]")].forEach((figure, column) => {
    const text = figure.textContent.trim();
    const label = element("span", "visually-hidden");
    label.textContent = text;
    const roll = element("span", "numbers__roll");
    roll.setAttribute("aria-hidden", "true");

    const count = (text.match(/\d/g) || []).length;
    let place = count;

    for (const character of text) {
      if (!/\d/.test(character)) {
        element("span", "numbers__mark", roll).textContent = character;
        continue;
      }
      place -= 1;
      const slot = element("span", "numbers__digit", roll);
      const strip = element("span", "numbers__strip", slot);
      // 0–9 and a second 0, so a wheel can turn past 9 into 0 without a jump.
      for (let n = 0; n <= 10; n += 1) element("span", "", strip).textContent = n % 10;

      const value = Number(character);
      // The leading digit counts straight up; lower places make one extra turn, as if the
      // figure were counted up. A wheel that would stay on 0 still turns once.
      const target = place === count - 1 && value > 0 ? value : value + 10;
      digits.push({ strip, position: 0, velocity: 0, target, delay: column * COLUMN_LAG + place * DIGIT_LAG, painted: NaN });
    }

    figure.closest(".numbers__item")?.style.setProperty("--i", column);
    figure.replaceChildren(label, roll);
  });

  const paint = () => {
    digits.forEach((digit) => {
      // Whole turns look identical, so the wheel shows the position modulo ten.
      const turn = ((digit.position % 10) + 10) % 10;
      if (Math.abs(turn - digit.painted) < 0.0005) return;
      digit.painted = turn;
      digit.strip.style.transform = `translate3d(0, ${(-turn / 11) * 100}%, 0)`;
      // A touch of motion blur while a wheel spins fast; none at rest.
      const blur = Math.min(Math.abs(digit.velocity) * 0.05, 1);
      digit.strip.style.filter = blur > 0.08 ? `blur(${blur.toFixed(2)}px)` : "";
    });
  };

  const finish = () => {
    digits.forEach((digit) => {
      digit.position = digit.target;
      digit.velocity = 0;
    });
    paint();
    row.classList.add("is-in");
  };

  let startTime = 0;
  let lastTime = 0;

  const frame = (time) => {
    if (reduceMotion.matches) {
      finish();
      return;
    }
    const dt = Math.min((time - (lastTime || time)) / 1000, 1 / 20);
    lastTime = time;
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    let moving = false;

    digits.forEach((digit) => {
      if (time - startTime < digit.delay) {
        moving = true;
        return;
      }
      if (digit.position === digit.target && digit.velocity === 0) return;
      for (let i = 0; i < steps; i += 1) {
        const acceleration = -STIFFNESS * (digit.position - digit.target) - DAMPING * digit.velocity;
        digit.velocity += acceleration * h;
        digit.position += digit.velocity * h;
      }
      if (Math.abs(digit.position - digit.target) < 0.002 && Math.abs(digit.velocity) < 0.01) {
        digit.position = digit.target;
        digit.velocity = 0;
      } else {
        moving = true;
      }
    });

    paint();
    if (moving) requestAnimationFrame(frame);
  };

  paint();
  row.classList.add("is-armed");

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      // Let the armed state paint before drawing the rules in.
      requestAnimationFrame(() => {
        row.classList.add("is-in");
        startTime = performance.now() + START_DELAY;
        requestAnimationFrame(frame);
      });
    },
    { threshold: 0.35 },
  );
  observer.observe(row);

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) finish();
  });
})();
