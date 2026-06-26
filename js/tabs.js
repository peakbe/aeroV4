export function initTabs() {
  document.querySelectorAll(".mcdu-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;

      document.querySelectorAll(".mcdu-tab").forEach(t =>
        t.classList.toggle("active", t === tab)
      );

      document.querySelectorAll(".tab-panel").forEach(panel =>
        panel.classList.toggle("active", panel.id === target)
      );
    });
  });
}
