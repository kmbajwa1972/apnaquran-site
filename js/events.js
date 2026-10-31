(() => {
  const list = document.getElementById('eventsList');
  if (!list) return;

  // Month and day values follow the Hijri calendar. Some dates are
  // commemorative and their observance varies between communities.
  const events = [
    { m: 1, d: 1, name: 'Islamic New Year', note: '1 Muharram — beginning of the Hijri year.' },
    { m: 1, d: 10, name: 'Day of Ashura', note: '10 Muharram — observed with differing practices across Muslim communities.' },
    { m: 3, d: 12, name: 'Mawlid an-Nabi', note: '12 Rabi al-Awwal — commemorated by some communities; observance varies.' },
    { m: 7, d: 27, name: 'Isra and Mi‘raj', note: '27 Rajab — a commonly commemorated date; observance varies.' },
    { m: 8, d: 15, name: 'Mid-Sha‘ban', note: '15 Sha‘ban — observance and practices vary among Muslim communities.' },
    { m: 9, d: 1, name: 'First day of Ramadan', note: 'Beginning of the fasting month; confirm the date through local moon sighting.' },
    { m: 9, d: 17, name: 'Battle of Badr', note: '17 Ramadan — the traditional date associated with the Battle of Badr.' },
    { m: 9, d: 21, name: 'Beginning of the last ten nights', note: 'The last ten nights begin; seek Laylat al-Qadr throughout these nights.' },
    { m: 9, d: 27, name: '27th night of Ramadan', note: 'Commonly observed as Laylat al-Qadr in many communities, but the exact night is not definitively fixed.' },
    { m: 10, d: 1, name: 'Eid al-Fitr', note: '1 Shawwal — beginning of Eid; confirm the date through local moon sighting.' },
    { m: 12, d: 9, name: 'Day of Arafah', note: '9 Dhul-Hijjah — the day of standing at Arafah during Hajj.' },
    { m: 12, d: 10, name: 'Eid al-Adha', note: '10 Dhul-Hijjah — beginning of Eid al-Adha; confirm the date through local moon sighting.' }
  ];

  function getHijriParts(date) {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric'
    }).formatToParts(date);
    const values = {};
    for (const part of parts) values[part.type] = part.value;
    return { day: Number(values.day), month: Number(values.month), year: Number(values.year) };
  }

  function addText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    parent.appendChild(node);
    return node;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [];

    // Scan a little more than one Hijri year so the list remains useful
    // near the end of the current Hijri year.
    for (let offset = 0; offset <= 400; offset += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const hijri = getHijriParts(date);
      for (const event of events) {
        if (hijri.month === event.m && hijri.day === event.d) {
          upcoming.push({ ...event, date, hijri });
        }
      }
    }

    upcoming.sort((a, b) => a.date - b.date);
    list.replaceChildren();

    if (!upcoming.length) {
      addText(list, 'p', 'empty', 'Upcoming dates could not be calculated in this browser. Please try a modern browser with Hijri calendar support.');
      list.setAttribute('aria-busy', 'false');
      return;
    }

    for (const event of upcoming) {
      const card = document.createElement('article');
      card.className = 'event-item card';

      const dateBox = document.createElement('div');
      dateBox.className = 'event-date';
      addText(dateBox, 'b', '', String(event.date.getDate()));
      addText(dateBox, 'small', '', event.date.toLocaleDateString(undefined, { month: 'short' }));
      card.appendChild(dateBox);

      const info = document.createElement('div');
      info.className = 'event-info';
      addText(info, 'h2', '', event.name);
      addText(info, 'p', 'event-hijri', event.hijri.day + ' / ' + event.hijri.month + ' / ' + event.hijri.year + ' AH');
      addText(info, 'p', '', event.note);
      addText(info, 'p', 'event-gregorian', event.date.toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }));
      card.appendChild(info);
      list.appendChild(card);
    }
  } catch (error) {
    addText(list, 'p', 'empty', 'Your browser could not calculate Hijri dates. Please try a modern browser with Umm al-Qura calendar support.');
  }

  list.setAttribute('aria-busy', 'false');
})();