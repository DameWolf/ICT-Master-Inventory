// ─── The 12 Official ICT Hardware Categories ───────────────────────────
export const CATEGORIES = [
  { id: 1,  name: "Computing Devices",     icon: "🖥️", color: "#9E1B32" },
  { id: 2,  name: "Storage Devices",       icon: "💾", color: "#DAA520" },
  { id: 3,  name: "Networking Equipment",  icon: "📡", color: "#C0392B" },
  { id: 4,  name: "Input Devices",         icon: "⌨️", color: "#795548" },
  { id: 5,  name: "Output Devices",        icon: "🖨️", color: "#E63946" },
  { id: 6,  name: "Peripheral Devices",    icon: "🔌", color: "#D9822B" },
  { id: 7,  name: "Communication Devices", icon: "📞", color: "#C0392B" },
  { id: 8,  name: "Other ICT Hardware",    icon: "🔋", color: "#E0A96D" },
  { id: 9,  name: "Specialized Devices",   icon: "💳", color: "#800020" },
  { id: 10, name: "Wearable Devices",      icon: "⌚", color: "#E67E22" },
  { id: 11, name: "Embedded Systems",      icon: "🤖", color: "#C0392B" },
  { id: 12, name: "Security Devices",      icon: "📹", color: "#8B0000" },
];

export const ALL_HARDWARE_CATEGORIES = CATEGORIES;

// Sub-types per category mapping
export const CATEGORY_SUBTYPES = {
  "Computing Devices": [
    "Desktop", "Laptop", "Tablet", "Server", "Mainframe", "Supercomputer", "Workstation", "Single-board Computer"
  ],
  "Storage Devices": [
    "HDD", "SSD", "External Hard Drive", "USB Flash Drive", "NAS", "CD / DVD / Blu-ray", "Cloud Storage Hardware"
  ],
  "Networking Equipment": [
    "Router", "Switch", "Hub", "Modem", "Access Point", "NIC", "Firewall", "Load Balancer"
  ],
  "Input Devices": [
    "Keyboard", "Mouse", "Touchscreen", "Stylus Pen", "Scanner", "Microphone", "Webcam", "Graphic Tablet"
  ],
  "Output Devices": [
    "Monitor", "Printer", "Laser Printer", "Inkjet Printer", "3D Printer", "Projector", "Speaker", "Headset", "Smart TV"
  ],
  "Peripheral Devices": [
    "External GPU", "Docking Station", "Game Controller", "External Optical Drive"
  ],
  "Communication Devices": [
    "Smartphone", "Satellite Phone", "Walkie-Talkie", "VOIP Phone", "Conference Phone", "Phone"
  ],
  "Other ICT Hardware": [
    "Power Supply", "UPS", "Cooling System", "Cables and Connectors", "Adapter and Converter", "Rack and Cabinet"
  ],
  "Specialized Devices": [
    "POS Terminal", "Kiosk", "ATM Machine", "Barcode Scanner", "RFID Reader"
  ],
  "Wearable Devices": [
    "Smartwatch", "Fitness Tracker", "AR Glasses", "VR Headset"
  ],
  "Embedded Systems": [
    "Microcontroller", "Sensor", "IoT Device", "Smart Home Device"
  ],
  "Security Devices": [
    "CCTV Camera", "Biometric Device", "Smart Lock", "Security Alarm"
  ]
};

// ─── Status colours ───────────────────────────────────────────────────────────
export const STATUS_COLORS = {
  "Functional":      "#10B981", // Emerald
  "For Upgrade":     "#D4AF37", // Liceo Gold
  "For Replacement": "#E67E22", // Warm Orange
  "Defective":       "#EF4444", // Crimson Red
  "Unknown":         "#8C7A82", // Muted Burgundy Gray
};

// ─── Campuses ─────────────────────────────────────────────────────────────────
export const CAMPUSES = ["Main", "RNP", "Paseo"];

// ─── Smart Category Matcher ────────────────────────────────────────────────────
export function getCategoryMeta(name) {
  if (!name) return CATEGORIES[0];
  const nameLower = name.toLowerCase();

  // Match exact category
  const directMatch = CATEGORIES.find((c) => c.name.toLowerCase() === nameLower);
  if (directMatch) return directMatch;

  // Match subtype
  for (const [catName, subTypes] of Object.entries(CATEGORY_SUBTYPES)) {
    if (subTypes.some((s) => s.toLowerCase() === nameLower || nameLower.includes(s.toLowerCase()))) {
      return CATEGORIES.find((c) => c.name === catName) || CATEGORIES[0];
    }
  }

  // Partial match
  const partial = CATEGORIES.find(
    (c) => nameLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nameLower)
  );

  return partial || CATEGORIES[0];
}

export const INITIAL_INVENTORY = [];
