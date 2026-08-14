/**
 * pmChecklistWord.js
 * ─────────────────────────────────────────────────────────
 * Generates a Word (.docx) file matching the LDCU PM Checklist
 * template using the `docx` npm library.
 */
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
  VerticalAlign, HeadingLevel, ShadingType,
} from "docx";
import { TEMPLATE_ROWS } from "./pmChecklistData";

// ── Helpers ──────────────────────────────────────────────

const THICK  = { style: BorderStyle.SINGLE, size: 12, color: "000000" };
const THIN   = { style: BorderStyle.SINGLE, size:  6, color: "000000" };
const NONE   = { style: BorderStyle.NONE,   size:  0, color: "FFFFFF" };

function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    verticalAlign: VerticalAlign.CENTER,
    width:         opts.width   ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan:    opts.span    || 1,
    shading:       opts.shading || undefined,
    borders: {
      top:    opts.noBorder ? NONE : THIN,
      bottom: opts.noBorder ? NONE : THIN,
      left:   opts.noBorder ? NONE : THIN,
      right:  opts.noBorder ? NONE : THIN,
    },
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({
        text: String(text || ""),
        bold:   opts.bold   || false,
        size:   opts.size   || 16,   // half-points; 16 = 8pt, 18 = 9pt, 20 = 10pt
        font:   "Arial",
        color:  opts.color  || "000000",
      }),
    ],
  });
}

function checkMark(checked) {
  return checked ? "✓" : "";
}

function blankLine() {
  return new Paragraph({ children: [new TextRun({ text: "", size: 16 })] });
}

// ── Main export ──────────────────────────────────────────

export async function downloadWord(data, fileName = "PM_Checklist") {
  const {
    department, campus, building, room, schedule,
    procedures, rows, connectivity, overallRemarks,
    userName, conductedBy, reportDate,
  } = data;

  // ── Row data table ───────────────────────────────────
  const headerRow = new TableRow({
    children: [
      cell(para("Component of\nComputer System", { bold: true, size: 16, center: true }), {
        width: 1800,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("Functional", { bold: true, size: 14, center: true }), {
        width: 700,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("For\nRepair", { bold: true, size: 14, center: true }), {
        width: 700,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("For\nUpgrade", { bold: true, size: 14, center: true }), {
        width: 700,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("For\nReplacement", { bold: true, size: 14, center: true }), {
        width: 700,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("Capital Asset\nInventory Tag", { bold: true, size: 14, center: true }), {
        width: 1400,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
      cell(para("Remarks", { bold: true, size: 14, center: true }), {
        width: 2800,
        shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
      }),
    ],
    tableHeader: true,
  });

  const dataRows = TEMPLATE_ROWS.map((rowDef) => {
    if (rowDef.isConnectivity) {
      // Special rows for connectivity
      const isType = rowDef.key === "connectivityType";
      return new TableRow({
        children: [
          cell(para(rowDef.label, { size: 16 }), { width: 1800 }),
          cell(para("", { size: 16 }), { width: 700 }),
          cell(para("", { size: 16 }), { width: 700 }),
          cell(para("", { size: 16 }), { width: 700 }),
          cell(para("", { size: 16 }), { width: 700 }),
          cell(para("N/A", { size: 16, center: true }), { width: 1400 }),
          cell(
            para(
              isType
                ? `${connectivity.hasWired ? "☑" : "☐"} Wired   ${connectivity.hasWireless ? "☑" : "☐"} Wireless`
                : connectivity.speed || "",
              { size: 16 }
            ),
            { width: 2800 }
          ),
        ],
      });
    }

    const entry = rows[rowDef.key] || {
      functional: false, forRepair: false, forUpgrade: false,
      forReplacement: false, assetTags: "", remarks: "",
    };

    return new TableRow({
      children: [
        cell(para(rowDef.label, { size: 16 }), { width: 1800 }),
        cell(para(checkMark(entry.functional), { size: 18, center: true }), { width: 700 }),
        cell(para(checkMark(entry.forRepair), { size: 18, center: true }), { width: 700 }),
        cell(para(checkMark(entry.forUpgrade), { size: 18, center: true }), { width: 700 }),
        cell(para(checkMark(entry.forReplacement), { size: 18, center: true }), { width: 700 }),
        cell(para(entry.assetTags || "", { size: 14, center: true }), { width: 1400 }),
        cell(para(entry.remarks || "", { size: 13 }), { width: 2800 }),
      ],
    });
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });

  // ── Document ─────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          // ── Header ────────────────────────────────────
          para("LICEO DE CAGAYAN UNIVERSITY", { bold: true, size: 28, center: true }),
          para("Rodolfo N. Pelaez Boulevard, Kauswagan,", { size: 16, center: true }),
          para("9000 Cagayan de Oro City, Philippines", { size: 16, center: true }),
          blankLine(),
          para("OFFICE OF THE VICE PRESIDENT FOR INFORMATION AND COMMUNICATION TECHNOLOGY", { bold: true, size: 16, center: true }),
          para("ICT – INFRASTRUCTURE OPERATIONS UNIT", { bold: true, size: 16, center: true }),
          para("SY 2025-2026 PREVENTIVE MAINTENANCE CHECKLIST", { bold: true, size: 22, center: true }),
          blankLine(),

          // ── Form fields ───────────────────────────────
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell(para(`College/Department: ${department}`, { size: 16 }), { noBorder: true, width: 4500 }),
                  cell(para(`Schedule: ${checkMark(schedule === "Weekly")} Weekly  ${checkMark(schedule === "Monthly")} Monthly  ${checkMark(schedule === "Semi-Annually")} Semi-Annually`, { size: 16 }), { noBorder: true }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para(`Building/Room/Office: ${building} ${room}`.trim(), { size: 16 }), { noBorder: true, width: 4500 }),
                  cell(para(`Campus: ${checkMark(campus === "Main")} Main  ${checkMark(campus === "RNP")} RNP  ${checkMark(campus === "Paseo")} Paseo`, { size: 16 }), { noBorder: true }),
                ],
              }),
            ],
          }),
          blankLine(),

          // ── Procedure ────────────────────────────────
          para("Procedure:", { bold: true, size: 18 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell(para(`${checkMark(procedures.inventoryManagement)} Inventory Management   ${checkMark(procedures.regularCleaning)} Regular Cleaning   ${checkMark(procedures.hardwareInspections)} Hardware Inspections`, { size: 16 }), { noBorder: true }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para(`${checkMark(procedures.dataBackup)} Data Back-up   ${checkMark(procedures.softwareUpdates)} Software Updates   ${checkMark(procedures.virusMalware)} Virus Malware Protection`, { size: 16 }), { noBorder: true }),
                ],
              }),
            ],
          }),
          para("Tick the appropriate box with (✓) mark for the current status of the computer system.", { size: 16 }),
          blankLine(),

          // ── Main table ───────────────────────────────
          mainTable,
          blankLine(),

          // ── Overall Remarks ──────────────────────────
          para(`Overall Remarks: ${overallRemarks}`, { size: 16 }),
          blankLine(),
          blankLine(),

          // ── Signatures ───────────────────────────────
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell(para(`User/In-charge: ${userName}`, { size: 16 }), { noBorder: true }),
                  cell(para(`Date: ${reportDate}`, { size: 16 }), { noBorder: true }),
                  cell(para("Signature: ___________", { size: 16 }), { noBorder: true }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para(`Conducted By: ${conductedBy}`, { size: 16 }), { noBorder: true }),
                  cell(para(`Date: ${reportDate}`, { size: 16 }), { noBorder: true }),
                  cell(para("Signature: ___________", { size: 16 }), { noBorder: true }),
                ],
              }),
            ],
          }),
          blankLine(),
          para("Recommended by:", { size: 16 }),
          blankLine(),
          para("Mr. Roy Emeterio L. Pabilona", { bold: true, size: 18 }),
          para("Head, ICT Infrastructure Operations", { size: 16 }),
          blankLine(),
          blankLine(),

          // ── Footer ───────────────────────────────────
          new Table({
            width: { size: 40, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell(para("Document Number", { bold: true, size: 14, center: true }), {
                    shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
                  }),
                  cell(para("Effectivity Date", { bold: true, size: 14, center: true }), {
                    shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
                  }),
                  cell(para("Revision Number", { bold: true, size: 14, center: true }), {
                    shading: { type: ShadingType.CLEAR, fill: "E0E0E0" },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para("LDCU-FORMS-VPICT-005", { size: 14, center: true })),
                  cell(para("August 1, 2025", { size: 14, center: true })),
                  cell(para("001", { size: 14, center: true })),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${fileName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
