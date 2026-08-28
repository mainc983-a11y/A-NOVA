/**
 * Device Native Geolocation Manager
 * Strictly handles native browser/desktop and Android system location permissions.
 * Remembers permission state and never guesses the user's location.
 */

export interface DeviceLocationResult {
  state: "granted" | "denied" | "prompt" | "unsupported" | "unavailable";
  coords: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
  error?: string;
}

const STORAGE_KEY = "anova_location_permission_state";

export function getCachedLocationPermission(): "granted" | "denied" | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "granted" || val === "denied") return val;
  } catch (_) {}
  return null;
}

export function setCachedLocationPermission(state: "granted" | "denied"): void {
  try {
    localStorage.setItem(STORAGE_KEY, state);
  } catch (_) {}
}

/**
 * Checks if a user's prompt in General Chat requires the user's device location.
 */
export function isLocationRequiredForQuery(text: string, mode: string = "general"): boolean {
  if (mode !== "general") return false;
  const lower = (text || "").toLowerCase().trim();

  // Location-relative phrases
  const relativeLocationRegex = /\b(near me|around me|around here|nearby|close by|from here|here|current location|where i am|my location|where am i|my coordinates|my area|closest|nearest)\b/i;
  if (relativeLocationRegex.test(lower)) {
    return true;
  }

  // General local weather query without a specific distant city named
  const generalWeatherRegex = /^(?:what(?:'s| is) the )?(?:weather|temperature|temp|forecast|is it raining|is it sunny|how hot is it|how cold is it|will it rain|is it going to rain|is it snowing)(?: (?:today|now|outside|currently|this week|tomorrow))?[?!.]*$/i;
  if (generalWeatherRegex.test(lower)) {
    return true;
  }

  // Directions starting implicitly from current location
  const relativeDirectionsRegex = /^(?:directions? to|how do i get to|route to|navigate to|guide me to|drive to|walk to)\s+([^?.!]+)$/i;
  if (relativeDirectionsRegex.test(lower)) {
    return true;
  }

  // Nearby discovery without specific city named
  const nearbySearchRegex = /^(?:find|search|show|get|recommend|where are|where is)(?: me)? (?:the )?(?:nearest|nearby|closest|best)?\s*(?:restaurants?|cafes?|coffee shops?|hotels?|gas stations?|hospitals?|pharmacies?|groceries?|supermarkets?|parks?|gyms?|stores?|shops?|cinemas?|theaters?)[?!.]*$/i;
  if (nearbySearchRegex.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Requests device location using native platform APIs (Desktop browser or Android WebView/Chrome).
 * - Ask for permission only when a location-based feature actually needs it.
 * - Remember the permission state in storage.
 * - Never guess the user's location.
 * - Do not repeatedly ask for permission after it has already been granted.
 */
export async function getDeviceNativeLocation(forcePrompt = false): Promise<DeviceLocationResult> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return { state: "unsupported", coords: null, error: "Geolocation is not supported on this device/browser." };
  }

  // Check browser Permission API if available
  if (typeof navigator.permissions !== "undefined" && navigator.permissions.query) {
    try {
      const permStatus = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      if (permStatus.state === "granted") {
        setCachedLocationPermission("granted");
      } else if (permStatus.state === "denied") {
        setCachedLocationPermission("denied");
      }
    } catch (_) {}
  }

  const cached = getCachedLocationPermission();
  if (cached === "denied" && !forcePrompt) {
    return { state: "denied", coords: null, error: "Location permission previously denied." };
  }

  return new Promise<DeviceLocationResult>((resolve) => {
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCachedLocationPermission("granted");
          resolve({
            state: "granted",
            coords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            }
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setCachedLocationPermission("denied");
            resolve({
              state: "denied",
              coords: null,
              error: "Device location permission denied."
            });
          } else {
            resolve({
              state: "unavailable",
              coords: null,
              error: err.message || "Location currently unavailable."
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } catch (e: any) {
      resolve({
        state: "unsupported",
        coords: null,
        error: e?.message || "Location request failed."
      });
    }
  });
}
