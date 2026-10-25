(() => {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const source = document.getElementById(button.dataset.copy);
    if (!source || !navigator.clipboard) return;

    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(source.innerText);
      button.dataset.copied = "";
      window.setTimeout(() => delete button.dataset.copied, 1400);
    });
  });
})();
