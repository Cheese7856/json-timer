document.addEventListener("DOMContentLoaded", async () => {
  const selector = document.getElementById("class-preset");
  const STORAGE_KEY = "jsonPreset";

  // DOM-referanser
  const customPanel = document.getElementById("custom-json-panel");
  const jsonInput = document.getElementById("custom-json-input");
  const errorDisplay = document.getElementById("json-error");
  const loadBtn = document.getElementById("load-custom-json");
  const closeBtn = document.getElementById("close-custom-panel");
  const reopenBtn = document.getElementById("reopen-custom-panel");

  // Hjelpefunksjoner
  const showError = (message) => {
    errorDisplay.textContent = message;
    errorDisplay.style.display = "block";
    errorDisplay.scrollIntoView({ behavior: "smooth" });
  };

  const clearError = () => {
    errorDisplay.textContent = "";
    errorDisplay.style.display = "none";
  };

  const togglePanel = (show) => {
    customPanel.style.display = show ? "block" : "none";
    reopenBtn.style.display = show || selector.value !== "custom" ? "none" : "block";
  };

  // Initialiser panel og knapper
  try {
    const presets = await (await fetch("presets.json")).json();
    const savedId = localStorage.getItem(STORAGE_KEY) || "default";

    // Fyll dropdown
    presets.forEach((preset) => {
      const option = new Option(preset.name, preset.id);
      option.selected = preset.id === savedId;
      selector.add(option);
    });

    // Legg til custom-valg
    const customOption = new Option("Egendefinert", "custom");
    customOption.selected = savedId === "custom";
    selector.add(customOption);

    // Initialiser visning
    togglePanel(savedId === "custom");
    reopenBtn.style.display = savedId === "custom" ? "block" : "none";
  } catch (error) {
    console.error("Feil ved lasting av presets:", error);
    selector.innerHTML = `
      <option value="" disabled selected>Feil ved lasting</option>
      <option value="custom">Bruk standard</option>
    `;
  }

  // Event listeners
  selector.addEventListener("change", (e) => {
    const isCustom = e.target.value === "custom";
    localStorage.setItem(STORAGE_KEY, e.target.value);
    togglePanel(isCustom);
    reopenBtn.style.display = isCustom ? "block" : "none";
    if (!isCustom) location.reload();
  });

  loadBtn.addEventListener("click", async () => {
    try {
      clearError();
      const rawData = jsonInput.value.trim();

      if (!rawData) throw new Error("Vennligst lim inn JSON-data");

      // Valider JSON-struktur
      const customData = JSON.parse(rawData);
      if (!customData.settings?.mode || !customData.schedule) {
        throw new Error("Mangler obligatoriske felter:\n- settings.mode\n- schedule");
      }

      // Valider tidspunkter
      const isValid = Object.values(customData.schedule).every((day) => day.every((event) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(event.time)));

      if (!isValid) throw new Error("Ugyldig tidformat. Bruk HH:MM (f.eks. 08:15)");

      // Lagre og last på nytt
      localStorage.setItem("customSchedule", rawData);
      alert("Timeplan lastet vellykket!✅");
      location.reload();
    } catch (error) {
      showError(`Feil: ${error.message}`);
    }
  });

  closeBtn.addEventListener("click", () => {
    togglePanel(false);
    reopenBtn.style.display = "block";
  });

  reopenBtn.addEventListener("click", () => {
    togglePanel(true);
    reopenBtn.style.display = "none";
  });

  // Last inn eksisterende custom data
  if (localStorage.getItem("customSchedule")) {
    jsonInput.value = localStorage.getItem("customSchedule");
  }

  // Initialiser reopen-knapp hvis i custom-modus
  if (localStorage.getItem(STORAGE_KEY) === "custom") {
    reopenBtn.style.display = "block";
  }
});
