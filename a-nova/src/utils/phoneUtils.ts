import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  AsYouType,
  parsePhoneNumberFromString,
  isValidPhoneNumber
} from "libphonenumber-js";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
  searchKey: string;
}

// Convert 2-letter ISO country code to emoji flag
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get localized country names
let regionDisplayNames: Intl.DisplayNames | null = null;
try {
  regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionDisplayNames = null;
}

export function getCountryName(code: CountryCode): string {
  try {
    return regionDisplayNames?.of(code) || code;
  } catch {
    return code;
  }
}

// Generate complete list of all 245+ countries and territories
export function getAllCountries(): CountryInfo[] {
  const countryCodes = getCountries();
  const list: CountryInfo[] = countryCodes.map((code) => {
    let callingCode = "";
    try {
      callingCode = "+" + getCountryCallingCode(code);
    } catch {
      callingCode = "+1";
    }
    const name = getCountryName(code);
    const flag = getCountryFlagEmoji(code);
    return {
      code,
      name,
      callingCode,
      flag,
      searchKey: `${name} ${code} ${callingCode}`.toLowerCase()
    };
  });

  // Sort alphabetically by country name
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export const ALL_COUNTRIES: CountryInfo[] = getAllCountries();

// Quick lookup map
export const COUNTRY_MAP: Map<CountryCode, CountryInfo> = new Map(
  ALL_COUNTRIES.map((c) => [c.code, c])
);

// Map timezones to country codes for accurate first-load detection
const TIMEZONE_COUNTRY_MAP: Record<string, CountryCode> = {
  "America/New_York": "US", "America/Chicago": "US", "America/Los_Angeles": "US", "America/Denver": "US",
  "America/Phoenix": "US", "America/Anchorage": "US", "America/Adak": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA", "America/Winnipeg": "CA",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Europe/London": "GB",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Singapore": "SG",
  "Asia/Dubai": "AE",
  "America/Sao_Paulo": "BR",
  "America/Mexico_City": "MX",
  "Africa/Lagos": "NG",
  "Africa/Johannesburg": "ZA",
  "Asia/Riyadh": "SA", "Asia/Jeddah": "SA",
  "Asia/Jakarta": "ID",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Amsterdam": "NL",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Helsinki": "FI",
  "Europe/Vienna": "AT",
  "Europe/Brussels": "BE",
  "Europe/Dublin": "IE",
  "Europe/Warsaw": "PL", "Europe/Prague": "CZ", "Europe/Budapest": "HU",
  "Asia/Bangkok": "TH", "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY", "Asia/Ho_Chi_Minh": "VN",
  "America/Argentina/Buenos_Aires": "AR", "America/Santiago": "CL", "America/Bogota": "CO", "America/Lima": "PE"
};

// Auto detect country on first load
export function detectUserCountry(): CountryCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_COUNTRY_MAP[tz]) {
      return TIMEZONE_COUNTRY_MAP[tz];
    }

    // Try user browser language e.g. "en-US", "en-IN", "en-GB", "fr-FR"
    const locale = navigator.language || (navigator.languages && navigator.languages[0]);
    if (locale && locale.includes("-")) {
      const region = locale.split("-")[1].toUpperCase() as CountryCode;
      if (getCountries().includes(region)) {
        return region;
      }
    }
  } catch {
    // Fallback
  }
  return "US";
}

export interface ValidationResult {
  formattedNational: string;
  e164: string;
  isValid: boolean;
  error: string | null;
  digitsOnly: string;
}

export function formatAndValidatePhone(rawInput: string, countryCode: CountryCode): ValidationResult {
  const countryInfo = COUNTRY_MAP.get(countryCode) || COUNTRY_MAP.get("US")!;
  const callingCodeDigits = countryInfo.callingCode.replace("+", "");

  // Clean raw input
  let cleaned = rawInput.trim();
  
  // If user pasted or typed full international number starting with +
  if (cleaned.startsWith("+")) {
    const parsedGlobal = parsePhoneNumberFromString(cleaned);
    if (parsedGlobal && parsedGlobal.country) {
      const globalCountry = parsedGlobal.country;
      const globalE164 = parsedGlobal.format("E.164");
      const globalFormatted = parsedGlobal.formatNational();
      const isValid = parsedGlobal.isValid();
      return {
        formattedNational: globalFormatted,
        e164: globalE164,
        isValid,
        error: isValid ? null : `Please enter a valid phone number for ${getCountryName(globalCountry)}.`,
        digitsOnly: parsedGlobal.nationalNumber
      };
    }
  }

  // Remove non-digit characters
  const digitsOnly = cleaned.replace(/\D/g, "");

  if (!digitsOnly) {
    return {
      formattedNational: "",
      e164: "",
      isValid: false,
      error: "Phone number is required.",
      digitsOnly: ""
    };
  }

  // As you type formatting
  const asYouType = new AsYouType(countryCode);
  const formattedNational = asYouType.input(digitsOnly);

  // Construct potential E.164
  const fullIntlString = `${countryInfo.callingCode}${digitsOnly}`;
  const parsed = parsePhoneNumberFromString(fullIntlString, countryCode);

  if (parsed) {
    const isValid = parsed.isValid();
    const e164 = parsed.format("E.164");

    if (isValid) {
      return {
        formattedNational: parsed.formatNational(),
        e164,
        isValid: true,
        error: null,
        digitsOnly: parsed.nationalNumber
      };
    }

    // Invalid details
    if (!parsed.isPossible()) {
      return {
        formattedNational,
        e164,
        isValid: false,
        error: `Number length is invalid for ${countryInfo.name}.`,
        digitsOnly
      };
    }

    return {
      formattedNational,
      e164,
      isValid: false,
      error: `Please enter a valid phone number for ${countryInfo.name}.`,
      digitsOnly
    };
  }

  // Basic length fallback check
  const fallbackValid = digitsOnly.length >= 6 && digitsOnly.length <= 15;
  const fallbackE164 = `+${callingCodeDigits}${digitsOnly}`;

  return {
    formattedNational,
    e164: fallbackE164,
    isValid: fallbackValid,
    error: fallbackValid ? null : `Invalid phone number for ${countryInfo.name}.`,
    digitsOnly
  };
}
