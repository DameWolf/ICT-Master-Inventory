/**
 * pmChecklistWord.js
 * ─────────────────────────────────────────────────────────
 * Generates a Word (.docx) file matching the exact layout,
 * proportions, and formatting of the LDCU PM Checklist preview.
 */
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, BorderStyle,
  VerticalAlign, ShadingType,
} from "docx";
import { TEMPLATE_ROWS } from "./pmChecklistData";

// ── Border definitions ───────────────────────────────────
const THIN = { style: BorderStyle.SINGLE, size: 6, color: "000000" };
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

// ── Helper to build table cells with DXA column widths ───
function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    columnSpan: opts.span || 1,
    shading: opts.shading || undefined,
    borders: {
      top: opts.noBorder ? NONE : THIN,
      bottom: opts.noBorder ? NONE : THIN,
      left: opts.noBorder ? NONE : THIN,
      right: opts.noBorder ? NONE : THIN,
    },
  });
}

// ── Helper to build paragraphs with TextRuns ────────────
function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: opts.before || 20, after: opts.after || 20 },
    children: [
      new TextRun({
        text: String(text || ""),
        bold: opts.bold || false,
        italic: opts.italic || false,
        size: opts.size || 16, // 16 = 8pt font
        font: "Arial",
        color: opts.color || "000000",
      }),
    ],
  });
}

function checkMark(checked) {
  return checked ? "✓" : "";
}

function checkSquare(checked) {
  return checked ? "☑" : "☐";
}

function blankLine(height = 16) {
  return new Paragraph({ children: [new TextRun({ text: "", size: height })] });
}

// ── Main Export ──────────────────────────────────────────
export async function downloadWord(data, fileName = "PM_Checklist") {
  const {
    department, campus, building, room, schedule,
    procedures, rows, connectivity, overallRemarks,
    userName, conductedBy, reportDate,
  } = data;

  // Exact column width distribution (Total = 9360 DXA ~ 6.5 inches printable width)
  const COL_W = {
    comp:    2060, // 22%
    func:     655, // 7%
    repair:   655, // 7%
    upg:      655, // 7%
    repl:     655, // 7%
    tag:     1500, // 16%
    remarks: 3180, // 34%
  };

  // ── Table Header ───────────────────────────────────────
  const headerRow1 = new TableRow({
    children: [
      cell(para("Component of\nComputer System", { bold: true, size: 15, center: true }), {
        width: COL_W.comp,
        shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
      }),
      cell(para("Status", { bold: true, size: 15, center: true }), {
        width: COL_W.func + COL_W.repair + COL_W.upg + COL_W.repl,
        span: 4,
        shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
      }),
      cell(para("Capital Asset\nInventory Tag", { bold: true, size: 15, center: true }), {
        width: COL_W.tag,
        shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
      }),
      cell(para("Remarks", { bold: true, size: 15, center: true }), {
        width: COL_W.remarks,
        shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
      }),
    ],
    tableHeader: true,
  });

  const headerRow2 = new TableRow({
    children: [
      cell(para("", { size: 1 }), { width: COL_W.comp, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("Functional", { bold: true, size: 13, center: true }), { width: COL_W.func, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("For Repair", { bold: true, size: 13, center: true }), { width: COL_W.repair, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("For Upgrade", { bold: true, size: 13, center: true }), { width: COL_W.upg, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("For Replace-ment", { bold: true, size: 13, center: true }), { width: COL_W.repl, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("", { size: 1 }), { width: COL_W.tag, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
      cell(para("", { size: 1 }), { width: COL_W.remarks, shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
    ],
    tableHeader: true,
  });

  // ── Table Rows ─────────────────────────────────────────
  const dataRows = TEMPLATE_ROWS.map((rowDef) => {
    if (rowDef.isConnectivity) {
      const isType = rowDef.key === "connectivityType";
      return new TableRow({
        children: [
          cell(para(rowDef.label, { size: 15, bold: true }), { width: COL_W.comp }),
          cell(para("", { size: 14 }), { width: COL_W.func }),
          cell(para("", { size: 14 }), { width: COL_W.repair }),
          cell(para("", { size: 14 }), { width: COL_W.upg }),
          cell(para("", { size: 14 }), { width: COL_W.repl }),
          cell(para("N/A", { size: 14, italic: true, center: true }), { width: COL_W.tag }),
          cell(
            para(
              isType
                ? `${checkSquare(connectivity.hasWired)} Wired     ${checkSquare(connectivity.hasWireless)} Wireless`
                : connectivity.speed || "",
              { size: 14 }
            ),
            { width: COL_W.remarks }
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
        cell(para(rowDef.label, { size: 15, bold: true }), { width: COL_W.comp }),
        cell(para(checkMark(entry.functional), { size: 18, bold: true, center: true }), { width: COL_W.func }),
        cell(para(checkMark(entry.forRepair), { size: 18, bold: true, center: true }), { width: COL_W.repair }),
        cell(para(checkMark(entry.forUpgrade), { size: 18, bold: true, center: true }), { width: COL_W.upg }),
        cell(para(checkMark(entry.forReplacement), { size: 18, bold: true, center: true }), { width: COL_W.repl }),
        cell(para(entry.assetTags || "", { size: 13, center: true }), { width: COL_W.tag }),
        cell(para(entry.remarks || "", { size: 13 }), { width: COL_W.remarks }),
      ],
    });
  });

  const mainTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [headerRow1, headerRow2, ...dataRows],
  });

  // ── Build Full Word Document ───────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 0.5 in margins
          },
        },
        children: [
          // Institution Header
          para("LICEO DE CAGAYAN UNIVERSITY", { bold: true, size: 28, center: true, color: "800020" }),
          para("Rodolfo N. Pelaez Boulevard, Kauswagan, 9000 Cagayan de Oro City, Philippines", { size: 15, center: true, color: "333333" }),
          blankLine(8),

          para("OFFICE OF THE VICE PRESIDENT FOR INFORMATION AND COMMUNICATION TECHNOLOGY", { bold: true, size: 15, center: true }),
          para("ICT – INFRASTRUCTURE OPERATIONS UNIT", { bold: true, size: 15, center: true }),
          para("SY 2025-2026 PREVENTIVE MAINTENANCE CHECKLIST", { bold: true, size: 22, center: true }),
          blankLine(10),

          // Metadata Fields Table
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  cell(para(`College/Department: ${department}`, { bold: true, size: 16 }), { noBorder: true, width: 5000 }),
                  cell(
                    para(
                      `Schedule: ${checkSquare(schedule === "Weekly")} Weekly  ${checkSquare(schedule === "Monthly")} Monthly  ${checkSquare(schedule === "Semi-Annually")} Semi-Annually`,
                      { size: 15 }
                    ),
                    { noBorder: true, width: 4360 }
                  ),
                ],
              }),
              new TableRow({
                children: [
                  cell(para(`Building/Room/Office: ${[building, room].filter(Boolean).join(" / ")}`, { bold: true, size: 16 }), { noBorder: true, width: 5000 }),
                  cell(
                    para(
                      `Campus: ${checkSquare(campus === "Main")} Main  ${checkSquare(campus === "RNP")} RNP  ${checkSquare(campus === "Paseo")} Paseo`,
                      { size: 15 }
                    ),
                    { noBorder: true, width: 4360 }
                  ),
                ],
              }),
            ],
          }),
          blankLine(10),

          // Procedures
          para("Procedure:", { bold: true, size: 16 }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  cell(
                    para(
                      `${checkSquare(procedures.inventoryManagement)} Inventory Management     ${checkSquare(procedures.regularCleaning)} Regular Cleaning     ${checkSquare(procedures.hardwareInspections)} Hardware Inspections`,
                      { size: 15 }
                    ),
                    { noBorder: true }
                  ),
                ],
              }),
              new TableRow({
                children: [
                  cell(
                    para(
                      `${checkSquare(procedures.dataBackup)} Data Back-up     ${checkSquare(procedures.softwareUpdates)} Software Updates     ${checkSquare(procedures.virusMalware)} Virus Malware Protection`,
                      { size: 15 }
                    ),
                    { noBorder: true }
                  ),
                ],
              }),
            ],
          }),
          blankLine(6),

          para("Tick the appropriate box with (✓) mark for the current status of the computer system.", { italic: true, size: 15 }),
          blankLine(8),

          // Main Table
          mainTable,
          blankLine(10),

          // Overall Remarks
          para("Overall Remarks:", { bold: true, size: 16 }),
          para(overallRemarks || "All devices are in good working condition.", { size: 15 }),
          blankLine(14),

          // Signatures
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  cell(para(`User/In-charge: ${userName}`, { bold: true, size: 15 }), { noBorder: true, width: 3800 }),
                  cell(para(`Date: ${reportDate}`, { size: 15 }), { noBorder: true, width: 2500 }),
                  cell(para("Signature: _________________", { size: 15 }), { noBorder: true, width: 3060 }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para(`Conducted By: ${conductedBy}`, { bold: true, size: 15 }), { noBorder: true, width: 3800 }),
                  cell(para(`Date: ${reportDate}`, { size: 15 }), { noBorder: true, width: 2500 }),
                  cell(para("Signature: _________________", { size: 15 }), { noBorder: true, width: 3060 }),
                ],
              }),
            ],
          }),
          blankLine(10),

          para("Recommended by:", { size: 15 }),
          para("Mr. Roy Emeterio L. Pabilona", { bold: true, size: 18 }),
          para("Head, ICT Infrastructure Operations", { size: 15 }),
          blankLine(14),

          // Footer Box
          new Table({
            width: { size: 4200, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [
                  cell(para("Document Number", { bold: true, size: 13, center: true }), { shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
                  cell(para("Effectivity Date", { bold: true, size: 13, center: true }), { shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
                  cell(para("Revision Number", { bold: true, size: 13, center: true }), { shading: { type: ShadingType.CLEAR, fill: "F0F0F0" } }),
                ],
              }),
              new TableRow({
                children: [
                  cell(para("LDCU-FORMS-VPICT-005", { size: 13, center: true })),
                  cell(para("August 1, 2025", { size: 13, center: true })),
                  cell(para("001", { size: 13, center: true })),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
