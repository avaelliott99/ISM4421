# FAU Owl Weather 🦉

A weather app for **Florida Atlantic University**, defaulting to the Boca Raton campus.
It uses the free [Open-Meteo](https://open-meteo.com/) APIs, so there are **no API keys, logins, or environment variables**.

## Features
- Current conditions for FAU Boca Raton on load (temp, feels like, humidity, wind, gusts, UV, pressure, sunrise/sunset)
- Next 24 hours, hourly
- 7-day forecast with high/low range bars and rain chances
- City search (Open-Meteo Geocoding API)
- "My location" button (browser geolocation)
- °F / °C toggle (remembered in your browser)
- FAU branding: FAU Blue `#003366`, FAU Red `#CC0000`, FAU Gray `#CCCCCC`
- Works on phones, tablets, and desktop, with light and dark mode

## Project files
| File | Purpose |
|------|---------|
| `index.html` | Page layout |
| `styles.css` | FAU-themed styles |
| `app.js` | Calls Open-Meteo and renders the weather |
| `assets/fau-logo.svg` | FAU logo (header + browser tab icon) |
| `netlify.toml` | Netlify config: publish directory and security headers |

This is a plain static site. There's nothing to install and no build step.

## Run locally
Open `index.html` in a browser, or serve the folder:
```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy to Netlify
**Option A: connect the GitHub repo (recommended, auto-deploys on every push)**
1. Log in at https://app.netlify.com and click **Add new site → Import an existing project**.
2. Choose **GitHub** and pick this repository (`ISM4421`).
3. Pick the branch you want to deploy.
4. Leave **Build command** empty and set **Publish directory** to `.`. `netlify.toml` already sets both.
5. Click **Deploy**. Your site will be live at `https://<your-site-name>.netlify.app`.

**Option B: drag and drop**
1. Go to https://app.netlify.com/drop.
2. Drag this project folder onto the page. That's it.

**Option C: Netlify CLI**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir .
```

## Using the official FAU logo
`assets/fau-logo.svg` is a stand-in owl mark in FAU colors. To use the official FAU logo, get it from FAU's brand resources and save it over `assets/fau-logo.svg`. If you use a PNG instead, update the two `fau-logo.svg` references in `index.html`.

## Credits
Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Student project for ISM 4421. Not an official FAU website.
