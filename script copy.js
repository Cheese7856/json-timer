// script.js
fetch('schedule-bedre.json')
  .then(response => response.json())
  .then(data => {
    const settings = data.settings;
    const schedule = data.schedule;
    const dayNames = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];
    const todayName = dayNames[new Date().getDay()];
    let todaysEvents = schedule[todayName] || [];

    // Funksjon for å konvertere "HH:MM" til et Date-objekt for i dag
    function parseTime(timeString) {
      const [hours, minutes] = timeString.split(":").map(Number);
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    }

    // Funksjon for å legge til automatiske friminutt i school-modus
    function addBreaks(events) {
      if (settings.mode !== 'school') return events;
      
      const processedEvents = [];
      const breakName = settings['break-name'] || 'Friminutt';

      for (let i = 0; i < events.length; i++) {
        const currentEvent = events[i];
        processedEvents.push(currentEvent);

        // Legg til friminutt etter hver time (unntatt siste)
        if (i < events.length - 1) {
          const currentEnd = parseTime(currentEvent.time);
          currentEnd.setMinutes(currentEnd.getMinutes() + 50); // 50 minutter varighet
          const breakStart = formatTime(currentEnd);

          processedEvents.push({
            name: breakName,
            time: breakStart
          });
        }
      }
      return processedEvents;
    }

    // Hjelpefunksjon for å konvertere Date til HH:MM
    function formatTime(date) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // Legg til friminutt hvis school-modus
    todaysEvents = addBreaks(todaysEvents);

    // Sorter events etter tid
    todaysEvents.sort((a, b) => parseTime(a.time) - parseTime(b.time));

    // Hent HTML-elementer
    const timerElem = document.getElementById("timer");
    const eventNameElem = document.getElementById("event-name");
    const progressBar = document.getElementById("progress-bar");
    const endMessage = document.getElementById("end-message");
    const openLinkButton = document.getElementById("open-link"); // Eksisterende knapp for link
    const pipButton = document.getElementById("pipButton"); // Knapp for picture in picture

    // Regn ut omkretsen til sirkelen
    const radius = progressBar.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressBar.style.strokeDasharray = circumference;
    progressBar.style.strokeDashoffset = circumference;

    // Globale variabler for events
    let currentEventIndex = 0;
    let prevEventObj = null;
    let nextEventObj = null;

    // Finn neste event basert på nåtid
    const now = new Date();
    let funnet = false;
    for (let i = 0; i < todaysEvents.length; i++) {
      const eventTime = parseTime(todaysEvents[i].time);
      if (eventTime > now) {
        currentEventIndex = i;
        nextEventObj = todaysEvents[i];
        if (i > 0) {
          prevEventObj = todaysEvents[i - 1];
        }
        funnet = true;
        break;
      }
    }
    if (!funnet && todaysEvents.length > 0) {
      currentEventIndex = todaysEvents.length;
    }

    if (currentEventIndex >= todaysEvents.length) {
      timerElem.textContent = "00:00";
      eventNameElem.textContent = "";
      endMessage.style.display = "block";
    } else {
      eventNameElem.textContent = todaysEvents[currentEventIndex].name;
    }

    // Funksjon for å starte neste event
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

    // Variabel for PiP-vinduet
    let pipWindow = null;

    // Funksjon for å oppdatere timer og progress bar
    function update() {
      const now = new Date();
      if (nextEventObj) {
        const nextEventTime = parseTime(nextEventObj.time);
        if (nextEventTime - now <= 0) {
          startNextEvent();
          return;
        }
        let progress;
        if (!prevEventObj) {
          // Første event: vis 100%
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
        const prosent = Math.round(progress * 100);
        const displayText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} (${prosent}%)`;
        progressBar.style.strokeDashoffset = circumference * (1 - progress);
        timerElem.textContent = displayText;

        // Send oppdatering til PiP-vinduet om det finnes
        if (pipWindow) {
          pipWindow.postMessage({ action: 'updateTime', time: displayText }, '*');
        }
      }
    }

    const timerInterval = setInterval(update, 1000);

    // Funksjonalitet for PiP-knappen
    if (pipButton) {
      pipButton.addEventListener("click", async () => {
        if (!('documentPictureInPicture' in window)) {
          alert("PiP støttes ikke i denne nettleseren.");
          return;
        }
        try {
          pipWindow = await documentPictureInPicture.requestWindow({
            width: 200,
            height: 100
          });

          // Minimalt PiP-innhold med kun tekst
          const pipContent = `
            <!DOCTYPE html>
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
                  font-family: Arial, sans-serif;
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
          `;

          pipWindow.document.write(pipContent);
          pipWindow.document.close();

          pipWindow.addEventListener("pagehide", () => {
            pipWindow = null;
          });
        } catch (e) {
          console.error("Feil ved PiP:", e);
        }
      });
    }

    // Funksjonalitet for openLink-knappen (fra tidligere)
    if (openLinkButton) {
      openLinkButton.addEventListener("click", () => {
        let linkToOpen = null;
        if (prevEventObj && prevEventObj.link) {
          linkToOpen = prevEventObj.link;
        } else if (nextEventObj && nextEventObj.link) {
          linkToOpen = nextEventObj.link;
        }
        if (linkToOpen) {
          window.open(linkToOpen, "_blank");
        } else {
          alert("Ingen link tilgjengelig for forrige eller neste hendelse.");
        }
      });
    }
  })
  .catch(error => console.error('Feil:', error));