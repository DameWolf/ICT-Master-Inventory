import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const sheetId = process.env.VITE_GOOGLE_SHEET_ID || '1D3-mLBlTAmJVOVgjspEY1w5kbVPrerSZALkyPY_C5UQ';

const tabs = [
  { name: 'Computing Devices', gid: '0' },
  { name: 'Storage Devices', gid: '1016225010' },
  { name: 'Networking Equipment', gid: '2145514340' },
  { name: 'Input Devices', gid: '702434542' },
  { name: 'Output Devices', gid: '1440195529' },
  { name: 'Peripheral Devices', gid: '218018862' },
  { name: 'Communication Devices', gid: '1124120964' },
  { name: 'Other ICT Hardware', gid: '1057208702' },
  { name: 'Specialized Devices', gid: '1544307167' },
  { name: 'Wearable Devices', gid: '1381636888' },
  { name: 'Embedded Systems', gid: '1042856241' },
  { name: 'Security Devices', gid: '748502813' },
  { name: 'BYOD / Personal', gid: '1674181719' },
];

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  result.push(current.trim());
  return result;
}

function parseRow(cols, tabName) {
  const deviceType = cols[0] || tabName;
  const campus = cols[1] || '';

  switch (tabName) {
    case 'Computing Devices':
      return {
        deviceType,
        campus,
        officeType: cols[2] || '',
        department: cols[3] || '',
        userType: cols[4] || '',
        yearPurchased: cols[5] || '',
        usage: cols[6] || '',
        processor: cols[7] || '',
        ram: cols[8] || '',
        os: cols[9] || '',
        storage: cols[10] || '',
        storageExtra: cols[11] || '',
        assetTag: cols[12] || '',
        assignedUser: cols[13] || '',
        status: cols[14] || 'Functional',
        remarks: cols[15] || '',
      };

    case 'Storage Devices':
      return {
        deviceType,
        campus,
        officeType: cols[2] || '',
        department: cols[3] || '',
        userType: cols[4] || '',
        yearPurchased: cols[5] || '',
        specs: cols[6] || '',
        storage: cols[7] || '',
        assetTag: cols[8] || '',
        assignedUser: cols[9] || '',
        status: cols[10] || 'Functional',
        remarks: cols[11] || '',
      };

    default:
      return {
        deviceType,
        campus,
        officeType: cols[2] || '',
        department: cols[3] || '',
        userType: cols[4] || '',
        yearPurchased: cols[5] || '',
        brand: cols[6] || '',
        model: cols[7] || '',
        assetTag: cols[8] || '',
        assignedUser: cols[9] || '',
        status: cols[10] || 'Functional',
        remarks: cols[11] || '',
      };
  }
}

function parseSheetCSV(csvText, tabName, startId = 1) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length < 2) return [];

  const rows = [];
  let idCounter = startId;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVRow(line);
    const deviceType = cols[0] || '';

    if (!deviceType && !cols[1] && !cols[3]) continue;
    if (deviceType.toLowerCase() === 'device type') continue;

    const fields = parseRow(cols, tabName);
    const id = idCounter++;

    rows.push({
      id,
      name: fields.deviceType,
      category: tabName,
      tab_category: tabName,
      device_type: fields.deviceType,
      campus: fields.campus || '',
      office_type: fields.officeType || '',
      department: fields.department || '',
      user_type: fields.userType || '',
      year_purchased: fields.yearPurchased || '',
      usage: fields.usage || '',
      processor: fields.processor || '',
      ram: fields.ram || '',
      os: fields.os || '',
      storage: fields.storage || '',
      storage_extra: fields.storageExtra || '',
      asset_tag: fields.assetTag || '',
      assigned_user: fields.assignedUser || '',
      status: fields.status || 'Functional',
      remarks: fields.remarks || '',
      quantity: 1,
      serial_number: fields.assetTag || `ROW-${id}`,
      date_added: fields.yearPurchased ? `${fields.yearPurchased}-01-01` : '',
      notes: fields.remarks || '',
      sheet_row: i + 1,
      sheet_tab: tabName,
      source: 'google_sheet',
    });
  }

  return rows;
}

async function fetchCSV(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch gid ${gid}: ${response.status}`);
  }
  return response.text();
}

async function main() {
  const allRows = [];
  let idCounter = 1;

  for (const tab of tabs) {
    console.log(`Fetching ${tab.name}...`);
    const csvText = await fetchCSV(tab.gid);
    const parsed = parseSheetCSV(csvText, tab.name, idCounter);
    allRows.push(...parsed);
    idCounter += parsed.length;
  }

  console.log(`Upserting ${allRows.length} inventory rows into Supabase...`);

  const { error } = await supabase
    .from('inventory_items')
    .upsert(allRows, { onConflict: 'id' });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log('Supabase sync complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
