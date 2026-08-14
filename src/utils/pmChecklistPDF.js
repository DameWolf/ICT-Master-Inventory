/**
 * pmChecklistPDF.js
 * ─────────────────────────────────────────────────────────
 * Renders the exact PM Checklist HTML preview to a PDF using
 * html2canvas + jsPDF.
 *
 * Guaranteed 100% full-width printing without horizontal squeezing.
 * Automatically spans multiple pages if content height exceeds one page.
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
  const margin = 8;                     // mm margin on left/right/top/bottom
  const usableW = size.w - margin * 2;  // full printable width in mm
  const usableH = size.h - margin * 2;  // full printable height in mm per page

  // ── Capture canvas at high resolution ──────────────────
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
  const imgW    = canvas.width;
  const imgH    = canvas.height;
  const aspect  = imgH / imgW;

  // ── Always stretch to fill usable page width (never squeeze) ──
  const printW = usableW;
  const printH = usableW * aspect; // total height in mm

  const pdf = new jsPDF({
    orientation: "portrait",
    unit:        "mm",
    format:      [size.w, size.h],
  });

  let heightLeft = printH;
  let position   = margin;

  // Render Page 1
  pdf.addImage(imgData, "PNG", margin, position, printW, printH);
  heightLeft -= usableH;

  // If content is longer than 1 page, append additional pages seamlessly
  while (heightLeft > 0) {
    position = margin - (printH - heightLeft);
    pdf.addPage([size.w, size.h], "portrait");
    pdf.addImage(imgData, "PNG", margin, position, printW, printH);
    heightLeft -= usableH;
  }

  pdf.save(`${fileName}.pdf`);
}
