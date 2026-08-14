/**
 * pmChecklistPDF.js
 * ─────────────────────────────────────────────────────────
 * Renders the PM Checklist preview div to a PDF using
 * html2canvas + jsPDF.
 */
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Takes the ID of the HTML preview element and downloads it as a PDF.
 * @param {string} elementId - ID of the checklist preview container
 * @param {string} fileName  - Output file name (without extension)
 */
export async function downloadPDF(elementId, fileName = "PM_Checklist") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Preview element not found");

  // Temporarily expand for full capture
  const originalOverflow = element.style.overflow;
  element.style.overflow = "visible";

  try {
    const canvas = await html2canvas(element, {
      scale: 2,           // 2x resolution for crisp print quality
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    element.style.overflow = originalOverflow;

    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({
      orientation: "portrait",
      unit:        "mm",
      format:      "a4",
    });

    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const margin = 8; // mm

    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    const imgW = canvas.width;
    const imgH = canvas.height;

    // Fit the image proportionally on the A4 page
    const ratio   = Math.min(usableW / (imgW / 3.7795), usableH / (imgH / 3.7795));
    const finalW  = (imgW / 3.7795) * ratio;
    const finalH  = (imgH / 3.7795) * ratio;

    pdf.addImage(imgData, "PNG", margin, margin, finalW, finalH);
    pdf.save(`${fileName}.pdf`);
  } catch (err) {
    element.style.overflow = originalOverflow;
    throw err;
  }
}
