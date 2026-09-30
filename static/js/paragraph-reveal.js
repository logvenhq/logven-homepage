(() => {
  const textElements = [...document.querySelectorAll("[data-reveal]")];
  const keyStatements = [...document.querySelectorAll(".content-section__copy strong, .lede strong")];
  const meters = [...document.querySelectorAll("[data-meter]")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const meterCells = 8;

  meters.forEach((meter) => {
    const codeCells = Number(meter.dataset.meter) || 0;

    meter.replaceChildren(
      ...Array.from({ length: meterCells }, (_, index) => {
        const cell = document.createElement("span");
        cell.className = index < codeCells ? "steps__cell steps__cell--code" : "steps__cell";
        cell.style.setProperty("--cell-delay", `${280 + index * 70}ms`);
        return cell;
      }),
    );
  });

  const reveal = (element) => {
    element.classList.add("is-visible");
    element.querySelectorAll("[data-meter]").forEach((meter) => meter.classList.add("is-filled"));
  };

  const revealAll = () => {
    textElements.forEach(reveal);
    meters.forEach((meter) => meter.classList.add("is-filled"));
    keyStatements.forEach((statement) => statement.classList.add("is-emphasized"));
  };

  if (reduceMotion.matches) {
    revealAll();
    return;
  }

  if (keyStatements.length) {
    const statementObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-emphasized");
          statementObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -18%", threshold: 0.65 },
    );

    keyStatements.forEach((statement) => statementObserver.observe(statement));
  }

  if (!textElements.length) return;

  const pendingRevealTimers = new Map();
  const viewportHeight = window.innerHeight;
  const initialElements = [];
  const laterElements = [];

  textElements.forEach((element) => {
    element.dataset.revealText = "";
    const isInFirstViewport = element.getBoundingClientRect().top < viewportHeight;
    (isInFirstViewport ? initialElements : laterElements).push(element);
  });

  initialElements.forEach((element, index) => {
    const timer = window.setTimeout(() => {
      reveal(element);
      pendingRevealTimers.delete(element);
    }, 1100 + index * 180);

    pendingRevealTimers.set(element, timer);
  });

  window.addEventListener(
    "scroll",
    () => {
      pendingRevealTimers.forEach((timer, element) => {
        window.clearTimeout(timer);
        reveal(element);
      });
      pendingRevealTimers.clear();
    },
    { once: true, passive: true },
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, index) => {
          revealObserver.unobserve(entry.target);
          window.setTimeout(() => reveal(entry.target), index * 90);
        });
    },
    { rootMargin: "0px 0px -8%" },
  );

  laterElements.forEach((element) => revealObserver.observe(element));

  reduceMotion.addEventListener("change", (event) => {
    if (!event.matches) return;

    pendingRevealTimers.forEach((timer) => window.clearTimeout(timer));
    pendingRevealTimers.clear();
    revealObserver.disconnect();
    revealAll();
  });
})();
