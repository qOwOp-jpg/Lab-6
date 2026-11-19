const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=43.589&longitude=-79.6441&current=cloud_cover';
const sky = document.getElementById('sky');
const statusText = document.getElementById('status');
const refreshButton = document.getElementById('refresh');
const moon = sky.querySelector('.moon');
const phaseName = document.getElementById('phase-name');
const timeZone = 'America/Toronto';

async function updateWeather() {
  statusText.textContent = 'Loading cloud cover…';

  try {
    const response = await fetch(weatherUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Weather request failed');
    }

    const weather = await response.json();
    const cloudCover = weather.current?.cloud_cover;
    if (!Number.isFinite(cloudCover) || cloudCover < 0 || cloudCover > 100) {
      throw new Error('Invalid cloud cover');
    }

    sky.style.setProperty('--cloud-cover', cloudCover / 100);
    statusText.textContent = `Current cloud cover: ${cloudCover}%`;
  } catch {
    sky.style.removeProperty('--cloud-cover');
    statusText.textContent = 'Cloud cover unavailable. Try refreshing.';
  }
}

async function updateMoon() {
  phaseName.textContent = 'Loading today’s moon phase…';
  const now = new Date();
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone }).format(now);
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset'
  }).formatToParts(now).find(part => part.type === 'timeZoneName').value;
  const url = `https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=43.589,-79.6441&tz=${Number(offset.slice(3, 6))}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Moon phase request failed');
    }

    const result = await response.json();
    const { curphase, fracillum, closestphase } = result.properties.data;
    const [year, month, day] = date.split('-').map(Number);
    const primaryPhaseToday = closestphase?.year === year && closestphase.month === month && closestphase.day === day;
    const phase = curphase || (primaryPhaseToday ? closestphase.phase : '');
    const primaryIllumination = { 'New Moon': 0, 'Full Moon': 100, 'First Quarter': 50, 'Last Quarter': 50 };
    const illumination = fracillum ? Number.parseFloat(fracillum) : primaryIllumination[phase];
    if (!phase || !Number.isFinite(illumination) || illumination < 0 || illumination > 100) {
      throw new Error('Invalid moon phase');
    }

    moon.style.setProperty('--phase-width', `${Math.abs(illumination * 2 - 100)}%`);
    moon.classList.toggle('waning', phase.startsWith('Waning') || phase === 'Last Quarter');
    moon.classList.toggle('crescent', illumination < 50);
    moon.hidden = false;
    phaseName.textContent = `Moon phase at local noon (${date}): ${phase} · ${illumination}% illuminated`;
  } catch {
    moon.hidden = true;
    phaseName.textContent = 'Moon phase unavailable. Try refreshing.';
  }
}

async function updateSky() {
  refreshButton.disabled = true;
  try {
    await Promise.all([updateWeather(), updateMoon()]);
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener('click', updateSky);
updateSky();
