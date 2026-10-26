(() => {
  const header = document.querySelector("[data-site-header]");
  const announcement = document.querySelector(".announcement");

  if (!header) return;

  const homeHero = document.querySelector(".hero--home");
  if (announcement && homeHero) {
    const updateAnnouncementHeight = () => {
      homeHero.style.setProperty("--announcement-height", `${announcement.offsetHeight}px`);
    };
    updateAnnouncementHeight();
    new ResizeObserver(updateAnnouncementHeight).observe(announcement);
  }

  // Transparent only until the header pins below the announcement, so nothing ever slides underneath the nav.
  const update = () => {
    const offset = announcement ? announcement.offsetHeight : 0;
    header.classList.toggle("is-scrolled", window.scrollY > offset + 8);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  const toggle = header.querySelector("[data-menu-toggle]");
  const navigation = header.querySelector(".site-header__links");
  if (!toggle || !navigation) return;

  const mobile = window.matchMedia("(max-width: 760px)");
  const label = toggle.querySelector("[data-menu-label]");
  const setOpen = (open, restoreFocus = false) => {
    header.classList.toggle("is-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    label.textContent = open ? "Close" : "Menu";
    navigation.inert = mobile.matches && !open;
    if (restoreFocus) toggle.focus({ preventScroll: true });
  };

  header.classList.add("has-menu");
  toggle.hidden = false;
  setOpen(false);
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
    if (open) navigation.querySelector("a").focus({ preventScroll: true });
  });
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false, mobile.matches);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && header.classList.contains("is-menu-open")) setOpen(false, true);
  });
  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });
  header.addEventListener("focusout", (event) => {
    if (!header.contains(event.relatedTarget)) setOpen(false);
  });
  mobile.addEventListener("change", () => setOpen(false));
})();
