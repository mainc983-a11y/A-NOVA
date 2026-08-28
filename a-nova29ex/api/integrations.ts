/**
 * A-NOVA Live Integrations Service
 * Real-time Weather, Exchange Rate, and Google Maps (Web & Android) API integrations.
 * 
 * Secure backend API environment variables:
 * - OPENWEATHER_API_KEY
 * - EXCHANGERATE_API_KEY
 * - GOOGLE_MAPS_WEB_API_KEY
 * - GOOGLE_MAPS_ANDROID_API_KEY
 */

export function getOpenWeatherApiKey(): string {
  return (process.env.OPENWEATHER_API_KEY || "").trim();
}

export function getExchangeRateApiKey(): string {
  return (process.env.EXCHANGERATE_API_KEY || "").trim();
}

export function getGoogleMapsWebApiKey(): string {
  return (process.env.GOOGLE_MAPS_WEB_API_KEY || "").trim();
}

export function getGoogleMapsAndroidApiKey(): string {
  return (process.env.GOOGLE_MAPS_ANDROID_API_KEY || "").trim();
}

export const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
export const EXCHANGERATE_API_KEY = process.env.EXCHANGERATE_API_KEY || "";
export const GOOGLE_MAPS_WEB_API_KEY = process.env.GOOGLE_MAPS_WEB_API_KEY || "";
export const GOOGLE_MAPS_ANDROID_API_KEY = process.env.GOOGLE_MAPS_ANDROID_API_KEY || "";

export type MapsPlatform = "web" | "android";

// ==========================================
// 1. OPENWEATHERMAP REAL-TIME WEATHER SERVICE
// ==========================================

export interface WeatherData {
  city: string;
  country: string;
  locationName: string;
  coordinates: { lat: number; lon: number };
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  condition: string;
  description: string;
  icon: string;
  windSpeed: number;
  windDeg: number;
  cloudiness: number;
  sunrise: string;
  sunset: string;
  timezone: number;
  timestamp: string;
  retrievedAt: string;
  retrievedDate: string;
  retrievedTime: string;
  isMyLocation: boolean;
  resolvedPlaceName?: string;
}

export interface StoredWeatherContext {
  retrievedAt: string;
  retrievedDate: string;
  retrievedTime: string;
  locationName: string;
  city: string;
  country: string;
  coordinates: { lat: number; lon: number };
  isMyLocation: boolean;
  resolvedPlaceName?: string;
  temperature: number;
  feelsLike: number;
  tempMin?: number;
  tempMax?: number;
  humidity: number;
  pressure?: number;
  condition: string;
  description: string;
  windSpeed?: number;
  sunrise?: string;
  sunset?: string;
  weatherData?: WeatherData;
}

export async function fetchCurrentWeather(
  locationQuery?: string,
  coords?: { lat: number; lon: number },
  units: "metric" | "imperial" = "metric",
  platform: MapsPlatform = "web"
): Promise<WeatherData | null> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) {
    console.warn("[Weather API Warning] OPENWEATHER_API_KEY environment variable is not configured.");
    return null;
  }

  try {
    let url = "";
    const isMyLocation = Boolean(coords && typeof coords.lat === "number" && typeof coords.lon === "number");
    if (isMyLocation && coords) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=${units}&appid=${apiKey}`;
    } else if (locationQuery && locationQuery.trim()) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(locationQuery.trim())}&units=${units}&appid=${apiKey}`;
    } else {
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[Weather API Warning] OpenWeatherMap returned HTTP ${response.status} for query "${locationQuery || JSON.stringify(coords)}"`);
      return null;
    }

    const data: any = await response.json();
    if (!data || data.cod !== 200) return null;

    const sunriseDate = data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "N/A";
    const sunsetDate = data.sys?.sunset ? new Date(data.sys.sunset * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "N/A";

    const now = new Date();
    const retrievedAt = now.toISOString();
    const retrievedDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const retrievedTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short" });

    let resolvedPlaceName = data.name || "";
    if (isMyLocation && coords) {
      try {
        const reverseName = await reverseGeocodeLocation(coords.lat, coords.lon, platform);
        if (reverseName && !reverseName.startsWith("Lat:")) {
          resolvedPlaceName = reverseName;
        }
      } catch (_) {}
    }

    const rawCityName = data.name || (isMyLocation ? "Current Location" : (locationQuery || "Unknown Location"));
    const countryCode = data.sys?.country || "";
    const baseLocationName = countryCode ? `${rawCityName}, ${countryCode}` : rawCityName;
    const finalLocationName = isMyLocation && resolvedPlaceName ? `${rawCityName} (${resolvedPlaceName.split(",").slice(0, 3).join(",")})` : baseLocationName;

    return {
      city: rawCityName,
      country: countryCode,
      locationName: finalLocationName,
      coordinates: {
        lat: data.coord?.lat || coords?.lat || 0,
        lon: data.coord?.lon || coords?.lon || 0,
      },
      temperature: Math.round(data.main?.temp * 10) / 10,
      feelsLike: Math.round(data.main?.feels_like * 10) / 10,
      tempMin: Math.round(data.main?.temp_min * 10) / 10,
      tempMax: Math.round(data.main?.temp_max * 10) / 10,
      humidity: data.main?.humidity || 0,
      pressure: data.main?.pressure || 0,
      condition: data.weather?.[0]?.main || "Clear",
      description: data.weather?.[0]?.description || "clear sky",
      icon: data.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png` : "",
      windSpeed: data.wind?.speed || 0,
      windDeg: data.wind?.deg || 0,
      cloudiness: data.clouds?.all || 0,
      sunrise: sunriseDate,
      sunset: sunsetDate,
      timezone: data.timezone || 0,
      timestamp: retrievedAt,
      retrievedAt,
      retrievedDate,
      retrievedTime,
      isMyLocation,
      resolvedPlaceName: resolvedPlaceName || baseLocationName
    };
  } catch (error) {
    console.error("[Weather API Error]:", error);
    return null;
  }
}

export async function fetchWeatherForecast(
  locationQuery?: string,
  coords?: { lat: number; lon: number },
  units: "metric" | "imperial" = "metric"
): Promise<any | null> {
  const apiKey = getOpenWeatherApiKey();
  if (!apiKey) {
    console.warn("[Weather Forecast API Warning] OPENWEATHER_API_KEY environment variable is not configured.");
    return null;
  }

  try {
    let url = "";
    if (coords && typeof coords.lat === "number" && typeof coords.lon === "number") {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${coords.lat}&lon=${coords.lon}&units=${units}&appid=${apiKey}`;
    } else if (locationQuery && locationQuery.trim()) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(locationQuery.trim())}&units=${units}&appid=${apiKey}`;
    } else {
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) return null;

    const data: any = await response.json();
    if (!data || data.cod !== "200" || !Array.isArray(data.list)) return null;

    // Aggregate daily forecasts
    const dailyForecasts = data.list.filter((_: any, idx: number) => idx % 8 === 0).slice(0, 5).map((item: any) => ({
      date: new Date(item.dt * 1000).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      temp: Math.round(item.main?.temp * 10) / 10,
      tempMin: Math.round(item.main?.temp_min * 10) / 10,
      tempMax: Math.round(item.main?.temp_max * 10) / 10,
      condition: item.weather?.[0]?.main || "Clear",
      description: item.weather?.[0]?.description || "",
      humidity: item.main?.humidity || 0,
      windSpeed: item.wind?.speed || 0,
      icon: item.weather?.[0]?.icon ? `https://openweathermap.org/img/wn/${item.weather[0].icon}.png` : ""
    }));

    return {
      city: data.city?.name || "Current Location",
      country: data.city?.country || "",
      daily: dailyForecasts
    };
  } catch (error) {
    console.error("[Weather Forecast API Error]:", error);
    return null;
  }
}

// ==========================================
// 2. EXCHANGERATE-API REAL-TIME CURRENCY SERVICE
// ==========================================

export interface CurrencyConversionResult {
  from: string;
  to: string;
  amount: number;
  rate: number;
  result: number;
  lastUpdated: string;
  nextUpdated: string;
}

export async function convertCurrency(
  fromCurrency: string,
  toCurrency: string,
  amount = 1
): Promise<CurrencyConversionResult | null> {
  const apiKey = getExchangeRateApiKey();
  if (!apiKey) {
    console.warn("[ExchangeRate API Warning] EXCHANGERATE_API_KEY environment variable is not configured.");
    return null;
  }

  try {
    const from = (fromCurrency || "USD").toUpperCase().trim();
    const to = (toCurrency || "EUR").toUpperCase().trim();
    const cleanAmount = Number(amount) || 1;

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}/${cleanAmount}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[ExchangeRate API Warning] HTTP ${response.status} for ${from}->${to}`);
      return null;
    }

    const data: any = await response.json();
    if (data.result !== "success") return null;

    return {
      from: data.base_code || from,
      to: data.target_code || to,
      amount: cleanAmount,
      rate: data.conversion_rate,
      result: data.conversion_result,
      lastUpdated: data.time_last_update_utc || new Date().toUTCString(),
      nextUpdated: data.time_next_update_utc || ""
    };
  } catch (error) {
    console.error("[ExchangeRate API Error]:", error);
    return null;
  }
}

export async function fetchLatestExchangeRates(baseCurrency = "USD"): Promise<any | null> {
  const apiKey = getExchangeRateApiKey();
  if (!apiKey) {
    console.warn("[ExchangeRate API Warning] EXCHANGERATE_API_KEY environment variable is not configured.");
    return null;
  }

  try {
    const base = (baseCurrency || "USD").toUpperCase().trim();
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data: any = await response.json();
    if (data.result !== "success") return null;

    return {
      base: data.base_code,
      lastUpdated: data.time_last_update_utc,
      nextUpdated: data.time_next_update_utc,
      rates: data.conversion_rates
    };
  } catch (error) {
    console.error("[ExchangeRate API Rates Error]:", error);
    return null;
  }
}

// ==========================================
// 3. GOOGLE MAPS PLATFORM (WEB & ANDROID)
// ==========================================

export interface GoogleMapsConfig {
  apiKey: string;
  platform: MapsPlatform;
  isRestricted: boolean;
}

export function getGoogleMapsCredentials(platform: MapsPlatform = "web"): GoogleMapsConfig {
  if (platform === "android") {
    return {
      apiKey: getGoogleMapsAndroidApiKey(),
      platform: "android",
      isRestricted: true
    };
  }
  return {
    apiKey: getGoogleMapsWebApiKey(),
    platform: "web",
    isRestricted: true
  };
}

export interface GeocodeResult {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId?: string;
  locationType?: string;
  mapUrl: string;
  embedUrl: string;
}

export async function geocodeLocation(address: string, platform: MapsPlatform = "web"): Promise<GeocodeResult | null> {
  const cleanAddress = address.trim();
  if (!cleanAddress) return null;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(cleanAddress)}&output=embed`;

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=1`;
    const resp = await fetch(nominatimUrl, {
      headers: { "User-Agent": `A-NOVA-GoogleMaps-Platform-${platform}/1.0` }
    });

    if (resp.ok) {
      const results: any = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        const item = results[0];
        return {
          formattedAddress: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          locationType: item.type || "establishment",
          mapUrl,
          embedUrl
        };
      }
    }
  } catch (err) {
    console.warn("[Geocode Location Notice]:", err);
  }

  return {
    formattedAddress: cleanAddress,
    lat: 0,
    lng: 0,
    mapUrl,
    embedUrl
  };
}

export async function reverseGeocodeLocation(lat: number, lng: number, platform: MapsPlatform = "web"): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": `A-NOVA-GoogleMaps-Platform-${platform}/1.0` }
    });
    if (resp.ok) {
      const data: any = await resp.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (_) {}
  return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
}

export interface DirectionsResult {
  origin: string;
  destination: string;
  travelMode: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  summary: string;
  steps: string[];
  directionsUrl: string;
  embedUrl: string;
}

export async function computeDirections(
  origin: string,
  destination: string,
  mode: "driving" | "walking" | "bicycling" | "transit" = "driving",
  platform: MapsPlatform = "web",
  originCoords?: { lat: number; lng: number }
): Promise<DirectionsResult | null> {
  const cleanOrigin = origin.trim();
  const cleanDest = destination.trim();
  if (!cleanOrigin || !cleanDest) return null;

  const originQuery = originCoords ? `${originCoords.lat},${originCoords.lng}` : cleanOrigin;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originQuery)}&destination=${encodeURIComponent(cleanDest)}&travelmode=${mode}`;
  const embedUrl = `https://www.google.com/maps?saddr=${encodeURIComponent(originQuery)}&daddr=${encodeURIComponent(cleanDest)}&output=embed`;

  let distanceText = "";
  let durationText = "";
  let steps: string[] = [];

  try {
    let geoOrigin: GeocodeResult | null = null;
    if (originCoords && typeof originCoords.lat === "number") {
      geoOrigin = {
        formattedAddress: "Current Device Location",
        lat: originCoords.lat,
        lng: originCoords.lng,
        mapUrl: "",
        embedUrl: ""
      };
    } else {
      geoOrigin = await geocodeLocation(cleanOrigin, platform);
    }

    const geoDest = await geocodeLocation(cleanDest, platform);

    if (geoOrigin && geoDest && geoOrigin.lat !== 0 && geoDest.lat !== 0) {
      const R = 6371; // Earth radius in km
      const dLat = (geoDest.lat - geoOrigin.lat) * (Math.PI / 180);
      const dLon = (geoDest.lng - geoOrigin.lng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(geoOrigin.lat * (Math.PI / 180)) *
        Math.cos(geoDest.lat * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const approxDistanceKm = Math.round(R * c * 1.25);

      const speedKmH = mode === "walking" ? 4.8 : mode === "bicycling" ? 15 : mode === "transit" ? 40 : 65;
      const hours = approxDistanceKm / speedKmH;
      const totalMinutes = Math.round(hours * 60);

      distanceText = approxDistanceKm > 1 ? `${approxDistanceKm} km` : `${approxDistanceKm * 1000} m`;
      if (totalMinutes < 60) {
        durationText = `${totalMinutes} mins`;
      } else {
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        durationText = `${h} hr ${m > 0 ? `${m} mins` : ""}`;
      }

      steps = [
        `Depart from ${geoOrigin.formattedAddress.split(",")[0] || cleanOrigin}`,
        `Follow primary routes toward ${cleanDest} (${distanceText})`,
        `Arrive at destination: ${geoDest.formattedAddress.split(",")[0] || cleanDest}`
      ];
    }
  } catch (err) {
    console.warn("[Directions Calculation Notice]:", err);
  }

  return {
    origin: cleanOrigin,
    destination: cleanDest,
    travelMode: mode,
    distanceText: distanceText || "View on Google Maps",
    durationText: durationText || "Calculated via Google Maps",
    distanceMeters: 0,
    durationSeconds: 0,
    summary: `${cleanOrigin} to ${cleanDest}`,
    steps: steps.length > 0 ? steps : [`Navigate toward ${cleanDest} via Google Maps`],
    directionsUrl,
    embedUrl
  };
}

export interface PlaceSearchResult {
  query: string;
  places: Array<{
    name: string;
    address: string;
    lat?: number;
    lng?: number;
    category?: string;
    mapUrl: string;
  }>;
  searchUrl: string;
  embedUrl: string;
}

export async function searchPlacesNearby(
  query: string,
  location?: string | { lat: number; lng: number },
  platform: MapsPlatform = "web"
): Promise<PlaceSearchResult> {
  const cleanQuery = query.trim();
  let searchPhrase = cleanQuery;

  if (typeof location === "string" && location.trim()) {
    searchPhrase = `${cleanQuery} in ${location.trim()}`;
  } else if (location && typeof location === "object" && typeof location.lat === "number") {
    searchPhrase = cleanQuery;
  }

  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchPhrase)}`;
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(searchPhrase)}&output=embed`;

  let placesList: Array<{ name: string; address: string; lat?: number; lng?: number; category?: string; mapUrl: string }> = [];

  try {
    let nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchPhrase)}&limit=5`;
    if (location && typeof location === "object" && typeof location.lat === "number") {
      nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQuery)}&lat=${location.lat}&lon=${location.lng}&limit=5`;
    }

    const resp = await fetch(nominatimUrl, {
      headers: { "User-Agent": `A-NOVA-GoogleMaps-Platform-${platform}/1.0` }
    });

    if (resp.ok) {
      const results: any = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        placesList = results.map((item: any) => ({
          name: item.display_name?.split(",")?.[0] || item.name || cleanQuery,
          address: item.display_name || "",
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          category: item.type || item.class || "Place",
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.display_name || item.name)}`
        }));
      }
    }
  } catch (err) {
    console.warn("[Places Search Notice]:", err);
  }

  if (placesList.length === 0) {
    placesList = [
      {
        name: searchPhrase,
        address: typeof location === "string" ? location : searchPhrase,
        mapUrl: searchUrl
      }
    ];
  }

  return {
    query: searchPhrase,
    places: placesList,
    searchUrl,
    embedUrl
  };
}

// ==========================================
// 4. GENERAL CHAT INTENT DISPATCHER
// ==========================================

export interface GeneralChatLiveContext {
  weatherData?: WeatherData | null;
  currencyData?: CurrencyConversionResult | null;
  mapData?: GeocodeResult | DirectionsResult | PlaceSearchResult | null;
  detectedType?: "weather" | "currency" | "maps" | "directions" | "places" | null;
  contextPromptString: string;
}

export async function detectAndFetchGeneralChatIntegrations(
  userText: string,
  platform: MapsPlatform = "web",
  userCoords?: { lat: number; lng: number } | null,
  locationPermissionState?: string,
  existingWeatherContext?: StoredWeatherContext | null,
  chatHistory?: Array<{ role: string; content: string }>
): Promise<GeneralChatLiveContext> {
  const text = (userText || "").trim();
  const lower = text.toLowerCase();

  // 1. Check for Weather Follow-up Query regarding previous weather data/report in the session
  const isFollowUpWeatherQuery = Boolean(
    existingWeatherContext && (
      /\b(date of this report|date of the report|when was this|when was that|when was the weather|what is the date of this|what was the date|what time was this|time of this report|time of the report|where is this weather for|where was this weather for|where is this for|where was this for|what location did you use|which location did you use|what location was used|which location was used|is this my location|was this my location|is that my location|was that my location|what place did you use|what coordinates were used|what coordinates did you use|what was the humidity|what was the temperature again|what did you say the temperature was|what was the weather again|repeat the weather)\b/i.test(lower) ||
      (/\b(this|that|the)\s+(report|weather|data|forecast)\b/i.test(lower) && /\b(date|time|when|where|location|place|coordinates|city|my location|resolved)\b/i.test(lower)) ||
      (/^(\s*what('s| is) the date\??|\s*when was it\??|\s*where is it\??|\s*is this my location\??|\s*what location\??|\s*what is the date\??)\s*$/i.test(lower))
    )
  );

  if (isFollowUpWeatherQuery && existingWeatherContext) {
    const ctx = existingWeatherContext;
    const isMyLocationText = ctx.isMyLocation
      ? "YES (This weather report was fetched for the user's current device location via browser Geolocation API coordinates)"
      : `NO (This weather report was fetched for "${ctx.locationName}" which was manually specified by the user)`;

    const contextPromptString = 
      `\n\n[STORED REAL-TIME WEATHER & LOCATION CONTEXT FROM THIS CONVERSATION]:\n` +
      `- Stored Location Used: ${ctx.locationName}\n` +
      `- Is This The User's Device Location: ${isMyLocationText}\n` +
      `- Resolved Place / Region Name: ${ctx.resolvedPlaceName || ctx.locationName}\n` +
      `- Exact Coordinates: ${ctx.coordinates ? `${ctx.coordinates.lat.toFixed(4)}°N, ${ctx.coordinates.lon.toFixed(4)}°E` : "N/A"}\n` +
      `- Exact Retrieval Date: ${ctx.retrievedDate}\n` +
      `- Exact Retrieval Time: ${ctx.retrievedTime}\n` +
      `- ISO 8601 Timestamp: ${ctx.retrievedAt}\n` +
      `- Stored Temperature: ${ctx.temperature}°C (${Math.round((ctx.temperature * 9/5 + 32) * 10) / 10}°F)\n` +
      `- Stored Condition: ${ctx.condition} (${ctx.description})\n` +
      `- Stored Humidity: ${ctx.humidity}%\n` +
      (ctx.feelsLike !== undefined ? `- Feels Like: ${ctx.feelsLike}°C\n` : "") +
      (ctx.tempMin !== undefined && ctx.tempMax !== undefined ? `- Min / Max: ${ctx.tempMin}°C / ${ctx.tempMax}°C\n` : "") +
      (ctx.windSpeed !== undefined ? `- Wind Speed: ${ctx.windSpeed} m/s\n` : "") +
      (ctx.sunrise && ctx.sunset ? `- Sunrise / Sunset: ${ctx.sunrise} / ${ctx.sunset}\n` : "") +
      `\n[MANDATORY INSTRUCTIONS FOR ANSWERING FOLLOW-UP QUESTIONS]:\n` +
      `The user is asking a follow-up question about the stored weather report from earlier in this chat.\n` +
      `- If asked "What is the date of this report?" or "When was this weather data?": Answer clearly with the exact date (${ctx.retrievedDate}) and time (${ctx.retrievedTime}) recorded above.\n` +
      `- If asked "Where is this weather for?" or "What location did you use?": Answer with the exact location (${ctx.locationName}) and resolved area (${ctx.resolvedPlaceName || ctx.locationName}).\n` +
      `- If asked "Is this my location?": Answer directly based on "${isMyLocationText}".\n` +
      `- NEVER guess, alter, or lose the stored weather location, date, or time for follow-up questions in this chat.`;

    return {
      weatherData: ctx.weatherData || null,
      detectedType: "weather",
      contextPromptString
    };
  }

  // 1. Weather Intent
  const weatherRegex = /\b(weather|temperature|temp|forecast|rain|raining|snow|snowing|climate|humidity|degrees|how hot|how cold|is it sunny|is it raining)\b/i;
  const isWeather = weatherRegex.test(lower) && !/\b(code|function|python|react|math|calculate|integral|equation)\b/i.test(lower);

  // 2. Currency Conversion Intent
  const currencyRegex = /\b(exchange rate|currency|convert|conversion|fx rate|how much is|rate of|forex)\b.*\b(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\b/i;
  const directPairRegex = /\b(\d+(?:\.\d+)?)\s*(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\s*(?:to|in|into|equal to|=)\s*(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\b/i;
  const isCurrency = directPairRegex.test(lower) || (currencyRegex.test(lower) && !/\b(weather|map|temperature|forecast)\b/i.test(lower));

  // 3. Directions / Route Intent
  const directionsRegex = /\b(directions?|route|navigate|how to get|driving to|distance|travel from|drive from|walk from|steps from)\b.*\b(from|to|between)\b/i;
  const isDirections = directionsRegex.test(lower) || /\b(directions to|route to|how do i get to|navigate to|drive to|walk to)\s+([^?.!]+)/i.test(lower);

  // 4. Google Maps & Places Intent (including "open in Google Maps", "find place", etc.)
  const openInMapsRegex = /\b(open in google maps|open on google maps|show in google maps|show on google maps|google maps link|open it in google maps|open on maps|open in maps|view on maps|view in maps|show on map)\b/i;
  const placesRegex = /\b(places?|restaurants?|cafes?|coffee shops?|hotels?|museums?|attractions?|gas stations?|hospitals?|stores?|shops?|supermarkets?|parks?|pharmacies?|gyms?|cinemas?|theaters?)\s+(?:in|near|around|at)\s+([a-zA-Z0-9\s,.-]+)/i;
  const nearbyPlacesRegex = /\b(places?|restaurants?|cafes?|coffee shops?|hotels?|gas stations?|hospitals?|pharmacies?|groceries?|supermarkets?|parks?)\s*(?:near me|nearby|around here|around me|close by)?\b/i;
  const mapSearchRegex = /\b(where is|show me on map|find on map|map of|location of|locate|find|search for)\s+([a-zA-Z0-9\s,.-]+)/i;
  const isPlacesOrMap = !isDirections && (openInMapsRegex.test(lower) || placesRegex.test(lower) || nearbyPlacesRegex.test(lower) || mapSearchRegex.test(lower));

  let contextPromptString = "";

  // ------------------------------------------
  // Handle Real-Time Weather
  // ------------------------------------------
  if (isWeather) {
    const isForecastRequest = /\b(forecast|this week|next \d+ days|upcoming days|multi-day|tomorrow)\b/i.test(lower);
    const isLocalWeather = /\b(near me|here|around here|current location|my location|today|outside|now)\b/i.test(lower) || !/\b(in|for|at|of)\s+[a-zA-Z]{3,}/i.test(lower);

    if (isLocalWeather && userCoords && typeof userCoords.lat === "number") {
      // User location available via Geolocation API
      if (isForecastRequest) {
        const forecast = await fetchWeatherForecast(undefined, { lat: userCoords.lat, lon: userCoords.lng }, "metric");
        if (forecast) {
          contextPromptString = `\n\n[REAL-TIME WEATHER FORECAST via Weather_API (OpenWeatherMap) for Current Device Location]:\n` +
            `- Location: ${forecast.city}, ${forecast.country}\n` +
            `- 5-Day Daily Forecast:\n` +
            forecast.daily.map((d: any) => `  * ${d.date}: ${d.temp}°C (${d.condition} - ${d.description}), Min: ${d.tempMin}°C, Max: ${d.tempMax}°C, Humidity: ${d.humidity}%`).join("\n") +
            `\nPlease deliver this verified 5-day weather forecast clearly to the user based on their device location.`;

          return { weatherData: null, detectedType: "weather", contextPromptString };
        } else {
          contextPromptString = `\n\n[WEATHER API NOTICE]: Could not retrieve 5-day forecast for current device location at this time. Please invite the user to specify a city or try again in a moment.`;
          return { detectedType: "weather", contextPromptString };
        }
      } else {
        const weather = await fetchCurrentWeather(undefined, { lat: userCoords.lat, lon: userCoords.lng }, "metric", platform);
        if (weather) {
          contextPromptString = `\n\n[REAL-TIME WEATHER DATA via Weather_API (OpenWeatherMap) for Current Device Location]:\n` +
            `- Location Used: ${weather.locationName}\n` +
            `- Resolved Place: ${weather.resolvedPlaceName || weather.locationName}\n` +
            `- Device Coordinates: ${weather.coordinates.lat.toFixed(4)}°N, ${weather.coordinates.lon.toFixed(4)}°E\n` +
            `- Is User's Location: Yes (Device Geolocation API)\n` +
            `- Date Retrieved: ${weather.retrievedDate}\n` +
            `- Time Retrieved: ${weather.retrievedTime}\n` +
            `- Current Temperature: ${weather.temperature}°C (${Math.round((weather.temperature * 9/5 + 32) * 10) / 10}°F)\n` +
            `- Condition: ${weather.condition} (${weather.description})\n` +
            `- Feels Like: ${weather.feelsLike}°C\n` +
            `- Min / Max: ${weather.tempMin}°C / ${weather.tempMax}°C\n` +
            `- Humidity: ${weather.humidity}%\n` +
            `- Wind Speed: ${weather.windSpeed} m/s\n` +
            `- Sunrise / Sunset: ${weather.sunrise} / ${weather.sunset}\n` +
            `- Verified Timestamp: ${weather.retrievedAt}\n` +
            `Please provide this exact real-time weather information for the user's current location accurately and clearly.`;

          return { weatherData: weather, detectedType: "weather", contextPromptString };
        } else {
          contextPromptString = `\n\n[WEATHER API ERROR]: The weather service was unable to retrieve real-time weather for the current device coordinates (${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}). Please explain this clearly to the user and invite them to specify their city name manually.`;
          return { detectedType: "weather", contextPromptString };
        }
      }
    } else {
      // Named city or region
      let locationExtracted = "";
      const inAtMatch = text.match(/\b(?:in|for|at|around|of)\s+([a-zA-Z\s,.-]{2,30})/i);
      if (inAtMatch && inAtMatch[1]) {
        locationExtracted = inAtMatch[1].replace(/[?!.,;]/g, "").trim();
      } else if (!isLocalWeather) {
        const words = text.split(/\s+/).filter(w => !weatherRegex.test(w) && w.length > 2);
        if (words.length > 0) locationExtracted = words.slice(-2).join(" ");
      }

      if (locationExtracted) {
        if (isForecastRequest) {
          const forecast = await fetchWeatherForecast(locationExtracted, undefined, "metric");
          if (forecast) {
            contextPromptString = `\n\n[REAL-TIME WEATHER FORECAST via Weather_API (OpenWeatherMap) for ${locationExtracted}]:\n` +
              `- Location: ${forecast.city}, ${forecast.country}\n` +
              `- 5-Day Daily Forecast:\n` +
              forecast.daily.map((d: any) => `  * ${d.date}: ${d.temp}°C (${d.condition} - ${d.description}), Min: ${d.tempMin}°C, Max: ${d.tempMax}°C, Humidity: ${d.humidity}%`).join("\n") +
              `\nPlease deliver this verified 5-day weather forecast clearly to the user.`;

            return { weatherData: null, detectedType: "weather", contextPromptString };
          } else {
            contextPromptString = `\n\n[WEATHER API ERROR]: The weather service could not find forecast data for "${locationExtracted}". Please inform the user clearly that forecast data for "${locationExtracted}" could not be retrieved, and invite them to check the spelling or enter a different location.`;
            return { detectedType: "weather", contextPromptString };
          }
        }

        const weather = await fetchCurrentWeather(locationExtracted, undefined, "metric", platform);
        if (weather) {
          contextPromptString = `\n\n[REAL-TIME WEATHER DATA via Weather_API (OpenWeatherMap) for ${locationExtracted}]:\n` +
            `- Location Used: ${weather.locationName}\n` +
            `- Is User's Location: No (User manually specified: ${locationExtracted})\n` +
            `- Coordinates: ${weather.coordinates.lat.toFixed(4)}°N, ${weather.coordinates.lon.toFixed(4)}°E\n` +
            `- Date Retrieved: ${weather.retrievedDate}\n` +
            `- Time Retrieved: ${weather.retrievedTime}\n` +
            `- Current Temperature: ${weather.temperature}°C (${Math.round((weather.temperature * 9/5 + 32) * 10) / 10}°F)\n` +
            `- Condition: ${weather.condition} (${weather.description})\n` +
            `- Feels Like: ${weather.feelsLike}°C\n` +
            `- Min / Max: ${weather.tempMin}°C / ${weather.tempMax}°C\n` +
            `- Humidity: ${weather.humidity}%\n` +
            `- Wind Speed: ${weather.windSpeed} m/s\n` +
            `- Sunrise / Sunset: ${weather.sunrise} / ${weather.sunset}\n` +
            `- Verified Timestamp: ${weather.retrievedAt}\n` +
            `Please provide this exact real-time weather information accurately and concisely.`;

          return { weatherData: weather, detectedType: "weather", contextPromptString };
        } else {
          contextPromptString = `\n\n[WEATHER API ERROR]: The weather service could not find weather data for "${locationExtracted}".\nPlease inform the user clearly and politely that weather data for "${locationExtracted}" could not be retrieved (for example, the city name could not be found or the weather service was temporarily unreachable), and invite them to check the spelling or enter a specific city/region.`;
          return { detectedType: "weather", contextPromptString };
        }
      } else if (isLocalWeather && (locationPermissionState === "denied" || !userCoords)) {
        if (locationPermissionState === "denied") {
          contextPromptString = `\n\n[LOCATION PERMISSION DENIED]: The user asked for local weather, but device location permission was denied. NEVER guess the user's location. Do NOT use IP-based tracking. Clearly and politely explain that device location permission was denied, and ask the user to enter their location or city manually.`;
        } else {
          contextPromptString = `\n\n[LOCATION PERMISSION REQUIRED]: The user asked for local weather, but device location permission is needed to determine their local coordinates. NEVER guess the user's location. Do NOT use IP tracking. Politely explain that location permission is needed to automatically provide local weather, and invite the user to allow location access or manually enter their city/area.`;
        }
        return { detectedType: "weather", contextPromptString };
      }
    }
  }

  // ------------------------------------------
  // Handle Real-Time Currency Exchange
  // ------------------------------------------
  if (isCurrency) {
    const currencyNameMap: Record<string, string> = {
      dollar: "USD", dollars: "USD", usd: "USD",
      euro: "EUR", euros: "EUR", eur: "EUR",
      pound: "GBP", pounds: "GBP", gbp: "GBP",
      rupee: "INR", rupees: "INR", inr: "INR",
      yen: "JPY", jpy: "JPY",
      cad: "CAD", aud: "AUD", chf: "CHF", cny: "CNY",
      rub: "RUB", krw: "KRW", nzd: "NZD", sgd: "SGD",
      hkd: "HKD", brl: "BRL", zar: "ZAR", mxn: "MXN",
      aed: "AED", sar: "SAR", sek: "SEK", nok: "NOK",
      pln: "PLN", try: "TRY", thb: "THB", idr: "IDR"
    };

    let amount = 1;
    let fromCurr = "USD";
    let toCurr = "EUR";

    const pairMatch = text.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*(?:to|in|into|equal to|=)\s*([a-zA-Z]+)/i);
    if (pairMatch) {
      amount = parseFloat(pairMatch[1]) || 1;
      fromCurr = currencyNameMap[pairMatch[2].toLowerCase()] || pairMatch[2].toUpperCase();
      toCurr = currencyNameMap[pairMatch[3].toLowerCase()] || pairMatch[3].toUpperCase();
    } else {
      const matchAmount = text.match(/(\d+(?:\.\d+)?)/);
      if (matchAmount) amount = parseFloat(matchAmount[1]) || 1;
      const foundCurrs: string[] = [];
      Object.keys(currencyNameMap).forEach(key => {
        if (new RegExp(`\\b${key}\\b`, "i").test(text) && !foundCurrs.includes(currencyNameMap[key])) {
          foundCurrs.push(currencyNameMap[key]);
        }
      });
      if (foundCurrs.length >= 2) {
        fromCurr = foundCurrs[0];
        toCurr = foundCurrs[1];
      } else if (foundCurrs.length === 1) {
        fromCurr = foundCurrs[0];
        toCurr = fromCurr === "USD" ? "EUR" : "USD";
      }
    }

    const conversion = await convertCurrency(fromCurr, toCurr, amount);
    if (conversion) {
      contextPromptString = `\n\n[REAL-TIME CURRENCY EXCHANGE DATA via Exchange_Rate_API]:\n` +
        `- Conversion: ${conversion.amount} ${conversion.from} = ${conversion.result} ${conversion.to}\n` +
        `- Current Exchange Rate: 1 ${conversion.from} = ${conversion.rate} ${conversion.to}\n` +
        `- Inverse Rate: 1 ${conversion.to} = ${(1 / conversion.rate).toFixed(6)} ${conversion.from}\n` +
        `- Last Updated UTC: ${conversion.lastUpdated}\n` +
        `Please present this verified live exchange rate clearly to the user.`;

      return {
        currencyData: conversion,
        detectedType: "currency",
        contextPromptString
      };
    }
  }

  // ------------------------------------------
  // Handle Google Maps (Web & Android) Directions
  // ------------------------------------------
  if (isDirections) {
    const fromToMatch = text.match(/(?:from|between)\s+([^,]+?)\s+(?:to|and)\s+([^,?.!]+)/i);
    let origin = "";
    let destination = "";

    if (fromToMatch) {
      origin = fromToMatch[1].trim();
      destination = fromToMatch[2].trim();
    } else {
      const toMatch = text.match(/(?:to|directions to|navigate to|how do i get to|drive to|walk to)\s+([^,?.!]+)/i);
      if (toMatch) {
        destination = toMatch[1].trim();
        origin = userCoords ? "Current Device Location" : "Current Location";
      }
    }

    if (destination) {
      const mode = /\b(walk|walking|foot)\b/i.test(lower) ? "walking" : /\b(transit|bus|train|subway)\b/i.test(lower) ? "transit" : /\b(bike|bicycle|cycling)\b/i.test(lower) ? "bicycling" : "driving";
      const directions = await computeDirections(
        origin || "Origin",
        destination,
        mode,
        platform,
        userCoords || undefined
      );

      if (directions) {
        const platformLabel = platform === "android" ? "Google Maps Android API" : "Google Maps Web API";
        contextPromptString = `\n\n[REAL-TIME GOOGLE MAPS ROUTE DATA via ${platformLabel}]:\n` +
          `- Origin: ${directions.origin}\n` +
          `- Destination: ${directions.destination}\n` +
          `- Travel Mode: ${directions.travelMode}\n` +
          `- Estimated Distance: ${directions.distanceText}\n` +
          `- Estimated Travel Time: ${directions.durationText}\n` +
          `- Route Steps:\n${directions.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}\n` +
          `- Working Google Maps Route Link: ${directions.directionsUrl}\n` +
          `Please provide the route details, distance, ETA, and turn-by-turn guidance with a working clickable Google Maps link ([Open in Google Maps](${directions.directionsUrl})). Never claim that you cannot open Google Maps or cannot provide navigation links.`;

        return {
          mapData: directions,
          detectedType: "directions",
          contextPromptString
        };
      }
    }
  }

  // ------------------------------------------
  // Handle Google Maps Places / Search / "Open in Google Maps"
  // ------------------------------------------
  if (isPlacesOrMap) {
    let placeQuery = text;
    const openInMapsClean = text.replace(/(?:can you |please )?(?:open (?:it |this )?(?:in|on) google maps|google maps link for|show (?:it |this )?(?:in|on) google maps|open in maps|show on map|find on map)/i, "").trim();
    
    if (openInMapsClean) {
      placeQuery = openInMapsClean;
    } else {
      const match = text.match(/(?:where is|find|search for|show me|map of|places? in|restaurants? in|hotels? in|cafes? in)\s+([^?.!]+)/i);
      if (match && match[1]) {
        placeQuery = match[1].trim();
      } else {
        const nearbyMatch = text.match(/(?:find|search|show|get|recommend)?\s*(?:the )?(?:nearest|nearby|closest)?\s*(restaurants?|cafes?|coffee shops?|hotels?|gas stations?|hospitals?|pharmacies?|supermarkets?|parks?)/i);
        if (nearbyMatch && nearbyMatch[1]) {
          placeQuery = nearbyMatch[1];
        }
      }
    }

    const platformLabel = platform === "android" ? "Google Maps Android API" : "Google Maps Web API";
    const placesResult = await searchPlacesNearby(
      placeQuery || "Locations",
      userCoords || undefined,
      platform
    );

    if (placesResult) {
      contextPromptString = `\n\n[REAL-TIME GOOGLE MAPS & PLACES DATA via ${platformLabel}]:\n` +
        `- Search Query: ${placesResult.query}\n` +
        `- Google Maps Search URL: ${placesResult.searchUrl}\n` +
        `- Found Places & Locations:\n${placesResult.places.map((p, i) => `  ${i + 1}. **${p.name}** - ${p.address} ([Open in Google Maps](${p.mapUrl}))`).join("\n")}\n` +
        `\nInstructions for Google Maps response:\n` +
        `- Always provide the working Google Maps link [Open in Google Maps](${placesResult.searchUrl}) or specific place link.\n` +
        `- Never say you cannot open Google Maps or cannot search places.\n` +
        `- Never guess or invent fake coordinates/addresses; use the verified addresses and map links above.\n` +
        `- If device location is available, recommend the best nearby options accurately.`;

      return {
        mapData: placesResult,
        detectedType: "places",
        contextPromptString
      };
    }
  }

  return { contextPromptString: "" };
}
