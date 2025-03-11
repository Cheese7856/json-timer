import { convertSchedule } from "./convert.js";

// ======================
// KONFIGURASJONER
// ======================
const DEFAULT_SCHEDULE = "schedule-bedre.json";
const PRESETS_URL = "presets.json";
const STORAGE_KEY = "jsonPreset";

// ======================
// GLOBALE VARIABLER
// ======================
let timerInterval;
let pipWindow = null;

// ======================
// CUSTOM UI VARIABLER (MIDLERTIDIG DEAKTIVERT)
// ======================
// let customJsonInput;
// let jsonErrorDisplay;

// ======================
// HENT PRESET FIL
// ======================
async function getPresetFile() {
  try {
    const storedId = localStorage.getItem(STORAGE_KEY) || "default";

    if (storedId === "custom") {
      const customData = localStorage.getItem("customSchedule");
      if (customData) return JSON.parse(customData);
      console.warn("Ingen egendefinert timeplan, laster standard");
      return DEFAULT_SCHEDULE;
    }

    const presetsResponse = await fetch(PRESETS_URL);
    if (!presetsResponse.ok) throw new Error("Kunne ikke laste presets");

    const presets = await presetsResponse.json();
    const preset = presets.find((p) => p.id === storedId);
    return preset?.file || DEFAULT_SCHEDULE;
  } catch (error) {
    console.error("Feil ved preset-håndtering:", error);
    return DEFAULT_SCHEDULE;
  }
}

// ======================
// INITIER APP
// ======================
async function initApp() {
  try {
    const presetSource = await getPresetFile();
    let data;

    if (typeof presetSource === "string") {
      const response = await fetch(presetSource);
      data = await response.json();
    } else {
      data = presetSource;
    }

    const schedule = convertSchedule(data);
    const dayNames = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const todayName = dayNames[new Date().getDay()];
    let todaysEvents = schedule[todayName] || [];

    // ======================
    // HJELPEFUNKSJONER
    // ======================
    const parseTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(":").map(Number);
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    todaysEvents.sort((a, b) => parseTime(a.time) - parseTime(b.time));

    // ======================
    // DOM-ELEMENTER
    // ======================
    const timerElem = document.getElementById("timer");
    const eventNameElem = document.getElementById("event-name");
    const progressBar = document.getElementById("progress-bar");
    const endMessage = document.getElementById("end-message");
    const openLinkButton = document.getElementById("open-link");
    const pipButton = document.getElementById("pipButton");

    // Progress bar konfigurasjon
    const radius = progressBar.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressBar.style.strokeDasharray = circumference;
    progressBar.style.strokeDashoffset = circumference;

    // ======================
    // TIMER LOGIKK
    // ======================
    let currentEventIndex = 0;
    let prevEventObj = null;
    let nextEventObj = null;
    const now = new Date();

    // Finn første kommende event
    let found = false;
    for (let i = 0; i < todaysEvents.length; i++) {
      const eventTime = parseTime(todaysEvents[i].time);
      if (eventTime > now) {
        currentEventIndex = i;
        nextEventObj = todaysEvents[i];
        if (i > 0) prevEventObj = todaysEvents[i - 1];
        found = true;
        break;
      }
    }
    if (!found && todaysEvents.length > 0) currentEventIndex = todaysEvents.length;

    // Initialiser visning
    if (currentEventIndex >= todaysEvents.length) {
      timerElem.textContent = "00:00";
      eventNameElem.textContent = "";
      endMessage.style.display = "block";
    } else {
      eventNameElem.textContent = todaysEvents[currentEventIndex].name;
    }

    // ======================
    // EVENT HANDLERS
    // ======================
    function startNextEvent() {
      currentEventIndex++;
      if (currentEventIndex >= todaysEvents.length) {
        clearInterval(timerInterval);
        endMessage.style.display = "block";
        timerElem.textContent = "00:00";
        eventNameElem.textContent = "";
        return;
      }
      prevEventObj = nextEventObj;
      nextEventObj = todaysEvents[currentEventIndex];
      eventNameElem.textContent = nextEventObj.name;
    }

    function updateTimer() {
      const now = new Date();
      if (nextEventObj) {
        const nextEventTime = parseTime(nextEventObj.time);
        if (nextEventTime - now <= 0) {
          startNextEvent();
          return;
        }

        let progress;
        if (!prevEventObj) {
          progress = 1;
        } else {
          const prevEventTime = parseTime(prevEventObj.time);
          const totalTime = nextEventTime - prevEventTime;
          const elapsed = now - prevEventTime;
          progress = elapsed / totalTime;
          progress = Math.min(Math.max(progress, 0), 1);
        }

        const remaining = nextEventTime - now;
        const totalSeconds = Math.floor(remaining / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const percent = Math.round(progress * 100);

        timerElem.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} (${percent}%)`;
        progressBar.style.strokeDashoffset = circumference * (1 - progress);

        if (pipWindow) {
          pipWindow.postMessage(
            {
              action: "updateTime",
              time: timerElem.textContent,
            },
            "*"
          );
        }
      }
    }

    // Start timer
    timerInterval = setInterval(updateTimer, 1000);

    // ======================
    // PiP FUNKSJONALITET
    // ======================
    if (pipButton) {
      pipButton.addEventListener("click", async () => {
        if (!("documentPictureInPicture" in window)) {
          alert("PiP støttes ikke i denne nettleseren");
          return;
        }

        try {
          pipWindow = await documentPictureInPicture.requestWindow({
            width: 200,
            height: 100,
          });

          pipWindow.document.write(`
            <html>
              <head>
                <style>
                  body { 
                    margin: 0; 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    font-size: 32px;
                    font-family: Arial;
                  }
                </style>
              </head>
              <body>
                <div id="pipTime">00:00</div>
                <script>
                  window.addEventListener('message', (e) => {
                    if (e.data.action === 'updateTime') {
                      document.getElementById('pipTime').textContent = e.data.time;
                    }
                  });
                <\/script>
              </body>
            </html>
          `);

          pipWindow.addEventListener("pagehide", () => {
            pipWindow = null;
          });
        } catch (error) {
          console.error("PiP-feil:", error);
        }
      });
    }

    // ======================
    // CUSTOM UI LOGIKK (MIDLERTIDIG DEAKTIVERT)
    // ======================
    /*
    if (document.getElementById("load-custom-json")) {
      document.getElementById("load-custom-json").addEventListener("click", async () => {
        try {
          const rawData = document.getElementById("custom-json-input").value.trim();
          
          if (!rawData) throw new Error("Tomt JSON-felt");
          
          const customData = JSON.parse(rawData);
          if (!customData.settings || !customData.schedule) {
            throw new Error("Mangler settings eller schedule");
          }

          localStorage.setItem("customSchedule", rawData);
          jsonErrorDisplay.textContent = "";
          alert("Timeplan lastet!");
          location.reload();
        } catch (error) {
          jsonErrorDisplay.textContent = `Feil: ${error.message}`;
        }
      });
    }
    */
  } catch (error) {
    console.error("Initialiseringsfeil:", error);
    const fallbackResponse = await fetch(DEFAULT_SCHEDULE);
    initApp(convertSchedule(await fallbackResponse.json()));
  }
}

// ======================
// INITIERING
// ======================
document.addEventListener("DOMContentLoaded", () => {
  const presetSelector = document.getElementById("class-preset");
  if (presetSelector) {
    presetSelector.addEventListener("change", async () => {
      localStorage.setItem(STORAGE_KEY, presetSelector.value);
      clearInterval(timerInterval);
      await initApp();
    });
  }
  initApp();
});
