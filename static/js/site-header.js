// Site header: a soft blur fades in once the page scrolls, and while a dark section
// ([data-header-dark]) sits behind the header, the logo and links turn light.
(() => {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  const darkSections = document.querySelectorAll("[data-header-dark]");

  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    const line = header.getBoundingClientRect().top + header.offsetHeight / 2;
    const dark = [...darkSections].some((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      return top <= line && bottom > line;
    });
    header.classList.toggle("is-dark", dark);
  };

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  // Again once styles and fonts have settled, so the first check can't run against a half-styled page.
  window.addEventListener("load", update);
  update();
})();
