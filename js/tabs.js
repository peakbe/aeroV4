export function initTabs() {

  const tabs = document.querySelectorAll(".mcdu-tab");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {

    tab.addEventListener("click", () => {

      const target = tab.dataset.tab;

      /****************************************************
       * 1) Désactivation visuelle des onglets (MCDU)
       ****************************************************/
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");

      /****************************************************
       * 2) Activation du panneau correspondant
       ****************************************************/
      panels.forEach(panel => {
        panel.classList.toggle("active", panel.id === target);
      });

      /****************************************************
       * 3) Scroll automatique en haut (Airbus MCDU)
       ****************************************************/
      const activePanel = document.getElementById(target);
      if (activePanel) activePanel.scrollTop = 0;

      /****************************************************
       * 4) Mise à jour du mode IFR global
       ****************************************************/
      window.currentTab = target;
      window.isSonoMode = (target === "tab-sono");

      /****************************************************
       * 5) Rafraîchissement dynamique selon onglet
       ****************************************************/
      if (target === "tab-metar") {
        // METAR = rafraîchissement cockpit
        processAirport("EBCI");
        processAirport("EBLG");
      }

      if (target === "tab-sono") {
        // SONO = mise à jour immédiate
        updateSono("EBCI", airports.EBCI.activeRunway?.name, map);
        updateSono("EBLG", airports.EBLG.activeRunway?.name, map);
      }

      if (target === "tab-logs") {
        // LOGS = scroll bottom
        const logs = document.getElementById("logs-console");
        if (logs) logs.scrollTop = logs.scrollHeight;
      }

      /****************************************************
       * 6) IMPORTANT : suppression du bloc FIDS
       *    (désormais géré par startFidsLive() dans app.js)
       ****************************************************/
      // ❌ plus aucun updateFidsFlights ici
    });
  });
}
