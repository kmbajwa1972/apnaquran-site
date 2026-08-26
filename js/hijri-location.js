/* ============================================================
   APNAQURAN — Location-aware Hijri calendar corrections

   Prayer times remain supplied by Aladhan. This small adapter only
   adjusts the displayed Hijri date when an official/local calendar
   differs from the calculated API date.

   Confirmed Pakistan rule for Rabi al-Awwal 1448:
   Pakistan's Central Ruet-e-Hilal Committee announced 1 Rabi
   al-Awwal 1448 as 15 Aug 2026. Therefore 15 Aug–12 Sep 2026
   is one Hijri day earlier than the Aladhan calculated calendar.

   Other locations are left unchanged and continue to use Aladhan's
   returned Hijri date. More country-specific observed calendars can
   be added here without touching prayer-time calculations.
   ============================================================ */
(function () {
  const originalFetch = window.fetch.bind(window);

  function isPakistan(url) {
    const tz = (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
      catch (_) { return ''; }
    })();
    if (tz === 'Asia/Karachi') return true;

    try {
      const u = new URL(url, location.href);
      const country = (u.searchParams.get('country') || '').toLowerCase();
      return country === 'pakistan' || country.includes('pakistan');
    } catch (_) {
      return false;
    }
  }

  function pakistanRabi1448(gregorian, hijri) {
    if (!gregorian || !hijri) return hijri;
    const g = `${gregorian.year}-${String(gregorian.month.number).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;

    // Official Pakistan start: 1 Rabi al-Awwal 1448 = 15 Aug 2026.
    // The month runs through 12 Sep 2026 in the Pakistan observed calendar.
    if (g < '2026-08-15' || g > '2026-09-12') return hijri;

    const copy = JSON.parse(JSON.stringify(hijri));
    let day = Number(copy.day) - 1;
    if (day >= 1) {
      copy.day = String(day);
      copy.month.number = 3;
      copy.month.en = 'Rabi al-Awwal';
      copy.month.ar = 'Rabīʿ al-Awwal';
      copy.month.ur = 'ربیع الاول';
      copy.year = 1448;
      return copy;
    }

    return hijri;
  }

  function adjustData(data, pakistan) {
    if (!pakistan || !data) return data;

    if (data.date && data.date.gregorian && data.date.hijri) {
      data.date.hijri = pakistanRabi1448(data.date.gregorian, data.date.hijri);
    }

    if (Array.isArray(data)) {
      data.forEach(day => {
        if (day && day.date && day.date.gregorian && day.date.hijri) {
          day.date.hijri = pakistanRabi1448(day.date.gregorian, day.date.hijri);
        }
      });
    }
    return data;
  }

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const response = await originalFetch(input, init);

    if (!/api\.aladhan\.com\/v1\//i.test(url) || !isPakistan(url)) return response;

    try {
      const cloned = response.clone();
      const json = await cloned.json();
      const data = adjustData(json.data, true);
      const body = JSON.stringify(Object.assign({}, json, { data }));
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (_) {
      return response;
    }
  };
})();
