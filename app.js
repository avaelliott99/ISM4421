// FAU Owl Weather — powered by the free Open-Meteo APIs (no API key needed).
(() => {
  "use strict";

  const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

  // Default location: FAU Boca Raton campus.
  const FAU_BOCA = {
    name: "FAU · Boca Raton",
    region: "Florida, United States",
    latitude: 26.3708,
    longitude: -80.1015,
  };

  // WMO weather interpretation codes -> [description, day icon, night icon]
  const WEATHER_CODES = {
    0: ["Clear sky", "☀️", "🌙"],
    1: ["Mainly clear", "🌤️", "🌙"],
    2: ["Partly cloudy", "⛅", "☁️"],
    3: ["Overcast", "☁️", "☁️"],
    45: ["Fog", "🌫️", "🌫️"],
    48: ["Depositing rime fog", "🌫️", "🌫️"],
    51: ["Light drizzle", "🌦️", "🌧️"],
    53: ["Drizzle", "🌦️", "🌧️"],
    55: ["Heavy drizzle", "🌧️", "🌧️"],
    56: ["Light freezing drizzle", "🌧️", "🌧️"],
    57: ["Freezing drizzle", "🌧️", "🌧️"],
    61: ["Light rain", "🌦️", "🌧️"],
    63: ["Rain", "🌧️", "🌧️"],
    65: ["Heavy rain", "🌧️", "🌧️"],
    66: ["Light freezing rain", "🌧️", "🌧️"],
    67: ["Freezing rain", "🌧️", "🌧️"],
    71: ["Light snow", "🌨️", "🌨️"],
    73: ["Snow", "🌨️", "🌨️"],
    75: ["Heavy snow", "❄️", "❄️"],
    77: ["Snow grains", "🌨️", "🌨️"],
    80: ["Light showers", "🌦️", "🌧️"],
    81: ["Showers", "🌧️", "🌧️"],
    82: ["Violent showers", "⛈️", "⛈️"],
    85: ["Snow showers", "🌨️", "🌨️"],
    86: ["Heavy snow showers", "❄️", "❄️"],
    95: ["Thunderstorm", "⛈️", "⛈️"],
    96: ["Thunderstorm with hail", "⛈️", "⛈️"],
    99: ["Severe thunderstorm with hail", "⛈️", "⛈️"],
  };

  const $ = (id) => document.getElementById(id);

  const state = {
    unit: loadUnit(),
    location: FAU_BOCA,
    data: null,
  };

  // ---------- Helpers ----------
  function loadUnit() {
    try {
      const u = localStorage.getItem("fau-weather-unit");
      return u === "celsius" ? "celsius" : "fahrenheit";
    } catch {
      return "fahrenheit";
    }
  }

  function saveUnit(unit) {
    try { localStorage.setItem("fau-weather-unit", unit); } catch { /* storage unavailable */ }
  }

  function describe(code, isDay = 1) {
    const entry = WEATHER_CODES[code] || ["Unknown", "🌡️", "🌡️"];
    return { text: entry[0], icon: isDay ? entry[1] : entry[2] };
  }

  const round = (n) => (n == null || Number.isNaN(n) ? "–" : Math.round(n));
  const deg = (n) => `${round(n)}°`;

  // Open-Meteo returns local times like "2026-09-28T14:00" when timezone=auto.
  // Parse the parts directly so the browser's own timezone never shifts them.
  function parseLocal(iso) {
    const [date, time = "00:00"] = iso.split("T");
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return { y, m, d, hh, mm };
  }

  function formatClock(iso) {
    const { hh, mm } = parseLocal(iso);
    const suffix = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
  }

  function formatHour(iso) {
    const { hh } = parseLocal(iso);
    const suffix = hh >= 12 ? "PM" : "AM";
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12} ${suffix}`;
  }

  function formatDay(iso, index) {
    if (index === 0) return "Today";
    const { y, m, d } = parseLocal(iso);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  }

  function formatDate(iso) {
    const { y, m, d } = parseLocal(iso);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
    });
  }

  function compass(degrees) {
    if (degrees == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(degrees / 45) % 8];
  }

  function uvLabel(uv) {
    if (uv == null) return "–";
    const v = Math.round(uv);
    const level = v <= 2 ? "Low" : v <= 5 ? "Moderate" : v <= 7 ? "High" : v <= 10 ? "Very high" : "Extreme";
    return `${v} · ${level}`;
  }

  function setStatus(message, isError = false) {
    const el = $("status");
    el.textContent = message;
    el.classList.toggle("error", isError);
  }

  // ---------- API ----------
  async function fetchForecast({ latitude, longitude }, unit) {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: [
        "temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day",
        "weather_code", "pressure_msl", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      ].join(","),
      hourly: ["temperature_2m", "precipitation_probability", "weather_code", "is_day"].join(","),
      daily: [
        "weather_code", "temperature_2m_max", "temperature_2m_min", "sunrise", "sunset",
        "uv_index_max", "precipitation_probability_max",
      ].join(","),
      temperature_unit: unit,
      wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
      precipitation_unit: unit === "fahrenheit" ? "inch" : "mm",
      timezone: "auto",
      forecast_days: "7",
    });
    const res = await fetch(`${FORECAST_URL}?${params}`);
    if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
    return res.json();
  }

  async function searchPlaces(query) {
    const params = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" });
    const res = await fetch(`${GEOCODE_URL}?${params}`);
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const json = await res.json();
    return json.results || [];
  }

  // ---------- Rendering ----------
  function render() {
    const data = state.data;
    if (!data) return;
    const { current, hourly, daily } = data;
    const loc = state.location;
    const windUnit = state.unit === "fahrenheit" ? "mph" : "km/h";

    // Current conditions
    const now = describe(current.weather_code, current.is_day);
    $("place-name").textContent = loc.name;
    $("place-meta").textContent = [loc.region, formatDate(current.time), `Updated ${formatClock(current.time)}`]
      .filter(Boolean).join(" · ");
    $("current-icon").textContent = now.icon;
    $("current-temp").textContent = `${round(current.temperature_2m)}°${state.unit === "fahrenheit" ? "F" : "C"}`;
    $("current-desc").textContent = now.text;
    $("current-hilo").textContent = `High ${deg(daily.temperature_2m_max[0])} · Low ${deg(daily.temperature_2m_min[0])}`;

    $("stat-feels").textContent = deg(current.apparent_temperature);
    $("stat-humidity").textContent = `${round(current.relative_humidity_2m)}%`;
    $("stat-wind").textContent = `${round(current.wind_speed_10m)} ${windUnit} ${compass(current.wind_direction_10m)}`;
    $("stat-gusts").textContent = `${round(current.wind_gusts_10m)} ${windUnit}`;
    $("stat-uv").textContent = uvLabel(daily.uv_index_max[0]);
    $("stat-pressure").textContent = state.unit === "fahrenheit"
      ? `${(current.pressure_msl * 0.02953).toFixed(2)} inHg`
      : `${round(current.pressure_msl)} hPa`;
    $("stat-sunrise").textContent = formatClock(daily.sunrise[0]);
    $("stat-sunset").textContent = formatClock(daily.sunset[0]);

    // Hourly: 24 hours starting at the current local hour
    const currentHour = current.time.slice(0, 13) + ":00";
    let start = hourly.time.findIndex((t) => t >= currentHour);
    if (start < 0) start = 0;
    const hourlyEl = $("hourly");
    hourlyEl.replaceChildren();
    for (let i = start; i < Math.min(start + 24, hourly.time.length); i++) {
      const d = describe(hourly.weather_code[i], hourly.is_day[i]);
      const pop = hourly.precipitation_probability[i];
      const item = document.createElement("div");
      item.className = "hour" + (i === start ? " now" : "");
      item.title = d.text;
      item.innerHTML = `
        <div class="hour-time">${i === start ? "Now" : formatHour(hourly.time[i])}</div>
        <div class="hour-icon" aria-hidden="true">${d.icon}</div>
        <div class="hour-temp">${deg(hourly.temperature_2m[i])}</div>
        <div class="hour-pop">${pop >= 10 ? `💧${pop}%` : ""}</div>`;
      hourlyEl.appendChild(item);
    }

    // Daily
    const lows = daily.temperature_2m_min;
    const highs = daily.temperature_2m_max;
    const weekMin = Math.min(...lows);
    const weekMax = Math.max(...highs);
    const span = Math.max(weekMax - weekMin, 1);
    const dailyEl = $("daily");
    dailyEl.replaceChildren();
    daily.time.forEach((t, i) => {
      const d = describe(daily.weather_code[i], 1);
      const pop = daily.precipitation_probability_max[i];
      const left = ((lows[i] - weekMin) / span) * 100;
      const width = ((highs[i] - lows[i]) / span) * 100;
      const li = document.createElement("li");
      li.className = "day";
      li.innerHTML = `
        <span class="day-name">${formatDay(t, i)}</span>
        <span class="day-icon" title="${d.text}" aria-label="${d.text}">${d.icon}</span>
        <span class="day-range">
          <span class="day-lo">${deg(lows[i])}</span>
          <span class="day-bar"><span></span></span>
          <span class="day-hi">${deg(highs[i])}</span>
        </span>
        <span class="day-pop">${pop >= 10 ? `💧${pop}%` : ""}</span>`;
      const fill = li.querySelector(".day-bar span");
      fill.style.left = `${left}%`;
      fill.style.width = `${Math.max(width, 3)}%`;
      dailyEl.appendChild(li);
    });

    ["current", "hourly-section", "daily-section"].forEach((id) => { $(id).hidden = false; });
    document.title = `${round(current.temperature_2m)}° ${now.text} · ${loc.name} | FAU Owl Weather`;
  }

  async function loadWeather(location) {
    state.location = location;
    setStatus(`Loading weather for ${location.name}…`);
    try {
      state.data = await fetchForecast(location, state.unit);
      render();
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("Couldn't load the weather right now. Check your connection and try again.", true);
    }
  }

  // ---------- Search ----------
  const resultsEl = $("search-results");

  function hideResults() {
    resultsEl.hidden = true;
    resultsEl.replaceChildren();
  }

  function showResults(places) {
    resultsEl.replaceChildren();
    places.forEach((p) => {
      const region = [p.admin1, p.country].filter(Boolean).join(", ");
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = `<strong></strong> <small></small>`;
      btn.querySelector("strong").textContent = p.name;
      btn.querySelector("small").textContent = region;
      btn.addEventListener("click", () => {
        hideResults();
        $("search-input").value = "";
        loadWeather({ name: p.name, region, latitude: p.latitude, longitude: p.longitude });
      });
      li.appendChild(btn);
      resultsEl.appendChild(li);
    });
    resultsEl.hidden = places.length === 0;
  }

  $("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = $("search-input").value.trim();
    if (query.length < 2) {
      setStatus("Type at least 2 letters to search.", true);
      return;
    }
    setStatus(`Searching for “${query}”…`);
    try {
      const places = await searchPlaces(query);
      if (places.length === 0) {
        hideResults();
        setStatus(`No places found for “${query}”.`, true);
      } else {
        showResults(places);
        setStatus("");
        resultsEl.querySelector("button").focus();
      }
    } catch (err) {
      console.error(err);
      setStatus("Search is unavailable right now. Please try again.", true);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-bar")) hideResults();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideResults();
  });

  // ---------- Buttons ----------
  $("btn-home").addEventListener("click", () => loadWeather(FAU_BOCA));

  $("btn-locate").addEventListener("click", () => {
    if (!("geolocation" in navigator)) {
      setStatus("Your browser doesn't support location lookup.", true);
      return;
    }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadWeather({
        name: "My location",
        region: `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      () => setStatus("Location permission was denied. Showing FAU Boca Raton instead.", true),
      { timeout: 10000, maximumAge: 600000 },
    );
  });

  document.querySelectorAll(".unit-toggle button").forEach((btn) => {
    const sync = () => document.querySelectorAll(".unit-toggle button").forEach((b) => {
      const active = b.dataset.unit === state.unit;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    sync();
    btn.addEventListener("click", () => {
      if (btn.dataset.unit === state.unit) return;
      state.unit = btn.dataset.unit;
      saveUnit(state.unit);
      sync();
      loadWeather(state.location);
    });
  });

  // ---------- Start ----------
  loadWeather(FAU_BOCA);
})();
