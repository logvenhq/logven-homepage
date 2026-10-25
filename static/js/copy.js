(() => {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    const source = document.getElementById(button.dataset.copy);
    if (!source || !navigator.clipboard) return;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(source.innerText);
      } catch {
        // Leave the control ready to retry if clipboard access is denied.
        return;
      }
      button.dataset.copied = "";
      window.setTimeout(() => delete button.dataset.copied, 1400);
    });
  });
})();
