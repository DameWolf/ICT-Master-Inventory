/**
 * pmChecklistPDF.js
 * ─────────────────────────────────────────────────────────
 * Renders the PM Checklist HTML preview to a full-bleed PDF
 * using html2canvas + jsPDF.
 *
 * The content always fills the FULL usable page width.
 * Supports Letter (8.5×11 in) and A4 (210×297 mm).
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const PAPER_SIZES = {
  letter: { w: 215.9, h: 279.4, label: "Letter (8.5×11 in)" },
  a4:     { w: 210.0, h: 297.0, label: "A4 (210×297 mm)"    },
};

/**
 * @param {string} elementId  - ID of the checklist preview container
 * @param {string} fileName   - Output file name (without .pdf)
 * @param {string} paperSize  - "letter" | "a4"
 */
export async function downloadPDF(elementId, fileName = "PM_Checklist", paperSize = "letter") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Preview element not found");

  const size   = PAPER_SIZES[paperSize] || PAPER_SIZES.letter;
  const margin = 8;                     // mm — equal on all sides
  const usableW = size.w - margin * 2;  // mm available horizontally
  const usableH = size.h - margin * 2;  // mm available vertically

  // ── Capture at 3× for crisp print quality ──────────────
  const canvas = await html2canvas(element, {
    scale:           3,
    useCORS:         true,
    allowTaint:      true,
    backgroundColor: "#ffffff",
    logging:         false,
    width:           element.scrollWidth,
    height:          element.scrollHeight,
    windowWidth:     element.scrollWidth,
    windowHeight:    element.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgW    = canvas.width;    // canvas px
  const imgH    = canvas.height;   // canvas px
  const aspect  = imgH / imgW;     // height-to-width ratio

  // ── Always fill full usable width ──────────────────────
  let printW = usableW;
  let printH = usableW * aspect;

  // If taller than one page, scale down to fit height too
  if (printH > usableH) {
    printH = usableH;
    printW = usableH / aspect;
  }

  // Centre horizontally if narrower than usable area
  const xOff = margin + (usableW - printW) / 2;
  const yOff = margin;

  // ── Build PDF ───────────────────────────────────────────
  const pdf = new jsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      [size.w, size.h],
  });

  pdf.addImage(imgData, "PNG", xOff, yOff, printW, printH);
  pdf.save(`${fileName}.pdf`);
}
