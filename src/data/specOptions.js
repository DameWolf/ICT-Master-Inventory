/**
 * Dropdown/datalist options derived from real sheet data.
 * All lists support free-text entry via <datalist> — these are suggestions, not restrictions.
 */

export const PROCESSOR_OPTIONS = [
  // Intel i3 series
  "Intel Core i3 CPU 540",
  "Intel Core i3 - 2100",
  "Intel Core i3 – 2120",
  "Intel Core i3 - 3220",
  "Intel Core i3 - 3240",
  "Intel Core i3 - 3470",
  "Intel Core i3 - 4150",
  "Intel Core i3 - 4160",
  "Intel Core i3 – 4170",
  "Intel Core i3 - 7100",
  "Intel Core i3 – 7100",
  "Intel Core i3 - 8100",
  "Intel Core i3 – 9100",
  "Intel Core i3 – 10100",
  "Intel Core i3 - 10105",
  "Intel Core i3 - 12100",
  // Intel i5 series
  "Intel Core i5 – 3470",
  "Intel Core i5 - 3470",
  "Intel Core i5 - 7400",
  "Intel Core i5 - 9400",
  "Intel Core i5 - 9400F",
  "Intel Core i5 - 10210U",
  "Intel Core i5 - 10400",
  "Intel Core i5 - 12400",
  // Intel i7 series
  "Intel Core i7 - 3770",
  "Intel Core i7 - 10700",
  // Intel Pentium
  "Intel Pentium Dual Core",
  "Intel Pentium Dual Core E5400",
  "Intel Pentium CPU G3220",
  "Intel Pentium G3260",
  "Intel Pentium CPU G4400",
  "Genuine Intel 2140",
  // Intel Core Duo
  "Intel Core Duo E7500",
  "Intel Core Duo",
  // AMD
  "AMD A4 - 6300",
  "AMD Ryzen 3 3200G",
  "AMD Ryzen 5 3600",
];

export const RAM_OPTIONS = [
  "1GB", "2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "24GB", "32GB", "64GB",
];

export const OS_OPTIONS = [
  // Windows XP
  "Windows XP",
  "Windows XP Pro",
  // Windows 7
  "Windows 7",
  "Windows 7 Pro",
  "Windows 7 Home",
  "Windows 7 Ultimate",
  // Windows 8
  "Windows 8",
  "Windows 8.1",
  // Windows 10
  "Windows 10 Pro",
  "Windows 10 Education",
  "Windows 10 Lite",
  "Windows 10 Home",
  // Windows 11
  "Windows 11 Pro",
  "Windows 11 Education",
  "Windows 11 Home",
  // Server / Other
  "Windows Server 2016",
  "Windows Server 2019",
  "Windows Server 2022",
  "Ubuntu 22.04 LTS",
  "macOS Ventura",
  "macOS Sonoma",
  "Chrome OS",
];

export const STORAGE_OPTIONS = [
  // HDD
  "80GB HDD",
  "160GB HDD",
  "250GB HDD",
  "320GB HDD",
  "500GB HDD",
  "1TB HDD",
  "2TB HDD",
  "4TB HDD",
  // SSD
  "120GB SSD",
  "240GB SSD",
  "250GB SSD",
  "256GB SSD",
  "480GB SSD",
  "512GB SSD",
  "1TB SSD",
  "2TB SSD",
  // NVMe
  "256GB NVMe",
  "512GB NVMe",
  "1TB NVMe",
  // None
  "N/A",
];

export const OFFICE_TYPE_OPTIONS = [
  "Office | Support",
  "Office | Academic",
  "Computer Laboratory",
];

export const DEPARTMENT_OPTIONS = [
  // Support
  "Cashier",
  "Accounting",
  "Supply",
  "Book Center",
  "Registrar",
  "Audit",
  "Safety Security",
  "Diagnostic Accounting",
  // Academic
  "Library / Graduates",
  "GS Library",
  "JHS Library",
  "SBMA Faculty",
  "College of Medicine",
  "College of Nursing",
  "College of Nursing",
  "College of Radiologic Technology",
  "College of Rehabilitation Sciences",
  "College of Medical Laboratory Science",
  "Clinic",
  // Labs
  "Engineering Com. Lab",
  "SBMA Comp. Lab",
  "Paseo Comp. Lab.",
  "CIT Lab (Decomissioned)",
];

export const YEAR_OPTIONS = Array.from({ length: 26 }, (_, i) => String(2000 + i));

export const DEVICE_TYPE_OPTIONS = [
  "Desktop",
  "Laptop",
  "Printer",
  "Scanner",
  "UPS",
  "Monitor",
  "Projector",
  "Router",
  "Switch",
  "IP Phone",
  "CCTV Camera",
  "Access Point",
  "Network Attached Storage",
  "Server",
  "Tablet",
];
