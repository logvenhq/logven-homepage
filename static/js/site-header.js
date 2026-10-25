(() => {
  const header = document.querySelector("[data-site-header]");
  const announcement = document.querySelector(".announcement");

  if (!header) return;

  // Transparent only until the header pins below the announcement, so nothing ever slides underneath the nav.
  const update = () => {
    const offset = announcement ? announcement.offsetHeight : 0;
    header.classList.toggle("is-scrolled", window.scrollY > offset + 8);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
