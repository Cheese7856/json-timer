document.addEventListener("DOMContentLoaded", async () => {
  const selector = document.getElementById("class-preset");
  const STORAGE_KEY = "jsonPreset";
  let presets = [];

  /*
  // Legg til høyrepanel for custom JSON
  const customUI = `
    <div id="custom-json-panel" style="
      position: fixed;
      right: 0;
      top: 0;
      width: 20%;
      height: 100vh;
      background: #fff;
      border-left: 1px solid #ddd;
      padding: 20px;
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
      z-index: 1000;
      display: none;
      overflow-y: auto;
    ">
      <h3 style="margin-top: 0; color: #2c3e50;">Egendefinert Timeplan</h3>
      <textarea 
        id="custom-json-input" 
        placeholder="Lim inn din JSON her..."
        style="
          width: 100%;
          height: 70vh;
          font-family: 'Courier New', monospace;
          padding: 10px;
          border: 2px solid #eee;
          border-radius: 4px;
          resize: none;
        "
      ></textarea>
      <button 
        id="load-custom-json"
        style="
          margin-top: 15px;
          padding: 10px 20px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          width: 100%;
        "
      >
        Last Inn Timeplan
      </button>
      <div id="json-error" style="color: #e74c3c; margin-top: 10px;"></div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', customUI);
  */

  try {
    const response = await fetch("presets.json");
    if (!response.ok) throw new Error("Kunne ikke laste presets");
    presets = await response.json();

    // Last inn lagret ID
    const savedId = localStorage.getItem(STORAGE_KEY);

    // Fyll dropdown med presets
    presets.forEach((preset) => {
      const option = new Option(preset.name, preset.id);
      option.selected = preset.id === savedId;
      selector.add(option);
    });

    // Legg til custom-valg
    const customOption = new Option("Egendefinert timeplan", "custom");
    customOption.selected = "custom" === savedId;
    selector.add(customOption);

    /* =====================================================================
    // Håndter visning av panel
    const customPanel = document.getElementById("custom-json-panel");
    const jsonError = document.getElementById("json-error");
    customPanel.style.display = savedId === "custom" ? "block" : "none";

    selector.addEventListener("change", (e) => {
      const value = e.target.value;
      localStorage.setItem(STORAGE_KEY, value);
      customPanel.style.display = value === "custom" ? "block" : "none";
      if (value !== "custom") location.reload();
    });

    // Håndter JSON-innlasting
    document.getElementById("load-custom-json").addEventListener("click", () => {
      try {
        const rawData = document.getElementById("custom-json-input").value.trim();
        if (!rawData) throw new Error("Vennligst lim inn JSON-data");
        
        const customData = JSON.parse(rawData);
        if (!customData.settings || !customData.schedule) {
          throw new Error("Mangler 'settings' eller 'schedule' i JSON");
        }

        localStorage.setItem("customSchedule", rawData);
        jsonError.textContent = "";
        alert("Timeplan lastet!");
        location.reload();
      } catch (error) {
        jsonError.textContent = `Feil: ${error.message}`;
      }
    });
    */
  } catch (error) {
    console.error("Feil ved lasting av presets:", error);
    selector.innerHTML = `
      <option value="" disabled selected>Kunne ikke laste klasser</option>
      <option value="custom">Bruk standard timeplan</option>
    `;
  }
});
