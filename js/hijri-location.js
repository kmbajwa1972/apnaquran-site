/* ============================================================
   APNAQURAN — Location-aware Hijri calendar corrections

   Prayer times remain supplied by Aladhan. This adapter only adjusts
   the displayed Hijri date where an official/local calendar differs
   from the calculated API date.

   IMPORTANT: never infer Pakistan from the browser timezone alone.
   A VPN, travel, or a manually selected city can make the browser
   timezone disagree with the requested location.
   ============================================================ */
(function () {
  const originalFetch = window.fetch.bind(window);

  function isPakistan(url) {
    try {
      const u = new URL(url, location.href);
      const country = (u.searchParams.get('country') || '').trim().toLowerCase();

      // Explicit city/country searches take priority over the device timezone.
      if (country) return country === 'pakistan';

      // For GPS requests Aladhan receives coordinates instead of a country.
      // Use Pakistan's geographic bounds rather than the browser/VPN timezone.
      const lat = Number(u.searchParams.get('latitude'));
      const lng = Number(u.searchParams.get('longitude'));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return lat >= 23.5 && lat <= 37.1 && lng >= 60.8 && lng <= 77.9;
      }
    } catch (_) {}
    return false;
  }

  function pakistanRabi1448(gregorian, hijri) {
    if (!gregorian || !hijri) return hijri;
    const g = `${gregorian.year}-${String(gregorian.month.number).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;

    // Pakistan official calendar: 1 Rabi al-Awwal 1448 = 15 Aug 2026.
    if (g < '2026-08-15' || g > '2026-09-12') return hijri;

    const copy = JSON.parse(JSON.stringify(hijri));
    const calculatedDay = Number(copy.day);
    if (!Number.isFinite(calculatedDay)) return hijri;

    // Aladhan's calculated calendar is one day ahead during this period.
    const day = calculatedDay - 1;
    if (day < 1) return hijri;

    copy.day = String(day);
    copy.month.number = 3;
    copy.month.en = 'Rabi al-Awwal';
    copy.month.ar = 'Rabīʿ al-Awwal';
    copy.month.ur = 'ربیع الاول';
    copy.year = 1448;
    return copy;
  }

  function adjustData(data) {
    if (!data) return data;

    if (data.date && data.date.gregorian && data.date.hijri) {
      data.date.hijri = pakistanRabi1448(data.date.gregorian, data.date.hijri);
    }

    if (Array.isArray(data)) {
      data.forEach(day => {
        if (day?.date?.gregorian && day?.date?.hijri) {
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
      const body = JSON.stringify(Object.assign({}, json, { data: adjustData(json.data) }));
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
