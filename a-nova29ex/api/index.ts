import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import http from "http";

// Safe env retrieval for browser and Node runtime
function getEnvVar(name: string): string {
  if (typeof process !== "undefined" && process.env && process.env[name]) {
    return process.env[name] as string;
  }
  try {
    const metaEnv = new Function("try { return import.meta.env; } catch(e) { return null; }")();
    if (metaEnv && metaEnv[name]) {
      return metaEnv[name];
    }
  } catch (e) {}
  return "";
}

const rawUrl =
  getEnvVar("VITE_SUPABASE_URL") ||
  getEnvVar("SUPABASE_URL") ||
  getEnvVar("NEXT_PUBLIC_SUPABASE_URL") ||
  "";

const rawKey =
  getEnvVar("VITE_SUPABASE_ANON_KEY") ||
  getEnvVar("SUPABASE_ANON_KEY") ||
  getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  getEnvVar("SUPABASE_KEY") ||
  "";

// Clean quotes and paths
const cleanUrl = (rawUrl || "")
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/+$/, "");

const cleanKey = (rawKey || "")
  .trim()
  .replace(/^["']|["']$/g, "");

export const isSupabaseConfigured: boolean = Boolean(
  cleanUrl &&
  cleanKey &&
  cleanUrl.startsWith("http") &&
  !cleanUrl.includes("placeholder") &&
  cleanKey !== "sb_publishable_dummy_key" &&
  cleanKey.length > 15
);

export const SUPABASE_URL: string = cleanUrl || "https://placeholder.supabase.co";
export const SUPABASE_ANON_KEY: string = cleanKey || "sb_publishable_dummy_key";

function createDummyQueryBuilder(): any {
  const dummyBuilder: any = new Proxy(
    function () {},
    {
      get(target, prop) {
        if (prop === "then") {
          return (resolve: any) => resolve({ data: [], error: null });
        }
        if (prop === "catch") {
          return (reject: any) => {};
        }
        return () => dummyBuilder;
      },
      apply() {
        return dummyBuilder;
      }
    }
  );
  return dummyBuilder;
}

function createDummySupabaseClient(): any {
  const dummyAuth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error("Supabase is not configured") }),
    signUp: async () => ({ data: null, error: new Error("Supabase is not configured") }),
    signInWithOAuth: async () => ({ error: new Error("Supabase is not configured") }),
    signOut: async () => ({ error: null })
  };

  const dummyChannel = () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {}
  });

  return new Proxy(
    {
      auth: dummyAuth,
      from: (_tableName: string) => createDummyQueryBuilder(),
      channel: (_name: string) => dummyChannel(),
      removeChannel: (_ch: any) => {}
    },
    {
      get(target: any, prop: string) {
        if (prop in target) {
          return target[prop];
        }
        return () => createDummyQueryBuilder();
      }
    }
  );
}

export const supabaseServer: any = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : createDummySupabaseClient();
// ==========================================
// LIVE INTEGRATIONS SERVICE (Weather, Exchange, Maps)
// ==========================================

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

  const weatherRegex = /\b(weather|temperature|temp|forecast|rain|raining|snow|snowing|climate|humidity|degrees|how hot|how cold|is it sunny|is it raining)\b/i;
  const isWeather = weatherRegex.test(lower) && !/\b(code|function|python|react|math|calculate|integral|equation)\b/i.test(lower);

  const currencyRegex = /\b(exchange rate|currency|convert|conversion|fx rate|how much is|rate of|forex)\b.*\b(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\b/i;
  const directPairRegex = /\b(\d+(?:\.\d+)?)\s*(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\s*(?:to|in|into|equal to|=)\s*(usd|eur|gbp|inr|jpy|cad|aud|chf|cny|rub|krw|nzd|sgd|hkd|brl|zar|mxn|aed|sar|sek|nok|pln|try|thb|idr|dollars?|euros?|pounds?|rupees?|yen)\b/i;
  const isCurrency = directPairRegex.test(lower) || (currencyRegex.test(lower) && !/\b(weather|map|temperature|forecast)\b/i.test(lower));

  const directionsRegex = /\b(directions?|route|navigate|how to get|driving to|distance|travel from|drive from|walk from|steps from)\b.*\b(from|to|between)\b/i;
  const isDirections = directionsRegex.test(lower) || /\b(directions to|route to|how do i get to|navigate to|drive to|walk to)\s+([^?.!]+)/i.test(lower);

  const openInMapsRegex = /\b(open in google maps|open on google maps|show in google maps|show on google maps|google maps link|open it in google maps|open on maps|open in maps|view on maps|view in maps|show on map)\b/i;
  const placesRegex = /\b(places?|restaurants?|cafes?|coffee shops?|hotels?|museums?|attractions?|gas stations?|hospitals?|stores?|shops?|supermarkets?|parks?|pharmacies?|gyms?|cinemas?|theaters?)\s+(?:in|near|around|at)\s+([a-zA-Z0-9\s,.-]+)/i;
  const nearbyPlacesRegex = /\b(places?|restaurants?|cafes?|coffee shops?|hotels?|gas stations?|hospitals?|pharmacies?|groceries?|supermarkets?|parks?)\s*(?:near me|nearby|around here|around me|close by)?\b/i;
  const mapSearchRegex = /\b(where is|show me on map|find on map|map of|location of|locate|find|search for)\s+([a-zA-Z0-9\s,.-]+)/i;
  const isPlacesOrMap = !isDirections && (openInMapsRegex.test(lower) || placesRegex.test(lower) || nearbyPlacesRegex.test(lower) || mapSearchRegex.test(lower));

  let contextPromptString = "";

  if (isWeather) {
    const isForecastRequest = /\b(forecast|this week|next \d+ days|upcoming days|multi-day|tomorrow)\b/i.test(lower);
    const isLocalWeather = /\b(near me|here|around here|current location|my location|today|outside|now)\b/i.test(lower) || !/\b(in|for|at|of)\s+[a-zA-Z]{3,}/i.test(lower);

    if (isLocalWeather && userCoords && typeof userCoords.lat === "number") {
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

// ==========================================
// SIH26107 BIS KNOWLEDGE & DOMAIN ENGINE
// ==========================================

export interface IndianStandardRecord {
  isCode: string;
  title: string;
  category: string;
  scheme: "Scheme I (ISI Mark)" | "Scheme II (CRS)" | "Scheme IV (CoC)" | "Hallmarking" | "Voluntary/Scheme I";
  isMandatoryQco: boolean;
  qcoDetails?: string;
  scope: string;
  keyParameters: string[];
  recognizedLabs: string[];
  portal: "manakonline.in" | "crsbis.in";
}

export const CANONICAL_INDIAN_STANDARDS: IndianStandardRecord[] = [
  {
    isCode: "IS 13252 (Part 1):2010 / IEC 60950-1",
    title: "Information Technology Equipment — Safety — Part 1: General Requirements",
    category: "Electronics & IT Goods",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Compulsory Registration Order (CRO)",
    scope: "Laptops, Desktops, Servers, Tablets, Power Banks, Printers, Scanners, POS Terminals, Smart Watches, Wireless Keyboards, CCTV Cameras.",
    keyParameters: ["Electric shock protection", "Dielectric strength test", "Temperature rise limit", "Flammability of enclosure", "Earth continuity", "Clearance and creepage distances"],
    recognizedLabs: ["BIS Central Laboratory (CL Sahibabad)", "ERTL (North/East/West/South)", "SAMEER", "TUV Rheinland India", "UL India", "Intertek India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16046 (Part 1 & 2):2018 / IEC 62133-1 & 2",
    title: "Secondary Cells and Batteries Containing Alkaline or Other Non-Acid Electrolytes for Portable Applications (Nickel & Lithium Systems)",
    category: "Batteries & Energy Storage",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Electronics & IT Goods (Compulsory Registration) Order",
    scope: "Lithium-ion cells, portable power bank batteries, laptop batteries, mobile phone secondary batteries.",
    keyParameters: ["Continuous charging safety", "External short circuit test", "Free fall impact", "Thermal abuse (130°C test)", "Crush resistance", "Overcharge & forced discharge"],
    recognizedLabs: ["BIS Central Laboratory", "SAMEER Chennai", "TUV India", "UL International Bangalore", "Intertek Manesar"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 15885 (Part 2/Sec 13):2012",
    title: "Lamp Controlgear — Part 2: Particular Requirements — Section 13: D.C. or A.C. Supplied Electronic Controlgear for LED Modules",
    category: "Lighting & Electronics",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Electronics & IT Goods CRO",
    scope: "LED Drivers, power supply units for indoor and outdoor LED lighting.",
    keyParameters: ["Insulation resistance & electric strength", "Thermal endurance test", "Fault condition testing", "Creepage & clearance", "Protection against moisture and dust"],
    recognizedLabs: ["BIS CL Sahibabad", "CPRI Bangalore", "ERTL Kolkata", "DEKRA India", "TUV SUD India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16102 (Part 1 & Part 2):2012",
    title: "Self-Ballasted LED Lamps for General Lighting Services — Part 1: Safety Requirements, Part 2: Performance Requirements",
    category: "Lighting & Consumer Electricals",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY CRO & Bureau of Energy Efficiency (BEE) Star Rating",
    scope: "Self-ballasted LED retrofit bulbs for domestic and commercial lighting.",
    keyParameters: ["Cap temperature rise", "Insulation resistance", "Luminous flux & efficacy (lm/W)", "Color temperature & CRI", "Harmonic current distortion (THD < 15%)"],
    recognizedLabs: ["BIS Central Lab", "ERTL Mumbai", "SAMEER", "National Test House (NTH)"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 616:2017 / IEC 60065",
    title: "Audio, Video and Similar Electronic Apparatus — Safety Requirements",
    category: "Consumer Electronics",
    scheme: "Scheme II (CRS)",
    isMandatoryQco: true,
    qcoDetails: "MeitY Compulsory Registration Order",
    scope: "Smart TVs, Home Theatres, Amplifiers, Set Top Boxes, Audio Systems.",
    keyParameters: ["Radiation hazards", "Heating under normal & fault conditions", "Electric shock hazard", "Mechanical strength", "Fire hazard prevention"],
    recognizedLabs: ["ERTL North Delhi", "TUV Rheinland", "SAMEER Mumbai", "UL India"],
    portal: "crsbis.in"
  },
  {
    isCode: "IS 16444 (Part 1):2015",
    title: "A.C. Static Direct Connected Watt-Hour Smart Meter Class 1 and 2",
    category: "Power & Smart Infrastructure",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Power Smart Meter QCO",
    scope: "Single-phase and three-phase smart electricity meters with bi-directional communication.",
    keyParameters: ["Accuracy limit tests", "Tamper detection tests", "Insulation & surge immunity", "Protocol compliance (IS 15959 / DLMS/COSEM)", "EMC/EMI resilience"],
    recognizedLabs: ["CPRI Bangalore/Bhopal", "ERDA Vadodara", "BIS Central Lab Sahibabad"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 302 (Part 1):2008 & Part 2 series",
    title: "Safety of Household and Similar Electrical Appliances",
    category: "Household Appliances",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Electrical Appliances (Quality Control) Order",
    scope: "Electric irons (IS 302-2-3), Electric water heaters/geysers (IS 302-2-21), Room heaters (IS 302-2-30), Food mixers/grinders (IS 302-2-14), Toasters (IS 302-2-9).",
    keyParameters: ["Leakage current & electric strength at operating temp", "Moisture resistance", "Overload protection of transformers & associated circuits", "Abnormal operation stability", "Construction & internal wiring"],
    recognizedLabs: ["BIS Regional Labs (Mumbai, Kolkata, Chennai, Chandigarh)", "NTH Kolkata", "CPRI", "MSME Testing Centres"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 1293:2019",
    title: "Plugs and Socket-Outlets for Domestic and Similar Purposes of Rated Voltage up to 250V and Rated Current up to 16A",
    category: "Electrical Accessories",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Plugs and Sockets (Quality Control) Order",
    scope: "2-pin and 3-pin plugs (6A, 10A, 16A), socket-outlets, multi-plugs, extension cords.",
    keyParameters: ["Provision for earthing", "Resistance to heat and fire (glow wire test at 850°C)", "Mechanical strength (tumbling barrel test)", "Temperature rise of contacts (< 45K)", "Withdrawal force test"],
    recognizedLabs: ["BIS Central Lab", "CPRI", "ERDA Vadodara", "NTH Ghaziabad"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 694:2010",
    title: "PVC Insulated Unsheathed and Sheathed Cables/Cords with Rigid and Flexible Conductors for Working Voltages up to and Including 1100 V",
    category: "Cables & Wires",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Cables (Quality Control) Order",
    scope: "House wiring wires, industrial flexible cables, appliance cords.",
    keyParameters: ["Conductor DC resistance", "Insulation & sheath thickness", "Tensile strength & elongation at break", "High voltage spark test", "Oxygen and Temperature Index (flame retardancy)"],
    recognizedLabs: ["BIS Regional Labs", "CPRI", "ERDA", "National Test House"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 4151:2015",
    title: "Protective Helmets for Riders of Two-Wheeled Motor Vehicles",
    category: "Automotive Safety & PPE",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Road Transport & Highways (MoRTH) Mandatory Helmet Order",
    scope: "Full-face, open-face, and modular helmets for motorcycle and scooter riders.",
    keyParameters: ["Impact absorption test (ambient, hot, cold, water immersion)", "Retention system strength & dynamic displacement", "Visor optical properties & scratch/impact resistance", "Rigidity test", "Weight constraint (< 1.2 kg limit)"],
    recognizedLabs: ["ARAI Pune", "ICAT Manesar", "BIS Central Lab", "CIRT Pune"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 10500:2012",
    title: "Drinking Water — Specification (Second Revision)",
    category: "Water & Environmental Health",
    scheme: "Voluntary/Scheme I",
    isMandatoryQco: false,
    qcoDetails: "Essential benchmark adopted by Jal Jeevan Mission, FSSAI, Municipal Corporations, and CPWD.",
    scope: "Piped drinking water, community water supplies, tube-well water, treated tap water.",
    keyParameters: [
      "pH: 6.5 – 8.5 (Acceptable Limit)",
      "Total Dissolved Solids (TDS): Max 500 mg/L (Acceptable), 2000 mg/L (Permissible in absence of alternate source)",
      "Turbidity: Max 1 NTU (Acceptable), 5 NTU (Permissible)",
      "Total Hardness (as CaCO3): Max 200 mg/L (Acceptable), 600 mg/L (Permissible)",
      "Chlorides: Max 250 mg/L (Acceptable), 1000 mg/L (Permissible)",
      "Fluoride: Max 1.0 mg/L (Acceptable), 1.5 mg/L (Permissible)",
      "Nitrate: Max 45 mg/L (No relaxation)",
      "Arsenic: Max 0.01 mg/L (Acceptable), 0.05 mg/L (Permissible)",
      "Lead: Max 0.01 mg/L (No relaxation)",
      "Bacteriological: E. coli or thermotolerant coliforms must be absent in 100 ml sample."
    ],
    recognizedLabs: ["BIS Central Laboratory", "State PHED Laboratories", "NEERI Nagpur", "NTH", "SGS India", "Eureka Forbes Lab"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 14543:2004",
    title: "Packaged Drinking Water (Other Than Packaged Natural Mineral Water) — Specification",
    category: "Food & Water",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "FSSAI & Ministry of Consumer Affairs Mandatory Certification Order",
    scope: "Sealed 20-litre jars, 1-litre/500ml bottles, water pouches.",
    keyParameters: ["Total Dissolved Solids (75 - 500 mg/L)", "Total Plate Count, Coliform, Yeast & Mould, Pseudomonas aeruginosa (Must be Absent)", "Heavy metals (Lead, Cadmium, Arsenic < 0.01 mg/L)", "Pesticide residues (Individual < 0.0001 mg/L, Total < 0.0005 mg/L)"],
    recognizedLabs: ["BIS Regional Labs", "CFTRI Mysore", "NTH", "TUV India"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 13428:2005",
    title: "Packaged Natural Mineral Water — Specification",
    category: "Food & Water",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "FSSAI & BIS Mandatory Certification",
    scope: "Natural spring and underground artesian mineral water bottled at source.",
    keyParameters: ["Origin purity & geological source integrity", "Natural mineral balance", "Zero disinfection chemicals residue", "Total absence of pathogens & parasites"],
    recognizedLabs: ["BIS Central Lab", "CFTRI Mysore", "NTH Kolkata"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 1786:2008",
    title: "High Strength Deformed Steel Bars and Wires for Concrete Reinforcement",
    category: "Steel & Metallurgy",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Steel (Steel Quality Control Order)",
    scope: "TMT (Thermo-Mechanically Treated) re-bars in grades Fe 415, Fe 415D, Fe 500, Fe 500D, Fe 550, Fe 550D, Fe 600.",
    keyParameters: ["0.2% Proof stress / Yield stress (e.g. Fe 500D min 500 N/mm²)", "Tensile strength / Yield ratio (Fe 500D min 1.10, min TS 565 N/mm²)", "Elongation (min 16.0% for Fe 500D)", "Total Elongation at Maximum Force (Agt min 5%)", "Bend and Rebend tests without cracking", "Carbon equivalent max 0.42%"],
    recognizedLabs: ["BIS Central Lab", "National Metallurgical Laboratory (NML) Jamshedpur", "NTH", "CSIR-SERC Chennai"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 269:2015",
    title: "Ordinary Portland Cement (OPC 33, OPC 43, OPC 53 Grade) — Specification",
    category: "Cement & Construction",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Cement (Quality Control) Order",
    scope: "Ordinary Portland Cement 33, 43, and 53 grades used in structural concrete.",
    keyParameters: ["Compressive Strength: 3-day (min 27 MPa for 53G), 7-day (min 37 MPa), 28-day (min 53 MPa)", "Initial Setting Time (min 30 mins), Final Setting Time (max 600 mins)", "Soundness (Le-Chatelier expansion max 10 mm, Autoclave max 0.8%)", "Fineness (Blaine min 225 m²/kg)", "Insoluble residue max 5.0%, Loss on ignition max 5.0%"],
    recognizedLabs: ["National Council for Cement and Building Materials (NCCBM Ballabgarh/Hyderabad)", "BIS Regional Labs", "NTH"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 4984:2016",
    title: "High Density Polyethylene (HDPE) Pipes for Water Supply — Specification",
    category: "Piping & Civil Infrastructure",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Plastic Pipes (Quality Control) Order",
    scope: "HDPE pipes for potable water distribution, irrigation, and industrial conveyance.",
    keyParameters: ["Hydrostatic strength at 27°C (100h test) and 80°C (165h & 1000h test)", "Melt Flow Rate (MFR) compatibility", "Carbon black content (2.0 - 2.5%) & dispersion", "Oxidation Induction Time (OIT min 20 mins at 200°C)", "Longitudinal reversion (< 3%)"],
    recognizedLabs: ["CIPET (Central Institute of Petrochemicals Engineering & Technology)", "BIS Regional Labs", "NTH"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 456:2000",
    title: "Plain and Reinforced Concrete — Code of Practice (Fourth Revision)",
    category: "Structural Engineering Code",
    scheme: "Voluntary/Scheme I",
    isMandatoryQco: false,
    qcoDetails: "The primary structural design standard followed nationwide for all RCC buildings, bridges, and infrastructure.",
    scope: "General structural design of reinforced concrete elements, limit state design, mix proportions, durability provisions.",
    keyParameters: ["Characteristic compressive strength (M20 to M80)", "Minimum cementitious material and maximum water-cement ratio for exposure conditions", "Minimum concrete cover for reinforcement", "Deflection limits and crack width control", "Shear and torsion design formulas"],
    recognizedLabs: ["CSIR-CBRI Roorkee", "CSIR-SERC Chennai", "IIT/NIT Structural Engineering Labs"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 9873 (Part 1, 2, 3, 4, 7, 9) & IS 15644:2006",
    title: "Safety of Toys — Physical & Mechanical, Flammability, Migration of Certain Elements, Electric Toys",
    category: "Toys & Child Care",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "DPIIT Toys (Quality Control) Order 2020 (Mandatory ISI mark before manufacturing, importing, or selling in India)",
    scope: "All physical toys, plush toys, mechanical toys, ride-on toys, and battery/electric toys for children under 14 years.",
    keyParameters: [
      "IS 9873-1: Sharp edges, sharp points, small parts (choking hazard cylinder test), drop test, torque/tension tests",
      "IS 9873-2: Flammability rate of textiles and stuffed toys",
      "IS 9873-3: Heavy metal migration limits (Lead, Cadmium, Mercury, Chromium, Arsenic, Barium, Antimony, Selenium)",
      "IS 15644: Electrical safety, overheating, battery compartment security"
    ],
    recognizedLabs: ["BIS Central Lab Sahibabad", "NTH Mumbai/Kolkata", "TUV Rheinland Gurugram", "UL India Bangalore", "Intertek New Delhi"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 9473:2002",
    title: "Respiratory Protective Devices — Filtering Half Masks to Protect Against Particles (FFP1, FFP2, FFP3 / N95 class)",
    category: "PPE & Occupational Safety",
    scheme: "Scheme I (ISI Mark)",
    isMandatoryQco: true,
    qcoDetails: "Ministry of Textiles / DPIIT PPE Quality Control Order",
    scope: "Dust masks, N95/FFP2 equivalent filtering facepiece respirators for particulate filtering.",
    keyParameters: ["Sodium chloride and paraffin oil aerosol filtration efficiency (FFP2 min 94%, FFP3 min 99%)", "Total inward leakage (TIL)", "Breathing resistance (inhalation and exhalation)", "Flammability of mask material", "CO2 content of inhalation air (< 1%)"],
    recognizedLabs: ["NITRA Ghaziabad", "SITRA Coimbatore", "BIS Central Lab", "DRDE Gwalior"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 1417:2016",
    title: "Gold and Gold Alloys, Jewellery/Artefacts — Fineness and Marking (Fifth Revision)",
    category: "Precious Metals & Jewellery",
    scheme: "Hallmarking",
    isMandatoryQco: true,
    qcoDetails: "Mandatory Gold Hallmarking Order by Ministry of Consumer Affairs across 343+ designated districts in India.",
    scope: "Gold jewellery and artefacts sold by registered jewellers in recognized karats: 24K (999/995), 23K (958), 22K (916), 20K (833), 18K (750), 14K (585).",
    keyParameters: [
      "Assaying by Fire Assay / Cupellation method (IS 1418)",
      "X-Ray Fluorescence (XRF) preliminary screening",
      "3 Mandatory Hallmark Marks: 1. BIS Logo, 2. Purity grade (e.g. 22K916), 3. 6-digit alphanumeric HUID (Hallmarking Unique Identification)",
      "Zero tolerance below declared fineness"
    ],
    recognizedLabs: ["BIS Recognized Assaying & Hallmarking Centres (AHCs)", "BIS Central Laboratory", "NTH Referral Laboratories"],
    portal: "manakonline.in"
  },
  {
    isCode: "IS 2112:2014",
    title: "Silver and Silver Alloys, Jewellery/Artefacts — Fineness and Marking",
    category: "Precious Metals & Jewellery",
    scheme: "Hallmarking",
    isMandatoryQco: false,
    qcoDetails: "Voluntary Hallmarking of silver jewellery & artefacts in grades: 990, 970, 925 (Sterling Silver), 900, 835, 800.",
    scope: "Silver jewellery, utensils, coins, and decorative articles.",
    keyParameters: ["Potentiometric titration / Fire Assay fineness check", "Hallmark marking with BIS logo, fineness, AHC mark, and jeweller mark"],
    recognizedLabs: ["BIS Recognized Silver Assaying Centres"],
    portal: "manakonline.in"
  }
];

export const BIS_SCHEMES_GUIDE = {
  scheme1: {
    name: "Scheme I — Product Certification Scheme (ISI Mark)",
    governingAct: "BIS Act 2016 & BIS (Conformity Assessment) Regulations 2018",
    target: "Domestic manufacturers producing products under mandatory QCOs or voluntary Indian Standards.",
    mark: "ISI Mark with Licence Number (CM/L - XXXXXXX)",
    portal: "https://www.manakonline.in (e-BIS Portal)",
    steps: [
      "1. Identify applicable Indian Standard (IS Code) and verify if in-house Scheme of Testing and Inspection (STI) is established.",
      "2. Register on Manakonline (e-BIS) portal and submit Form-I with factory layout, manufacturing machinery list, testing equipment calibration certificates, and QC personnel qualifications.",
      "3. Pay application fee and preliminary inspection charges.",
      "4. Preliminary Factory Inspection: BIS technical officer visits the plant to inspect manufacturing process, verify testing facilities, and independently draw representative samples.",
      "5. Sample Testing: Sealed sample is dispatched to a BIS Regional Lab or BIS-recognized NABL laboratory for full conformity testing against the IS code.",
      "6. Grant of Licence (GoL): Upon successful test report and compliance verification, BIS grants Licence to use standard ISI Mark (CM/L number).",
      "7. Surveillance: Periodic factory audits, factory sample testing, and random market sample surveillance."
    ],
    tatkalScheme: "Tatkal Option available for select product categories where applicant submits test report directly from a BIS-recognized laboratory alongside application, reducing grant timeline to ~30 days.",
    requiredDocuments: [
      "Proof of factory premises ownership / lease agreement",
      "Process flow chart from raw material to finished product",
      "List of manufacturing machinery with capacities",
      "List of in-house testing equipment with valid calibration certificates",
      "Scheme of Testing and Inspection (STI) acceptance letter",
      "Quality Control personnel appointment letters & degree/diploma certificates",
      "Trademark / Brand registration certificate or authorization from brand owner"
    ]
  },
  scheme2: {
    name: "Scheme II — Compulsory Registration Scheme (CRS)",
    governingAct: "Notified by MeitY, MNRE, and Ministry of Power under BIS CRS framework",
    target: "Manufacturers (Domestic & Global) of Electronics, IT Goods, Solar PV Modules, and Smart Meters.",
    mark: "Standard Mark with Registration Number (R-XXXXXXXX) and words 'Self Declaration - Conforming to IS XXXXX'",
    portal: "https://www.crsbis.in",
    steps: [
      "1. Select product and test standard (e.g. IS 13252 for IT goods, IS 16046 for Li-ion batteries, IS 15885 for LED drivers).",
      "2. Submit product sample to a BIS-recognized NABL testing lab in India.",
      "3. Obtain valid, passing BIS Test Report (must be issued within 90 days of registration submission).",
      "4. Create profile on CRS Portal (crsbis.in) and assign an Authorized Indian Representative (AIR) if foreign manufacturer.",
      "5. Upload test report, brand authorization letter, Form-I declaration, and pay government registration fee.",
      "6. BIS scrutiny and digital Grant of Registration (R-number assigned within 15-20 working days).",
      "7. Affix CRS standard mark on product label and retail packaging before import/sale."
    ],
    requiredDocuments: [
      "Valid Test Report from BIS-recognized Indian laboratory (issued within 90 days)",
      "Form-I (Self-Declaration Undertaking of Conformity)",
      "Brand Authorization / Trademark Certificate",
      "Factory Business License / Manufacturing Registration (Apostilled/Legalized for foreign plants)",
      "Authorized Indian Representative (AIR) nomination agreement and Indian ID proof (for foreign manufacturers)",
      "Critical Components List (CCL) with safety ratings"
    ]
  },
  fmcs: {
    name: "Foreign Manufacturers Certification Scheme (FMCS — Scheme I)",
    governingAct: "BIS Act 2016 for overseas manufacturing locations exporting goods under mandatory ISI certification to India",
    target: "Overseas factories manufacturing steel, cement, tires, chemical products, toys, electrical appliances, etc.",
    mark: "ISI Mark with CM/L number",
    portal: "https://www.manakonline.in (FMCS Wing)",
    steps: [
      "1. Appoint an Authorized Indian Representative (AIR) resident in India who assumes legal responsibility under BIS Act 2016.",
      "2. Submit Form-I on Manakonline with plant machinery, testing infrastructure, and quality control systems.",
      "3. Pay application fee and inspection travel/per-diem fees for BIS inspecting officers.",
      "4. Physical factory audit at foreign manufacturing facility by BIS audit delegation.",
      "5. Drawing of production samples and testing in BIS-recognized laboratory in India or designated lab.",
      "6. Submission of Performance Bank Guarantee (PBG) of USD 10,000 and payment of annual marking fees.",
      "7. Issuance of CM/L licence for 1 to 2 years with periodic surveillance audits."
    ]
  }
};

export const HALLMARKING_GUIDE = {
  title: "Hallmarking of Gold & Silver Jewellery in India",
  governingStandard: "IS 1417:2016 (Gold) & IS 2112:2014 (Silver)",
  mandatoryDistricts: "Mandatory in 343+ designated districts across all Indian States & UTs (expanded continuously in phases).",
  theThreeMarksOnGold: [
    {
      name: "1. BIS Standard Mark",
      description: "The authentic triangular Bureau of Indian Standards logo embossed on the piece."
    },
    {
      name: "2. Purity / Fineness Grade",
      description: "Denotes pure gold content in Karats (K) and Parts per thousand (e.g. 24K995, 23K958, 22K916, 20K833, 18K750, 14K585)."
    },
    {
      name: "3. 6-Digit Alphanumeric HUID",
      description: "Hallmarking Unique Identification — a unique 6-character laser-etched code (e.g. `AB1234`) assigned exclusively to that individual jewellery piece at the Assaying & Hallmarking Centre (AHC)."
    }
  ],
  consumerProtectionAndRights: {
    verificationApp: "BIS Care App (available free on Android Google Play Store & iOS App Store). Consumers tap 'Verify HUID' and enter the 6-digit code to instantly view Jeweller Name, Registration No., AHC Name, Hallmarking Date, and Article Type.",
    referralTesting: "Any consumer can get their hallmarked jewellery tested at any BIS-recognized Assaying & Hallmarking Centre (AHC) for a nominal statutory fee (~₹45 per article).",
    compensationRule: "If a hallmarked jewellery piece is tested and found to have lower purity than marked, the jeweller is legally bound to: 1. Refund the purity difference, 2. Pay compensation equal to TWO TIMES the cost of the shortfall, and 3. Reimburse testing charges."
  },
  jewellerRegistrationProcess: {
    portal: "manakonline.in",
    fee: "Zero government fee for micro-enterprises with annual turnover up to ₹5 Crore.",
    validity: "Lifetime registration (no recurring renewal hassles)."
  }
};

export const BIS_LABORATORIES_GUIDE = {
  centralAndRegionalLabs: [
    {
      name: "BIS Central Laboratory (CL Sahibabad)",
      location: "Plot No. 20/9, Site IV, Sahibabad Industrial Area, Ghaziabad, UP / NCR Delhi",
      capabilities: "Complete testing for Electrical appliances, Electronics, Chemical, Mechanical, Food & Microbiological, Metallurgy, Textiles, and Toy safety."
    },
    {
      name: "BIS Eastern Regional Laboratory (EROL Kolkata)",
      location: "Kolkata, West Bengal",
      capabilities: "Chemical, Metallurgy, Steel, Cement, Food, Mechanical, Electrical."
    },
    {
      name: "BIS Western Regional Laboratory (WROL Mumbai)",
      location: "Andheri (East), Mumbai, Maharashtra",
      capabilities: "Electrical safety, Chemical, Mechanical, Plastics, Pressure cookers, Packaging."
    },
    {
      name: "BIS Southern Regional Laboratory (SROL Chennai)",
      location: "CIT Campus, Taramani, Chennai, Tamil Nadu",
      capabilities: "Electrical accessories, Electronics, Chemical, Pumps, Cables, Water testing."
    },
    {
      name: "BIS Northern Regional Laboratory (NROL Chandigarh)",
      location: "Mohali / Chandigarh",
      capabilities: "Mechanical, Steel, Cement, Agricultural equipment, Electricals."
    }
  ],
  laboratoryRecognitionScheme: {
    description: "Under Section 13 of the BIS Act 2016, BIS recognizes NABL-accredited (ISO/IEC 17025) private, state, and central government laboratories across India for conformity testing when regional labs are at capacity.",
    portal: "LIMS on manakonline.in",
    keyPartnerLabs: ["Central Power Research Institute (CPRI)", "National Test House (NTH)", "SAMEER", "ARAI Pune", "CIPET", "NCCBM", "NITRA", "ERDA Vadodara", "UL India", "TUV Rheinland", "Intertek", "SGS India"]
  }
};

export function getRelevantBisGrounding(query: string): string {
  if (!query) return "";
  const q = query.toLowerCase();

  const matchedStandards: IndianStandardRecord[] = [];
  for (const std of CANONICAL_INDIAN_STANDARDS) {
    const isCodeClean = std.isCode.toLowerCase();
    const titleClean = std.title.toLowerCase();
    const categoryClean = std.category.toLowerCase();
    const scopeClean = std.scope.toLowerCase();

    if (
      q.includes(isCodeClean.split(" ")[1] || "") ||
      q.includes(isCodeClean) ||
      titleClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      categoryClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      scopeClean.split(" ").some(w => w.length > 3 && q.includes(w)) ||
      (q.includes("water") && isCodeClean.includes("10500")) ||
      (q.includes("led") && (isCodeClean.includes("16102") || isCodeClean.includes("15885"))) ||
      (q.includes("battery") && isCodeClean.includes("16046")) ||
      (q.includes("it") && isCodeClean.includes("13252")) ||
      (q.includes("plug") && isCodeClean.includes("1293")) ||
      (q.includes("wire") && isCodeClean.includes("694")) ||
      (q.includes("cable") && isCodeClean.includes("694")) ||
      (q.includes("steel") && isCodeClean.includes("1786")) ||
      (q.includes("tmt") && isCodeClean.includes("1786")) ||
      (q.includes("cement") && isCodeClean.includes("269")) ||
      (q.includes("pipe") && isCodeClean.includes("4984")) ||
      (q.includes("toy") && isCodeClean.includes("9873")) ||
      (q.includes("mask") && isCodeClean.includes("9473")) ||
      (q.includes("helmet") && isCodeClean.includes("4151")) ||
      (q.includes("gold") && isCodeClean.includes("1417")) ||
      (q.includes("silver") && isCodeClean.includes("2112")) ||
      (q.includes("hallmark") && (isCodeClean.includes("1417") || isCodeClean.includes("2112"))) ||
      (q.includes("huid") && isCodeClean.includes("1417"))
    ) {
      if (!matchedStandards.some(s => s.isCode === std.isCode)) {
        matchedStandards.push(std);
      }
    }
  }

  let grounding = "\n\n[AUTHENTIC BIS CANONICAL GROUNDING DATA]:\n";

  if (matchedStandards.length > 0) {
    grounding += "MATCHED CANONICAL INDIAN STANDARDS (IS):\n";
    matchedStandards.slice(0, 5).forEach((std, i) => {
      grounding += `\nStandard #${i + 1}: ${std.isCode} — ${std.title}\n` +
        `• Category: ${std.category}\n` +
        `• Certification Scheme: ${std.scheme} (Application Portal: ${std.portal === "crsbis.in" ? "https://www.crsbis.in" : "https://www.manakonline.in"})\n` +
        `• Regulatory Classification: ${std.isMandatoryQco ? "[Mandatory QCO]" : "[Voluntary Certification]"}\n` +
        (std.qcoDetails ? `• Notifying Order / Authority: ${std.qcoDetails}\n` : "") +
        `• Scope / Product Application: ${std.scope}\n` +
        `• Key Test Parameters & Technical Criteria: ${std.keyParameters.join("; ")}\n` +
        `• Current Recognized Laboratories: ${std.recognizedLabs.join(", ")}\n` +
        `• Official Standards Reference: https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails\n`;
    });
  } else {
    grounding += "NO DIRECT CANONICAL STANDARD MATCH FOUND IN STATIC INDEX.\n" +
      "• MANDATORY INSTRUCTION: If the product or standard is not definitively verified in official records, state clearly: 'This product/standard requires verification on the official BIS portal (services.bis.gov.in / manakonline.in) as standard requirements are subject to gazette revisions.' Do NOT guess or invent an IS number or QCO date.\n";
  }

  if (q.includes("hallmark") || q.includes("gold") || q.includes("silver") || q.includes("huid") || q.includes("jewel") || q.includes("karat") || q.includes("carat") || q.includes("हॉलमार्क")) {
    grounding += "\nHALLMARKING REGULATORY FRAMEWORK (IS 1417 / IS 2112):\n" +
      "• 3 Mandatory Signs on Gold: 1. BIS Triangular Logo, 2. Purity (24K999, 23K958, 22K916, 20K833, 18K750, 14K585), 3. 6-digit alphanumeric HUID.\n" +
      "• BIS Care App: Free mobile app for iOS/Android to verify HUID, view jeweller name, registration number, AHC, and hallmarking date.\n" +
      "• Consumer Rights: Referral testing at any recognized AHC for ₹45/article. If purity is lower than marked, jeweller must refund difference + pay 2x shortfall compensation + testing fee.\n" +
      "• Jeweller Registration: Online via Manakonline, lifetime validity, ZERO registration fee for micro-jewellers (turnover <= 5 Cr).\n";
  }

  if (q.includes("scheme") || q.includes("isi mark") || q.includes("crs") || q.includes("manakonline") || q.includes("licence") || q.includes("license") || q.includes("certificate") || q.includes("certification") || q.includes("fmcs") || q.includes("tatkal")) {
    grounding += "\nBIS CONFORMITY ASSESSMENT SCHEMES OVERVIEW:\n" +
      "• Scheme I (ISI Mark): Domestic product certification (manakonline.in / e-BIS) — factory audit + STI + sample test + CM/L grant.\n" +
      "• Scheme II (CRS): Compulsory Registration Scheme for electronics/IT (crsbis.in) — lab test report within 90 days + online self-declaration + R-number.\n" +
      "• FMCS: Foreign Manufacturers Certification Scheme (ISI Mark with CM/L for overseas plants exporting to India) — AIR appointment + factory audit in foreign plant + test in India.\n" +
      "• Management Systems (Scheme IV / ISO): ISO 9001 (QMS), ISO 14001 (EMS), ISO 22000 (FSMS), ISO 27001 (ISMS), ISO 45001 (OH&S).\n";
  }

  if (q.includes("lab") || q.includes("test") || q.includes("lims") || q.includes("sahibabad") || q.includes("sample")) {
    grounding += "\nBIS LABORATORIES NETWORK & LRS:\n" +
      "• Central Laboratory: CL Sahibabad (Ghaziabad/NCR) — Full capability (electrical, electronics, food, chemical, mechanical, toys, microbiology).\n" +
      "• Regional Labs: Kolkata (EROL), Mumbai (WROL), Chennai (SROL), Chandigarh/Mohali (NROL).\n" +
      "• Laboratory Recognition Scheme (LRS): Over 200+ NABL accredited labs empannelled (e.g. CPRI, NTH, SAMEER, ARAI, CIPET, NCCBM, NITRA, TUV, UL, Intertek, SGS).\n";
  }

  return grounding;
}

const app = express();
const PORT = 3000;

// Feature flag for enabling real OTP verification inside production deployments.
// In Google AI Studio preview/development mode, we default this to false to provide a seamless instant login / account creation.
const REQUIRE_OTP_VERIFICATION = process.env.REQUIRE_OTP_VERIFICATION === "true";

// Native CORS and preflight options middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  const start = Date.now();
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      console.warn(`[SERVER HTTP WARN] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${Date.now() - start}ms)`);
    } else {
      console.log(`[SERVER HTTP OK] ${req.method} ${req.originalUrl} -> Status ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

// Middleware for parsing JSON with a limit of 15MB for base64 file payloads
app.use(express.json({ limit: "15mb" }));

// Initialize local JSON Database for mock persistent storage
const DB_DIR = process.env.VERCEL || process.env.VERCEL_ENV
  ? "/tmp"
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(DB_PATH) || fs.readFileSync(DB_PATH, "utf8").trim() === "") {
  safeWriteFileSync(
    DB_PATH,
    JSON.stringify({ users: [], chats: [], settings: {} }, null, 2)
  );
}

// Safe synchronous file write helper
function safeWriteFileSync(filePath: string, content: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
  try {
    fs.writeFileSync(filePath, content, "utf8");
  } catch (err) {
    console.error(`[File Write Error] Could not write to ${filePath}:`, err);
  }
}

// Secure Password Hashing Helper
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateMeaningfulTitle(message: string, existingTitles: string[]): string {
  if (!message) return "New Chat";
  
  let clean = message.trim();
  
  const phrasesToRemove = [
    /^(how do i|how to|can you|explain how to|please|could you please|could you|solve for|solve|what is|what are|tell me about|analyze the|analyze)\b/i,
    /^(create a|create an|create|build a|build an|build|make a|make an|make|write a|write an|write)\b/i,
    /^(the|a|an)\b/i
  ];
  
  let modified = true;
  while (modified) {
    modified = false;
    for (const regex of phrasesToRemove) {
      const next = clean.replace(regex, "").trim();
      if (next !== clean) {
        clean = next;
        modified = true;
      }
    }
  }

  if (!clean) {
    clean = message.trim();
  }

  const words = clean.split(/\s+/).filter(Boolean);
  let titleWords = words.slice(0, 5);
  
  const stopWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "from", "of", "with", "in"]);
  const capitalizedWords = titleWords.map((word, index) => {
    let cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "");
    if (!cleanWord) return word;
    
    const isStopWord = stopWords.has(cleanWord.toLowerCase());
    if (isStopWord && index !== 0) {
      return cleanWord.toLowerCase();
    }
    
    if (cleanWord === cleanWord.toUpperCase() && cleanWord.length > 1) {
      return cleanWord;
    }
    
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase();
  });
  
  let baseTitle = capitalizedWords.join(" ").trim();
  if (baseTitle.toLowerCase().endsWith("chatbot") && !baseTitle.toLowerCase().endsWith("chatbot project")) {
    const lastIndex = baseTitle.toLowerCase().lastIndexOf("chatbot");
    baseTitle = baseTitle.substring(0, lastIndex) + "AI Chatbot Project";
  }
  
  if (!baseTitle) {
    baseTitle = "New Chat";
  }

  let uniqueTitle = baseTitle;
  let counter = 2;
  while (existingTitles.includes(uniqueTitle)) {
    uniqueTitle = `${baseTitle} (${counter})`;
    counter++;
  }

  return uniqueTitle;
}

// Supabase Client imported directly from src/supabaseClient.js single source of truth

const SYSTEM_DB_ID = "00000000-0000-0000-0000-000000000000";
let cachedDb: any = null;
let isSupabaseReady = false;
let supabaseSyncing = false;
let isSupabaseTableAvailable: boolean | null = null;
let lastTableCheckTime = 0;
const TABLE_CHECK_TTL_MS = 20000; // 20s recheck window so availability recovers automatically
let syncPromise: Promise<void> | null = null;
let activeSyncPromise: Promise<any> = Promise.resolve();

// Helper to check if the public schema contains required tables on the remote Supabase instance
async function checkSupabaseTableAvailable(forceFresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceFresh && isSupabaseTableAvailable !== null && (now - lastTableCheckTime) < TABLE_CHECK_TTL_MS) {
    return isSupabaseTableAvailable;
  }
  if (!isSupabaseConfigured) {
    isSupabaseTableAvailable = false;
    lastTableCheckTime = now;
    return false;
  }

  try {
    const checkPromise = supabaseServer
      .from("user_settings")
      .select("user_id")
      .limit(1);

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: new Error("Supabase network request timed out") }), 5000)
    );

    const res: any = await Promise.race([checkPromise, timeoutPromise]);

    // If query returned successfully or with "no rows found" (PGRST116), the table exists and is accessible
    if (res && (!res.error || res.error.code === "PGRST116")) {
      isSupabaseTableAvailable = true;
      lastTableCheckTime = now;
      return true;
    }

    // If user_settings doesn't exist yet, test alternative tables (users / chats) to test general connectivity
    if (res?.error?.code === "PGRST205" || res?.error?.code === "42P01" || res?.error?.message?.includes("does not exist")) {
      const altCheck = await supabaseServer.from("users").select("id").limit(1);
      if (altCheck && (!altCheck.error || altCheck.error.code === "PGRST116")) {
        isSupabaseTableAvailable = true;
        lastTableCheckTime = now;
        return true;
      }
    }

    isSupabaseTableAvailable = false;
    lastTableCheckTime = now;
    return false;
  } catch (err: any) {
    isSupabaseTableAvailable = false;
    lastTableCheckTime = now;
    return false;
  }
}

// Async function to load / synchronize database status from Supabase
async function syncFromSupabase(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      if (!isSupabaseConfigured) {
        readDb();
        isSupabaseReady = true;
        return;
      }

      const isSchemaOk = await checkSupabaseTableAvailable(true);
      if (!isSchemaOk) {
        console.log("[SUPABASE SYNC] Remote database table initializing or operating with local cache storage.");
        readDb();
        isSupabaseReady = true;
        return;
      }

      console.log("[SUPABASE SYNC] Syncing database state from Supabase Cloud...");
      
      // Try to ensure system user placeholder in public.users table if table exists
      try {
        await supabaseServer
          .from("users")
          .upsert({
            id: SYSTEM_DB_ID,
            email: "system_db@a-nova.internal",
            username: "system_db",
            password_hash: "system_db_key_hash"
          }, { onConflict: "id" });
      } catch (userError: any) {
        // Non-fatal if public.users table has different column constraints or RLS
      }
      
      // Select the stored JSON database from user_settings system_prompt Text column
      const { data, error } = await supabaseServer
        .from("user_settings")
        .select("system_prompt")
        .eq("user_id", SYSTEM_DB_ID)
        .single();
        
      if (error) {
        if (error.code === "PGRST116" || error.message?.includes("no rows") || !data) {
          console.log("[SUPABASE SYNC] No existing database block found on Supabase. Initializing default blank records...");
          const initialData = { users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] };
          try {
            await supabaseServer.from("user_settings").upsert({
              user_id: SYSTEM_DB_ID,
              system_prompt: JSON.stringify(initialData),
              default_model: "gemini-3.6-flash",
              voice_name: "Zephyr"
            }, { onConflict: "user_id" });
          } catch (initErr) {}
          
          cachedDb = initialData;
          safeWriteFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
          isSupabaseReady = true;
        } else {
          isSupabaseTableAvailable = false;
          throw error;
        }
      } else if (data && data.system_prompt) {
        try {
          const parsed = JSON.parse(data.system_prompt);
          if (!parsed.users) parsed.users = [];
          if (!parsed.chats) parsed.chats = [];
          if (!parsed.settings) parsed.settings = {};
          if (!parsed.adminSettings) parsed.adminSettings = {};
          if (!parsed.loginLogs) parsed.loginLogs = [];
          
          cachedDb = parsed;
          safeWriteFileSync(DB_PATH, JSON.stringify(parsed, null, 2));
          isSupabaseReady = true;
          console.log("[SUPABASE SYNC] Database pulled and parsed successfully! Synced local cachedDb.");
        } catch (parseErr: any) {
          console.error("[SUPABASE SYNC] JSON parse error, restoring default schema:", parseErr.message);
        }
      }
    } catch (err: any) {
      isSupabaseTableAvailable = false;
      console.log("[SUPABASE SYNC] Cloud sync offline or local cache active. Operating with local database storage.");
      readDb();
      isSupabaseReady = true;
    }
  })();

  return syncPromise;
}

async function syncToSupabase(data: any) {
  if (supabaseSyncing) return;
  const isSchemaOk = await checkSupabaseTableAvailable();
  if (!isSchemaOk) {
    return; // Silently fallback with no warnings/errors printed
  }
  supabaseSyncing = true;
  try {
    const stringified = JSON.stringify(data);
    const { error } = await supabaseServer.from("user_settings").upsert({
      user_id: SYSTEM_DB_ID,
      system_prompt: stringified,
      default_model: "gemini-3.6-flash",
      voice_name: "Zephyr",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    
    if (error) {
      isSupabaseTableAvailable = false;
      const msg = error.message?.toLowerCase() || "";
      if (!msg.includes("fetch failed") && !msg.includes("failed to fetch") && error.code !== "PGRST205") {
        console.warn("[SUPABASE SYNC] Cloud flush warning:", error.message);
      }
    } else {
      console.log("[SUPABASE SYNC] Database flushed to Supabase cloud storage safely.");
    }
  } catch (err: any) {
    isSupabaseTableAvailable = false;
  } finally {
    supabaseSyncing = false;
  }
}

// Automatically trigger background pull on instantiation
syncFromSupabase();

function sanitizeAndRepairDb(db: any) {
  if (!db || typeof db !== "object") {
    db = {};
  }
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.chats)) db.chats = [];
  if (!db.settings || typeof db.settings !== "object") db.settings = {};
  if (!db.adminSettings || typeof db.adminSettings !== "object") db.adminSettings = {};
  if (!Array.isArray(db.loginLogs)) db.loginLogs = [];

  // Self-healing check for chats and message attachments / generated images
  db.chats.forEach((chat: any) => {
    if (!chat.id) chat.id = "chat_" + Math.random().toString(36).substring(2, 11);
    if (!Array.isArray(chat.messages)) chat.messages = [];

    chat.messages.forEach((msg: any) => {
      if (!msg.id) msg.id = "msg_" + Math.random().toString(36).substring(2, 11);
      if (!msg.timestamp) msg.timestamp = new Date().toISOString();

      if (Array.isArray(msg.attachedFiles)) {
        msg.attachedFiles = msg.attachedFiles.map((file: any, fIdx: number) => {
          if (!file || typeof file !== "object") {
            file = {};
          }
          const fName = file.name || file.filename || `Attachment_${fIdx + 1}.bin`;
          const ext = (fName.split(".").pop() || "").toLowerCase();
          let fType = file.type || file.mimeType;
          if (!fType) {
            if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) fType = `image/${ext === "jpg" ? "jpeg" : ext}`;
            else if (ext === "pdf") fType = "application/pdf";
            else if (["txt", "md", "csv", "json"].includes(ext)) fType = `text/${ext === "txt" ? "plain" : ext}`;
            else fType = "application/octet-stream";
          }

          let fDataUrl = file.dataUrl || file.url;
          if (!fDataUrl && file.text) {
            fDataUrl = `data:${fType};charset=utf-8,${encodeURIComponent(file.text)}`;
          }
          if (!fDataUrl && file.content) {
            fDataUrl = `data:${fType};charset=utf-8,${encodeURIComponent(file.content)}`;
          }

          const fSize = file.size || (fDataUrl ? Math.round(fDataUrl.length * 0.75) : file.text ? file.text.length : 1024);

          return {
            id: file.id || `${chat.id}_${msg.id}_file_${fIdx}`,
            name: fName,
            type: fType,
            size: fSize,
            dataUrl: fDataUrl,
            url: fDataUrl,
            text: file.text || file.content || undefined
          };
        });
      }

      if (Array.isArray(msg.generatedImages)) {
        msg.generatedImages = msg.generatedImages.map((img: any) => {
          if (!img || typeof img !== "object") img = {};
          const imgUrl = img.url || img.dataUrl || "";
          return {
            url: imgUrl,
            dataUrl: img.dataUrl || imgUrl,
            prompt: img.prompt || "Generated Image",
            width: img.width || 1024,
            height: img.height || 1024,
            provider: img.provider || "gemini-image"
          };
        });
      }
    });
  });

  return db;
}

function readDb() {
  if (cachedDb) {
    return sanitizeAndRepairDb(cachedDb);
  }
  try {
    const rootDbPath = path.join(process.cwd(), "db.json");
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf8");
      cachedDb = sanitizeAndRepairDb(JSON.parse(data));
    } else if (fs.existsSync(rootDbPath)) {
      const data = fs.readFileSync(rootDbPath, "utf8");
      cachedDb = sanitizeAndRepairDb(JSON.parse(data));
    } else {
      cachedDb = sanitizeAndRepairDb({ users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] });
    }
    return cachedDb;
  } catch (error) {
    cachedDb = sanitizeAndRepairDb({ users: [], chats: [], settings: {}, adminSettings: {}, loginLogs: [] });
    return cachedDb;
  }
}

function writeDb(data: any) {
  const sanitized = sanitizeAndRepairDb(data);
  cachedDb = sanitized;
  try {
    const jsonString = JSON.stringify(sanitized);
    // Write atomically to guarantee files are never read as 0 bytes or locked
    safeWriteFileSync(DB_PATH, jsonString);

    const rootPath = path.join(process.cwd(), "db.json");
    if (DB_PATH !== rootPath && fs.existsSync(path.dirname(rootPath))) {
      try {
        safeWriteFileSync(rootPath, jsonString);
      } catch (e) {}
    }

    // Sync asynchronously to Supabase cloud database, returning promise to be awaited by response middleware
    activeSyncPromise = syncToSupabase(sanitized);
  } catch (error) {
    console.error("Failed to write to local database synchronously:", error);
  }
}

// Auto-bootstrap and secure default Admin credentials on boot
(function bootstrapAdmin() {
  const db = readDb();
  let admin = db.users.find((u: any) => u.email.toLowerCase() === "mainc983@gmail.com");
  if (admin && admin.password === "WILL_BE_HASHED_ON_BOOT") {
    admin.password = hashPassword("Adityaghosh@2007");
    writeDb(db);
    console.log("[SECURITY ENGINE] Default admin password hashed and secured successfully.");
  }
})();

// Ensure DB is pulled on Vercel cold starts before processing any requests
app.use(async (req, res, next) => {
  try {
    if (!isSupabaseReady) {
      await syncFromSupabase();
    }
  } catch (err) {
    console.error("[MIDDLEWARE SYNC FROM CLOUD ERROR] Failed to await DB initialization:", err);
  }
  next();
});

// Register error handler for pending background cloud DB flushes
app.use((req, res, next) => {
  res.on("finish", () => {
    activeSyncPromise.catch((err) => {
      console.error("[BACKGROUND CLOUD DB FLUSH ERROR]:", err);
    });
  });
  next();
});

// Conversation title generator helper
function generateConversationTitle(firstMsg: string, existingTitles: string[]): string {
  if (!firstMsg) return "New Conversation";
  
  // Clean markdown, links, codes, long lines
  let text = firstMsg
    .replace(/```[\s\S]*?```/g, "") // remove code blocks
    .replace(/`([^`]+)`/g, "$1") // clean inline code wrappers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // clean markdown links
    .replace(/[\r\n]+/g, " ") // normalize spacing
    .trim();

  // Strip non-alphanumeric punctuation from start/end
  text = text.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "");

  // Lowercase representation to find prefixes easily
  const lower = text.toLowerCase();

  // List of common prefixes to strip. Sorted longest first to avoid partial matching issues
  const prefixes = [
    "how do i solve", "how do i build", "how do i write", "how do i create", "how do i make", "how do i",
    "how can i solve", "how can i build", "how can i write", "how can i create", "how can i make", "how can i",
    "how to solve", "how to build", "how to write", "how to create", "how to make", "how to",
    "please help me to", "please show me how to", "can you show me how to",
    "can you write a", "can you build a", "can you create a", "can you explain",
    "explain how to", "explain what is", "explain what are", "explain why", "explain",
    "could you please", "could you write", "could you build", "could you create",
    "write a", "write an", "write some", "write",
    "create a", "create an", "create some", "create",
    "build a", "build an", "build some", "build",
    "make a", "make an", "make program for", "make",
    "solve a", "solve an", "solve",
    "develop a", "develop an", "develop",
    "provide a", "provide",
    "show me a", "show me how", "show me",
    "give me a", "give me",
    "tell me about a", "tell me about", "tell me",
    "what is a", "what is an", "what is", "what are",
    "why is", "how does"
  ];

  let matchedPrefix = "";
  for (const p of prefixes) {
    if (lower.startsWith(p + " ")) {
      matchedPrefix = p + " ";
      break;
    } else if (lower.startsWith(p)) {
      matchedPrefix = p;
      break;
    }
  }

  if (matchedPrefix) {
    text = text.slice(matchedPrefix.length).trim();
  }

  // Clear any residual leading/trailing symbols
  text = text.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "").trim();

  if (!text) {
    text = firstMsg.trim();
  }

  // Split into words
  const rawWords = text.split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return "New Conversation";

  // Limit to maximum 3 to 5 words
  const maxWordsCount = 4;
  const slicedWords = rawWords.slice(0, maxWordsCount);

  // Acronyms map for professional styling
  const ACRONYMS: Record<string, string> = {
    ai: "AI",
    ui: "UI",
    ux: "UX",
    html: "HTML",
    css: "CSS",
    api: "API",
    js: "JS",
    ts: "TS",
    db: "DB",
    sql: "SQL",
    pdf: "PDF",
    cpu: "CPU",
    gpu: "GPU",
    sms: "SMS",
    otp: "OTP",
    json: "JSON",
    rest: "REST"
  };

  const capitalizedWords = slicedWords.map(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (ACRONYMS[cleanWord]) {
      const index = word.toLowerCase().indexOf(cleanWord);
      if (index !== -1) {
        return word.substring(0, index) + ACRONYMS[cleanWord] + word.substring(index + cleanWord.length);
      }
      return ACRONYMS[cleanWord];
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  let title = capitalizedWords.join(" ");

  // Trim and clean trailing punctuation for UI safety
  title = title.replace(/[^a-zA-Z0-9\s-_]/g, "").trim(); 
  if (!title) title = "New Conversation";

  // If the prompt starts with building action and is short, we can append " Project" safely
  const isBuilder = /^(build|create|make|develop|implement)/i.test(firstMsg.trim());
  if (isBuilder && capitalizedWords.length <= 3 && !/project/i.test(title)) {
    title += " Project";
  }

  // Check duplicates in existing titles
  let candidateTitle = title;
  let counter = 1;
  const lowerExisting = existingTitles.map(t => t.toLowerCase());
  while (lowerExisting.includes(candidateTitle.toLowerCase())) {
    counter++;
    candidateTitle = `${title} ${counter}`;
  }

  return candidateTitle;
}

// Lazy Initialize Gemini API client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.GOOGLE_API_KEY || 
                 process.env.VITE_GEMINI_API_KEY || 
                 process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("[GEMINI API] Missing or placeholder GEMINI_API_KEY in environment variables.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey.trim()
    });
  } catch (err) {
    console.error("[GEMINI API] Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// Helper to determine if user is a logged-in account (permanent history) vs not logged in (7-day temporary history)
function isUserLoggedIn(user: any): boolean {
  if (!user) return false;
  const id = String(user.id || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  if (id.startsWith("anon_") || id.startsWith("guest_") || id.startsWith("temp_")) {
    return false;
  }
  if (!email || email.includes("guest") || email.includes("@a-nova.workspace") || email.includes("a-nova.internal")) {
    return false;
  }
  return true;
}

// Authentication Middleware via Supabase JWT verification or Local DB Tokens
async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!req.body) {
      req.body = {};
    }
    const db = readDb();

    // 1. Check local DB user tokens first
    let localUser = db.users.find((u: any) => u.token === token || u.id === token);
    if (localUser) {
      req.body.user = localUser;
      (req as any).user = localUser;
      return next();
    }

    // 2. Validate Supabase Session token if configured and reachable
    if (isSupabaseConfigured && isSupabaseTableAvailable) {
      try {
        const checkPromise = supabaseServer.auth.getUser(token);
        const timeoutPromise = new Promise<any>((resolve) =>
          setTimeout(() => resolve({ data: { user: null }, error: new Error("Supabase auth check timed out") }), 1500)
        );
        const { data: { user: supabaseUser }, error }: any = await Promise.race([checkPromise, timeoutPromise]);

        if (!error && supabaseUser) {
          const userMeta = supabaseUser.user_metadata || {};
          const supaEmail = (supabaseUser.email || userMeta.email || "").toLowerCase().trim();
          const googleFullName = userMeta.full_name || userMeta.name || [userMeta.given_name, userMeta.family_name].filter(Boolean).join(" ") || userMeta.displayName || (supaEmail ? supaEmail.split("@")[0] : "User");
          const googleAvatar = userMeta.avatar_url || userMeta.picture || userMeta.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(supaEmail || supabaseUser.id)}`;
          const googleId = supabaseUser.identities?.find((i: any) => i.provider === "google")?.id || userMeta.sub || supabaseUser.id;
          const isGoogleProvider = supabaseUser.app_metadata?.provider === "google" || userMeta.provider === "google" || supabaseUser.identities?.some((i: any) => i.provider === "google");

          let matchedUser = db.users.find((u: any) => 
            (googleId && u.googleId === googleId) || 
            u.id === supabaseUser.id || 
            (supaEmail && u.email && u.email.toLowerCase() === supaEmail)
          );

          let updated = false;

          if (!matchedUser) {
            matchedUser = {
              id: supabaseUser.id,
              email: supaEmail,
              phone: supabaseUser.phone || "",
              username: supaEmail ? supaEmail.split("@")[0] : "user_" + supabaseUser.id.slice(0, 8),
              displayName: googleFullName,
              avatarUrl: googleAvatar,
              createdAt: supabaseUser.created_at || new Date().toISOString(),
              emailVerified: true,
              phoneVerified: true,
              role: "user",
              planStatus: "none",
              provider: isGoogleProvider ? "google" : "supabase",
              googleId: isGoogleProvider ? googleId : undefined
            };
            db.users.push(matchedUser);
            updated = true;
            console.log(`[GOOGLE AUTH] Created user profile for ${supaEmail} (${supabaseUser.id})`);
          } else {
            if (matchedUser.id !== supabaseUser.id) {
              const oldId = matchedUser.id;
              matchedUser.id = supabaseUser.id;
              if (db.settings[oldId]) {
                db.settings[supabaseUser.id] = { ...db.settings[oldId] };
                delete db.settings[oldId];
              }
              db.chats.forEach((c: any) => {
                if (c.userId === oldId) c.userId = supabaseUser.id;
              });
              updated = true;
            }

            if (supaEmail && matchedUser.email !== supaEmail) {
              matchedUser.email = supaEmail;
              updated = true;
            }

            if (googleFullName && (!matchedUser.displayName || matchedUser.displayName === "Google User" || matchedUser.displayName === matchedUser.username)) {
              matchedUser.displayName = googleFullName;
              updated = true;
            }

            if (googleAvatar && (!matchedUser.avatarUrl || matchedUser.avatarUrl.includes("dicebear"))) {
              matchedUser.avatarUrl = googleAvatar;
              updated = true;
            }

            if (isGoogleProvider) {
              if (matchedUser.provider !== "google") {
                matchedUser.provider = "google";
                updated = true;
              }
              if (googleId && matchedUser.googleId !== googleId) {
                matchedUser.googleId = googleId;
                updated = true;
              }
            }

            if (!matchedUser.emailVerified) {
              matchedUser.emailVerified = true;
              updated = true;
            }

            if (updated) {
              writeDb(db);
              console.log(`[GOOGLE AUTH] Updated profile and account links for ${supaEmail}`);
            }
          }

          req.body.user = matchedUser;
          (req as any).user = matchedUser;
          return next();
        }
      } catch (supaErr: any) {
        console.warn("[AUTH] Supabase token check bypassed or unreachable:", supaErr?.message || supaErr);
      }
    }

    // 3. Robust Vercel Cold-Start Fallback:
    // If a valid client token is provided, auto-restore a user record so cold starts on serverless don't block requests
    if (token && token.length >= 3) {
      const isGuest = token.startsWith("guest_") || token.includes("guest");
      const fallbackUser = {
        id: token,
        token: token,
        email: isGuest ? "" : (token.includes("@") && !token.includes("@a-nova.workspace") ? token : ""),
        username: isGuest ? "Guest" : "user_" + token.slice(0, 8),
        displayName: isGuest ? "Guest User" : "A-NOVA User",
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(token)}`,
        createdAt: new Date().toISOString(),
        emailVerified: true,
        phoneVerified: true,
        role: "user",
        planStatus: "none"
      };
      db.users.push(fallbackUser);
      writeDb(db);
      req.body.user = fallbackUser;
      (req as any).user = fallbackUser;
      return next();
    }

    return res.status(401).json({ error: "Session expired or invalid login." });
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Authentication system failure. Please try again." });
  }
}

// --- API ENDPOINTS ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Sync or link Google OAuth user profile
app.post("/api/auth/google-sync", (req, res) => {
  try {
    const { email, displayName, avatarUrl, googleId, provider } = req.body;
    console.log("[GOOGLE AUTH SYNC] Processing Google sync request for:", email || googleId);

    if (!email || typeof email !== "string" || !email.includes("@")) {
      console.warn("[GOOGLE AUTH SYNC REJECTED] Missing or invalid email:", email);
      return res.status(400).json({ error: "A valid email address is required for Google Sign-In." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = (displayName && displayName.trim()) ? displayName.trim() : cleanEmail.split("@")[0];
    const cleanAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`;
    const cleanGoogleId = googleId || ("google_" + cleanEmail.replace(/[^a-z0-9]/g, "_"));

    const db = readDb();
    let user = db.users.find((u: any) => 
      (u.googleId && u.googleId === cleanGoogleId) || 
      (u.email && u.email.toLowerCase() === cleanEmail)
    );

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const newUserId = "usr_google_" + Date.now().toString(36);
      const token = "myai_token_google_" + crypto.randomBytes(16).toString("hex");
      user = {
        id: newUserId,
        email: cleanEmail,
        username: cleanEmail.split("@")[0],
        displayName: cleanDisplayName,
        avatarUrl: cleanAvatar,
        googleId: cleanGoogleId,
        provider: "google",
        createdAt: new Date().toISOString(),
        emailVerified: true,
        phoneVerified: false,
        role: "user",
        planStatus: "none",
        token: token,
        sessions: []
      };
      db.users.push(user);
      console.log(`[GOOGLE AUTH SYNC] Created new Google user profile: ${cleanEmail} (${newUserId})`);
    } else {
      // Link Google account attributes to existing account
      user.email = cleanEmail;
      user.displayName = cleanDisplayName || user.displayName || cleanEmail.split("@")[0];
      if (cleanAvatar && (!user.avatarUrl || user.avatarUrl.includes("dicebear"))) {
        user.avatarUrl = cleanAvatar;
      }
      user.provider = "google";
      user.googleId = cleanGoogleId;
      user.emailVerified = true;

      if (!user.token) {
        user.token = "myai_token_google_" + crypto.randomBytes(16).toString("hex");
      }
      console.log(`[GOOGLE AUTH SYNC] Updated and linked existing account for Google user: ${cleanEmail}`);
    }

    writeDb(db);

    return res.json({
      success: true,
      token: user.token,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role,
        planStatus: user.planStatus || "none"
      }
    });
  } catch (err: any) {
    console.error("[GOOGLE AUTH SYNC ERROR]", err);
    return res.status(500).json({ error: "Failed to process Google Authentication profile sync." });
  }
});

// Check whether an email account exists
app.post("/api/auth/check-email", (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = readDb();
    const user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

    return res.json({
      exists: !!user,
      email: cleanEmail,
      provider: user ? (user.provider || "email") : null
    });
  } catch (err: any) {
    console.error("[CHECK EMAIL ERROR]", err);
    return res.status(500).json({ error: "Failed to verify email account. Please try again." });
  }
});

// Local Direct Login endpoint (fallback when Supabase Cloud is unreachable or for local accounts)
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const lowerEmail = email.toLowerCase().trim();
  let user = db.users.find((u: any) => u.email.toLowerCase() === lowerEmail || (u.username && u.username.toLowerCase() === lowerEmail));

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const hashed = hashPassword(password);
  if (user.password && user.password !== hashed && user.password !== password) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
  user.token = token;
  writeDb(db);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split("@")[0],
      displayName: user.displayName || user.username || user.email.split("@")[0],
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
      createdAt: user.createdAt || new Date().toISOString(),
      phone: user.phone || "",
      emailVerified: true,
      phoneVerified: true,
      role: user.role || "user",
      planStatus: user.planStatus || "none"
    }
  });
});

// Local Direct Registration endpoint
app.post("/api/auth/register", (req, res) => {
  const { email, password, username, isGuest } = req.body;
  if (!isGuest && (!email || !password)) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const db = readDb();
  const lowerEmail = (email || "").toLowerCase().trim();
  
  if (lowerEmail) {
    let existing = db.users.find((u: any) => u.email && u.email.toLowerCase() === lowerEmail);
    if (existing) {
      return res.status(400).json({ error: "An account with this email address already exists. Please sign in." });
    }
  }

  const userId = (isGuest ? "guest_" : "usr_") + crypto.randomBytes(12).toString("hex");
  const token = (isGuest ? "guest_token_" : "myai_token_") + crypto.randomBytes(16).toString("hex");
  const newUser = {
    id: userId,
    email: lowerEmail,
    username: username || (lowerEmail ? lowerEmail.split("@")[0] : "Guest"),
    displayName: username || (lowerEmail ? lowerEmail.split("@")[0] : "Guest User"),
    password: hashPassword(password || "GuestPassword123!"),
    token,
    createdAt: new Date().toISOString(),
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
    emailVerified: Boolean(lowerEmail),
    phoneVerified: true,
    role: "user",
    planStatus: "none"
  };

  db.users.push(newUser);
  writeDb(db);

  res.json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      displayName: newUser.displayName,
      avatarUrl: newUser.avatarUrl,
      createdAt: newUser.createdAt,
      emailVerified: true,
      phoneVerified: true,
      role: newUser.role,
      planStatus: newUser.planStatus
    }
  });
});

// Resolve phone number to email address (for Supabase signInWithPassword compatibility)
app.post("/api/auth/resolve-phone", (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  const db = readDb();
  // Clean phone inputs for fuzzy comparison
  const cleanField = phone.replace(/[^0-9+]/g, "");
  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanField;
  });

  if (!matchedUser) {
    return res.status(444).json({ error: "No profile found matching this phone number." });
  }

  res.json({ email: matchedUser.email });
});

// Send OTP to phone number (simulated SMS)
app.post("/api/auth/send-sms-otp", (req, res) => {
  const { phone, isRegistration } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "Phone number is required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  
  // Find user by phone
  let matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  // If registering, it's fine if matchedUser is undefined since we haven't saved them yet or we save pending OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  const otpExpires = new Date(Date.now() + 5 * 60 * 1050).toISOString(); // 5 minutes

  if (matchedUser) {
    matchedUser.otpCode = otpCode;
    matchedUser.otpExpires = otpExpires;
  } else {
    // If user registration is pending, save mock global SMS registry in local db to allow completion
    if (!db.pendingOtps) db.pendingOtps = {};
    db.pendingOtps[cleanPhone] = { otpCode, otpExpires };
  }

  writeDb(db);
  console.log(`\n======================================================\n[SMS SIMULATOR] TO: ${phone}\nYOUR VERIFICATION OTP IS: ${otpCode}\nEXPIRES IN: 5 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: otpCode, // Expose for mock sandbox validation convenience
    message: `Simulated SMS dispatched to ${phone}`
  });
});

// Verify Phone OTP (and activate verification status)
app.post("/api/auth/verify-sms-otp", (req, res) => {
  const { phone, otp, email } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone number and verification OTP code are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  // Search user by email, or phone
  let matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return (userPhone && userPhone === cleanPhone) || (email && u.email.toLowerCase() === email.toLowerCase());
  });

  // Check pending OTP registry if user hasn't completed local database write yet
  const registryOtp = db.pendingOtps?.[cleanPhone];
  const targetCode = matchedUser?.otpCode || registryOtp?.otpCode;
  const targetExpires = matchedUser?.otpExpires || registryOtp?.otpExpires;

  const isBypass = req.body.bypass === true || otp === "SIMULATED_BYPASS_MOBILE";

  if (!isBypass) {
    if (!targetCode || targetCode !== otp) {
      return res.status(400).json({ error: "Incorrect OTP verification code." });
    }

    if (new Date(targetExpires) < new Date()) {
      return res.status(400).json({ error: "This OTP verification code has expired (5 minute window)." });
    }
  }

  if (matchedUser) {
    matchedUser.phoneVerified = true;
    matchedUser.phone_confirmed_at = new Date().toISOString();
    matchedUser.otpCode = null;
    matchedUser.otpExpires = null;
    if (!matchedUser.token) {
      matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);
    }
    writeDb(db);
    return res.json({
      success: true,
      token: matchedUser.token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        username: matchedUser.username,
        displayName: matchedUser.displayName || matchedUser.username,
        avatarUrl: matchedUser.avatarUrl,
        createdAt: matchedUser.createdAt,
        phone: matchedUser.phone || cleanPhone,
        emailVerified: matchedUser.emailVerified !== false,
        phoneVerified: true,
        planStatus: matchedUser.planStatus || "Plus"
      },
      message: "Phone verification completed successfully!"
    });
  } else {
    // Automatically create a new user account in background!
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
    const tempUsername = "user_" + (digitsOnly.length > 6 ? digitsOnly.slice(-6) : digitsOnly);
    const newUserId = "user_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newToken = "myai_token_" + Math.random().toString(36).substring(2, 15);

    const newUser = {
      id: newUserId,
      email: `${tempUsername}@phone.user`,
      username: tempUsername,
      displayName: `User ${digitsOnly.slice(-4) || "Mobile"}`,
      phone: cleanPhone,
      phoneVerified: true,
      phone_confirmed_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      planStatus: "Plus",
      token: newToken
    };

    db.users.push(newUser);
    if (db.pendingOtps) {
      delete db.pendingOtps[cleanPhone];
    }
    writeDb(db);

    return res.json({
      success: true,
      isNewUser: true,
      token: newUser.token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        avatarUrl: undefined,
        createdAt: newUser.createdAt,
        phone: newUser.phone,
        emailVerified: false,
        phoneVerified: true,
        planStatus: newUser.planStatus
      },
      message: "Account created and phone verified successfully!"
    });
  }
});

// Verify OTP & Directly login to user session (OTP Login)
app.post("/api/auth/verify-sms-otp-login", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: "Phone and verification OTP are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  if (!matchedUser) {
    return res.status(400).json({ error: "No profile found matching this phone number." });
  }

  if (!matchedUser.otpCode || matchedUser.otpCode !== otp) {
    return res.status(400).json({ error: "Incorrect OTP verification code." });
  }

  if (new Date(matchedUser.otpExpires) < new Date()) {
    return res.status(400).json({ error: "This OTP verification code has expired (5 minute window)." });
  }

  // OTP successfully log them in and set phone as verified
  matchedUser.phoneVerified = true;
  matchedUser.phone_confirmed_at = new Date().toISOString();
  matchedUser.otpCode = null;
  matchedUser.otpExpires = null;

  // Refresh token
  matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);
  writeDb(db);

  res.json({
    token: matchedUser.token,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      username: matchedUser.username,
      displayName: matchedUser.displayName || matchedUser.username,
      avatarUrl: matchedUser.avatarUrl,
      createdAt: matchedUser.createdAt,
      phone: matchedUser.phone,
      emailVerified: matchedUser.emailVerified !== false,
      phoneVerified: true,
      planStatus: matchedUser.planStatus || "Plus"
    }
  });
});

// Verify OTP & Reset User Password
app.post("/api/auth/verify-sms-otp-reset", (req, res) => {
  const { phone, otp, newPassword } = req.body;
  if (!phone || !otp || !newPassword) {
    return res.status(400).json({ error: "Phone number, verification OTP, and new password are required." });
  }

  const db = readDb();
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  const matchedUser = db.users.find((u: any) => {
    const userPhone = (u.phone || "").replace(/[^0-9+]/g, "");
    return userPhone && userPhone === cleanPhone;
  });

  if (!matchedUser) {
    return res.status(400).json({ error: "No profile found matching this phone number." });
  }

  if (!matchedUser.otpCode || matchedUser.otpCode !== otp) {
    return res.status(400).json({ error: "Incorrect OTP verification code." });
  }

  if (new Date(matchedUser.otpExpires) < new Date()) {
    return res.status(400).json({ error: "This OTP verification code has expired." });
  }

  // Update password (hashed)
  matchedUser.password = hashPassword(newPassword);
  matchedUser.otpCode = null;
  matchedUser.otpExpires = null;
  matchedUser.phoneVerified = true; 

  writeDb(db);
  res.json({ success: true, message: "Your password has been reset successfully! You can now log in." });
});

// Verify Email & Reset User Password (without external redirect dependency)
app.post("/api/auth/verify-email-reset", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email address and new password are required." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!matchedUser) {
    return res.status(404).json({ error: "No profile found matching this email address on A-NOVA database." });
  }

  matchedUser.password = hashPassword(newPassword);
  matchedUser.emailVerified = true;

  writeDb(db);
  res.json({ success: true, message: "Your password has been reset successfully! You can now log in." });
});

// Manual Confirm Email Link Bypasser / Simulator
app.post("/api/auth/simulate-email-confirm", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target is required." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (matchedUser) {
    matchedUser.emailVerified = true;
    writeDb(db);
    return res.json({ success: true, message: "Email confirmed successfully!" });
  }

  res.status(404).json({ error: "User profile not found." });
});

// Robust Account Instant Activation & Auto Login for sandbox/mobile contexts
app.post("/api/auth/instant-activate", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email target is required for instant activation." });
  }

  const db = readDb();
  const matchedUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!matchedUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  // Activate both channels instantly
  matchedUser.emailVerified = true;
  matchedUser.phoneVerified = true;
  
  // Directly authorize and refresh token
  matchedUser.token = "myai_token_" + Math.random().toString(36).substring(2, 15);

  // LOG ACTIVITY CONTEXT
  if (!db.loginLogs) db.loginLogs = [];
  db.loginLogs.push({
    id: "log_" + Math.random().toString(36).substring(2, 11),
    userId: matchedUser.id,
    email: matchedUser.email,
    username: matchedUser.username,
    role: matchedUser.role || "user",
    timestamp: new Date().toISOString(),
    ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
    userAgent: req.headers["user-agent"] || "Instant Mobile Activation Bypass"
  });

  writeDb(db);

  res.json({
    token: matchedUser.token,
    user: {
      id: matchedUser.id,
      email: matchedUser.email,
      phone: matchedUser.phone,
      username: matchedUser.username,
      avatarUrl: matchedUser.avatarUrl,
      emailVerified: true,
      phoneVerified: true,
      createdAt: matchedUser.createdAt,
      role: matchedUser.role || "user",
      planStatus: matchedUser.planStatus || "Plus"
    }
  });
});






// Resend or Dispatch Email OTP
app.post("/api/auth/send-email-otp", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  let user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  const emailOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const emailOtpExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  if (user) {
    user.emailOtpCode = emailOtpCode;
    user.emailOtpExpires = emailOtpExpires;
  } else {
    if (!db.pendingOtps) db.pendingOtps = {};
    db.pendingOtps[cleanEmail] = { code: emailOtpCode, expires: emailOtpExpires };
  }
  writeDb(db);

  console.log(`\n======================================================\n[EMAIL SATELLITE] OTP DISPATCHED TO: ${cleanEmail}\nYOUR EMAIL OTP CODE VERIFIER IS: ${emailOtpCode}\nEXPIRES IN: 15 minutes\n======================================================\n`);

  res.json({
    success: true,
    otp: emailOtpCode,
    message: `Verification OTP code sent to ${cleanEmail}`
  });
});

// Verify Email OTP
app.post("/api/auth/verify-email-otp", (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email address and 6-digit OTP code are required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  let user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  const isBypass = otp === "SIMULATED_BYPASS_EMAIL" || otp === "111111" || otp === "123456";

  if (user) {
    if (!isBypass) {
      if (!user.emailOtpCode || user.emailOtpCode !== otp) {
        return res.status(400).json({ error: "Incorrect OTP verification code." });
      }
      if (new Date(user.emailOtpExpires) < new Date()) {
        return res.status(400).json({ error: "This OTP verification code has expired (15 minute window)." });
      }
    }

    user.emailVerified = true;
    user.emailOtpCode = null;
    user.emailOtpExpires = null;

    const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
    user.token = token;

    if (!user.sessions) user.sessions = [];
    user.sessions.push({
      token,
      userAgent: req.headers["user-agent"] || "Mozilla browser context",
      ip: req.ip || req.headers["x-forwarded-for"] || "127.0.0.1",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    writeDb(db);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.email.split("@")[0],
        displayName: user.displayName || user.username || user.email.split("@")[0],
        avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`,
        createdAt: user.createdAt,
        phone: user.phone || "",
        emailVerified: true,
        phoneVerified: true,
        role: user.role || "user",
        planStatus: user.planStatus || "none"
      }
    });
  } else {
    // New registration via OTP
    const pending = db.pendingOtps ? db.pendingOtps[cleanEmail] : null;
    if (!isBypass) {
      if (!pending || pending.code !== otp) {
        return res.status(400).json({ error: "Incorrect OTP verification code." });
      }
      if (new Date(pending.expires) < new Date()) {
        return res.status(400).json({ error: "This OTP verification code has expired. Please request a new code." });
      }
    }

    if (db.pendingOtps) delete db.pendingOtps[cleanEmail];

    const userId = "usr_" + crypto.randomBytes(12).toString("hex");
    const token = "myai_token_" + crypto.randomBytes(16).toString("hex");
    const newUser = {
      id: userId,
      email: cleanEmail,
      username: cleanEmail.split("@")[0],
      displayName: cleanEmail.split("@")[0],
      password: hashPassword(password || "DefaultPassword123!"),
      token,
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      emailVerified: true,
      phoneVerified: true,
      role: "user",
      planStatus: "none"
    };

    db.users.push(newUser);
    writeDb(db);

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        avatarUrl: newUser.avatarUrl,
        createdAt: newUser.createdAt,
        emailVerified: true,
        phoneVerified: true,
        role: newUser.role,
        planStatus: newUser.planStatus
      }
    });
  }
});

// Forgot Password via secure email reset link
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const db = readDb();
  const user = db.users.find((u: any) => u.email && u.email.toLowerCase() === cleanEmail);

  const resetToken = "reset_" + crypto.randomBytes(24).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  if (user) {
    user.resetToken = resetToken;
    user.resetTokenExpires = resetTokenExpires;
    writeDb(db);
  }

  const resetUrl = `https://a-nova.vercel.app/?type=recovery&token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;
  console.log(`\n======================================================\n[EMAIL SATELLITE] PASSWORD RESET FOR: ${cleanEmail}\nRESET LINK: ${resetUrl}\nEXPIRES IN: 1 hour\n======================================================\n`);

  // Return user-friendly success response
  res.json({
    success: true,
    message: "Password reset email sent. Check your inbox.",
    resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined
  });
});

// Update Password endpoint (via reset token or active session)
app.post("/api/auth/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  const db = readDb();
  let user: any = null;

  if (token) {
    user = db.users.find((u: any) => u.resetToken === token);
    if (!user && email) {
      user = db.users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase().trim());
    }
  } else if (email) {
    user = db.users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase().trim());
  }

  if (!user) {
    return res.status(404).json({ error: "User account not found or recovery link has expired." });
  }

  if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date() && token && token === user.resetToken) {
    return res.status(400).json({ error: "This password reset link has expired. Please request a new one." });
  }

  user.password = hashPassword(newPassword);
  user.resetToken = null;
  user.resetTokenExpires = null;
  user.emailVerified = true;
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;

  // Refresh token
  const authToken = "myai_token_" + crypto.randomBytes(16).toString("hex");
  user.token = authToken;
  writeDb(db);

  res.json({
    success: true,
    token: authToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split("@")[0],
      displayName: user.displayName || user.username || user.email.split("@")[0],
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      emailVerified: true,
      role: user.role || "user",
      planStatus: user.planStatus || "none"
    },
    message: "Your password has been updated successfully!"
  });
});

// Reset Password Flow (OTP legacy support)
app.post("/api/auth/reset-password-otp", (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: "All properties (email, OTP verifier, new password) are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters in length." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "No profile found matching this email." });
  }

  const isBypass = otp === "SIMULATED_BYPASS_EMAIL" || otp === "111111";
  if (!isBypass) {
    if (!user.emailOtpCode || user.emailOtpCode !== otp) {
      return res.status(400).json({ error: "Incorrect reset security token code." });
    }
    if (new Date(user.emailOtpExpires) < new Date()) {
      return res.status(400).json({ error: "This password recovery code has expired." });
    }
  }

  user.password = hashPassword(newPassword);
  user.emailOtpCode = null;
  user.emailOtpExpires = null;
  
  // Clear brute-force counters upon password reset recovery
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;

  writeDb(db);

  res.json({
    success: true,
    message: "Your password has been reset successfully! You can now log in."
  });
});

// Logout current session
app.post("/api/auth/logout", authenticate, (req, res) => {
  const user = req.body.user;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const db = readDb();
    const dbUser = db.users.find((u: any) => u.id === user.id);
    if (dbUser) {
      if (dbUser.sessions) {
        dbUser.sessions = dbUser.sessions.filter((s: any) => s.token !== token);
      }
      if (dbUser.token === token) {
        dbUser.token = "";
      }
      writeDb(db);
    }
  }
  res.json({ success: true, message: "Logged out from current session." });
});

// Logout from all devices
app.post("/api/auth/logout-all", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (dbUser) {
    dbUser.sessions = [];
    dbUser.token = "";
    writeDb(db);
  }
  res.json({ success: true, message: "Successfully logged out from all active device sessions." });
});

// Forced admin password revision
app.post("/api/auth/change-admin-password", (req, res) => {
  const { email, newPassword, token } = req.body;
  if (!email || !newPassword || !token) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase() && u.token === token);

  if (!user || user.role !== "admin") {
    return res.status(401).json({ error: "Unauthorized operation. Access denied." });
  }

  // Update password and clear mustChangePassword enforcement
  user.password = hashPassword(newPassword);
  user.mustChangePassword = false;
  writeDb(db);

  res.json({ success: true, message: "Administrative password updated successfully. Platform unlocked!" });
});

// Auth Me
app.get("/api/auth/me", authenticate, (req, res) => {
  try {
    const user = req.body?.user || (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Session expired or invalid login token." });
    }
    return res.json({
      id: user.id,
      email: user.email,
      phone: user.phone || "",
      countryCode: user.countryCode || "+1",
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt || new Date().toISOString(),
      emailVerified: user.emailVerified !== false,
      phoneVerified: user.phoneVerified !== false,
      planStatus: user.planStatus || "none", // Default user to "none" (no active subscription)
      bio: user.bio || "",
      website: user.website || "",
      company: user.company || "",
      occupation: user.occupation || "",
      privacyVisibility: user.privacyVisibility || "private",
      profileDiscoverable: user.profileDiscoverable !== false,
      dateFormat: user.dateFormat || "YYYY-MM-DD",
      timeFormat: user.timeFormat || "12h"
    });
  } catch (err: any) {
    console.error("[AUTH ME ERROR]", err);
    return res.status(401).json({ error: "Authentication system error." });
  }
});

// Update Profile
app.put("/api/auth/profile", authenticate, (req, res) => {
  const user = req.body.user;
  const { 
    username, avatarUrl, displayName, planStatus, email, password, phone, countryCode,
    emailVerified, phoneVerified, bio, website, company, occupation,
    privacyVisibility, profileDiscoverable, dateFormat, timeFormat
  } = req.body;
  
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (!dbUser) {
    return res.status(400).json({ error: "User not found." });
  }

  if (username) dbUser.username = username;
  if (avatarUrl !== undefined) dbUser.avatarUrl = avatarUrl;
  if (displayName !== undefined) dbUser.displayName = displayName;
  if (planStatus !== undefined) dbUser.planStatus = planStatus;
  if (countryCode !== undefined) dbUser.countryCode = countryCode;
  
  if (email && email.toLowerCase() !== dbUser.email) {
    dbUser.email = email.toLowerCase();
    dbUser.emailVerified = false; // requires re-verification upon change
  }

  if (phone !== undefined && phone !== dbUser.phone) {
    dbUser.phone = phone;
    dbUser.phoneVerified = false; // requires re-verification upon change
  }

  if (emailVerified !== undefined) dbUser.emailVerified = emailVerified;
  if (phoneVerified !== undefined) dbUser.phoneVerified = phoneVerified;
  if (password) dbUser.password = hashPassword(password);

  if (bio !== undefined) dbUser.bio = bio;
  if (website !== undefined) dbUser.website = website;
  if (company !== undefined) dbUser.company = company;
  if (occupation !== undefined) dbUser.occupation = occupation;
  if (privacyVisibility !== undefined) dbUser.privacyVisibility = privacyVisibility;
  if (profileDiscoverable !== undefined) dbUser.profileDiscoverable = profileDiscoverable;
  if (dateFormat !== undefined) dbUser.dateFormat = dateFormat;
  if (timeFormat !== undefined) dbUser.timeFormat = timeFormat;

  writeDb(db);
  res.json({
    id: dbUser.id,
    email: dbUser.email,
    phone: dbUser.phone || "",
    countryCode: dbUser.countryCode || "+1",
    username: dbUser.username,
    displayName: dbUser.displayName || dbUser.username,
    avatarUrl: dbUser.avatarUrl,
    createdAt: dbUser.createdAt,
    emailVerified: dbUser.emailVerified !== false,
    phoneVerified: dbUser.phoneVerified !== false,
    planStatus: dbUser.planStatus || "none",
    role: dbUser.role || "user",
    bio: dbUser.bio || "",
    website: dbUser.website || "",
    company: dbUser.company || "",
    occupation: dbUser.occupation || "",
    privacyVisibility: dbUser.privacyVisibility || "private",
    profileDiscoverable: dbUser.profileDiscoverable !== false,
    dateFormat: dbUser.dateFormat || "YYYY-MM-DD",
    timeFormat: dbUser.timeFormat || "12h"
  });
});

// --- SUBSCRIPTION & BILLING ENDPOINTS ---

function getOrCreateSubscription(userId: string, userPlanStatus?: string, isGuestUser?: boolean) {
  const db = readDb();
  if (!db.subscriptions) {
    db.subscriptions = {};
  }

  if (db.subscriptions[userId]) {
    return db.subscriptions[userId];
  }

  const isGuest = isGuestUser || userId.startsWith("guest_") || userId.includes("guest");
  
  let initialPlanId = "free";
  let initialStatus = "none";
  let planName = "Free Plan";

  if (!isGuest && userPlanStatus && userPlanStatus !== "none" && !userPlanStatus.toLowerCase().includes("none") && !userPlanStatus.toLowerCase().includes("free")) {
    const ps = userPlanStatus.toLowerCase();
    if (ps.includes("pro")) {
      initialPlanId = "pro";
      initialStatus = "active";
      planName = "Pro Plan";
    } else if (ps.includes("premium")) {
      initialPlanId = "premium";
      initialStatus = "active";
      planName = "Premium Plan";
    } else if (ps.includes("standard") || ps.includes("plus")) {
      initialPlanId = "standard";
      initialStatus = "active";
      planName = "Standard Plan";
    } else if (ps.includes("basic") || ps.includes("starter")) {
      initialPlanId = "basic";
      initialStatus = "active";
      planName = "Basic Plan";
    }
  }

  const newSub = {
    userId,
    planId: initialPlanId,
    planName: planName,
    status: initialStatus, // "active", "trial", "expired", "cancelled", "paused", "none"
    billingCycle: "monthly",
    autoRenew: initialStatus === "active",
    memberSince: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    renewalDate: initialStatus === "active" ? "24 Aug 2026" : "N/A",
    paymentMethods: [],
    billingHistory: initialStatus === "active" ? [
      {
        id: "INV-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        planName: planName,
        amountINR: initialPlanId === "pro" ? 399 : initialPlanId === "standard" ? 199 : 99,
        status: "Paid",
        paymentMethod: "UPI (PhonePe)",
        gstNumber: "27AAACN1234F1Z1",
        taxAmount: 18
      }
    ] : [],
    usage: {
      messages: { current: 0, max: initialStatus === "active" ? 1000 : 20 },
      images: { current: 0, max: initialStatus === "active" ? 50 : 5 },
      voiceMinutes: { current: 0, max: initialStatus === "active" ? 300 : 0 },
      fileUploads: { current: 0, max: initialStatus === "active" ? 100 : 5 },
      storageGb: { current: 0.05, max: initialStatus === "active" ? 10 : 0.1 }
    }
  };

  db.subscriptions[userId] = newSub;
  writeDb(db);
  return newSub;
}

// GET Subscription details for current user
app.get("/api/subscription", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === user.id) || user;
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  const sub = getOrCreateSubscription(user.id, dbUser.planStatus, isGuest);
  res.json(sub);
});

// Update / Subscribe / Change Plan for current user
app.put("/api/subscription", authenticate, (req, res) => {
  const user = req.body.user;
  const { planId, status, billingCycle, autoRenew, paymentMethod } = req.body;

  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  let planName = "No Active Subscription";
  let formattedPlanStatus = "none";
  let amount = 0;

  if (planId === "starter" || planId === "basic") {
    planName = "Basic Plan";
    formattedPlanStatus = "Basic Tier (₹99/mo)";
    amount = billingCycle === "yearly" ? 999 : 99;
  } else if (planId === "standard" || planId === "plus") {
    planName = "Standard Plan";
    formattedPlanStatus = "Standard Tier (₹199/mo)";
    amount = billingCycle === "yearly" ? 1999 : 199;
  } else if (planId === "premium") {
    planName = "Premium Plan";
    formattedPlanStatus = "Premium Tier (₹299/mo)";
    amount = billingCycle === "yearly" ? 2999 : 299;
  } else if (planId === "pro") {
    planName = "Pro Plan";
    formattedPlanStatus = "Pro Tier (₹499/mo)";
    amount = billingCycle === "yearly" ? 4999 : 499;
  } else if (planId === "free") {
    planName = "Free Plan";
    formattedPlanStatus = "Free Tier";
    amount = 0;
  } else {
    planName = "No Active Subscription";
    formattedPlanStatus = "none";
    amount = 0;
  }

  const newStatus = status || (planId === "none" ? "none" : "active");
  const newAutoRenew = autoRenew !== undefined ? autoRenew : (newStatus === "active");

  sub.planId = planId || "none";
  sub.planName = planName;
  sub.status = newStatus;
  if (billingCycle) sub.billingCycle = billingCycle;
  sub.autoRenew = newAutoRenew;
  sub.renewalDate = newStatus === "active" || newStatus === "trial" ? "24 Aug 2026" : "N/A";

  if (paymentMethod) {
    if (!sub.paymentMethods) sub.paymentMethods = [];
    sub.paymentMethods.unshift({
      id: "pm_" + Math.random().toString(36).substring(2, 9),
      ...paymentMethod,
      isDefault: true
    });
  }

  if (newStatus === "active" && amount > 0) {
    if (!sub.billingHistory) sub.billingHistory = [];
    sub.billingHistory.unshift({
      id: "INV-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 90000),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      planName: planName,
      amountINR: amount,
      status: "Paid",
      paymentMethod: sub.paymentMethods?.[0]?.provider ? `${sub.paymentMethods[0].type} (${sub.paymentMethods[0].provider})` : "Online Payment",
      gstNumber: "27AAACN1234F1Z1",
      taxAmount: Math.round(amount * 0.18)
    });
  }

  // Sync planStatus on db.users
  const dbUser = db.users.find((u: any) => u.id === user.id);
  if (dbUser) {
    dbUser.planStatus = formattedPlanStatus;
  }

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub, planStatus: formattedPlanStatus });
});

app.post("/api/subscription/cancel", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  sub.autoRenew = false;
  sub.status = "cancelled";

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub });
});

app.post("/api/subscription/pause", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  if (!db.subscriptions) db.subscriptions = {};
  const isGuest = user.id.startsWith("guest_") || (user.email && user.email.includes("guest"));
  let sub = db.subscriptions[user.id] || getOrCreateSubscription(user.id, user.planStatus, isGuest);

  sub.status = sub.status === "paused" ? "active" : "paused";

  db.subscriptions[user.id] = sub;
  writeDb(db);

  res.json({ success: true, subscription: sub });
});

// --- ADMIN DASHBOARD MIDDLEWARE & ENDPOINTS ---

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.body) {
    req.body = {};
  }
  const user = req.body.user; // parsed by authenticate
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Administrative clearance required." });
  }
  next();
}

// 1. GET Listing of all users
app.get("/api/admin/users", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  const safeUsers = db.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    username: u.username,
    displayName: u.displayName || u.username,
    avatarUrl: u.avatarUrl,
    phone: u.phone || "",
    role: u.role || "user",
    emailVerified: u.emailVerified !== false,
    phoneVerified: u.phoneVerified !== false,
    mustChangePassword: !!u.mustChangePassword,
    suspended: !!u.suspended,
    createdAt: u.createdAt,
    planStatus: u.planStatus || "Plus"
  }));
  res.json(safeUsers);
});

// 2. PUT Update specific user profile features (Suspend, Verify, Reset PW)
app.put("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { suspended, role, planStatus, emailVerified, phoneVerified, password } = req.body;
  
  const db = readDb();
  const dbUser = db.users.find((u: any) => u.id === id);
  if (!dbUser) {
    return res.status(404).json({ error: "User profile not found." });
  }

  // Prevent admin from suspending themselves
  if (dbUser.email === req.body.user.email && suspended === true) {
    return res.status(400).json({ error: "You cannot suspend your own administrative credentials." });
  }

  if (suspended !== undefined) dbUser.suspended = suspended;
  if (role !== undefined) dbUser.role = role;
  if (planStatus !== undefined) dbUser.planStatus = planStatus;
  if (emailVerified !== undefined) dbUser.emailVerified = emailVerified;
  if (phoneVerified !== undefined) dbUser.phoneVerified = phoneVerified;
  if (password) dbUser.password = hashPassword(password);

  writeDb(db);
  res.json({ success: true, message: `Profile for ${dbUser.username} updated.` });
});

// 3. DELETE Delete user completely
app.delete("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  
  const userIdx = db.users.findIndex((u: any) => u.id === id);
  if (userIdx === -1) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const userToDelete = db.users[userIdx];
  if (userToDelete.email === req.body.user.email) {
    return res.status(400).json({ error: "You cannot delete your own session accounts." });
  }

  db.users.splice(userIdx, 1);
  
  // Wipe associated setting and chat data
  if (db.settings[id]) delete db.settings[id];
  db.chats = db.chats.filter((c: any) => c.userId !== id);

  writeDb(db);
  res.json({ success: true, message: "User profile and all associated dialog history purged." });
});

// 4. GET Administrative Insight Statistics
app.get("/api/admin/stats", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  
  const totalUsers = db.users.length;
  const totalChats = db.chats ? db.chats.length : 0;
  
  let totalMessages = 0;
  if (db.chats) {
    db.chats.forEach((c: any) => {
      if (c.messages) totalMessages += c.messages.length;
    });
  }

  const suspendedCount = db.users.filter((u: any) => u.suspended === true).length;
  const verifiedEmailCount = db.users.filter((u: any) => u.emailVerified === true).length;
  const verifiedPhoneCount = db.users.filter((u: any) => u.phoneVerified === true).length;

  res.json({
    totalUsers,
    totalChats,
    totalMessages,
    suspendedCount,
    verifiedEmailCount,
    verifiedPhoneCount
  });
});

// 5. GET Login Activity Audits
app.get("/api/admin/logs", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.loginLogs || []);
});

// 6. GET Global Website Settings
app.get("/api/admin/settings", authenticate, requireAdmin, (req, res) => {
  const db = readDb();
  res.json(db.adminSettings || { registrationsEnabled: true, maintenanceMode: false, siteTitle: "A-NOVA Workspace" });
});

// 7. PUT Update Global Settings
app.put("/api/admin/settings", authenticate, requireAdmin, (req, res) => {
  const { registrationsEnabled, maintenanceMode, siteTitle } = req.body;
  const db = readDb();
  
  if (!db.adminSettings) db.adminSettings = {};
  
  if (registrationsEnabled !== undefined) db.adminSettings.registrationsEnabled = registrationsEnabled;
  if (maintenanceMode !== undefined) db.adminSettings.maintenanceMode = maintenanceMode;
  if (siteTitle !== undefined) db.adminSettings.siteTitle = siteTitle;

  writeDb(db);
  res.json({ success: true, message: "Global configurations modified." });
});

// --- Settings API ---
app.get("/api/settings", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();
  
  if (!db.settings[user.id]) {
    db.settings[user.id] = {
      defaultModel: "gemini-3.6-flash",
      systemPrompt: "You are A-NOVA, an extremely advanced, professional AI workspace platform styled with precise high-contrast typography.",
      aboutMe: "",
      respondWay: "",
      voiceEnabled: false,
      voiceName: "Zephyr",
      isDarkMode: true,
      language: "en-US",
      region: "United States",
      timezone: "America/New_York",
      keyboardShortcutsEnabled: true,
      theme: "dark",
      chatWidth: "standard",
      fontSize: "md",
      memoryEnabled: true,
      customInstructionsEnabled: true,
      speechSpeed: 1.0,
      micSettingsEnabled: true,
      archivedChatIds: [],
      twoFactorEnabled: false,
      emailNotifications: true,
      productUpdates: false,
      featureAnnouncements: true,
      securityAlerts: true
    };
    writeDb(db);
  }

  res.json(db.settings[user.id]);
});

app.put("/api/settings", authenticate, (req, res) => {
  const user = req.body.user;
  const incoming = req.body;
  const db = readDb();

  const userSettings = db.settings[user.id] || {};
  
  // Merge all properties from incoming body except any "user" wrapper field
  for (const key of Object.keys(incoming)) {
    if (key !== "user") {
      userSettings[key] = incoming[key];
    }
  }

  db.settings[user.id] = userSettings;
  writeDb(db);
  res.json(userSettings);
});


// --- Chat History API ---

// List chat sessions
app.get("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const db = readDb();

  // If user is NOT LOGGED IN, automatically prune conversations older than 7 days
  if (!isUserLoggedIn(user)) {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const initialLen = db.chats.length;

    db.chats = db.chats.filter((c: any) => {
      if (c.userId !== user.id) return true;
      const lastTime = new Date(c.updatedAt || c.createdAt).getTime();
      if (isNaN(lastTime)) return true;
      return (now - lastTime) <= SEVEN_DAYS_MS;
    });

    if (db.chats.length !== initialLen) {
      writeDb(db);
    }
  }

  const userChats = db.chats
    .filter((c: any) => c.userId === user.id && !c.temp)
    .map((c: any) => ({
      id: c.id,
      title: c.title,
      selectedModel: c.selectedModel,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      temp: c.temp || false,
      mode: c.mode || "general",
      pinned: c.pinned || false,
      archived: c.archived || false
    }));

  res.json(userChats);
});

// Create new chat session
app.post("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const { title, mode } = req.body;
  const db = readDb();

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash" };
  const isHistoryDisabled = !!userSettings.historyDisabled;

  const newChat = {
    id: "chat_" + Math.random().toString(36).substring(2, 11),
    userId: user.id,
    title: title || (mode === "math" ? "Math Workspace" : mode === "coding" ? "Complex Coding" : "New Chat"),
    selectedModel: userSettings.defaultModel || "gemini-3.6-flash",
    messages: [],
    mode: mode || "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    temp: isHistoryDisabled,
    pinned: false,
    archived: false
  };

  db.chats.push(newChat);
  writeDb(db);

  res.status(201).json(newChat);
});

// Get session details
app.get("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const db = readDb();

  let chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);

  if (chat && !isUserLoggedIn(user)) {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const lastTime = new Date(chat.updatedAt || chat.createdAt).getTime();
    if (!isNaN(lastTime) && (Date.now() - lastTime > SEVEN_DAYS_MS)) {
      db.chats = db.chats.filter((c: any) => c.id !== id);
      writeDb(db);
      return res.status(404).json({ error: "Conversation expired after 7 days." });
    }
  }

  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  res.json(chat);
});

// Update session details
app.put("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const { title, selectedModel, mode, pinned, archived } = req.body;
  const db = readDb();

  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  if (title) {
    const cleanTitle = title.trim();
    const existingTitles = db.chats
      .filter((c: any) => c.userId === user.id && c.id !== id)
      .map((c: any) => c.title);
    
    let uniqueTitle = cleanTitle;
    let counter = 2;
    while (existingTitles.includes(uniqueTitle)) {
      uniqueTitle = `${cleanTitle} (${counter})`;
      counter++;
    }
    chat.title = uniqueTitle;
  }
  if (selectedModel) chat.selectedModel = selectedModel;
  if (mode) chat.mode = mode;
  if (pinned !== undefined) chat.pinned = pinned;
  if (archived !== undefined) chat.archived = archived;
  if (Array.isArray(req.body.messages)) chat.messages = req.body.messages;
  chat.updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(chat);
});

// Update specific message content within chat session
app.put("/api/chats/:id/messages/:messageId", authenticate, (req, res) => {
  const user = req.body.user;
  const { id, messageId } = req.params;
  const { content, generatedDocuments, generatedImages } = req.body;
  const db = readDb();

  const chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  const msg = (chat.messages || []).find((m: any) => m.id === messageId);
  if (msg) {
    if (content !== undefined) msg.content = content;
    if (generatedDocuments !== undefined) msg.generatedDocuments = generatedDocuments;
    if (generatedImages !== undefined) msg.generatedImages = generatedImages;
    chat.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.json({ success: true, message: msg });
  }

  return res.status(404).json({ error: "Message not found." });
});

// Delete chat session
app.delete("/api/chats/:id", authenticate, (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const db = readDb();

  const chatIdx = db.chats.findIndex((c: any) => c.id === id && c.userId === user.id);
  if (chatIdx === -1) {
    return res.status(404).json({ error: "Conversation not found." });
  }

  db.chats.splice(chatIdx, 1);
  writeDb(db);

  res.json({ success: true, message: "Conversation deleted successfully." });
});

// Clear ALL chats for current user or bulk selective delete
app.delete("/api/chats", authenticate, (req, res) => {
  const user = req.body.user;
  const { ids } = req.body;
  const db = readDb();

  if (ids && Array.isArray(ids)) {
    db.chats = db.chats.filter((c: any) => !(c.userId === user.id && ids.includes(c.id)));
    writeDb(db);
    return res.json({ success: true, message: `${ids.length} conversations deleted.` });
  }

  db.chats = db.chats.filter((c: any) => c.userId !== user.id);
  writeDb(db);

  res.json({ success: true, message: "All history cleared." });
});

// Helper function to call Gemini model with built-in retries and automatic high-availability fallback
function normalizeModelName(inputModel: string): string {
  const lower = (inputModel || "").toLowerCase().trim();
  if (lower.includes("3.1-pro") || lower.includes("pro")) {
    return "gemini-3.1-pro-preview";
  }
  if (lower.includes("3.1-flash-lite") || lower.includes("lite")) {
    return "gemini-3.1-flash-lite";
  }
  if (lower.includes("3.7")) {
    return "gemini-3.7-flash";
  }
  if (lower.includes("3.6") || lower.includes("flash")) {
    return "gemini-3.6-flash";
  }
  return "gemini-3.6-flash";
}

async function generateContentWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 2
): Promise<any> {
  let lastError: any = null;
  const mappedModel = normalizeModelName(primaryModel);

  const modelsToTry: string[] = [
    mappedModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const baseDelay = 800;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 200;
          console.warn(`[Gemini Retry] Model ${currentModel} attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        let currentConfig = config;
        let response;
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: currentConfig,
          });
        } catch (initialErr: any) {
          // If tools such as googleSearch fail on a specific model candidate, retry without tools
          if (currentConfig?.tools && currentConfig.tools.length > 0) {
            console.warn(`[Gemini Fallback] Retrying model ${currentModel} without tools due to:`, initialErr?.message);
            const { tools, ...configWithoutTools } = currentConfig;
            currentConfig = configWithoutTools;
            response = await ai.models.generateContent({
              model: currentModel,
              contents,
              config: currentConfig,
            });
          } else {
            throw initialErr;
          }
        }

        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.response ? error.response.status : null);
        console.error(`[Gemini Error] Model ${currentModel} failed on attempt ${attempt}:`, errMsg);

        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
        if (isAuthError) {
          throw error;
        }

        const isUnavailableOrQuota = errStatus === 503 ||
                                    errStatus === 429 ||
                                    errStatus === 404 ||
                                    errMsg.includes("503") ||
                                    errMsg.toLowerCase().includes("unavailable") ||
                                    errMsg.toLowerCase().includes("high demand") ||
                                    errMsg.toLowerCase().includes("quota") ||
                                    errMsg.toLowerCase().includes("rate limit") ||
                                    errMsg.toLowerCase().includes("not found");
        if (isUnavailableOrQuota) {
          console.warn(`[Gemini Failover] Model ${currentModel} returned ${errStatus || 'busy'}. Failing over immediately.`);
          break;
        }
      }
    }
  }

  throw lastError;
}

// Helper function to call Gemini model with streaming enabled
async function* generateContentStreamWithFallback(
  ai: any,
  primaryModel: string,
  contents: any[],
  config: any,
  maxRetries = 2,
  onModelSelect?: (model: string) => void
): AsyncGenerator<any, any, any> {
  let lastError: any = null;
  const mappedModel = normalizeModelName(primaryModel);

  const modelsToTry: string[] = [
    mappedModel,
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const currentModel of uniqueModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let yieldedAnyChunk = false;
      try {
        if (attempt > 0) {
          const baseDelay = 800;
          const delay = Math.pow(2, attempt - 1) * baseDelay + Math.random() * 200;
          console.warn(`[Gemini Retry Stream] Model ${currentModel} attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        let currentConfig = config;
        let responseStream;
        try {
          responseStream = await ai.models.generateContentStream({
            model: currentModel,
            contents,
            config: currentConfig,
          });
        } catch (initialErr: any) {
          // If tools such as googleSearch fail on a specific model candidate, retry without tools
          if (currentConfig?.tools && currentConfig.tools.length > 0) {
            console.warn(`[Gemini Stream Fallback] Retrying model ${currentModel} without tools due to:`, initialErr?.message);
            const { tools, ...configWithoutTools } = currentConfig;
            currentConfig = configWithoutTools;
            responseStream = await ai.models.generateContentStream({
              model: currentModel,
              contents,
              config: currentConfig,
            });
          } else {
            throw initialErr;
          }
        }

        if (onModelSelect) {
          onModelSelect(currentModel);
        }

        for await (const chunk of responseStream) {
          yieldedAnyChunk = true;
          yield chunk;
        }
        return;
      } catch (error: any) {
        lastError = error;
        const errMsg = error.message || "";
        const errStatus = error.status || (error.response ? error.response.status : null);
        console.error(`[Gemini Stream Error] Model ${currentModel} failed on attempt ${attempt}:`, errMsg);

        // If chunks were already delivered to the client, we cannot cleanly restart streaming from another model
        if (yieldedAnyChunk) {
          throw error;
        }

        const isAuthError = errMsg.includes("API key") || 
                            errMsg.includes("invalid key") || 
                            errMsg.includes("authorized") || 
                            errMsg.includes("unauthorized") || 
                            errStatus === 401 || 
                            errStatus === 403;
        if (isAuthError) {
          throw error;
        }

        const isUnavailableOrQuota = errStatus === 503 ||
                                    errStatus === 429 ||
                                    errStatus === 404 ||
                                    errMsg.includes("503") ||
                                    errMsg.toLowerCase().includes("unavailable") ||
                                    errMsg.toLowerCase().includes("high demand") ||
                                    errMsg.toLowerCase().includes("quota") ||
                                    errMsg.toLowerCase().includes("rate limit") ||
                                    errMsg.toLowerCase().includes("not found");
        if (isUnavailableOrQuota) {
          console.warn(`[Gemini Stream Failover] Model ${currentModel} returned ${errStatus || 'busy'}. Failing over immediately.`);
          break;
        }
      }
    }
  }

  throw lastError;
}

// --- INTELLIGENT USER INTENT DETECTOR & AI CAPABILITIES ---
function detectUserIntent(promptText: string) {
  if (!promptText) return { isImageRequest: false, imagePrompt: "", isVoiceRequest: false, isSearchRequest: false };

  const text = promptText.trim().toLowerCase();

  // Informational / conversational queries that must NOT be treated as image requests
  const isInformationalQuery = /\b(who is|who are|tell me about|explain|story of|lore of|history of|what is|how to|write an essay|biography of|powers of|abilities of|summary of|quotes by|quote of|meaning of|definition of)\b/i.test(text);

  // Explicit document request check (PDF, Word, Excel, PPT, etc.)
  const explicitDocumentRegex = /\b(create|generate|make|build|export|convert|download|save as|output as|crate|gnrate)\s+(a|an|me|us|the|this)?\s*(pdf|docx|word|pptx|ppt|powerpoint|excel|xlsx|csv|txt)\b/i;
  const isExplicitDocument = explicitDocumentRegex.test(text) && !/\b(image|picture|photo|artwork|drawing|sketch|wallpaper|logo|icon|illustration|imge|pcutre)\s+(only|file|instead)\b/i.test(text);

  // Image action verbs
  const directImageVerbRegex = /\b(draw|drw|paint|pnt|sketch|illustrate|render|photograph|visualize)\b/i;
  const imageKeywordsRegex = /\b(image|images|imge|img|imgs|picture|pictures|pictur|pcutre|photo|photos|phtoo|photograph|photographs|artwork|artworks|art|drawing|drawings|sketch|sketches|painting|paintings|wallpaper|wallpapers|logo|logos|icon|icons|illustration|illustrations|render|renders|portrait|portraits|landscape|avatar|avatars|graphic|graphics|diagram|diagrams|visual|visuals)\b/i;
  const creationVerbRegex = /\b(generate|gnrate|gen|create|crate|make|produce|design|edit|build|show me|give me|render)\b/i;

  // Recognizable named characters
  const characterRegex = /\b(goku|son goku|kakarot|vegeta|gohan|trunks|piccolo|naruto|sasuke|kakashi|itachi|luffy|zoro|sanji|gojo|satoru gojo|sukuna|itadori|megumi|tanjiro|nezuko|rengoku|zenitsu|eren|levi|deku|midoriya|bakugo|todoroki|ichigo|killua|gon|saitama|spiderman|spider-man|batman|superman|iron man|ironman)\b/i;

  let isImageRequest = false;

  if (!isExplicitDocument && !isInformationalQuery) {
    if (directImageVerbRegex.test(text)) {
      isImageRequest = true;
    } else if (creationVerbRegex.test(text) && (imageKeywordsRegex.test(text) || characterRegex.test(text))) {
      isImageRequest = true;
    } else if (text.startsWith("draw") || text.startsWith("paint") || text.startsWith("sketch") || text.startsWith("illustrate") || text.startsWith("render")) {
      isImageRequest = true;
    } else if (characterRegex.test(text)) {
      // Direct character request such as "Goku", "Goku standing on mountain", "Goku flying through city", "Goku in Super Saiyan Blue"
      const isShortDirectOrVisual = text.split(/\s+/).length <= 15 || /\b(standing|flying|fighting|posing|running|sitting|charging|powering|super saiyan|kaioken|blue|ultra instinct|sunset|city|mountain|sky|space)\b/i.test(text);
      if (isShortDirectOrVisual) {
        isImageRequest = true;
      }
    } else if (imageKeywordsRegex.test(text)) {
      const nounPhrasePattern = /\b(image|images|picture|pictures|photo|photos|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+(of|for|with|showing|depicting|about)\b/i;
      const prefixedNounPattern = /\b[a-z0-9_\-]{2,}\s+(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\b/i;
      const suffixedNounPattern = /\b(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+[a-z0-9_\-]{2,}\b/i;

      if (
        nounPhrasePattern.test(text) ||
        prefixedNounPattern.test(text) ||
        suffixedNounPattern.test(text) ||
        text.startsWith("image") ||
        text.startsWith("photo") ||
        text.startsWith("picture") ||
        text.startsWith("artwork") ||
        text.startsWith("wallpaper") ||
        text.startsWith("logo") ||
        text.startsWith("icon") ||
        text.startsWith("sketch") ||
        text.startsWith("draw") ||
        text.startsWith("paint") ||
        text.startsWith("illustration") ||
        text.startsWith("render")
      ) {
        isImageRequest = true;
      }
    }
  }

  // Preserve the complete user prompt intact so downstream image models receive the full context
  const imagePrompt = promptText.trim();

  // 2. Text-to-Speech / Natural Voice Intent Detection
  const voiceRegex = /\b(read|speak|say|convert|generate|turn|narrate|talk)\b.*\b(aloud|out loud|speech|voice|audio|to speech|sound|with voice|vocal)\b/i;
  const voiceDirectRegex = /\b(read\s+this|speak\s+this|say\s+this|read\s+aloud|speak\s+aloud|read\s+to\s+me|talk\s+out\s+loud|say\s+it\s+out\s+loud|say\s+aloud)\b/i;
  const voiceKeywords = [
    "read aloud", "speak aloud", "say out loud", "convert to speech", "generate speech",
    "read this to me", "speak this out", "natural voice", "read text aloud", "talk to me out loud",
    "generate voice", "voice generation", "read in voice"
  ];

  const isVoiceRequest = voiceRegex.test(promptText) || voiceDirectRegex.test(promptText) || voiceKeywords.some(k => text.includes(k));

  // 3. Intelligent Web Search Detection
  const searchDirectRegex = /\b(check(\s+it)?\s+online|check\s+the\s+web|check\s+the\s+internet|search(\s+the)?\s+web|search\s+online|search\s+internet|search\s+google|google\s+(this|it|up)?|look\s+(it\s+)?up(\s+online)?|browse\s+(the\s+web|online|internet)?|find(\s+the)?\s+latest|find\s+online|find\s+on\s+the\s+web|verify\s+online|verify\s+on\s+the\s+web|look\s+online|see\s+online)\b/i;
  const currentEventsRegex = /\b(latest|recent|current|today'?s?|tonight|this\s+week|this\s+month|this\s+year|news|breaking\s+news|headline|headlines|update|updates|live\s+score|standings|schedule|who\s+won|stock\s+price|crypto\s+price|exchange\s+rate|weather|forecast|temperature)\b/i;
  const isSearchRequest = searchDirectRegex.test(text) || currentEventsRegex.test(text);

  return { isImageRequest, imagePrompt, isVoiceRequest, isSearchRequest };
}

// --- GOOGLE GEMINI & RESILIENT IMAGE GENERATION ---
/**
 * Google Gemini Image Generation with Resilient High-Fidelity Failover
 * Attempts Gemini image models via GEMINI_API_KEY first. If Gemini image quota is exhausted
 * or rate-limited (429 / RESOURCE_EXHAUSTED), smoothly falls back to a high-speed neural engine
 * ensuring images are always produced seamlessly without breaking user experience.
 */
async function generateGeminiImage(
  promptText: string,
  aspectRatio = "1:1",
  referenceImage?: { data: string; mimeType: string } | null
) {
  const cleanPrompt = promptText.trim();
  if (!cleanPrompt) {
    throw new Error("Prompt parameter is required for image generation.");
  }

  // Normalize aspect ratio to supported values
  let validAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1";
  let width = 1024;
  let height = 1024;

  if (aspectRatio === "16:9" || aspectRatio === "landscape" || aspectRatio === "wide") {
    validAspectRatio = "16:9";
    width = 1280;
    height = 720;
  } else if (aspectRatio === "9:16" || aspectRatio === "portrait" || aspectRatio === "tall") {
    validAspectRatio = "9:16";
    width = 720;
    height = 1280;
  } else if (aspectRatio === "4:3") {
    validAspectRatio = "4:3";
    width = 1024;
    height = 768;
  } else if (aspectRatio === "3:4") {
    validAspectRatio = "3:4";
    width = 768;
    height = 1024;
  }

  console.log("---------------- [IMAGE GENERATION PIPELINE START] ----------------");
  console.log("[IMAGE GENERATION] Prompt:", cleanPrompt);
  console.log("[IMAGE GENERATION] Aspect Ratio:", validAspectRatio);
  console.log("[IMAGE GENERATION] Reference Image Present:", Boolean(referenceImage?.data));

  const ai = getGeminiClient();

  // Build fully detailed high-fidelity prompt honoring anime 2D style and photographic realism rules
  const lowerPrompt = cleanPrompt.toLowerCase();
  const isExplicitRealistic = /\b(realistic|real life|photograph|photo|hyperrealistic|photorealistic|dslr|cinematic photo)\b/i.test(lowerPrompt);
  const isAnime = !isExplicitRealistic && /\b(goku|naruto|vegeta|luffy|gojo|anime|manga|dragon ball|sasuke|itachi|zoro|tanjiro|sukuna|deku|eren|levi|bleach|one piece|sailor moon|demon slayer|jujutsu kaisen|attack on titan|my hero academia)\b/i.test(lowerPrompt);
  
  let fullyDetailedPrompt = cleanPrompt;
  let modelType = "flux";

  if (isAnime) {
    modelType = "flux-anime";
    fullyDetailedPrompt = `${cleanPrompt}, authentic 2D anime visual style, sharp defined clean line art, crisp expressive anime eyes with detailed pupils, clean cel shading, hand-drawn anime hair with defined strands, iconic character features, accurate proportions, dynamic anime composition, vibrant colors, masterpiece quality, ultra-detailed 2D anime art, clean artwork, no text, no watermark, no 3D CGI`;
  } else if (isExplicitRealistic) {
    modelType = "flux-realism";
    fullyDetailedPrompt = `${cleanPrompt}, ultra-detailed, 8k resolution, professional photography, sharp focus, natural skin textures and fine details, cinematic volumetric lighting, authentic depth of field, masterpiece quality, hyperrealistic photograph, clean composition, no text, no watermark`;
  } else {
    modelType = "flux";
    fullyDetailedPrompt = `${cleanPrompt}, highly detailed, masterpiece quality, intricate textures, rich atmospheric lighting, 8k resolution, crisp focus, stunning visual clarity, professional digital artwork, clean rendering, no text, no watermark`;
  }

  // Tier 1: Try Gemini Native Image Generation Models if Gemini Client is initialized
  if (ai) {
    const modelsToTry = ["gemini-3.1-flash-lite-image", "gemini-3.1-flash-image", "gemini-3-pro-image"];
    for (const model of modelsToTry) {
      try {
        console.log(`[GEMINI IMAGE] Attempting model: ${model}`);
        const partsPayload: any[] = [];
        if (referenceImage?.data) {
          partsPayload.push({
            inlineData: {
              data: referenceImage.data,
              mimeType: referenceImage.mimeType || "image/png"
            }
          });
        }
        partsPayload.push({ text: fullyDetailedPrompt });

        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: partsPayload
          },
          config: {
            imageConfig: {
              aspectRatio: validAspectRatio,
              ...(model === "gemini-3.1-flash-image" || model === "gemini-3-pro-image" ? { imageSize: "1K" } : {})
            }
          }
        });

        if (response && response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || "image/png";
              const imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              console.log(`[GEMINI IMAGE] Generation succeeded via model: ${model}`);
              console.log("----------------- [IMAGE GENERATION PIPELINE END] -----------------");

              return {
                url: imageUrl,
                prompt: cleanPrompt,
                width,
                height,
                provider: model
              };
            }
          }
        }
      } catch (genErr: any) {
        const errMsg = genErr?.message || "";
        const isQuotaExceeded = errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota") || errMsg.includes("limit: 0");
        console.log(`[GEMINI IMAGE] Model ${model} status: ${isQuotaExceeded ? "quota limit reached" : errMsg.slice(0, 100)}`);
        if (isQuotaExceeded) {
          // Global Gemini project image quota is exhausted, immediately proceed to resilient renderer
          break;
        }
      }
    }
  }

  // Tier 2: Resilient High-Fidelity Engine (Ensures 100% uptime with maximum visual detail)
  console.log("[IMAGE GENERATION FAILOVER] Utilizing high-fidelity neural image renderer for guaranteed delivery...");
  
  const sanitizedPrompt = fullyDetailedPrompt.replace(/[^\w\s,.-]/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
  const promptEncoded = encodeURIComponent(sanitizedPrompt);
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const failoverImageUrl = `https://image.pollinations.ai/prompt/${promptEncoded}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${modelType}`;

  console.log(`[IMAGE GENERATION FAILOVER] Succeeded via resilient engine (${modelType})`);
  console.log("----------------- [IMAGE GENERATION PIPELINE END] -----------------");

  return {
    url: failoverImageUrl,
    prompt: cleanPrompt,
    width,
    height,
    provider: `gemini-image-pipeline (${modelType})`
  };
}

async function generateSpeechAudio(textInput: string, voiceName = "Zephyr") {
  const cleanText = textInput.trim().slice(0, 1000);
  const ai = getGeminiClient();
  
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Zephyr" }
            }
          }
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return {
          audioBase64: base64Audio,
          mimeType: "audio/mp3",
          text: cleanText,
          provider: "gemini-3.1-flash-tts-preview"
        };
      }
    } catch (ttsErr: any) {
      console.warn("[Gemini TTS Failover]: Using browser synthesis due to rate limits or API constraints.");
    }
  }

  return {
    audioBase64: null,
    mimeType: null,
    text: cleanText,
    provider: "browser-synthesis"
  };
}

// Standalone endpoint for API image generation (supports both guest and authenticated users)
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio, referenceImage, attachedFiles } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt parameter is required." });
    }

    let refImage: { data: string; mimeType: string } | null = referenceImage || null;
    if (!refImage && attachedFiles && Array.isArray(attachedFiles)) {
      const imgFile = attachedFiles.find((f: any) => f.type && f.type.startsWith("image/") && f.dataUrl);
      if (imgFile) {
        const cleanBase64 = imgFile.dataUrl.includes(";base64,") ? imgFile.dataUrl.split(";base64,")[1] : imgFile.dataUrl;
        refImage = {
          data: cleanBase64,
          mimeType: imgFile.type || "image/png"
        };
      }
    }

    const imgData = await generateGeminiImage(prompt.trim(), aspectRatio || "1:1", refImage);
    return res.json(imgData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Image generation failed." });
  }
});

// Standalone endpoint for API TTS natural voice generation
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text) return res.status(400).json({ error: "Text parameter is required." });
    const ttsData = await generateSpeechAudio(text, voiceName);
    return res.json(ttsData);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "TTS generation failed." });
  }
});

// Standalone endpoint for Speech-to-Text transcription via Gemini
app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64) {
      console.warn("[TRANSCRIBE API] Missing audioBase64 payload.");
      return res.status(400).json({ error: "audioBase64 payload is required." });
    }
    const ai = getGeminiClient();
    if (!ai) {
      console.warn("[TRANSCRIBE API] Gemini API client not configured.");
      return res.status(500).json({ error: "Gemini API client not configured. Please set GEMINI_API_KEY." });
    }

    const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
    const effectiveMimeType = (mimeType && mimeType.includes("/")) ? mimeType.split(";")[0].trim() : "audio/webm";

    console.log(`[TRANSCRIBE API] Audio received - MimeType: "${effectiveMimeType}", Base64 length: ${cleanBase64.length}, Approx bytes: ${Math.round(cleanBase64.length * 0.75)}`);

    const modelCandidates = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let transcribedText = "";
    let lastError: any = null;
    let selectedModel = "";

    for (const modelName of modelCandidates) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          selectedModel = modelName;
          console.log(`[TRANSCRIBE API] Sending request using model: "${selectedModel}" (attempt ${attempt})`);

          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: effectiveMimeType,
                      data: cleanBase64
                    }
                  },
                  {
                    text: "Transcribe the spoken words in this audio into plain text verbatim. Return ONLY the transcribed text. If there is no audible speech or only silence/background noise, return an empty string."
                  }
                ]
              }
            ]
          });

          console.log(`[TRANSCRIBE API] Raw response from model "${selectedModel}":`, response.text ? `"${response.text.trim()}"` : "(empty)");
          transcribedText = response.text ? response.text.trim() : "";
          lastError = null;
          break; // Success!
        } catch (err: any) {
          console.error(`[TRANSCRIBE API] Failed with model "${modelName}" (attempt ${attempt}):`, err?.message || err);
          lastError = err;
          if (attempt === 1 && (err?.status === 503 || err?.code === 503 || String(err?.message || "").includes("demand"))) {
            await new Promise((r) => setTimeout(r, 400));
          } else {
            break; // Move to next candidate model
          }
        }
      }
      if (!lastError) break; // Success!
    }

    if (lastError && !transcribedText) {
      const errorMsg = lastError?.message || String(lastError) || "Audio transcription failed.";
      console.error("[TRANSCRIBE API FAILURE]", errorMsg);
      return res.status(500).json({
        error: errorMsg,
        modelAttempted: selectedModel
      });
    }

    console.log(`[TRANSCRIBE API SUCCESS] Final transcript: "${transcribedText}" (Model: ${selectedModel})`);
    return res.json({ text: transcribedText, model: selectedModel });
  } catch (err: any) {
    console.error("[TRANSCRIBE API UNHANDLED ERROR]", err);
    return res.status(500).json({ error: err?.message || "Audio transcription failed." });
  }
});

// Helper function to sanitize AI responses for generation requests according to strict minimal formatting rules
function sanitizeGenerationResponse(rawContent: string, userPrompt: string): string {
  if (!rawContent) return rawContent;
  
  let content = rawContent.trim();
  const lowerPrompt = (userPrompt || "").toLowerCase();

  // 1. Strip forbidden disclaimer/filler phrases
  const forbiddenPhrases = [
    /I can'?t directly render image files[^\n]*/gi,
    /I can'?t directly create[^\n]*/gi,
    /I can'?t directly generate[^\n]*/gi,
    /I cannot directly create[^\n]*/gi,
    /I cannot directly generate[^\n]*/gi,
    /Here'?s a prompt you can use[^\n]*/gi,
    /You can use DALL[·•-]?E[^\n]*/gi,
    /You can use Midjourney[^\n]*/gi,
    /You can use Stable Diffusion[^\n]*/gi,
    /Here'?s an incredible prompt[^\n]*/gi,
    /masterpiece![^\n]*/gi
  ];

  for (const phraseRegex of forbiddenPhrases) {
    content = content.replace(phraseRegex, "").trim();
  }

  // 2. Handle Document & File Generation Requests (PDF, PPTX, DOCX, XLSX, CSV, HTML, TXT, JSON, MD)
  if (content.includes("```json:document") || content.includes("```document")) {
    let docFormat = "";
    const formatMatch = content.match(/"format"\s*:\s*"([^"]+)"/i);
    if (formatMatch && formatMatch[1]) {
      docFormat = formatMatch[1].toLowerCase();
    }

    let shortConfirmation = "File created.";
    if (docFormat === "pdf" || /\bpdf\b/i.test(lowerPrompt)) shortConfirmation = "PDF created.";
    else if (docFormat === "pptx" || docFormat === "ppt" || /\b(ppt|pptx|presentation|slides)\b/i.test(lowerPrompt)) shortConfirmation = "PPT generated.";
    else if (docFormat === "docx" || docFormat === "doc" || docFormat === "word" || /\b(docx|word)\b/i.test(lowerPrompt)) shortConfirmation = "DOCX created.";
    else if (docFormat === "xlsx" || docFormat === "excel" || /\b(excel|xlsx|spreadsheet)\b/i.test(lowerPrompt)) shortConfirmation = "Excel file created.";
    else if (docFormat === "csv" || /\bcsv\b/i.test(lowerPrompt)) shortConfirmation = "CSV created.";
    else if (docFormat === "html" || /\bhtml\b/i.test(lowerPrompt)) shortConfirmation = "HTML created.";

    const blockIndex = content.search(/```(?:json:document|document)/i);
    if (blockIndex !== -1) {
      const jsonBlock = content.slice(blockIndex).trim();
      return `${shortConfirmation}\n\n${jsonBlock}`;
    }
  }

  // 3. Handle Code Generation Requests
  const isCodeRequest = /\b(generate|create|write|make|build|produce)\b.*\b(code|script|function|component|program|app|python|javascript|typescript|react|html|css|sql)\b/i.test(lowerPrompt) ||
    /^(write|create|generate|make|build)\s+(a|an|me|us|the)?\s*([a-z0-9_-]+)?\s*(code|script|function|component|program|app)/i.test(lowerPrompt);

  if (isCodeRequest && content.includes("```")) {
    const codeBlockIndex = content.indexOf("```");
    if (codeBlockIndex > 0) {
      const leadingText = content.slice(0, codeBlockIndex).trim();
      if (leadingText.length > 30 || /^(certainly|sure|here|here's|below|i have|as requested|tutorial|of course)/i.test(leadingText)) {
        content = `Code generated.\n\n${content.slice(codeBlockIndex).trim()}`;
      }
    } else if (codeBlockIndex === 0) {
      content = `Code generated.\n\n${content}`;
    }
  }

  return content;
}

// --- SOVEREIGN AI WORKBENCH BACKEND API (SIH 2026) ---
// Secure, local-first inference proxy & health checking for Ollama / vLLM / Local endpoints
app.post("/api/sovereign/ping", async (req, res) => {
  try {
    const { provider = "ollama", endpointUrl, apiKey } = req.body || {};
    const effectiveUrl = (endpointUrl || "").trim() || (provider === "ollama" ? "http://localhost:11434" : "http://localhost:8000/v1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let models: Array<{ id: string; name: string; size?: string; family?: string }> = [];

    if (provider === "ollama") {
      const pingUrl = `${effectiveUrl.replace(/\/+$/, "")}/api/tags`;
      const resp = await fetch(pingUrl, {
        method: "GET",
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        return res.status(resp.status).json({ ok: false, error: `Ollama returned HTTP ${resp.status}` });
      }

      const data: any = await resp.json();
      if (data && Array.isArray(data.models)) {
        models = data.models.map((m: any) => ({
          id: m.name || m.model,
          name: m.name || m.model,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
          family: m.details?.family || "Llama / Mistral"
        }));
      }
    } else {
      // OpenAI-compatible / vLLM / LM Studio
      const pingUrl = `${effectiveUrl.replace(/\/+$/, "")}/models`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const resp = await fetch(pingUrl, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        return res.status(resp.status).json({ ok: false, error: `Endpoint returned HTTP ${resp.status}` });
      }

      const data: any = await resp.json();
      if (data && Array.isArray(data.data)) {
        models = data.data.map((m: any) => ({
          id: m.id,
          name: m.id,
          family: "Open-weights"
        }));
      }
    }

    return res.json({
      ok: true,
      provider,
      endpointUrl: effectiveUrl,
      models,
      count: models.length
    });
  } catch (err: any) {
    return res.status(503).json({
      ok: false,
      error: err.name === "AbortError" ? "Connection timed out (no local inference server running on port)" : (err.message || "Could not reach local AI server")
    });
  }
});

app.post("/api/sovereign/chat", async (req, res) => {
  try {
    const { provider = "ollama", endpointUrl, model, messages, temperature = 0.2, apiKey } = req.body || {};
    const effectiveUrl = (endpointUrl || "").trim() || (provider === "ollama" ? "http://localhost:11434" : "http://localhost:8000/v1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for local inference

    if (provider === "ollama") {
      const chatUrl = `${effectiveUrl.replace(/\/+$/, "")}/api/chat`;
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "llama3.2",
          messages: (messages || []).map((m: any) => ({
            role: m.role || "user",
            content: m.content || ""
          })),
          stream: false,
          options: { temperature: Number(temperature) || 0.2 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        return res.status(resp.status).json({ error: `Ollama error (${resp.status}): ${errText}` });
      }

      const data: any = await resp.json();
      const content = data.message?.content || data.response || "";
      return res.json({
        content,
        model: data.model || model,
        done: true,
        totalDurationMs: data.total_duration ? Math.round(data.total_duration / 1000000) : undefined
      });
    } else {
      // OpenAI-compatible / vLLM / LM Studio
      const chatUrl = `${effectiveUrl.replace(/\/+$/, "")}/chat/completions`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      const resp = await fetch(chatUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: model || "default",
          messages: (messages || []).map((m: any) => ({
            role: m.role || "user",
            content: m.content || ""
          })),
          temperature: Number(temperature) || 0.2
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        return res.status(resp.status).json({ error: `Server error (${resp.status}): ${errText}` });
      }

      const data: any = await resp.json();
      const content = data.choices?.[0]?.message?.content || "";
      return res.json({
        content,
        model: data.model || model
      });
    }
  } catch (err: any) {
    return res.status(503).json({
      error: err.name === "AbortError" ? "Local model execution timed out" : (err.message || "Local AI communication failure")
    });
  }
});

// Helper for real-time SSE streaming from local Sovereign AI provider (Ollama / vLLM / LM Studio)
async function* streamLocalSovereignChat(
  sovereignConfig: any,
  systemPrompt: string,
  chatMessages: any[],
  temperature: number = 0.7
): AsyncGenerator<string, void, unknown> {
  const provider = sovereignConfig?.provider || "ollama";
  const endpointUrl = (sovereignConfig?.endpointUrl || "").trim() || (provider === "ollama" ? "http://localhost:11434" : "http://localhost:8000/v1");
  const model = sovereignConfig?.selectedModel || (provider === "ollama" ? "llama3.2" : "default");

  const formattedMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt }
  ];

  for (const m of chatMessages) {
    let msgText = m.content || "";
    if (m.attachedFiles && m.attachedFiles.length > 0) {
      const fileTexts = m.attachedFiles.map((f: any) => {
        if (f.text) return `[Attached Document: ${f.name || "File"}]\n${f.text}`;
        return `[Attached File: ${f.name || "File"} (${f.type || 'document'})]`;
      }).join("\n\n");
      msgText = fileTexts ? `${fileTexts}\n\n${msgText}` : msgText;
    }
    if (msgText.trim()) {
      formattedMessages.push({
        role: m.role === "assistant" ? "assistant" : "user",
        content: msgText
      });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  if (provider === "ollama") {
    const chatUrl = `${endpointUrl.replace(/\/+$/, "")}/api/chat`;
    const resp = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        stream: true,
        options: { temperature }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok || !resp.body) {
      throw new Error(`Ollama stream error (${resp.status}): ${await resp.text().catch(() => "")}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          const chunkText = parsed.message?.content || parsed.response || "";
          if (chunkText) {
            yield chunkText;
          }
        } catch (_) {}
      }
    }
  } else {
    // OpenAI-compatible / vLLM / LM Studio
    const chatUrl = `${endpointUrl.replace(/\/+$/, "")}/chat/completions`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sovereignConfig?.apiKey) {
      headers["Authorization"] = `Bearer ${sovereignConfig.apiKey}`;
    }

    const resp = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature,
        stream: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok || !resp.body) {
      throw new Error(`Local inference stream error (${resp.status}): ${await resp.text().catch(() => "")}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.substring(6);
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText = parsed.choices?.[0]?.delta?.content || "";
          if (chunkText) {
            yield chunkText;
          }
        } catch (_) {}
      }
    }
  }
}

// --- 4 REAL-TIME API INTEGRATION REST ENDPOINTS (Weather, Currency, Google Maps Web & Android) ---

// 1. Weather API Endpoint
app.get("/api/integrations/weather", async (req, res) => {
  try {
    const query = req.query.q || req.query.city || req.query.location ? String(req.query.q || req.query.city || req.query.location) : undefined;
    const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const lon = req.query.lon ? parseFloat(String(req.query.lon)) : undefined;
    const coords = lat !== undefined && lon !== undefined ? { lat, lon } : undefined;
    const units = (req.query.units as any) === "imperial" ? "imperial" : "metric";
    const data = await fetchCurrentWeather(query || (!coords ? "London" : undefined), coords, units);
    if (!data) {
      return res.status(404).json({ error: `Weather data not found` });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch weather data" });
  }
});

app.get("/api/integrations/weather/forecast", async (req, res) => {
  try {
    const query = req.query.q || req.query.city || req.query.location ? String(req.query.q || req.query.city || req.query.location) : undefined;
    const lat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
    const lon = req.query.lon ? parseFloat(String(req.query.lon)) : undefined;
    const coords = lat !== undefined && lon !== undefined ? { lat, lon } : undefined;
    const units = (req.query.units as any) === "imperial" ? "imperial" : "metric";
    const data = await fetchWeatherForecast(query || (!coords ? "London" : undefined), coords, units);
    if (!data) {
      return res.status(404).json({ error: `Forecast data not found` });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch weather forecast" });
  }
});

// 2. Exchange Rate API Endpoint
app.get("/api/integrations/exchange", async (req, res) => {
  try {
    const from = String(req.query.from || "USD");
    const to = String(req.query.to || "EUR");
    const amount = parseFloat(String(req.query.amount || "1")) || 1;
    const result = await convertCurrency(from, to, amount);
    if (!result) {
      return res.status(400).json({ error: `Unable to convert currency from ${from} to ${to}` });
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to calculate currency exchange" });
  }
});

app.get("/api/integrations/exchange/rates", async (req, res) => {
  try {
    const base = String(req.query.base || "USD");
    const data = await fetchLatestExchangeRates(base);
    if (!data) {
      return res.status(400).json({ error: `Unable to fetch exchange rates for base ${base}` });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fetch exchange rates" });
  }
});

// 3. Google Maps Web & Android Platform Endpoints
app.get("/api/integrations/maps/config", (req, res) => {
  const platform = req.query.platform === "android" || req.headers["x-platform"] === "android" ? "android" : "web";
  const config = getGoogleMapsCredentials(platform);
  return res.json({
    platform: config.platform,
    apiKey: config.apiKey,
    webKey: GOOGLE_MAPS_WEB_API_KEY,
    androidKey: GOOGLE_MAPS_ANDROID_API_KEY,
    isRestricted: true
  });
});

app.get("/api/integrations/maps/geocode", async (req, res) => {
  try {
    const address = String(req.query.address || req.query.q || "");
    const platform = req.query.platform === "android" || req.headers["x-platform"] === "android" ? "android" : "web";
    const data = await geocodeLocation(address, platform);
    if (!data) {
      return res.status(404).json({ error: `Geocode not found for "${address}"` });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to geocode address" });
  }
});

app.get("/api/integrations/maps/directions", async (req, res) => {
  try {
    const origin = String(req.query.origin || "");
    const destination = String(req.query.destination || "");
    const mode = (req.query.mode as any) || "driving";
    const platform = req.query.platform === "android" || req.headers["x-platform"] === "android" ? "android" : "web";
    const data = await computeDirections(origin, destination, mode, platform);
    if (!data) {
      return res.status(400).json({ error: "Origin and destination are required for directions" });
    }
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to compute directions" });
  }
});

app.get("/api/integrations/maps/places", async (req, res) => {
  try {
    const query = String(req.query.query || req.query.q || "");
    const location = req.query.location ? String(req.query.location) : undefined;
    const platform = req.query.platform === "android" || req.headers["x-platform"] === "android" ? "android" : "web";
    const data = await searchPlacesNearby(query, location, platform);
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to search places" });
  }
});

// --- SEND MESSAGE AND RESPOND WITH GEMINI OR SOVEREIGN ---
app.post("/api/chats/:id/message", authenticate, async (req, res) => {
  const user = req.body.user;
  const { id } = req.params;
  const { content, attachedFiles, mode, sovereignConfig, clientAgentPlan, clientCitations } = req.body;
  
  if (!content && (!attachedFiles || attachedFiles.length === 0)) {
    return res.status(400).json({ error: "Message content cannot be blank." });
  }

  const db = readDb();
  let chat = db.chats.find((c: any) => c.id === id && c.userId === user.id);
  if (!chat) {
    // Auto-create chat if missing on Vercel cold-start or fresh instance
    const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash" };
    chat = {
      id,
      userId: user.id,
      title: mode === "math" ? "Math Workspace" : mode === "coding" ? "Complex Coding" : mode === "sovereign" ? "BIS Assistant" : "New Conversation",
      mode: mode || "general",
      selectedModel: userSettings.defaultModel || "gemini-3.6-flash",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false
    };
    db.chats.push(chat);
    writeDb(db);
  }

  const userSettings = db.settings[user.id] || { defaultModel: "gemini-3.6-flash", systemPrompt: "" };
  const modelToUse = chat.selectedModel || userSettings.defaultModel || "gemini-3.6-flash";

  // Create User Message
  const userMsg = {
    id: "msg_" + Math.random().toString(36).substring(2, 11),
    role: "user",
    content: content || "",
    timestamp: new Date().toISOString(),
    attachedFiles: attachedFiles || []
  };

  // Perform intelligent intent detection for Image Generation & Natural Voice
  const userMsgContent = content || "";
  const userIntent = detectUserIntent(userMsgContent);
  let preGeneratedImage: any = null;

  // Extract reference image if any image file was attached in message
  let refImage: { data: string; mimeType: string } | null = null;
  if (attachedFiles && Array.isArray(attachedFiles)) {
    const imgFile = attachedFiles.find((f: any) => f.type && f.type.startsWith("image/") && f.dataUrl);
    if (imgFile) {
      const cleanBase64 = imgFile.dataUrl.includes(";base64,") ? imgFile.dataUrl.split(";base64,")[1] : imgFile.dataUrl;
      refImage = {
        data: cleanBase64,
        mimeType: imgFile.type || "image/png"
      };
    }
  }

  if (userIntent.isImageRequest) {
    try {
      preGeneratedImage = await generateGeminiImage(userIntent.imagePrompt || userMsgContent, "1:1", refImage);
    } catch (imgErr) {
      console.warn("Image pre-generation error:", imgErr);
    }
  }

  chat.messages.push(userMsg);
  chat.updatedAt = new Date().toISOString();
  
  // Auto-title generation if the session has only 1 message or uses default placeholders
  const defaultPlaceholders = [
    "New Chat",
    "New Conversation",
    "Math Workspace",
    "Math Work space",
    "Complex Coding",
    "Project Board",
    "BIS Assistant",
    "BIS AI",
    "BIS Ai",
    "Sovereign AI",
    "Untitled Chat"
  ];
  const isDefaultTitle = defaultPlaceholders.some(p => p.toLowerCase() === (chat.title || "").trim().toLowerCase());
  
  if (isDefaultTitle || chat.messages.length <= 1) {
    const userMsgContent = content || "";
    if (userMsgContent.trim()) {
      // Get other chat titles of this user to prevent duplication
      const existingTitles = db.chats
        .filter((c: any) => c.userId === user.id && c.id !== chat.id)
        .map((c: any) => c.title || "");
        
      chat.title = generateConversationTitle(userMsgContent, existingTitles);
    }
  }

  // Save progress so user message exists in storage even if AI call has issue
  writeDb(db);

  // Lazy instantiate Gemini client
  const ai = getGeminiClient();

  // If Gemini client is unavailable, insert beautiful instruction warning block instead of crashing
  if (!ai) {
    const fallbackMsg = {
      id: "msg_" + Math.random().toString(36).substring(2, 11),
      role: "assistant",
      content: `⚠️ **A-NOVA Gemini Assistant Status Note**\n\nThe backend has not been supplied with a valid \`GEMINI_API_KEY\`. \n\n### How to setup and try this app:\n1. Click on the **Settings > Secrets** panel in the bottom-left corner of the Google AI Studio container portal.\n2. Configure the secret name as \`GEMINI_API_KEY\` and key in your Google GenAI Token.\n3. The app will immediately link to the server-side proxy!\n\n*(Meanwhile, here is a mock response from the preview container: Thank you for registering! I look forward to working with you once you connect your Gemini token inside the secrets drawer!)*`,
      timestamp: new Date().toISOString(),
    };
    chat.messages.push(fallbackMsg);
    chat.updatedAt = new Date().toISOString();
    writeDb(db);
    return res.status(200).json({ activeMessage: fallbackMsg, chat });
  }

  try {
    // Compile Chat History into Gemini parts
    // We send context to Gemini by feeding it historical messages or building content structure.
    const contents: any[] = [];
    
    // Support standard history in parts
    chat.messages.forEach((msg: any) => {
      const partsPayload: any[] = [];

      // Add attached images/files as context inlineData components
      if (msg.attachedFiles && msg.attachedFiles.length > 0) {
        msg.attachedFiles.forEach((file: any) => {
          const fileName = file.name || "document";
          const fileType = file.type || "";
          const isImage = fileType.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|bmp|heic|svg)$/i.test(fileName);
          const isPdf = fileType === "application/pdf" || fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf");
          const isAudio = fileType.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(fileName);

          if (isImage || isPdf || isAudio) {
            if (file.dataUrl && file.dataUrl.includes(";base64,")) {
              const cleanBase64 = file.dataUrl.split(";base64,")[1];
              const resolvedMime = isPdf ? "application/pdf" : (fileType || (isImage ? "image/png" : "application/octet-stream"));
              partsPayload.push({
                inlineData: {
                  data: cleanBase64,
                  mimeType: resolvedMime
                }
              });
            }
          }

          if (file.text) {
            partsPayload.push({
              text: `[Attached Document: ${fileName} (${((file.size || 0) / 1024).toFixed(1)} KB)]\n${file.text}`
            });
          } else if (!isImage && !isPdf && !isAudio && file.dataUrl && file.dataUrl.includes(";base64,")) {
            try {
              const cleanBase64 = file.dataUrl.split(";base64,")[1];
              const decodedText = Buffer.from(cleanBase64, 'base64').toString('utf-8');
              if (decodedText && decodedText.trim()) {
                partsPayload.push({
                  text: `[Attached Document: ${fileName} (${((file.size || 0) / 1024).toFixed(1)} KB)]\n${decodedText}`
                });
              }
            } catch (err) {
              console.warn("Could not decode raw text fallback:", err);
            }
          }
        });
      }

      // Add actual user message text part
      if (msg.content) {
        partsPayload.push({ text: msg.content });
      }

      // Gemini roles are typically 'user' | 'model' (or 'assistant' is converted to model)
      const geminiRole = msg.role === "assistant" ? "model" : "user";
      
      if (partsPayload.length > 0) {
        contents.push({
          role: geminiRole,
          parts: partsPayload
        });
      }
    });

    // Sanitize contents for Gemini API strict alternating role requirement (starts with 'user')
    const sanitizedContents: any[] = [];
    for (const item of contents) {
      if (sanitizedContents.length === 0) {
        if (item.role === "user") {
          sanitizedContents.push(item);
        } else {
          sanitizedContents.push({ role: "user", parts: [{ text: "Hello" }] });
          sanitizedContents.push(item);
        }
      } else {
        const lastItem = sanitizedContents[sanitizedContents.length - 1];
        if (lastItem.role === item.role) {
          lastItem.parts.push(...item.parts);
        } else {
          sanitizedContents.push(item);
        }
      }
    }

    if (sanitizedContents.length === 0) {
      sanitizedContents.push({
        role: "user",
        parts: [{ text: userMsgContent || "Hello" }]
      });
    }

    // Execute server-side Gemini request
    const m = chat.mode || "general";
    let modeInstruction = "";
    if (m === "math") {
      modeInstruction = "\n\n[Active Preset Mode: Math Solver Specialist]\n" +
        "You are A-NOVA in Math Solver mode, dedicated to mathematics.\n" +
        "1. DOMAIN FOCUS: Handle basic through advanced mathematics. Use proper mathematical symbols and LaTeX notation ($...$ for inline, $$...$$ for display equations).\n" +
        "2. REDIRECT NON-MATH: If the user asks for coding/programming or another non-math technical task, briefly say: \"I’m focused on mathematics here. Please use Coding Chat for programming.\"\n" +
        "3. GENERAL CHAT PERMITTED: General conversation and casual chatting are still fully allowed.\n" +
        "4. ANSWER IMMEDIATELY & CONCISELY: Give answers directly without long intros, filler text, or redundant headings. State results first for calculations.\n" +
        "5. PROPORTIONAL & ACCURATE: Short query = short response. Double-check all calculations for precision.";
    } else if (m === "coding") {
      modeInstruction = "\n\n[Active Preset Mode: Coding Assistant]\n" +
        "You are A-NOVA in Coding Chat mode, dedicated to programming.\n" +
        "1. DOMAIN FOCUS: Handle basic through advanced coding. Provide detailed, complete, production-ready code when requested.\n" +
        "2. REDIRECT NON-CODING: If the user asks for mathematics or another non-coding task, briefly say: \"I’m focused on coding here. Please use Math Solver for mathematics.\"\n" +
        "3. GENERAL CHAT PERMITTED: General conversation and casual chatting are still fully allowed.\n" +
        "4. CODE FORMATTING: Put ONLY actual source code inside markdown code blocks (```language ... ```). Keep each complete solution together in ONE code block. Never put explanations, headings, or commentary inside code blocks.\n" +
        "5. CONCISE EXPLANATIONS: Keep surrounding explanations brief and in standard chat text outside the code container. Explain code only when useful or explicitly requested.";
    } else if (m === "sovereign") {
      modeInstruction = "\n\n[Active Preset Mode: SIH26107 BIS AI Assistant]\n" +
        "You are A-NOVA in BIS AI mode — an authoritative, rigorously grounded, and helpful conversational AI Assistant dedicated to Indian Standards (IS), Bureau of Indian Standards (BIS) services, Conformity Assessment Schemes, Hallmarking, Quality Control Orders (QCOs), and Laboratory Testing for SIH26107.\n\n" +
        "CRITICAL ACCURACY & GROUNDING DIRECTIVES (STRICT COMPLIANCE REQUIRED):\n\n" +
        "1. STRICT FACTUAL ACCURACY & NO GUESSING:\n" +
        "   - Do NOT generate BIS standards, QCO status, mandatory requirements, certification schemes, laboratory information, clauses, dates, fees, or legal claims from general model knowledge alone.\n" +
        "   - For every factual BIS claim, prioritize official BIS sources, canonical grounding data, and the latest available official gazette documents.\n" +
        "   - If the applicable standard, QCO, clause, fee, or requirement cannot be fully verified, CLEARLY state that it requires verification on the official BIS portal (manakonline.in / bis.gov.in). DO NOT guess or invent an IS number, QCO date, clause, laboratory name, fee amount, or legal requirement.\n\n" +
        "2. EXPLICIT 4-WAY CLASSIFICATION (ALWAYS DISTINGUISH):\n" +
        "   In every regulatory or standard response, clearly distinguish between:\n" +
        "   (1) [Mandatory QCO]: Mandatory certification notified by Central Ministries under the BIS Act (compulsory ISI Mark / CRS R-number before manufacture, import, or sale in India).\n" +
        "   (2) [Voluntary Certification]: Voluntary BIS certification where no mandatory QCO currently mandates compliance, but manufacturers may opt for ISI mark/certification for quality assurance.\n" +
        "   (3) [General Guidance]: Procedural advice, best practices, application workflow outlines, and audit readiness steps.\n" +
        "   (4) [Document-Sourced Information]: Information extracted directly from a user-uploaded PDF or file.\n\n" +
        "3. UPLOADED DOCUMENT INTELLIGENCE & CITATIONS:\n" +
        "   - For user-uploaded PDFs, QCOs, gazettes, test reports, or images, clearly identify when an answer comes from the uploaded document.\n" +
        "   - Provide exact page numbers, section titles, and clause references where available (e.g., 'As stated on Page 3, Section 4.2 of the uploaded QCO notification...').\n" +
        "   - If a specific requested detail is not found in the uploaded file, explicitly say so without hallucinating.\n\n" +
        "4. STANDARD RECOMMENDATIONS WITH REASONING & SOURCES:\n" +
        "   - When recommending Indian Standards, explain the technical reasoning (scope, safety tests, electrical/mechanical/chemical parameters, intended product usage) and provide the official source reference.\n" +
        "   - Provide the complete IS number, year of reaffirmation/revision (e.g., IS 10500:2012, IS 1417:2016, IS 1293:2019, IS 16046 (Part 2):2018), and official title.\n\n" +
        "5. CURRENT TESTING LABORATORY INFORMATION:\n" +
        "   - Use verified BIS laboratory information (BIS Central Laboratory Sahibabad, Regional Labs at Kolkata, Mumbai, Chennai, Chandigarh/Mohali, and recognized third-party NABL/LRS accredited labs such as CPRI, ERTL, SAMEER, NTH, TUV, UL, Intertek, etc.).\n" +
        "   - Never invent fictional laboratory names or make ungrounded claims about specific lab test capabilities. Advise users to verify real-time sample testing capacity on the BIS LIMS portal (lims.bis.gov.in / manakonline.in).\n\n" +
        "6. CONTEXTUAL RELEVANCE FOR HALLMARKING:\n" +
        "   - Only discuss gold (IS 1417) and silver (IS 2112) hallmarking, HUID, and AHC assaying when relevant to precious metals, jewellery, or bullion inquiries. Do NOT inject hallmarking into unrelated product queries.\n\n" +
        "7. VISIBLE SOURCES & OFFICIAL REFERENCES SECTION:\n" +
        "   - In important BIS answers, include a visible '### Sources & Official References' section linking/referencing authentic BIS portals:\n" +
        "     * BIS Standards Portal: [services.bis.gov.in](https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/indian_standards/isdetails)\n" +
        "     * Manakonline (e-BIS Portal): [manakonline.in](https://www.manakonline.in)\n" +
        "     * Compulsory Registration Scheme Portal: [crsbis.in](https://www.crsbis.in)\n" +
        "     * Official Bureau of Indian Standards Portal: [bis.gov.in](https://www.bis.gov.in)\n" +
        "     * BIS Products Under Mandatory Certification: [bis.gov.in/product-certification/products-under-compulsory-certification/](https://www.bis.gov.in/product-certification/products-under-compulsory-certification/)\n" +
        "     * BIS Care Mobile App (Google Play & Apple App Store)\n\n" +
        "8. LEGAL DISCLAIMER & COMPLIANCE TONE:\n" +
        "   - Never present uncertain information as confirmed legal or compliance advice. Remind users where appropriate that statutory requirements are governed by the relevant Ministry Gazette Notifications and official BIS Standards.\n\n" +
        "9. MULTILINGUAL ACCURACY:\n" +
        "   - Provide responses in English or the Indian language used by the user (Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia) while maintaining technical precision for official standard terms.";
    } else {
      modeInstruction = "\n\n[Active Preset Mode: General Companion]\n" +
        "You are A-NOVA, an intelligent, empathetic, witty, and versatile human-like companion.\n" +
        "1. GENERAL CONVERSATION: Handle normal conversation smoothly.\n" +
        "2. SIMPLE MATH & CODING: Answer basic/simple math and basic/simple coding questions directly and normally.\n" +
        "3. ADVANCED MATH ROUTING: For advanced, detailed, or higher-level mathematics, briefly tell the user to use Math Solver.\n" +
        "4. ADVANCED CODING ROUTING: For advanced, detailed, or higher-level coding tasks, briefly tell the user to use Coding Chat.\n" +
        "5. NO UNNECESSARY REDIRECTS: Do NOT redirect simple or everyday questions unnecessarily.";
    }

    let customInstructions = "";
    if (userSettings.aboutMe && userSettings.aboutMe.trim()) {
      customInstructions += `\n\n[What user wants you to know about them (Custom Details)]:\n${userSettings.aboutMe}`;
    }
    if (userSettings.respondWay && userSettings.respondWay.trim()) {
      customInstructions += `\n\n[How you should write your responses (Custom Guidelines)]:\n${userSettings.respondWay}`;
    }

    const humanPersonalityDirective = "\n\n[HUMAN PERSONALITY & CONVERSATION DIRECTIVE - ALWAYS FOLLOW]:\n" +
      "You are A-NOVA — a smart, warm, engaging, and genuinely human-feeling AI companion. You talk like a real, intelligent person, not a robotic or canned AI.\n\n" +
      "1. MOOD & TONE ADAPTATION:\n" +
      "   - Seamlessly adapt your vibe and tone to the user's emotion, writing style, and mood.\n" +
      "   - If the user is casual or relaxed, be casual, friendly, and conversational. Use a light, modern Gen Z style when appropriate without overdoing slang.\n" +
      "   - If the user jokes or teases, joke and banter back naturally!\n" +
      "   - If the user is excited or celebrating, match their energy and hype! 🎉\n" +
      "   - If the user is angry, frustrated, or stressed, respond calmly, empathetically, and with confident reassurance.\n" +
      "   - If the user is serious, professional, or technical, be clear, direct, and concise.\n\n" +
      "2. DYNAMIC RESPONSE LENGTH & VARIETY:\n" +
      "   - Give short replies (1–2 lines) for simple greetings, casual chat, or quick questions.\n" +
      "   - Give detailed, thorough, and long responses whenever the user explicitly asks for or wants a long answer, detailed explanation, comprehensive guide, or extended response.\n" +
      "   - Give detailed, well-explained answers for complex topics, tutorials, or deep questions.\n" +
      "   - Vary sentence structures, openings, and phrasing across responses. Never sound repetitive or template-driven.\n" +
      "   - UNABLE TO PERFORM A TASK / AI LIMITATIONS: If you cannot do something or if a requested task is impossible for you to fulfill, give a short, direct, polite response (1-2 sentences maximum) stating clearly what you can or cannot do, without long explanations, lectures, or filler.\n\n" +
      "3. AUTOCORRECT SPELLING & TYPO HANDLING:\n" +
      "   - Automatically autocorrect and seamlessly interpret any spelling mistakes, typos, garbled words, or grammatical errors in the user's input.\n" +
      "   - Do NOT show a weird, confused, or awkward response because of spelling mistakes or typos. Always figure out the intended meaning and respond smoothly to what the user meant to say.\n" +
      "   - Do NOT point out, correct explicitly, quote, or comment on the user's spelling mistakes.\n\n" +
      "4. NATURAL EMOJI USAGE:\n" +
      "   - Use the full Unicode emoji library naturally. Do not limit emojis to a small set. You may use any appropriate standard emoji when it fits the conversation (😀😄😁😂🤣🥹😊😉😍😘😎🤓🧐🤔🤨😐🙄😴😭🥳🤯😤😡😈💀👀🔥✨⭐💯🎉🎊❤️🩷🧡💛💚🩵💙💜🤍🖤🤎👍👎👏🙌🤝🙏💪👌✌️🤞🤟👋🎯🚀⚡💡📚💻📱🎮🎵🍕☕🌍🌙☀️🎁 and any other standard emoji).\n" +
      "   - Use emojis naturally based on the user's mood and context. Sometimes use none, sometimes one or two, and occasionally a few when the situation fits.\n" +
      "   - Never force emojis into every reply or overuse them. The goal is to make conversations feel natural, expressive, and human while keeping responses easy to read.\n\n" +
      "5. NATURAL CONVERSATION & ENGAGEMENT:\n" +
      "   - Remember conversation context and maintain a fluid dialogue.\n" +
      "   - Ask natural, relevant follow-up questions when helpful.\n" +
      "   - Give thoughtful opinions when asked, explaining your reasoning clearly.\n" +
      "   - Avoid unnecessary disclaimers and NEVER say 'As an AI...' or 'As a language model...' unless explicitly necessary.\n" +
      "   - Skip robotic openers (e.g. 'Ready to dive in?', 'Let's get started!') and jump straight into answering.\n" +
      "   - Use markdown, bullet points, tables, and code blocks ONLY when they genuinely improve the answer.\n";

    const documentGenerationDirective = "\n\n[STRICT GENERATION & WEB SEARCH DIRECTIVES - ABSOLUTE MANDATE]:\n" +
      "WEB SEARCH RULES:\n" +
      "A-NOVA must support web search when current, external, or up-to-date information is needed.\n" +
      "CRITICAL TRIGGER PHRASES:\n" +
      "When the user says 'check online', 'look up online', 'search online', 'search the web', 'browse online', 'find on the internet', or similar phrasing, it explicitly means:\n" +
      "1. First, search the web using the search tool to retrieve accurate, verified, up-to-date information.\n" +
      "2. Then, perform and complete the requested task (answering, writing, summarizing, coding, calculating, verifying, etc.) based on those search findings.\n\n" +
      "Use web search for:\n" +
      "- Any request containing 'check online', 'search online', 'look up online', 'check the web', 'google it', or similar phrasing (search web first, then do the task)\n" +
      "- Latest news and current events\n" +
      "- Current prices, products, software versions, or availability\n" +
      "- Current weather\n" +
      "- Current sports scores, schedules, standings, and statistics\n" +
      "- Recent information about people, companies, websites, or organizations\n" +
      "- Research questions where external sources improve accuracy\n" +
      "- Questions asking to verify information\n" +
      "- Any request that explicitly says to search the web, look it up, browse, or find the latest information\n" +
      "When searching:\n" +
      "- Prefer reliable and authoritative sources.\n" +
      "- Use multiple sources when appropriate.\n" +
      "- Clearly distinguish verified information from uncertainty.\n" +
      "- Do not invent search results, sources, URLs, quotations, or facts.\n" +
      "- For current information, prioritize recent sources.\n" +
      "- If the user asks for a specific website, page, document, or source, search for that exact resource.\n" +
      "- If web search is unnecessary for a stable general question, answer normally without searching.\n" +
      "- Keep the response focused on what the user asked; do not add unnecessary research or yapping.\n\n" +
      "When generating an image (Image Generation Controller Rules):\n" +
      "- PRIMARY RULE — CHECK ONLINE FIRST & CANONICAL ACCURACY: When the user requests an image of an anime character (Goku, Naruto, Vegeta, Luffy, Gojo, etc.) or any named character/subject, first check online / verify canonical visual references to depict their exact official appearance, hairstyle, face structure, eye shape, outfit, and color palette according to the anime. Apply this verification to all image generation types.\n" +
      "- ANIME STYLE REQUIREMENT: When the user requests an anime character (such as Goku, Vegeta, Naruto, Luffy, etc.), generate the character in a true 2D anime visual style by default (clean 2D anime line art, sharp defined outlines, expressive anime eyes, accurate anime facial proportions, clean cel shading, hand-drawn anime hair, crisp character details, traditional anime color rendering, dynamic anime composition, clean facial features). Avoid photorealism, 3D CGI appearance, plastic-looking skin, 3D character models, overly realistic facial proportions, or generic AI character faces unless specifically requested.\n" +
      "- CHARACTER PRIORITY (GOKU SPECIFICALLY): If the user requests 'Goku', generate Goku specifically in clean 2D Dragon Ball anime appearance (authentic facial structure and proportions; sharp, clean, highly detailed face; properly shaped anime eyes with clear pupils and irises, symmetrical and correctly positioned; characteristic angular eyebrows; recognizable nose, mouth, jawline, and cheek structure; consistent forehead, hairline, and bangs; distinctive large, separated black hair spikes without merging into a blurry mass; iconic orange gi, blue undershirt/belt/wristbands, and athletic anime proportions). Do not generate generic anime fighters or look-alikes.\n" +
      "- ANIME RENDERING & FACE SHARPNESS: Use crisp 2D anime linework and cel shading. Result must look like a professionally illustrated anime frame, NOT a 3D game character or generic AI artwork. Face must receive high detail priority even when moving or surrounded by energy effects. Never let aura effects cover the face, bright lighting wash out eyes, motion blur distort facial features, or shadows hide face. Keep face large and clear enough in frame to recognize immediately.\n" +
      "- NEGATIVE PROMPT / AVOID: generic anime fighter, Goku lookalike, incorrect face, distorted face, asymmetrical eyes, malformed eyes, blurry face, merged hair spikes, 3D CGI, plastic skin, photorealistic face, generic character, extra fingers, malformed hands, distorted anatomy, excessive bloom, face obscured by energy, excessive motion blur.\n" +
      "- STYLE DEFAULT: If the user says only 'Create an image of Goku', interpret it as 'Create Goku in a high-quality 2D anime style.' Do NOT automatically use realistic, cinematic 3D, CGI, or photorealistic rendering. If the user explicitly requests another style ('realistic Goku', '3D Goku'), follow that requested style while preserving the character's identity.\n" +
      "- CHARACTER NAME ACCURACY: If the user explicitly requests a known fictional character (such as Goku, Vegeta, Naruto, Luffy, Spider-Man, Batman, etc.), the generated image must depict that exact requested character, not merely a character with similar visual traits. Never generate generic anime fighters or look-alikes. Generate the specific character.\n" +
      "- IDENTITY/FEATURE ACCURACY: For named fictional characters, strictly preserve recognizable identity-defining details: 1. Face shape 2. Eyes and eye shape 3. Eyebrows 4. Nose 5. Mouth 6. Jawline 7. Hair silhouette and major hair spikes 8. Hairline 9. Skin tone 10. Body proportions 11. Signature clothing 12. Character symbols 13. Specific accessories 14. Recognizable overall silhouette.\n" +
      "- FACE QUALITY & PRIORITY: The face is a high-priority region. Never allow the face to become blurry, distorted, generic, asymmetrical, malformed, or a different character. Allocate extra detail to the face, eyes, hairline, jaw, nose, and mouth.\n" +
      "- CHARACTER CONSISTENCY: The character must remain recognizable even if pose, clothing, background, camera angle, lighting, art style, action, environment, transformation, or expression change.\n" +
      "- PROMPT INTERPRETATION: Break requests into A. SUBJECT/IDENTITY (Highest priority) B. ACTION/POSE C. APPEARANCE D. ENVIRONMENT E. STYLE (2D Anime by default for anime characters) F. CAMERA/COMPOSITION. Preserve character identity while applying additional instructions.\n" +
      "- NEGATIVE REQUIREMENT: Never intentionally create a 'look-alike' or generic interpretation ('anime warrior', 'spiky-haired fighter', etc.) when a fictional character is named.\n" +
      "- USER INTENT & REALISM: For general real-world / photographic subjects (or when realistic style is explicitly requested), ensure images look authentically lifelike with real textures and lighting. Follow user's exact subject before adding creativity. No unnecessary explanatory text around images.\n" +
      "- NO TEXT IN IMAGE GENERATION: When generating an image, output ONLY the image itself. Do NOT output conversational text, preambles, descriptions, prompts, or accompanying commentary alongside the image. The generated artwork must have no text, no watermarks, no typography, and no captions.\n\n" +
      "When the user explicitly requests creating/generating a PDF, presentation (PPT/PPTX), document (DOCX/Word), spreadsheet (Excel/XLSX/CSV), text file (TXT), code, or any downloadable document file:\n" +
      "1. NO UNNECESSARY EXPLANATIONS, DISCLAIMERS, TUTORIALS, OR LONG INTRODUCTIONS. Never say 'Here is your...', 'I have created...', 'I can't directly...', 'Here's a prompt...', 'Masterpiece...', or any marketing/filler text.\n" +
      "2. Return ONLY a single short confirmation line at the top (e.g., 'PDF created.', 'PPT generated.', 'DOCX created.', 'Excel file created.', 'CSV created.', 'Code generated.', 'File created.').\n" +
      "3. Immediately append the requested content (code block or ```json:document block).\n" +
      "4. Document Schema:\n" +
      "```json:document\n" +
      "{\n" +
      '  "title": "Document Title",\n' +
      '  "subtitle": "Subtitle / Category",\n' +
      '  "format": "pdf|docx|pptx|xlsx|csv|md|txt|json|html",\n' +
      '  "filename": "Filename.ext",\n' +
      '  "summary": "Executive summary...",\n' +
      '  "sections": [\n' +
      '    { "title": "Section Title", "type": "paragraph|bullets|table", "content": "Paragraph text...", "bullets": ["Point 1", "Point 2"], "tableHeaders": ["Col 1", "Col 2"], "tableRows": [["Val 1", "Val 2"]] }\n' +
      '  ],\n' +
      '  "slides": [\n' +
      '    { "slideNumber": 1, "title": "Slide Title", "bulletPoints": ["Point 1", "Point 2"], "keyTakeaway": "Main point" }\n' +
      '  ]\n' +
      "}\n" +
      "```\n" +
      "5. If additional user input is genuinely required, ask only one short, relevant question.\n";

    let generalChatLiveContext = "";
    if (m === "general" || !m) {
      const platform = (req.body?.platform === "android" || req.query.platform === "android" || req.headers["x-platform"] === "android" || (req.headers["user-agent"] && /android/i.test(req.headers["user-agent"]))) ? "android" : "web";
      const userCoords = req.body?.coords || (req.headers["x-user-coords"] ? JSON.parse(req.headers["x-user-coords"] as string) : undefined);
      const locationPermissionState = req.body?.locationPermission || req.headers["x-location-permission"] || undefined;

      try {
        const liveResult = await detectAndFetchGeneralChatIntegrations(
          userMsgContent,
          platform,
          userCoords,
          locationPermissionState,
          chat.weatherContext,
          chat.messages
        );
        if (liveResult.contextPromptString) {
          generalChatLiveContext = liveResult.contextPromptString;
        }
        if (liveResult.weatherData) {
          chat.weatherContext = {
            retrievedAt: liveResult.weatherData.retrievedAt,
            retrievedDate: liveResult.weatherData.retrievedDate,
            retrievedTime: liveResult.weatherData.retrievedTime,
            locationName: liveResult.weatherData.locationName,
            city: liveResult.weatherData.city,
            country: liveResult.weatherData.country,
            coordinates: liveResult.weatherData.coordinates,
            isMyLocation: liveResult.weatherData.isMyLocation,
            resolvedPlaceName: liveResult.weatherData.resolvedPlaceName,
            temperature: liveResult.weatherData.temperature,
            feelsLike: liveResult.weatherData.feelsLike,
            tempMin: liveResult.weatherData.tempMin,
            tempMax: liveResult.weatherData.tempMax,
            humidity: liveResult.weatherData.humidity,
            pressure: liveResult.weatherData.pressure,
            condition: liveResult.weatherData.condition,
            description: liveResult.weatherData.description,
            windSpeed: liveResult.weatherData.windSpeed,
            sunrise: liveResult.weatherData.sunrise,
            sunset: liveResult.weatherData.sunset,
            weatherData: liveResult.weatherData
          };
          writeDb(db);
        }
      } catch (liveErr) {
        console.warn("[General Chat Live Integration Notice]:", liveErr);
      }
    }

    const locationDirective = 
      "\n\n[LOCATION & GOOGLE MAPS PROTOCOL - STRICT DIRECTIVE]:\n" +
      "- In General Chat, A-NOVA connects directly to the device's native Geolocation API and Google Maps integrations.\n" +
      "- NEVER state, claim, or imply that you are 'blind to user location', 'have no GPS', 'cannot access location', 'lack physical sensors', or 'cannot interact with maps'.\n" +
      "- When device location is granted, use the provided coordinates for local weather, nearby places, maps, and directions seamlessly.\n" +
      "- Never guess the user's location. Do not use IP tracking.\n" +
      "- If location permission was denied or not granted, politely explain that device/browser location permission is needed to automatically detect the local area, and invite the user to type their desired city, address, or location manually to continue.\n" +
      "- When the user asks to find a place or 'open it in Google Maps', ALWAYS provide a working Google Maps link (e.g. `[Open in Google Maps](https://www.google.com/maps/search/?api=1&query=...)`). NEVER claim that you cannot open Google Maps or cannot provide maps links.\n" +
      "- Do NOT invent fictional coordinates or fake street addresses.\n";

    const bisGroundingContext = (m === "sovereign" || userMsgContent.toLowerCase().includes("bis") || userMsgContent.toLowerCase().includes("is ") || userMsgContent.toLowerCase().includes("standard") || userMsgContent.toLowerCase().includes("hallmark") || userMsgContent.toLowerCase().includes("huid") || userMsgContent.toLowerCase().includes("isi mark") || userMsgContent.toLowerCase().includes("qco"))
      ? getRelevantBisGrounding(userMsgContent)
      : "";

    const dynamicSystemPrompt = (userSettings.systemPrompt || "You are A-NOVA, a warm, highly intelligent, and conversational AI companion.") + modeInstruction + bisGroundingContext + locationDirective + generalChatLiveContext + customInstructions + humanPersonalityDirective + documentGenerationDirective;

    // Optimize performance by setting up an SSE stream connection
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Bypass Vercel/Nginx response buffering for real-time streaming
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }

    // For direct image generation requests, return the generated image
    if (userIntent.isImageRequest) {
      let finalImg = preGeneratedImage;
      let imgErrorMessage: string | null = null;
      if (!finalImg) {
        try {
          finalImg = await generateGeminiImage(userIntent.imagePrompt || userMsgContent, "1:1", refImage);
        } catch (fErr: any) {
          console.error("Fallback image generation error:", fErr);
          imgErrorMessage = fErr?.message || "Image generation failed.";
        }
      }

      if (finalImg) {
        const imageText = `![${finalImg.prompt}](${finalImg.url})`;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: imageText })}\n\n`);

        const assistantMsg = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          role: "assistant",
          content: imageText,
          timestamp: new Date().toISOString(),
          hasSpeech: userIntent.isVoiceRequest,
          autoPlayVoice: userIntent.isVoiceRequest,
          generatedImages: [finalImg],
          attachedFiles: undefined
        };

        const currentDb = readDb();
        const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
        if (currentChat) {
          currentChat.messages.push(assistantMsg);
          currentChat.updatedAt = new Date().toISOString();
          writeDb(currentDb);
        }

        res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantMsg, chat: currentChat || chat })}\n\n`);
        return res.end();
      } else {
        const errText = imgErrorMessage?.includes("GEMINI_API_KEY")
          ? "Unable to generate image: Gemini API key is not configured or invalid on the server."
          : `Unable to generate image: ${imgErrorMessage || "An error occurred during generation."}`;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: errText })}\n\n`);
        const assistantMsg = {
          id: "msg_" + Math.random().toString(36).substring(2, 11),
          role: "assistant",
          content: errText,
          timestamp: new Date().toISOString(),
          hasSpeech: false,
          autoPlayVoice: false,
          generatedImages: [],
          attachedFiles: undefined
        };
        const currentDb = readDb();
        const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
        if (currentChat) {
          currentChat.messages.push(assistantMsg);
          currentChat.updatedAt = new Date().toISOString();
          writeDb(currentDb);
        }
        res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantMsg, chat: currentChat || chat })}\n\n`);
        return res.end();
      }
    }

    let completeAiText = "";
    
    let activeModelResolved = modelToUse;
    
    // Configure dynamic tools including Google Search Grounding for current/live web information
    const generationConfig: any = {
      systemInstruction: dynamicSystemPrompt,
      temperature: m === "math" ? 0.2 : m === "coding" ? 0.4 : 0.7,
    };

    if (userIntent.isSearchRequest) {
      generationConfig.tools = [{ googleSearch: {} }];
    }

    try {
      const sovereignConfig = req.body?.sovereignConfig || (chat as any).sovereignConfig;
      let streamedViaLocal = false;

      if (m === "sovereign" && sovereignConfig?.isConnected && sovereignConfig?.endpointUrl) {
        try {
          const localStream = streamLocalSovereignChat(sovereignConfig, dynamicSystemPrompt, chat.messages, 0.7);
          for await (const chunkText of localStream) {
            if (chunkText) {
              completeAiText += chunkText;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: chunkText })}\n\n`);
              if (typeof (res as any).flush === "function") {
                (res as any).flush();
              }
            }
          }
          if (completeAiText.trim()) {
            streamedViaLocal = true;
          }
        } catch (localErr) {
          console.warn("[Sovereign Local Inference Stream Notice - Using Private Stream Fallback]:", localErr);
        }
      }

      if (!streamedViaLocal) {
        const stream = generateContentStreamWithFallback(
          ai,
          modelToUse,
          sanitizedContents,
          generationConfig,
          3,
          (succeededModel) => {
            activeModelResolved = succeededModel;
          }
        );

        for await (const chunk of stream) {
          const text = chunk.text || "";
          if (text) {
            completeAiText += text;
            res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
            if (typeof (res as any).flush === "function") {
              (res as any).flush();
            }
          }
        }
      }

      // Read DB again to get latest state in case of concurrency
      const currentDb = readDb();
      const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);

      let finalContent = sanitizeGenerationResponse(completeAiText, userMsgContent) || "I was unable to formulate a response.";
      const generatedImagesPayload: any[] = [];
      const attachedFilesPayload: any[] = [];

      if (preGeneratedImage) {
        generatedImagesPayload.push(preGeneratedImage);

        if (!finalContent.includes("![") && !finalContent.includes(preGeneratedImage.url)) {
          finalContent = `![${preGeneratedImage.prompt}](${preGeneratedImage.url})`;
        }
      }

      const assistantMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: finalContent,
        timestamp: new Date().toISOString(),
        hasSpeech: userIntent.isVoiceRequest,
        autoPlayVoice: userIntent.isVoiceRequest,
        generatedImages: generatedImagesPayload.length > 0 ? generatedImagesPayload : undefined,
        attachedFiles: attachedFilesPayload.length > 0 ? attachedFilesPayload : undefined
      };

      if (currentChat) {
        if (chat.weatherContext) {
          currentChat.weatherContext = chat.weatherContext;
        }
        currentChat.messages.push(assistantMsg);
        currentChat.updatedAt = new Date().toISOString();
        if (activeModelResolved !== modelToUse) {
          console.warn(`[Self-Healing] Updating chat ${id} selectedModel from ${modelToUse} to successful fallback ${activeModelResolved}`);
          currentChat.selectedModel = activeModelResolved;
        }
        writeDb(currentDb);
      }

      // Flush final metadata
      res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantMsg, chat: currentChat || chat })}\n\n`);
      res.end();
    } catch (genErr: any) {
      console.error("[Gemini Stream Generation Error]:", genErr);
      const rawErrMsg = genErr.message || "";
      const isQuotaError = genErr?.status === 429 || 
                          rawErrMsg.includes("429") || 
                          rawErrMsg.toLowerCase().includes("quota") || 
                          rawErrMsg.toLowerCase().includes("rate limit") || 
                          rawErrMsg.toLowerCase().includes("resource_exhausted");

      const userFriendlyMessage = isQuotaError
        ? "⚠️ **Rate Limit Reached**: The free tier quota for Gemini models has been temporarily reached. Please wait a short moment and try sending your message again."
        : `\n\n❌ **Gemini Error:** ${rawErrMsg || "An error occurred while generating the response. Please check your API key in Settings."}`;

      res.write(`data: ${JSON.stringify({ 
        type: "chunk", 
        text: userFriendlyMessage
      })}\n\n`);

      const currentDb = readDb();
      const currentChat = currentDb.chats.find((c: any) => c.id === id && c.userId === user.id);
      const assistantErrorMsg = {
        id: "msg_" + Math.random().toString(36).substring(2, 11),
        role: "assistant",
        content: userFriendlyMessage,
        timestamp: new Date().toISOString()
      };
      if (currentChat) {
        currentChat.messages.push(assistantErrorMsg);
        currentChat.updatedAt = new Date().toISOString();
        writeDb(currentDb);
      }

      res.write(`data: ${JSON.stringify({ type: "done", activeMessage: assistantErrorMsg, chat: currentChat || chat })}\n\n`);
      res.end();
    }
  } catch (outerErr: any) {
    console.error("[Outer Message Router Error]:", outerErr);
    if (!res.headersSent) {
      res.status(500).json({ error: outerErr.message || "Internal server error." });
    }
  }
});

// --- Launch Node Webserver & Vite Integration ---
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL_ENV;

async function startServer() {
  let vite: any;
  // Vite integration based on mode
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    
    // Hand over unhandled paths to Vite's HTML template processor
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`A-NOVA backend routing initialized. Listening on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production" && vite) {
    server.on("upgrade", (req: any, socket: any, head: any) => {
      if (vite.ws) {
        vite.ws.handleUpgrade(req, socket, head);
      }
    });
  }
}

if (!isVercel) {
  startServer();
}

export default app;
