/* ============================================================
   APNAQURAN — Location-aware Hijri calendar corrections

   Prayer times remain supplied by Aladhan. This adapter only adjusts
   the displayed Hijri date where an official/local calendar differs
   from the calculated API date.

   Country-specific rules are based on official/local calendar sources.
   Never infer a country from the browser timezone when a city/country
   was explicitly selected.
   ============================================================ */
(function () {
  const originalFetch = window.fetch.bind(window);

  function locationCountry(url) {
    try {
      const u = new URL(url, location.href);
      const country = (u.searchParams.get('country') || '').trim().toLowerCase();
      if (country) return country;

      const lat = Number(u.searchParams.get('latitude'));
      const lng = Number(u.searchParams.get('longitude'));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        if (lat >= 23.5 && lat <= 37.1 && lng >= 60.8 && lng <= 77.9) return 'pakistan';
        if (lat >= 0.8 && lat <= 7.5 && lng >= 99.5 && lng <= 119.5) return 'malaysia';
      }
    } catch (_) {}
    return '';
  }

  function shiftHijri(hijri, delta, monthName = 'Rabi al-Awwal', monthArabic = 'Rabīʿ al-Awwal', monthUrdu = 'ربیع الاول', year = 1448) {
    const copy = JSON.parse(JSON.stringify(hijri));
    const day = Number(copy.day);
    if (!Number.isFinite(day)) return hijri;
    copy.day = String(day + delta);
    copy.month.number = 3;
    copy.month.en = monthName;
    copy.month.ar = monthArabic;
    copy.month.ur = monthUrdu;
    copy.year = year;
    return copy;
  }

  function countryCorrection(country, gregorian, hijri) {
    if (!gregorian || !hijri) return hijri;
    const g = `${gregorian.year}-${String(gregorian.month.number).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')}`;

    // Pakistan: official 1 Rabi al-Awwal 1448 = 15 Aug 2026.
    // Aladhan's calculated calendar is one day ahead for this period.
    if (country === 'pakistan' && g >= '2026-08-15' && g <= '2026-09-12') {
      return shiftHijri(hijri, -1);
    }

    // Malaysia: JAKIM/e-Solat lists 12 Rabi al-Awwal 1448 on
    // 25 Aug 2026, so 26 Aug 2026 is 13 Rabi al-Awwal.
    // Aladhan's displayed date in this period is one day behind.
    if ((country === 'malaysia' || country === 'malaysia,') && g >= '2026-08-14' && g <= '2026-09-11') {
      return shiftHijri(hijri, +1);
    }

    return hijri;
  }

  function adjustData(data, country) {
    if (!data) return data;

    if (data.date?.gregorian && data.date?.hijri) {
      data.date.hijri = countryCorrection(country, data.date.gregorian, data.date.hijri);
    }

    if (Array.isArray(data)) {
      data.forEach(day => {
        if (day?.date?.gregorian && day?.date?.hijri) {
          day.date.hijri = countryCorrection(country, day.date.gregorian, day.date.hijri);
        }
      });
    }
    return data;
  }

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const response = await originalFetch(input, init);

    if (!/api\.aladhan\.com\/v1\//i.test(url)) return response;

    const country = locationCountry(url);
    if (!country) return response;

    try {
      const cloned = response.clone();
      const json = await cloned.json();
      const body = JSON.stringify(Object.assign({}, json, { data: adjustData(json.data, country) }));
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
