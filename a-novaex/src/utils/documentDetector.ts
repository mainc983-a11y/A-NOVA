import { GeneratedDocument, DocumentFormat, DocumentSection, DocumentSlide, SpreadsheetSheet } from "../types/document";

/**
 * Detects if a user prompt explicitly requests a specific document format to be created, generated, converted, or exported.
 */
export function detectDocumentFormatRequest(promptText: string): { isDocumentRequest: boolean; format: DocumentFormat; title: string } {
  if (!promptText) return { isDocumentRequest: false, format: "pdf", title: "Document" };

  const text = promptText.trim().toLowerCase();

  // 1. Check for general capability questions ("can you make pdfs?", "do you create excel files?")
  const capabilityQuestionRegex = /^(can|could|would)\s+(you|anova|a-nova)\s+(make|create|generate|export|build|convert|support)\s+(pdf|pdfs|docx|word|pptx|ppt|excel|xlsx|csv|documents|files)\??$/i;

  if (capabilityQuestionRegex.test(text)) {
    return { isDocumentRequest: false, format: "pdf", title: "Document" };
  }

  // 2. Check for informational / question prompts starting with question words
  // e.g. "What is a PDF?", "Why PDF then?", "How does docx work?", "Explain excel"
  const questionStartRegex = /^(what|why|how|when|where|who|which|is|are|does|do|explain|tell me|tell us|meaning|difference)\b/i;

  if (questionStartRegex.test(text)) {
    // Only allow if there's an explicit command phrase like "can you create a pdf for..." or "how do I convert this to pdf..." with explicit action
    const hasExplicitCreateCommand = /\b(create|generate|make|export|convert|download|save|build|produce)\s+(a|an|me|us|the|this)?\s*(pdf|docx|word|pptx|powerpoint|excel|xlsx|csv|txt|markdown|document|file)\b/i.test(text);
    if (!hasExplicitCreateCommand) {
      return { isDocumentRequest: false, format: "pdf", title: "Document" };
    }
  }

  // 3. Must have an explicit action verb indicating file creation / export / conversion
  const actionVerbsRegex = /\b(create|generate|make|build|export|convert|download|produce|save as|output as|draw up|prepare|format as)\b/i;

  if (!actionVerbsRegex.test(text)) {
    return { isDocumentRequest: false, format: "pdf", title: "Document" };
  }

  // 4. Format keyword patterns
  const formatPatterns: { format: DocumentFormat; regex: RegExp }[] = [
    { format: "pdf", regex: /\b(pdf|pdf report|pdf document)\b/i },
    { format: "docx", regex: /\b(word|docx|word doc|word document|doc file|microsoft word)\b/i },
    { format: "pptx", regex: /\b(powerpoint|pptx|ppt|presentation|slide deck|slides)\b/i },
    { format: "xlsx", regex: /\b(excel|xlsx|xls|spreadsheet|excel sheet|excel file)\b/i },
    { format: "csv", regex: /\b(csv|csv file|comma separated)\b/i },
    { format: "md", regex: /\b(markdown|md|md notes)\b/i },
    { format: "json", regex: /\b(json|json file|json data)\b/i },
    { format: "html", regex: /\b(html|html file|html document|webpage)\b/i },
    { format: "txt", regex: /\b(txt|text file|plain text)\b/i },
  ];

  let detectedFormat: DocumentFormat | null = null;
  for (const item of formatPatterns) {
    if (item.regex.test(text)) {
      detectedFormat = item.format;
      break;
    }
  }

  // Broad intent check for documents
  const generalDocRegex = /\b(report|document|summary|proposal|brief|analysis|whitepaper|deck|cheatsheet|plan)\b/i;
  const isDocumentRequest = detectedFormat !== null || (generalDocRegex.test(text) && text.length > 8);

  if (!isDocumentRequest) {
    return { isDocumentRequest: false, format: "pdf", title: "Document" };
  }

  // Extract clean title from prompt
  let title = promptText
    .replace(/^(please\s+)?(can\s+you\s+)?(could\s+you\s+)?(generate|create|make|write|build|produce|export|convert|download|draw)\s+(a|an|me|us|the)?\s*/i, "")
    .replace(/\b(pdf|word|powerpoint|excel|csv|markdown|json|html|txt|document|report|presentation|spreadsheet|notes|file|into|to|as)\b/gi, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 3) {
    title = "Generated_Document";
  } else {
    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 50) title = title.slice(0, 48) + "...";
  }

  return {
    isDocumentRequest: true,
    format: detectedFormat || "pdf",
    title,
  };
}

/**
 * Helper to parse embedded JSON or Markdown content into a structured GeneratedDocument
 */
export function parseDocumentFromAiResponse(
  content: string,
  userPromptFormat?: DocumentFormat | null,
  defaultTitle?: string,
  userPrompt?: string
): GeneratedDocument | null {
  if (!content) return null;

  // 1. Check for explicit ```json:document or ```document block in AI response
  const jsonDocMatch = content.match(/```(?:json:document|document-json|json-doc|document)\s*([\s\S]*?)```/i);
  if (jsonDocMatch && jsonDocMatch[1]) {
    try {
      const parsed = JSON.parse(jsonDocMatch[1].trim());
      if (parsed.title) {
        return {
          id: "doc_" + Math.random().toString(36).substring(2, 11),
          title: parsed.title,
          subtitle: parsed.subtitle || "AI Generated Document",
          format: parsed.format || userPromptFormat || "pdf",
          filename: parsed.filename || `${parsed.title.replace(/\s+/g, "_")}.${parsed.format || "pdf"}`,
          summary: parsed.summary,
          date: parsed.date || new Date().toLocaleDateString(),
          sections: parsed.sections || [],
          slides: parsed.slides || [],
          sheets: parsed.sheets || [],
          rawMarkdown: content,
          jsonData: parsed.jsonData || parsed,
        };
      }
    } catch (_) {}
  }

  // 2. Fallback: Parse Markdown headings into a structured document ONLY IF the user prompt explicitly requested a document
  let targetFormat: DocumentFormat | null = userPromptFormat || null;

  if (!targetFormat && userPrompt) {
    const userDetected = detectDocumentFormatRequest(userPrompt);
    if (userDetected.isDocumentRequest) {
      targetFormat = userDetected.format;
    }
  }

  // If neither userPromptFormat nor userPrompt was an explicit document creation request, return null.
  if (!targetFormat) return null;

  const lines = content.split("\n");
  let documentTitle = defaultTitle || "Document Analysis";
  let subtitle = "AI Generated Document";
  let summary = "";
  const sections: DocumentSection[] = [];
  const slides: DocumentSlide[] = [];
  const sheets: SpreadsheetSheet[] = [];

  let currentSection: DocumentSection | null = null;
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: (string | number)[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // H1 Heading (Document Title)
    if (line.startsWith("# ")) {
      documentTitle = line.replace(/^#\s+/, "").trim();
      continue;
    }

    // H2/H3 Headings (Section Titles)
    if (line.startsWith("## ") || line.startsWith("### ")) {
      if (currentSection) {
        if (inTable && tableHeaders.length > 0) {
          currentSection.tableHeaders = tableHeaders;
          currentSection.tableRows = tableRows;
          inTable = false;
          tableHeaders = [];
          tableRows = [];
        }
        sections.push(currentSection);
      }

      const secTitle = line.replace(/^#{2,3}\s+/, "").trim();
      currentSection = {
        id: "sec_" + Math.random().toString(36).substring(2, 7),
        title: secTitle,
        level: line.startsWith("## ") ? 1 : 2,
        type: "paragraph",
        content: "",
        bullets: [],
      };

      // Slide representation for PowerPoint format
      slides.push({
        id: "slide_" + (slides.length + 1),
        slideNumber: slides.length + 1,
        title: secTitle,
        bulletPoints: [],
      });
      continue;
    }

    // Markdown Tables
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "");
      if (cells.length > 0) {
        if (!inTable) {
          inTable = true;
          tableHeaders = cells;
          tableRows = [];
        } else if (line.includes("---")) {
          // delimiter line, skip
        } else {
          tableRows.push(cells);
        }
        continue;
      }
    } else if (inTable) {
      // Table ended
      if (currentSection) {
        currentSection.type = "table";
        currentSection.tableHeaders = tableHeaders;
        currentSection.tableRows = tableRows;
      } else {
        sections.push({
          id: "sec_tbl_" + Math.random().toString(36).substring(2, 6),
          type: "table",
          tableHeaders,
          tableRows,
        });
      }
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    // Bullet points
    if (line.startsWith("- ") || line.startsWith("* ") || line.match(/^\d+\.\s+/)) {
      const bulletText = line.replace(/^[-*\d.]+\s+/, "").trim();
      if (currentSection) {
        currentSection.type = "bullets";
        if (!currentSection.bullets) currentSection.bullets = [];
        currentSection.bullets.push(bulletText);
      }
      if (slides.length > 0) {
        const lastSlide = slides[slides.length - 1];
        if (!lastSlide.bulletPoints) lastSlide.bulletPoints = [];
        lastSlide.bulletPoints.push(bulletText);
      }
      continue;
    }

    // Paragraph text
    if (line.length > 0 && !line.startsWith("```")) {
      if (!summary && line.length > 20) {
        summary = line;
      }
      if (currentSection) {
        currentSection.content += (currentSection.content ? "\n" : "") + line;
      } else if (line.length > 10) {
        currentSection = {
          id: "sec_init",
          type: "paragraph",
          content: line,
        };
      }
    }
  }

  // Push final section
  if (currentSection) {
    if (inTable && tableHeaders.length > 0) {
      currentSection.type = "table";
      currentSection.tableHeaders = tableHeaders;
      currentSection.tableRows = tableRows;
    }
    sections.push(currentSection);
  }

  // Create spreadsheet sheet if format is xlsx / csv and tables exist
  if ((targetFormat === "xlsx" || targetFormat === "csv") && sections.some((s) => s.tableHeaders)) {
    const tableSec = sections.find((s) => s.tableHeaders);
    if (tableSec && tableSec.tableHeaders) {
      const cols = tableSec.tableHeaders.map((h, idx) => ({ key: `col_${idx}`, label: h }));
      const rows = (tableSec.tableRows || []).map((r) => {
        const rowObj: Record<string, any> = {};
        cols.forEach((col, idx) => {
          rowObj[col.key] = r[idx] ?? "";
        });
        return rowObj;
      });

      sheets.push({
        name: documentTitle.slice(0, 30),
        columns: cols,
        rows,
      });
    }
  }

  return {
    id: "doc_" + Math.random().toString(36).substring(2, 11),
    title: documentTitle,
    subtitle,
    format: targetFormat,
    filename: `${documentTitle.replace(/\s+/g, "_")}.${targetFormat}`,
    date: new Date().toLocaleDateString(),
    summary,
    sections: sections.length > 0 ? sections : [{ id: "sec_1", type: "paragraph", content }],
    slides: slides.length > 0 ? slides : undefined,
    sheets: sheets.length > 0 ? sheets : undefined,
    rawMarkdown: content,
  };
}
