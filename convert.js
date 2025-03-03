// convert.js
function getCurrentWeekType() {
    const today = new Date();
    const adjustToThursday = date => {
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        return date;
    };
    
    const jan4 = new Date(today.getFullYear(), 0, 4);
    const weekNumber = 1 + Math.round((
        adjustToThursday(today) - adjustToThursday(jan4)) / 86400000 / 7
    );
    return weekNumber % 2 === 1 ? 'odd' : 'even';
}

export function convertSchedule(data) {
    const weekType = getCurrentWeekType();
    const { settings, schedule, "odd-week": oddWeek } = data;
    const legacySchedule = {};

    // Hjelpefunksjoner
    const parseTime = timeStr => {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime = date => 
        `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    // Prosesser hver dag
    Object.entries(schedule).forEach(([day, regularEvents]) => {
        let events = [...regularEvents];
        
        // Erstatt hele dagen for oddetallsuker
        if (weekType === 'odd' && oddWeek?.[day]) {
            events = [...oddWeek[day]];
        }

        // Sorter events etter tid
        events.sort((a, b) => parseTime(a.time) - parseTime(b.time));

        const legacyEvents = [];
        let lastWasLongBreak = false;

        // Generer pauser og slutttid
        for (let i = 0; i < events.length; i++) {
            const currentEvent = events[i];
            legacyEvents.push({...currentEvent});

            if (currentEvent["is-long-break"]) {
                lastWasLongBreak = true;
                continue;
            }

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

        // Legg til dagsslutt
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