import { jsPDF } from "jspdf";
import * as docx from "docx";
import PptxGenJS from "pptxgenjs";
import * as XLSX from "xlsx";
import { GeneratedDocument, DocumentFormat, DocumentSlide } from "../types/document";

/**
 * Sanitizes filename for filesystem saving
 */
export function sanitizeFilename(title: string, format: DocumentFormat): string {
  let clean = (title || "Generated_Document")
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "_");

  if (!clean) clean = "Generated_Document";

  const extMap: Record<DocumentFormat, string> = {
    pdf: ".pdf",
    docx: ".docx",
    pptx: ".pptx",
    xlsx: ".xlsx",
    csv: ".csv",
    md: ".md",
    txt: ".txt",
    json: ".json",
    html: ".html",
  };

  const ext = extMap[format] || ".pdf";
  if (!clean.toLowerCase().endsWith(ext)) {
    clean += ext;
  }
  return clean;
}

/**
 * Helper to trigger browser file download from Blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Main function to generate and download a document in its requested format
 */
export async function exportAndDownloadDocument(doc: GeneratedDocument): Promise<void> {
  const filename = sanitizeFilename(doc.title || "Document", doc.format);

  switch (doc.format) {
    case "pdf":
      await downloadPDF(doc, filename);
      break;
    case "docx":
      await downloadDOCX(doc, filename);
      break;
    case "pptx":
      await downloadPPTX(doc, filename);
      break;
    case "xlsx":
      downloadXLSX(doc, filename);
      break;
    case "csv":
      downloadCSV(doc, filename);
      break;
    case "md":
      downloadMarkdown(doc, filename);
      break;
    case "txt":
      downloadTXT(doc, filename);
      break;
    case "json":
      downloadJSON(doc, filename);
      break;
    case "html":
      downloadHTML(doc, filename);
      break;
    default:
      downloadPDF(doc, filename);
      break;
  }
}

/**
 * PDF Generator using jsPDF with multi-page styling, headers, footers & tables
 */
async function downloadPDF(doc: GeneratedDocument, filename: string): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Primary Theme Accent Color (Cyan/Indigo)
  const primaryColor = [14, 116, 144]; // cyan-700
  const headerBgColor = [241, 245, 249]; // slate-100

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 15) {
      pdf.addPage();
      y = margin + 10;
      addHeaderFooter();
    }
  };

  const addHeaderFooter = () => {
    // Header line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(margin, margin - 5, pageWidth - margin, margin - 5);

    // Header text
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(doc.title.toUpperCase().slice(0, 40), margin, margin - 7);
    pdf.text("A-NOVA AI DOCUMENT", pageWidth - margin, margin - 7, { align: "right" });

    // Footer
    const totalPages = (pdf.internal as any).getNumberOfPages();
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Page ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  };

  // --- Title Banner ---
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(margin, y, contentWidth, 32, 3, 3, "F");
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(margin, y, contentWidth, 32, 3, 3, "S");

  // Accent left bar
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(margin, y, 3, 32, "F");

  // Title Text
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42); // slate-900
  const titleLines = pdf.splitTextToSize(doc.title, contentWidth - 12);
  pdf.text(titleLines[0] || doc.title, margin + 8, y + 12);

  // Subtitle / Date / Author
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  const metaText = `${doc.subtitle || "AI Generated Document"} • ${doc.date || new Date().toLocaleDateString()}`;
  pdf.text(metaText, margin + 8, y + 22);

  y += 40;
  addHeaderFooter();

  // --- Executive Summary Box ---
  if (doc.summary) {
    checkPageBreak(25);
    pdf.setFillColor(240, 249, 255); // sky-50
    pdf.setDrawColor(186, 230, 253);
    const summaryLines = pdf.splitTextToSize(`Executive Summary: ${doc.summary}`, contentWidth - 10);
    const boxHeight = Math.max(16, summaryLines.length * 5 + 6);
    pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9.5);
    pdf.setTextColor(12, 74, 110);
    pdf.text(summaryLines, margin + 5, y + 7);
    y += boxHeight + 8;
  }

  // --- Render Sections ---
  if (doc.sections && doc.sections.length > 0) {
    for (const sec of doc.sections) {
      if (sec.title) {
        checkPageBreak(12);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(sec.level === 2 ? 12 : 14);
        pdf.setTextColor(15, 23, 42);
        pdf.text(sec.title, margin, y);
        y += 2;

        // Underline
        pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        pdf.setLineWidth(0.6);
        pdf.line(margin, y + 1, margin + Math.min(contentWidth, sec.title.length * 3 + 10), y + 1);
        y += 7;
      }

      // Paragraph
      if (sec.type === "paragraph" && sec.content) {
        checkPageBreak(10);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(51, 65, 85);
        const lines = pdf.splitTextToSize(sec.content, contentWidth);
        for (const line of lines) {
          checkPageBreak(6);
          pdf.text(line, margin, y);
          y += 5.2;
        }
        y += 3;
      }

      // Bullets
      if (sec.type === "bullets" && sec.bullets) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(51, 65, 85);
        for (const item of sec.bullets) {
          checkPageBreak(7);
          pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          pdf.circle(margin + 2, y - 1.2, 1, "F");

          const bulletLines = pdf.splitTextToSize(item, contentWidth - 8);
          pdf.text(bulletLines, margin + 6, y);
          y += bulletLines.length * 5 + 1.5;
        }
        y += 3;
      }

      // Metrics Grid
      if (sec.type === "metrics" && sec.metrics) {
        checkPageBreak(25);
        const cardCount = sec.metrics.length;
        const cardWidth = Math.floor((contentWidth - (cardCount - 1) * 4) / cardCount);

        let x = margin;
        for (const m of sec.metrics) {
          pdf.setFillColor(248, 250, 252);
          pdf.setDrawColor(203, 213, 225);
          pdf.roundedRect(x, y, cardWidth, 18, 2, 2, "FD");

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(100, 116, 139);
          pdf.text(m.label.toUpperCase().slice(0, 22), x + 4, y + 5);

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.setTextColor(15, 23, 42);
          pdf.text(String(m.value), x + 4, y + 13);

          x += cardWidth + 4;
        }
        y += 24;
      }

      // Table
      if (sec.type === "table" && sec.tableHeaders && sec.tableRows) {
        checkPageBreak(20);
        const headers = sec.tableHeaders;
        const rows = sec.tableRows;
        const colWidth = contentWidth / headers.length;

        // Header Row
        pdf.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
        pdf.rect(margin, y, contentWidth, 8, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 41, 59);

        headers.forEach((h, idx) => {
          pdf.text(String(h).slice(0, 18), margin + idx * colWidth + 2, y + 5.5);
        });
        y += 8;

        // Data Rows
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(51, 65, 85);

        rows.forEach((row, rowIndex) => {
          checkPageBreak(7);
          if (rowIndex % 2 === 1) {
            pdf.setFillColor(248, 250, 252);
            pdf.rect(margin, y, contentWidth, 6.5, "F");
          }

          row.forEach((cell, colIndex) => {
            pdf.text(String(cell ?? "").slice(0, 22), margin + colIndex * colWidth + 2, y + 4.5);
          });
          y += 6.5;
        });

        // Bottom border
        pdf.setDrawColor(203, 213, 225);
        pdf.line(margin, y, margin + contentWidth, y);
        y += 6;
      }
    }
  }

  const pdfBlob = pdf.output("blob");
  downloadBlob(pdfBlob, filename);
}

/**
 * Word DOCX Generator using docx package
 */
async function downloadDOCX(doc: GeneratedDocument, filename: string): Promise<void> {
  const docxSections: any[] = [];

  // Title Paragraph
  docxSections.push(
    new docx.Paragraph({
      text: doc.title,
      heading: docx.HeadingLevel.TITLE,
      spacing: { after: 120 },
    })
  );

  // Subtitle / Date
  if (doc.subtitle || doc.date) {
    docxSections.push(
      new docx.Paragraph({
        text: `${doc.subtitle || "AI Document"} | ${doc.date || new Date().toLocaleDateString()}`,
        spacing: { after: 240 },
        style: "Subtitle",
      })
    );
  }

  // Summary
  if (doc.summary) {
    docxSections.push(
      new docx.Paragraph({
        text: `Executive Summary: ${doc.summary}`,
        spacing: { after: 240 },
      })
    );
  }

  // Sections
  if (doc.sections && doc.sections.length > 0) {
    for (const sec of doc.sections) {
      if (sec.title) {
        docxSections.push(
          new docx.Paragraph({
            text: sec.title,
            heading: sec.level === 2 ? docx.HeadingLevel.HEADING_2 : docx.HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 },
          })
        );
      }

      if (sec.type === "paragraph" && sec.content) {
        docxSections.push(
          new docx.Paragraph({
            text: sec.content,
            spacing: { after: 120 },
          })
        );
      }

      if (sec.type === "bullets" && sec.bullets) {
        for (const item of sec.bullets) {
          docxSections.push(
            new docx.Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 60 },
            })
          );
        }
      }

      if (sec.type === "table" && sec.tableHeaders && sec.tableRows) {
        const tableHeaderRow = new docx.TableRow({
          children: sec.tableHeaders.map(
            (h) =>
              new docx.TableCell({
                children: [
                  new docx.Paragraph({
                    children: [new docx.TextRun({ text: String(h), bold: true })],
                  }),
                ],
                shading: { fill: "F1F5F9" },
              })
          ),
        });

        const tableDataRows = sec.tableRows.map(
          (row) =>
            new docx.TableRow({
              children: row.map(
                (cell) =>
                  new docx.TableCell({
                    children: [new docx.Paragraph({ text: String(cell ?? "") })],
                  })
              ),
            })
        );

        docxSections.push(
          new docx.Table({
            rows: [tableHeaderRow, ...tableDataRows],
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
          })
        );
        docxSections.push(new docx.Paragraph({ text: "", spacing: { after: 180 } }));
      }
    }
  }

  const wordDoc = new docx.Document({
    sections: [
      {
        properties: {},
        children: docxSections,
      },
    ],
  });

  const blob = await docx.Packer.toBlob(wordDoc);
  downloadBlob(blob, filename);
}

/**
 * PowerPoint PPTX Generator using pptxgenjs package
 */
async function downloadPPTX(doc: GeneratedDocument, filename: string): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = doc.author || "A-NOVA AI";
  pptx.title = doc.title;

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "0F172A" }; // dark slate background

  titleSlide.addText(doc.title, {
    x: 0.8,
    y: 2.2,
    w: 11.0,
    h: 1.5,
    fontSize: 36,
    bold: true,
    color: "38BDF8", // sky-400
    fontFace: "Arial",
  });

  if (doc.subtitle || doc.summary) {
    titleSlide.addText(doc.subtitle || doc.summary || "", {
      x: 0.8,
      y: 3.8,
      w: 11.0,
      h: 1.0,
      fontSize: 18,
      color: "94A3B8",
      fontFace: "Arial",
    });
  }

  // Slide Deck from doc.slides OR derived sections
  const slidesToRender: DocumentSlide[] =
    doc.slides && doc.slides.length > 0
      ? doc.slides
      : (doc.sections || []).map((sec, idx) => ({
          id: `slide_${idx}`,
          slideNumber: idx + 1,
          title: sec.title || `Section ${idx + 1}`,
          bulletPoints: sec.bullets || (sec.content ? [sec.content] : []),
        }));

  for (const s of slidesToRender) {
    const slide = pptx.addSlide();
    slide.background = { color: "F8FAFC" };

    // Header Title
    slide.addText(s.title, {
      x: 0.8,
      y: 0.6,
      w: 11.0,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: "0F172A",
      fontFace: "Arial",
    });

    // Bullets
    if (s.bulletPoints && s.bulletPoints.length > 0) {
      const items = s.bulletPoints.map((bp) => ({
        text: bp,
        options: { fontSize: 16, color: "334155", bullet: true, spaceAfter: 12 },
      }));

      slide.addText(items as any, {
        x: 0.8,
        y: 1.6,
        w: 11.0,
        h: 4.5,
        fontFace: "Arial",
      });
    }

    // Key takeaway callout box
    if (s.keyTakeaway) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.8,
        y: 5.8,
        w: 11.0,
        h: 0.9,
        fill: { color: "E0F2FE" },
        line: { color: "0284C7", width: 1 },
      });

      slide.addText(`Key Takeaway: ${s.keyTakeaway}`, {
        x: 1.0,
        y: 5.9,
        w: 10.6,
        h: 0.7,
        fontSize: 13,
        color: "0369A1",
        bold: true,
      });
    }
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  downloadBlob(blob, filename);
}

/**
 * Excel XLSX Generator using SheetJS (xlsx)
 */
function downloadXLSX(doc: GeneratedDocument, filename: string): void {
  const wb = XLSX.utils.book_new();

  if (doc.sheets && doc.sheets.length > 0) {
    for (const sheet of doc.sheets) {
      const wsData = [
        sheet.columns.map((c) => c.label),
        ...sheet.rows.map((row) => sheet.columns.map((c) => row[c.key])),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    }
  } else {
    // Generate sheet from document sections
    const rows: any[][] = [];
    rows.push([doc.title.toUpperCase()]);
    rows.push([doc.subtitle || "AI Generated Spreadsheet"]);
    rows.push([]);

    for (const sec of doc.sections || []) {
      if (sec.title) {
        rows.push([sec.title]);
      }
      if (sec.tableHeaders && sec.tableRows) {
        rows.push(sec.tableHeaders);
        sec.tableRows.forEach((r) => rows.push(r));
        rows.push([]);
      } else if (sec.content) {
        rows.push([sec.content]);
      } else if (sec.bullets) {
        sec.bullets.forEach((b) => rows.push([`• ${b}`]));
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  downloadBlob(blob, filename);
}

/**
 * CSV Generator
 */
function downloadCSV(doc: GeneratedDocument, filename: string): void {
  let csvContent = "";

  if (doc.sheets && doc.sheets.length > 0) {
    const s = doc.sheets[0];
    csvContent += s.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",") + "\n";
    s.rows.forEach((row) => {
      csvContent +=
        s.columns.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
    });
  } else {
    // Table section or raw markdown table fallback
    let tableFound = false;
    for (const sec of doc.sections || []) {
      if (sec.tableHeaders && sec.tableRows) {
        tableFound = true;
        csvContent += sec.tableHeaders.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";
        sec.tableRows.forEach((row) => {
          csvContent += row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",") + "\n";
        });
      }
    }

    if (!tableFound) {
      csvContent += `Title,Value\n`;
      csvContent += `"${doc.title.replace(/"/g, '""')}","${(doc.summary || "").replace(/"/g, '""')}"\n`;
      for (const sec of doc.sections || []) {
        if (sec.content) {
          csvContent += `"${(sec.title || "Content").replace(/"/g, '""')}","${sec.content.replace(/"/g, '""')}"\n`;
        }
      }
    }
  }

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Markdown Generator
 */
function downloadMarkdown(doc: GeneratedDocument, filename: string): void {
  let md = `# ${doc.title}\n\n`;
  if (doc.subtitle) md += `*${doc.subtitle}*\n\n`;
  if (doc.date) md += `**Date:** ${doc.date}\n\n`;
  if (doc.summary) md += `> **Executive Summary:** ${doc.summary}\n\n`;

  for (const sec of doc.sections || []) {
    if (sec.title) md += `## ${sec.title}\n\n`;
    if (sec.content) md += `${sec.content}\n\n`;
    if (sec.bullets) {
      sec.bullets.forEach((b) => (md += `- ${b}\n`));
      md += "\n";
    }
    if (sec.tableHeaders && sec.tableRows) {
      md += `| ${sec.tableHeaders.join(" | ")} |\n`;
      md += `| ${sec.tableHeaders.map(() => "---").join(" | ")} |\n`;
      sec.tableRows.forEach((r) => {
        md += `| ${r.join(" | ")} |\n`;
      });
      md += "\n";
    }
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * Plain Text Generator
 */
function downloadTXT(doc: GeneratedDocument, filename: string): void {
  let txt = `${doc.title.toUpperCase()}\n${"=".repeat(doc.title.length)}\n\n`;
  if (doc.subtitle) txt += `Subtitle: ${doc.subtitle}\n`;
  if (doc.date) txt += `Date: ${doc.date}\n\n`;
  if (doc.summary) txt += `SUMMARY:\n${doc.summary}\n\n`;

  for (const sec of doc.sections || []) {
    if (sec.title) txt += `\n[ ${sec.title.toUpperCase()} ]\n${"-".repeat(sec.title.length + 4)}\n`;
    if (sec.content) txt += `${sec.content}\n`;
    if (sec.bullets) {
      sec.bullets.forEach((b) => (txt += `* ${b}\n`));
    }
    if (sec.tableHeaders && sec.tableRows) {
      txt += `${sec.tableHeaders.join("\t|\t")}\n`;
      sec.tableRows.forEach((r) => (txt += `${r.join("\t|\t")}\n`));
    }
  }

  const blob = new Blob([txt], { type: "text/plain;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * JSON Data Generator
 */
function downloadJSON(doc: GeneratedDocument, filename: string): void {
  const jsonOutput = doc.jsonData || {
    title: doc.title,
    subtitle: doc.subtitle,
    summary: doc.summary,
    date: doc.date || new Date().toISOString(),
    sections: doc.sections,
    slides: doc.slides,
    sheets: doc.sheets,
  };

  const str = JSON.stringify(jsonOutput, null, 2);
  const blob = new Blob([str], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, filename);
}

/**
 * HTML Document Generator with embedded styling
 */
function downloadHTML(doc: GeneratedDocument, filename: string): void {
  let bodyHtml = `<header><h1>${doc.title}</h1>`;
  if (doc.subtitle) bodyHtml += `<p class="subtitle">${doc.subtitle}</p>`;
  if (doc.date) bodyHtml += `<p class="meta">Generated: ${doc.date}</p>`;
  bodyHtml += `</header>`;

  if (doc.summary) {
    bodyHtml += `<div class="summary"><strong>Executive Summary:</strong> ${doc.summary}</div>`;
  }

  for (const sec of doc.sections || []) {
    bodyHtml += `<section>`;
    if (sec.title) bodyHtml += `<h2>${sec.title}</h2>`;
    if (sec.content) bodyHtml += `<p>${sec.content}</p>`;
    if (sec.bullets) {
      bodyHtml += `<ul>${sec.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`;
    }
    if (sec.tableHeaders && sec.tableRows) {
      bodyHtml += `<table><thead><tr>${sec.tableHeaders.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>`;
      sec.tableRows.forEach((r) => {
        bodyHtml += `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`;
      });
      bodyHtml += `</tbody></table>`;
    }
    bodyHtml += `</section>`;
  }

  const htmlStr = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${doc.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 0 20px; background: #f8fafc; }
    header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
    h1 { color: #0f172a; margin-bottom: 6px; }
    .subtitle { color: #0284c7; font-size: 1.1rem; margin-top: 0; }
    .meta { color: #64748b; font-size: 0.85rem; }
    .summary { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin-bottom: 24px; color: #0369a1; }
    section { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #e2e8f0; }
    h2 { color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;

  const blob = new Blob([htmlStr], { type: "text/html;charset=utf-8;" });
  downloadBlob(blob, filename);
}
