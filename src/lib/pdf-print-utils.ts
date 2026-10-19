'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Triggers a clean, high-fidelity browser print for a specific DOM element.
 * Hides sidebars, headers, action buttons, and scrollbars during printing.
 */
export function printElement(elementId: string, pageTitle: string = 'Document'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Print Error: Element with id "${elementId}" not found.`);
    window.print();
    return;
  }

  // Create an isolated printable iframe for clean, undisturbed printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Collect active CSS links and styles from the main document (including Tailwind & KaTeX styles)
  const styles: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    styles.push(node.outerHTML);
  });

  const printSpecificStyles = `
    <style>
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 15mm 15mm;
      }
      body {
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print, button, input[type="button"], input[type="submit"] {
        display: none !important;
      }
      .page-break {
        page-break-before: always !important;
      }
      .avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      /* Clean up dark mode classes for pristine paper output */
      .bg-slate-900, .bg-slate-950, .bg-slate-900\\/60, .bg-slate-950\\/70, .bg-\\[\\#070b14\\] {
        background-color: #ffffff !important;
        color: #0f172a !important;
      }
      .border-slate-800, .border-slate-700, .border-slate-800\\/80 {
        border-color: #cbd5e1 !important;
      }
      .text-white, .text-slate-100, .text-slate-200 {
        color: #0f172a !important;
      }
      .text-slate-400, .text-slate-500 {
        color: #475569 !important;
      }
      .text-indigo-400, .text-indigo-300 {
        color: #4338ca !important;
      }
      .text-teal-400, .text-teal-300 {
        color: #0f766e !important;
      }
      .text-amber-400, .text-amber-300 {
        color: #b45309 !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      th, td {
        border: 1px solid #cbd5e1 !important;
      }
    </style>
  `;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${pageTitle}</title>
        ${styles.join('\n')}
        ${printSpecificStyles}
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  // Wait for images and fonts to render before invoking print dialog
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 400);
}

/**
 * Direct PDF Download using html2canvas & jsPDF.
 * Renders the element into a high-res canvas and stitches pages into an A4 PDF document.
 */
export async function downloadPdfFromElement(
  elementId: string,
  fileName: string = 'document.pdf',
  onProgress?: (isGenerating: boolean) => void
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`PDF Error: Element with id "${elementId}" not found.`);
    return;
  }

  try {
    if (onProgress) onProgress(true);

    const canvas = await html2canvas(element, {
      scale: 2, // High resolution crisp text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgWidth = 210; // A4 size in mm
    const pageHeight = 297; // A4 size in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    const imgData = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    // Fallback to browser print if canvas generation fails
    printElement(elementId, fileName);
  } finally {
    if (onProgress) onProgress(false);
  }
}
