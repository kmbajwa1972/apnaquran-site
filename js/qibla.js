/* ============================================================
   AL-QURAN — Qibla Direction page
   Great-circle bearing to the Kaaba + optional live device compass.
   ============================================================ */

const KAABA = { lat: 21.4225, lng: 39.8262 };
const EARTH_KM = 6371;

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }

/* Initial great-circle bearing from (lat1,lng1) to (lat2,lng2), 0-360 */
function bearingTo(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2), Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* Great-circle distance in km (haversine) */
function distanceKm(lat1, lng1, lat2, lng2) {
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1), Δλ = toRad(lng2 - lng1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let qiblaBearing = 0;
let deviceHeading = null; // null until compass permission granted + events flow

function setNeedle(rotationDeg) {
  $('#needle').style.transform = `rotate(${rotationDeg}deg)`;
}
function setDial(rotationDeg) {
  $('#compassDial').style.transform = `rotate(${rotationDeg}deg)`;
}

function showCompass(place) {
  qiblaBearing = bearingTo(place.lat, place.lng, KAABA.lat, KAABA.lng);
  const dist = Math.round(distanceKm(place.lat, place.lng, KAABA.lat, KAABA.lng));

  $('#qiblaState').style.display = 'none';
  $('#qiblaCompassWrap').style.display = 'block';
  $('#qiblaDeg').textContent = Math.round(qiblaBearing) + '°';
  $('#qiblaDist').textContent = dist.toLocaleString() + ' km to the Kaaba';

  // Static mode: needle points at the qibla bearing directly (dial fixed with N up)
  setNeedle(qiblaBearing);
}

function handleOrientation(e) {
  // alpha: compass heading of device (0 = facing North), varies by browser/OS.
  let heading = null;
  if (typeof e.webkitCompassHeading === 'number') {
    heading = e.webkitCompassHeading; // iOS Safari — already true compass heading
  } else if (e.alpha != null) {
    heading = 360 - e.alpha; // rough approximation on most Android browsers
  }
  if (heading == null) return;
  deviceHeading = heading;

  // Rotate the whole dial opposite to device heading so "N" stays pointing true north,
  // and rotate the needle to the fixed qibla bearing relative to true north.
  setDial(-heading);
  setNeedle(qiblaBearing - heading);
  $('#qiblaNote').textContent = 'Compass live — rotate your phone until the Kaaba icon points up.';
}

async function enableCompass() {
  const btn = $('#compassBtn');
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') {
        alert('Compass access was not granted. You can still use the static direction shown above.');
        return;
      }
    }
    const evName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evName, handleOrientation, true);
    btn.textContent = 'Live compass enabled';
    btn.disabled = true;
  } catch {
    alert('Your device or browser does not support a live compass. The static direction above is still accurate — just face the printed degree using any compass app.');
  }
}

function locate() {
  if (!navigator.geolocation) {
    $('#qiblaState').innerHTML = '<div class="error-box"><b>Location not supported</b>Your browser can\'t provide location. Try a different browser or device.</div>';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => showCompass({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => {
      $('#qiblaState').innerHTML = `<div class="error-box"><b>Location access needed</b>Please allow location access to calculate your Qibla direction, then reload this page.</div>`;
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

document.addEventListener('DOMContentLoaded', () => {
  locate();
  $('#compassBtn').addEventListener('click', enableCompass);
});
