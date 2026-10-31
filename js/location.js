/* ============================================================
   AL-QURAN — automatic visitor location
   IP geolocation is the no-prompt default. Device location is used
   only when the visitor has already granted browser permission.
   ============================================================ */
window.AQLocation = (() => {
  const KEY = 'aq_pt_settings';

  function savePlace(place) {
    try {
      const settings = JSON.parse(localStorage.getItem(KEY) || '{}');
      settings.place = place;
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {}
    return place;
  }

  function getSavedPlace() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}').place || null; }
    catch { return null; }
  }

  async function getIpPlace() {
    const response = await fetch('https://ipwho.is/', {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Location lookup unavailable');
    const data = await response.json();
    if (!data.success || !Number.isFinite(Number(data.latitude)) ||
        !Number.isFinite(Number(data.longitude))) {
      throw new Error('Location lookup returned no coordinates');
    }
    const city = data.city || '';
    const country = data.country || '';
    return {
      lat: Number(data.latitude),
      lng: Number(data.longitude),
      city,
      country,
      label: [city, country].filter(Boolean).join(', ') || 'Approximate location',
      source: 'ip',
      detectedAt: Date.now()
    };
  }

  function getGrantedDevicePlace(fallback) {
    if (!navigator.geolocation || !navigator.permissions ||
        !navigator.permissions.query) return Promise.resolve(null);

    return navigator.permissions.query({ name: 'geolocation' })
      .then(permission => {
        if (permission.state !== 'granted') return null;
        return new Promise(resolve => {
          navigator.geolocation.getCurrentPosition(
            position => resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: fallback && fallback.city || '',
              country: fallback && fallback.country || '',
              label: fallback && fallback.label || 'Your device location',
              source: 'device',
              detectedAt: Date.now()
            }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
          );
        });
      })
      .catch(() => null);
  }

  async function resolve() {
    let approximate = null;
    try {
      approximate = await getIpPlace();
    } catch {
      approximate = getSavedPlace();
    }

    if (!approximate) return null;

    // Never trigger a permission prompt: use device coordinates only
    // when the visitor has already granted location access.
    const device = await getGrantedDevicePlace(approximate);
    return savePlace(device || approximate);
  }

  return { resolve, getSavedPlace };
})();
