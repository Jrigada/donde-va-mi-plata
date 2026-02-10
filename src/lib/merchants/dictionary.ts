export interface MerchantCategory {
  name: string;
  color: string;
  patterns: string[];
}

export const CATEGORIES: MerchantCategory[] = [
  {
    name: "Transporte",
    color: "#3B82F6",
    patterns: [
      "PAYU*AR*UBER",
      "PYU*UBER",
      "DLO*DiDi",
      "DLOCAL*DIDI",
      "UBER",
      "CABIFY",
      "BEAT",
    ],
  },
  {
    name: "Delivery",
    color: "#EF4444",
    patterns: [
      "DLO*Rappi",
      "RAPPI",
      "PEDIDOSYA",
      "GLOBO",
    ],
  },
  {
    name: "Supermercado",
    color: "#22C55E",
    patterns: [
      "3SM*SUPER TIME",
      "DISCO",
      "PVS*SUPERMERCADO",
      "MERPAGO*SUPERMERCADO",
      "CARREFOUR",
      "COTO",
      "JUMBO",
      "DIA",
      "CHANGOMAS",
      "WALMART",
      "VEA",
      "MAKRO",
    ],
  },
  {
    name: "Suscripciones",
    color: "#8B5CF6",
    patterns: [
      "ADOBE",
      "SPOTIFY",
      "NETFLIX",
      "YOUTUBE",
      "HBOMAX",
      "DISNEY",
      "AMAZON PRIME",
      "APPLE",
      "MERPAGO*APPLEPRO",
      "RAPPIPRO",
      "MERCADOLIBRE NIVEL",
      "GOOGLE",
      "MICROSOFT",
      "OPENAI",
      "CHATGPT",
    ],
  },
  {
    name: "Entretenimiento",
    color: "#F59E0B",
    patterns: [
      "SHOWCASE CINEMAS",
      "HOYTS",
      "CINEMARK",
      "CINEPOLIS",
      "MERPAGO*BETANO",
      "BETANO",
      "STEAM",
      "PLAYSTATION",
      "XBOX",
      "NINTENDO",
    ],
  },
  {
    name: "Eventos",
    color: "#EC4899",
    patterns: [
      "MERPAGO*PASSLINE",
      "PASSLINE",
      "TICKETEK",
      "LIVEPASS",
      "EVENTBRITE",
      "ALLACCESS",
    ],
  },
  {
    name: "Estacionamiento",
    color: "#6B7280",
    patterns: [
      "MERPAGO*PARKING",
      "MERPAGO*PARKINGDOT",
      "ESTACIONAMIENTO",
      "PARKING",
      "AUTOPISTA",
      "PEAJE",
    ],
  },
  {
    name: "Compras",
    color: "#14B8A6",
    patterns: [
      "NIKE",
      "ADIDAS",
      "ZARA",
      "H&M",
      "LIBRERIA",
      "MONOBLOCK",
      "FRAVEGA",
      "GARBARINO",
      "MUSIMUNDO",
      "MEGATONE",
      "MERCADOLIBRE",
      "AMAZON",
    ],
  },
  {
    name: "Mascotas",
    color: "#F97316",
    patterns: [
      "PET SUPPLIES",
      "PUPPIS",
      "PET SHOP",
      "VETERINARIA",
    ],
  },
  {
    name: "Café",
    color: "#A16207",
    patterns: [
      "MERPAGO*BEECOFFEE",
      "BEE COFFEE",
      "STARBUCKS",
      "HAVANNA",
      "CAFE MARTINEZ",
      "LE BLEU",
      "LATTENTE",
      "BIRKIN",
    ],
  },
  {
    name: "Restaurantes",
    color: "#DC2626",
    patterns: [
      "RESTAURANT",
      "PARRILLA",
      "PIZZERIA",
      "SUSHI",
      "BURGER",
      "MCDONALD",
      "WENDYS",
      "KFC",
      "MOSTAZA",
      "DEAN & DENNYS",
      "KANSAS",
      "LA CABRERA",
    ],
  },
  {
    name: "Kiosco",
    color: "#059669",
    patterns: [
      "MERPAGO*1440KIOSCOS",
      "KIOSCO",
      "MAXIKIOSCO",
      "FARMACITY",
    ],
  },
  {
    name: "Farmacia",
    color: "#0EA5E9",
    patterns: [
      "FARMACIA",
      "FARMAPLUS",
      "FARMACITY",
      "DROGUERIA",
    ],
  },
  {
    name: "Salud",
    color: "#06B6D4",
    patterns: [
      "OSDE",
      "SWISS MEDICAL",
      "GALENO",
      "MEDICUS",
      "HOSPITAL",
      "CLINICA",
      "CONSULTORIO",
      "LABORATORIO",
    ],
  },
  {
    name: "Combustible",
    color: "#FBBF24",
    patterns: [
      "YPF",
      "SHELL",
      "AXION",
      "PUMA",
      "NAFTA",
      "GNC",
    ],
  },
  {
    name: "Servicios",
    color: "#6366F1",
    patterns: [
      "EDENOR",
      "EDESUR",
      "METROGAS",
      "AYSA",
      "TELECENTRO",
      "FIBERTEL",
      "PERSONAL",
      "MOVISTAR",
      "CLARO",
      "DIRECTV",
    ],
  },
  {
    name: "Personal (QR propio)",
    color: "#A855F7",
    patterns: [
      "MERPAGO*JUANRIGADA",
    ],
  },
];

// Known subscription services (always flag as subscription even if categorized elsewhere)
export const KNOWN_SUBSCRIPTIONS: string[] = [
  "ADOBE",
  "RAPPIPRO",
  "SPOTIFY",
  "NETFLIX",
  "YOUTUBE",
  "HBOMAX",
  "DISNEY",
  "AMAZON PRIME",
  "MERPAGO*APPLEPRO",
  "APPLE",
  "MERCADOLIBRE NIVEL",
  "GOOGLE ONE",
  "MICROSOFT 365",
  "OPENAI",
  "CHATGPT",
  "ICLOUD",
  "DROPBOX",
  "NOTION",
  "FIGMA",
  "CANVA",
  "LINKEDIN",
  "GITHUB",
];

/**
 * Matches a merchant name to a category
 */
export function categorize(merchant: string): MerchantCategory | null {
  const normalizedMerchant = merchant.toUpperCase();

  for (const category of CATEGORIES) {
    for (const pattern of category.patterns) {
      if (normalizedMerchant.includes(pattern.toUpperCase())) {
        return category;
      }
    }
  }

  return null;
}

/**
 * Checks if a merchant is a known subscription service
 */
export function isKnownSubscription(merchant: string): boolean {
  const normalizedMerchant = merchant.toUpperCase();

  for (const pattern of KNOWN_SUBSCRIPTIONS) {
    if (normalizedMerchant.includes(pattern.toUpperCase())) {
      return true;
    }
  }

  return false;
}
