export interface Country {
  code: string; // Dial code e.g. "+1"
  iso: string;  // ISO code e.g. "US"
  name: string; // Country name e.g. "United States"
  flag: string; // Emoji flag e.g. "🇺🇸"
  minDigits: number;
  maxDigits: number;
}

export const ALL_COUNTRIES: Country[] = [
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸", minDigits: 10, maxDigits: 10 },
  { code: "+1", iso: "CA", name: "Canada", flag: "🇨🇦", minDigits: 10, maxDigits: 10 },
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳", minDigits: 10, maxDigits: 10 },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧", minDigits: 10, maxDigits: 11 },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺", minDigits: 9, maxDigits: 10 },
  { code: "+49", iso: "DE", name: "Germany", flag: "🇩🇪", minDigits: 10, maxDigits: 11 },
  { code: "+33", iso: "FR", name: "France", flag: "🇫🇷", minDigits: 9, maxDigits: 10 },
  { code: "+81", iso: "JP", name: "Japan", flag: "🇯🇵", minDigits: 10, maxDigits: 11 },
  { code: "+86", iso: "CN", name: "China", flag: "🇨🇳", minDigits: 11, maxDigits: 11 },
  { code: "+55", iso: "BR", name: "Brazil", flag: "🇧🇷", minDigits: 10, maxDigits: 11 },
  { code: "+971", iso: "AE", name: "United Arab Emirates", flag: "🇦🇪", minDigits: 9, maxDigits: 9 },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦", minDigits: 9, maxDigits: 9 },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬", minDigits: 8, maxDigits: 8 },
  { code: "+82", iso: "KR", name: "South Korea", flag: "🇰🇷", minDigits: 9, maxDigits: 11 },
  { code: "+39", iso: "IT", name: "Italy", flag: "🇮🇹", minDigits: 9, maxDigits: 10 },
  { code: "+34", iso: "ES", name: "Spain", flag: "🇪🇸", minDigits: 9, maxDigits: 9 },
  { code: "+31", iso: "NL", name: "Netherlands", flag: "🇳🇱", minDigits: 9, maxDigits: 9 },
  { code: "+41", iso: "CH", name: "Switzerland", flag: "🇨🇭", minDigits: 9, maxDigits: 9 },
  { code: "+46", iso: "SE", name: "Sweden", flag: "🇸🇪", minDigits: 7, maxDigits: 9 },
  { code: "+47", iso: "NO", name: "Norway", flag: "🇳🇴", minDigits: 8, maxDigits: 8 },
  { code: "+45", iso: "DK", name: "Denmark", flag: "🇩🇰", minDigits: 8, maxDigits: 8 },
  { code: "+358", iso: "FI", name: "Finland", flag: "🇫🇮", minDigits: 8, maxDigits: 10 },
  { code: "+353", iso: "IE", name: "Ireland", flag: "🇮🇪", minDigits: 9, maxDigits: 9 },
  { code: "+64", iso: "NZ", name: "New Zealand", flag: "🇳🇿", minDigits: 8, maxDigits: 10 },
  { code: "+27", iso: "ZA", name: "South Africa", flag: "🇿🇦", minDigits: 9, maxDigits: 9 },
  { code: "+52", iso: "MX", name: "Mexico", flag: "🇲🇽", minDigits: 10, maxDigits: 10 },
  { code: "+54", iso: "AR", name: "Argentina", flag: "🇦🇷", minDigits: 10, maxDigits: 11 },
  { code: "+57", iso: "CO", name: "Colombia", flag: "🇨🇴", minDigits: 10, maxDigits: 10 },
  { code: "+56", iso: "CL", name: "Chile", flag: "🇨🇱", minDigits: 9, maxDigits: 9 },
  { code: "+51", iso: "PE", name: "Peru", flag: "🇵🇪", minDigits: 9, maxDigits: 9 },
  { code: "+20", iso: "EG", name: "Egypt", flag: "🇪🇬", minDigits: 10, maxDigits: 10 },
  { code: "+234", iso: "NG", name: "Nigeria", flag: "🇳🇬", minDigits: 10, maxDigits: 10 },
  { code: "+254", iso: "KE", name: "Kenya", flag: "🇰🇪", minDigits: 9, maxDigits: 9 },
  { code: "+90", iso: "TR", name: "Turkey", flag: "🇹🇷", minDigits: 10, maxDigits: 10 },
  { code: "+92", iso: "PK", name: "Pakistan", flag: "🇵🇰", minDigits: 10, maxDigits: 10 },
  { code: "+880", iso: "BD", name: "Bangladesh", flag: "🇧🇩", minDigits: 10, maxDigits: 10 },
  { code: "+62", iso: "ID", name: "Indonesia", flag: "🇮🇩", minDigits: 9, maxDigits: 12 },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾", minDigits: 9, maxDigits: 10 },
  { code: "+63", iso: "PH", name: "Philippines", flag: "🇵🇭", minDigits: 10, maxDigits: 10 },
  { code: "+66", iso: "TH", name: "Thailand", flag: "🇹🇭", minDigits: 9, maxDigits: 9 },
  { code: "+84", iso: "VN", name: "Vietnam", flag: "🇻🇳", minDigits: 9, maxDigits: 10 },
  { code: "+48", iso: "PL", name: "Poland", flag: "🇵🇱", minDigits: 9, maxDigits: 9 },
  { code: "+380", iso: "UA", name: "Ukraine", flag: "🇺🇦", minDigits: 9, maxDigits: 9 },
  { code: "+40", iso: "RO", name: "Romania", flag: "🇷🇴", minDigits: 9, maxDigits: 9 },
  { code: "+36", iso: "HU", name: "Hungary", flag: "🇭🇺", minDigits: 9, maxDigits: 9 },
  { code: "+420", iso: "CZ", name: "Czech Republic", flag: "🇨🇿", minDigits: 9, maxDigits: 9 },
  { code: "+30", iso: "GR", name: "Greece", flag: "🇬🇷", minDigits: 10, maxDigits: 10 },
  { code: "+351", iso: "PT", name: "Portugal", flag: "🇵🇹", minDigits: 9, maxDigits: 9 },
  { code: "+32", iso: "BE", name: "Belgium", flag: "🇧🇪", minDigits: 9, maxDigits: 9 },
  { code: "+43", iso: "AT", name: "Austria", flag: "🇦🇹", minDigits: 10, maxDigits: 11 },
  { code: "+972", iso: "IL", name: "Israel", flag: "🇮🇱", minDigits: 9, maxDigits: 9 },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦", minDigits: 8, maxDigits: 8 },
  { code: "+965", iso: "KW", name: "Kuwait", flag: "🇰🇼", minDigits: 8, maxDigits: 8 },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲", minDigits: 8, maxDigits: 8 },
  { code: "+973", iso: "BH", name: "Bahrain", flag: "🇧🇭", minDigits: 8, maxDigits: 8 },
  { code: "+962", iso: "JO", name: "Jordan", flag: "🇯🇴", minDigits: 8, maxDigits: 9 },
  { code: "+961", iso: "LB", name: "Lebanon", flag: "🇱🇧", minDigits: 7, maxDigits: 8 },
  { code: "+964", iso: "IQ", name: "Iraq", flag: "🇮🇶", minDigits: 10, maxDigits: 10 },
  { code: "+98", iso: "IR", name: "Iran", flag: "🇮🇷", minDigits: 10, maxDigits: 10 },
  { code: "+7", iso: "RU", name: "Russia", flag: "🇷🇺", minDigits: 10, maxDigits: 10 },
  { code: "+7", iso: "KZ", name: "Kazakhstan", flag: "🇰🇿", minDigits: 10, maxDigits: 10 },
  { code: "+994", iso: "AZ", name: "Azerbaijan", flag: "🇦🇿", minDigits: 9, maxDigits: 9 },
  { code: "+995", iso: "GE", name: "Georgia", flag: "🇬🇪", minDigits: 9, maxDigits: 9 },
  { code: "+374", iso: "AM", name: "Armenia", flag: "🇦🇲", minDigits: 8, maxDigits: 8 },
  { code: "+977", iso: "NP", name: "Nepal", flag: "🇳🇵", minDigits: 10, maxDigits: 10 },
  { code: "+94", iso: "LK", name: "Sri Lanka", flag: "🇱🇰", minDigits: 9, maxDigits: 9 },
  { code: "+95", iso: "MM", name: "Myanmar", flag: "🇲🇲", minDigits: 8, maxDigits: 10 },
  { code: "+852", iso: "HK", name: "Hong Kong", flag: "🇭🇰", minDigits: 8, maxDigits: 8 },
  { code: "+886", iso: "TW", name: "Taiwan", flag: "🇹🇼", minDigits: 9, maxDigits: 9 },
  { code: "+853", iso: "MO", name: "Macau", flag: "🇲🇴", minDigits: 8, maxDigits: 8 },
  { code: "+354", iso: "IS", name: "Iceland", flag: "🇮🇸", minDigits: 7, maxDigits: 7 },
  { code: "+356", iso: "MT", name: "Malta", flag: "🇲🇹", minDigits: 8, maxDigits: 8 },
  { code: "+357", iso: "CY", name: "Cyprus", flag: "🇨🇾", minDigits: 8, maxDigits: 8 },
  { code: "+385", iso: "HR", name: "Croatia", flag: "🇭🇷", minDigits: 8, maxDigits: 9 },
  { code: "+381", iso: "RS", name: "Serbia", flag: "🇷🇸", minDigits: 8, maxDigits: 9 },
  { code: "+359", iso: "BG", name: "Bulgaria", flag: "🇧🇬", minDigits: 8, maxDigits: 9 },
  { code: "+421", iso: "SK", name: "Slovakia", flag: "🇸🇰", minDigits: 9, maxDigits: 9 },
  { code: "+386", iso: "SI", name: "Slovenia", flag: "🇸🇮", minDigits: 8, maxDigits: 8 },
  { code: "+370", iso: "LT", name: "Lithuania", flag: "🇱🇹", minDigits: 8, maxDigits: 8 },
  { code: "+371", iso: "LV", name: "Latvia", flag: "🇱🇻", minDigits: 8, maxDigits: 8 },
  { code: "+372", iso: "EE", name: "Estonia", flag: "🇪🇪", minDigits: 7, maxDigits: 8 },
  { code: "+598", iso: "UY", name: "Uruguay", flag: "🇺🇾", minDigits: 8, maxDigits: 8 },
  { code: "+595", iso: "PY", name: "Paraguay", flag: "🇵🇾", minDigits: 9, maxDigits: 9 },
  { code: "+593", iso: "EC", name: "Ecuador", flag: "🇪🇨", minDigits: 9, maxDigits: 9 },
  { code: "+506", iso: "CR", name: "Costa Rica", flag: "🇨🇷", minDigits: 8, maxDigits: 8 },
  { code: "+507", iso: "PA", name: "Panama", flag: "🇵🇦", minDigits: 8, maxDigits: 8 },
  { code: "+503", iso: "SV", name: "El Salvador", flag: "🇸🇻", minDigits: 8, maxDigits: 8 },
  { code: "+502", iso: "GT", name: "Guatemala", flag: "🇬🇹", minDigits: 8, maxDigits: 8 },
  { code: "+504", iso: "HN", name: "Honduras", flag: "🇭🇳", minDigits: 8, maxDigits: 8 },
  { code: "+1-809", iso: "DO", name: "Dominican Republic", flag: "🇩🇴", minDigits: 10, maxDigits: 10 },
  { code: "+1-787", iso: "PR", name: "Puerto Rico", flag: "🇵🇷", minDigits: 10, maxDigits: 10 },
  { code: "+212", iso: "MA", name: "Morocco", flag: "🇲🇦", minDigits: 9, maxDigits: 9 },
  { code: "+213", iso: "DZ", name: "Algeria", flag: "🇩🇿", minDigits: 9, maxDigits: 9 },
  { code: "+216", iso: "TN", name: "Tunisia", flag: "🇹🇳", minDigits: 8, maxDigits: 8 },
  { code: "+233", iso: "GH", name: "Ghana", flag: "🇬🇭", minDigits: 9, maxDigits: 9 },
  { code: "+255", iso: "TZ", name: "Tanzania", flag: "🇹🇿", minDigits: 9, maxDigits: 9 },
  { code: "+256", iso: "UG", name: "Uganda", flag: "🇺🇬", minDigits: 9, maxDigits: 9 },
  { code: "+251", iso: "ET", name: "Ethiopia", flag: "🇪🇹", minDigits: 9, maxDigits: 9 },
  { code: "+225", iso: "CI", name: "Ivory Coast", flag: "🇨🇮", minDigits: 10, maxDigits: 10 },
  { code: "+221", iso: "SN", name: "Senegal", flag: "🇸🇳", minDigits: 9, maxDigits: 9 },
  { code: "+230", iso: "MU", name: "Mauritius", flag: "🇲🇺", minDigits: 8, maxDigits: 8 },
  { code: "+679", iso: "FJ", name: "Fiji", flag: "🇫🇯", minDigits: 7, maxDigits: 7 },
];

export function detectUserCountry(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("India")) {
      return ALL_COUNTRIES.find((c) => c.iso === "IN") || ALL_COUNTRIES[0];
    }
    if (tz.includes("London") || tz.includes("Belfast")) {
      return ALL_COUNTRIES.find((c) => c.iso === "GB") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Sydney") || tz.includes("Melbourne") || tz.includes("Brisbane")) {
      return ALL_COUNTRIES.find((c) => c.iso === "AU") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Berlin") || tz.includes("Frankfurt")) {
      return ALL_COUNTRIES.find((c) => c.iso === "DE") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Paris")) {
      return ALL_COUNTRIES.find((c) => c.iso === "FR") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Tokyo")) {
      return ALL_COUNTRIES.find((c) => c.iso === "JP") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Shanghai") || tz.includes("Beijing")) {
      return ALL_COUNTRIES.find((c) => c.iso === "CN") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Dubai")) {
      return ALL_COUNTRIES.find((c) => c.iso === "AE") || ALL_COUNTRIES[0];
    }
    if (tz.includes("Sao_Paulo") || tz.includes("Bahia")) {
      return ALL_COUNTRIES.find((c) => c.iso === "BR") || ALL_COUNTRIES[0];
    }

    const lang = (navigator.language || "").toUpperCase();
    if (lang.endsWith("-IN")) return ALL_COUNTRIES.find((c) => c.iso === "IN") || ALL_COUNTRIES[0];
    if (lang.endsWith("-GB")) return ALL_COUNTRIES.find((c) => c.iso === "GB") || ALL_COUNTRIES[0];
    if (lang.endsWith("-CA")) return ALL_COUNTRIES.find((c) => c.iso === "CA") || ALL_COUNTRIES[0];
    if (lang.endsWith("-AU")) return ALL_COUNTRIES.find((c) => c.iso === "AU") || ALL_COUNTRIES[0];
    if (lang.endsWith("-DE")) return ALL_COUNTRIES.find((c) => c.iso === "DE") || ALL_COUNTRIES[0];
    if (lang.endsWith("-FR")) return ALL_COUNTRIES.find((c) => c.iso === "FR") || ALL_COUNTRIES[0];
  } catch (e) {
    // ignore
  }

  return ALL_COUNTRIES[0]; // Default US
}
