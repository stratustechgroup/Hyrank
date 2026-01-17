// Country code to flag emoji and name mapping
export const COUNTRIES: Record<string, { flag: string; name: string }> = {
  US: { flag: "🇺🇸", name: "United States" },
  GB: { flag: "🇬🇧", name: "United Kingdom" },
  DE: { flag: "🇩🇪", name: "Germany" },
  FR: { flag: "🇫🇷", name: "France" },
  CA: { flag: "🇨🇦", name: "Canada" },
  AU: { flag: "🇦🇺", name: "Australia" },
  NL: { flag: "🇳🇱", name: "Netherlands" },
  BR: { flag: "🇧🇷", name: "Brazil" },
  JP: { flag: "🇯🇵", name: "Japan" },
  KR: { flag: "🇰🇷", name: "South Korea" },
  SG: { flag: "🇸🇬", name: "Singapore" },
  PL: { flag: "🇵🇱", name: "Poland" },
  RU: { flag: "🇷🇺", name: "Russia" },
  SE: { flag: "🇸🇪", name: "Sweden" },
  FI: { flag: "🇫🇮", name: "Finland" },
  NO: { flag: "🇳🇴", name: "Norway" },
  DK: { flag: "🇩🇰", name: "Denmark" },
  ES: { flag: "🇪🇸", name: "Spain" },
  IT: { flag: "🇮🇹", name: "Italy" },
  PT: { flag: "🇵🇹", name: "Portugal" },
  MX: { flag: "🇲🇽", name: "Mexico" },
  AR: { flag: "🇦🇷", name: "Argentina" },
  CL: { flag: "🇨🇱", name: "Chile" },
  IN: { flag: "🇮🇳", name: "India" },
  CN: { flag: "🇨🇳", name: "China" },
  HK: { flag: "🇭🇰", name: "Hong Kong" },
  TW: { flag: "🇹🇼", name: "Taiwan" },
  TH: { flag: "🇹🇭", name: "Thailand" },
  VN: { flag: "🇻🇳", name: "Vietnam" },
  ID: { flag: "🇮🇩", name: "Indonesia" },
  MY: { flag: "🇲🇾", name: "Malaysia" },
  PH: { flag: "🇵🇭", name: "Philippines" },
  NZ: { flag: "🇳🇿", name: "New Zealand" },
  ZA: { flag: "🇿🇦", name: "South Africa" },
  AE: { flag: "🇦🇪", name: "United Arab Emirates" },
  IL: { flag: "🇮🇱", name: "Israel" },
  TR: { flag: "🇹🇷", name: "Turkey" },
  UA: { flag: "🇺🇦", name: "Ukraine" },
  CZ: { flag: "🇨🇿", name: "Czech Republic" },
  AT: { flag: "🇦🇹", name: "Austria" },
  CH: { flag: "🇨🇭", name: "Switzerland" },
  BE: { flag: "🇧🇪", name: "Belgium" },
  IE: { flag: "🇮🇪", name: "Ireland" },
  RO: { flag: "🇷🇴", name: "Romania" },
  HU: { flag: "🇭🇺", name: "Hungary" },
  GR: { flag: "🇬🇷", name: "Greece" },
};

export function getCountryFlag(code?: string): string {
  if (!code) return "🌍";
  return COUNTRIES[code.toUpperCase()]?.flag || "🌍";
}

export function getCountryName(code?: string): string {
  if (!code) return "Unknown";
  return COUNTRIES[code.toUpperCase()]?.name || code;
}

// Get all available countries for filtering
export function getAvailableCountries(): Array<{ code: string; flag: string; name: string }> {
  return Object.entries(COUNTRIES).map(([code, { flag, name }]) => ({
    code,
    flag,
    name,
  }));
}
