// Legg til denne funksjonen i script.js
function getCurrentWeekType() {
    const today = new Date();
    const adjustToThursday = (date) => {
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        return date;
    };
    
    const jan4 = new Date(today.getFullYear(), 0, 4);
    const adjustedToday = adjustToThursday(new Date(today));
    const adjustedJan4 = adjustToThursday(new Date(jan4));
    
    const weekNumber = 1 + Math.round(((adjustedToday - adjustedJan4) / 86400000 - 3 + ((adjustedJan4.getDay() + 6) % 7)) / 7);
    return weekNumber % 2 === 1 ? 'odd' : 'even';
}

// Modifisert konverteringsfunksjon
function convertSchedule(data) {
    const weekType = getCurrentWeekType();
    const { settings, schedule, "odd-week": oddWeek } = data;
    const legacySchedule = {};

    // Hjelpefunksjoner for tidshåndtering
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime = (date) => {
        return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    // Prosesser hver dag
    Object.entries(schedule).forEach(([day, regularEvents]) => {
        // Velg timeplan basert på uke-type
        let events = [...regularEvents];
        
        if (weekType === 'odd' && oddWeek && oddWeek[day]) {
            events = [...oddWeek[day]]; // Full erstatning for dagen
        }

        // Resten av din eksisterende logikk...
        const legacyEvents = [];
        let lastWasLongBreak = false;

        for (let i = 0; i < events.length; i++) {
            const currentEvent = events[i];
            const isLongBreak = currentEvent["is-long-break"];

            // Legg til nåværende hendelse
            legacyEvents.push({...currentEvent});

            // Hopp over pause-logikk for lang-friminutt
            if (isLongBreak) {
                lastWasLongBreak = true;
                continue;
            }

            // Automatiske pauser kun i skolemodus
            if (settings.mode === 'school' && i < events.length - 1) {
                const nextEvent = events[i + 1];
                const currentEnd = parseTime(currentEvent.time);
                currentEnd.setMinutes(currentEnd.getMinutes() + settings["hour-length"]);

                if (!lastWasLongBreak && !nextEvent["is-long-break"]) {
                    const nextStart = parseTime(nextEvent.time);
                    if (currentEnd < nextStart) {
                        legacyEvents.push({
                            name: settings["break-name"],
                            time: formatTime(currentEnd)
                        });
                    }
                }
            }

            lastWasLongBreak = false;
        }

        // Legg til "Slutten på dagen"
        const lastEvent = events[events.length - 1];
        if (lastEvent && !lastEvent["is-long-break"]) {
            const dayEnd = parseTime(lastEvent.time);
            dayEnd.setMinutes(dayEnd.getMinutes() + settings["hour-length"]);
            legacyEvents.push({
                name: settings["end-name"],
                time: formatTime(dayEnd)
            });
        }

        legacySchedule[day] = legacyEvents;
    });

    return legacySchedule;
}