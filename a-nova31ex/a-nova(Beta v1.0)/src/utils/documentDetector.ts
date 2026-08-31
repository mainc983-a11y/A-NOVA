import { GeneratedDocument, DocumentFormat, DocumentSection, DocumentSlide, SpreadsheetSheet } from "../types/document";

/**
 * Robust helper to detect if a prompt is an image generation request.
 */
export function isImageGenerationRequest(promptText: string): { isImageRequest: boolean; imagePrompt: string } {
  if (!promptText || typeof promptText !== "string") {
    return { isImageRequest: false, imagePrompt: "" };
  }

  const text = promptText.trim().toLowerCase();

  // 1. If user explicitly requests a document format (pdf, docx, pptx, excel, csv, txt), it's not a standalone image request
  const explicitDocumentRegex = /\b(create|generate|make|build|export|convert|download|save as|output as|crate|gnrate)\s+(a|an|me|us|the|this)?\s*(pdf|docx|word|pptx|ppt|powerpoint|excel|xlsx|csv|txt)\b/i;
  if (explicitDocumentRegex.test(text) && !/\b(image|picture|photo|artwork|drawing|sketch|wallpaper|logo|icon|illustration)\s+(only|file|instead)\b/i.test(text)) {
    return { isImageRequest: false, imagePrompt: "" };
  }

  // 2. Image action verbs
  const directImageVerbRegex = /\b(draw|drw|paint|pnt|sketch|illustrate|render|photograph|visualize)\b/i;

  // 3. Image keywords and nouns
  const imageKeywordsRegex = /\b(image|images|imge|img|imgs|picture|pictures|pictur|pcutre|photo|photos|phtoo|photograph|photographs|artwork|artworks|art|drawing|drawings|sketch|sketches|painting|paintings|wallpaper|wallpapers|logo|logos|icon|icons|illustration|illustrations|render|renders|portrait|portraits|landscape|avatar|avatars|graphic|graphics|diagram|diagrams|visual|visuals)\b/i;

  // 4. Creation verbs
  const creationVerbRegex = /\b(generate|gnrate|gen|create|crate|make|produce|design|edit|build|show me|give me|render)\b/i;

  let isImage = false;

  // Case A: Action verbs like draw, paint, sketch, illustrate, render (e.g., "draw Goku", "sketch Naruto", "paint a portrait")
  if (directImageVerbRegex.test(text)) {
    isImage = true;
  }
  // Case B: Creation verb + image keyword (e.g., "generate an image", "create a photo", "make a logo")
  else if (creationVerbRegex.test(text) && imageKeywordsRegex.test(text)) {
    isImage = true;
  }
  else if (text.startsWith("draw") || text.startsWith("paint") || text.startsWith("sketch") || text.startsWith("illustrate") || text.startsWith("render")) {
    isImage = true;
  }
  // Case C: Noun phrases or standalone image queries (e.g., "Image of Goku", "Photo of Eiffel Tower", "Goku image", "Naruto artwork")
  else if (imageKeywordsRegex.test(text)) {
    const nounPhrasePattern = /\b(image|images|picture|pictures|photo|photos|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+(of|for|with|showing|depicting|about)\b/i;
    const prefixedNounPattern = /\b[a-z0-9_\-]{2,}\s+(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\b/i;
    const suffixedNounPattern = /\b(image|picture|photo|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+[a-z0-9_\-]{2,}\b/i;

    if (
      nounPhrasePattern.test(text) ||
      prefixedNounPattern.test(text) ||
      suffixedNounPattern.test(text) ||
      text.startsWith("image") ||
      text.startsWith("photo") ||
      text.startsWith("picture") ||
      text.startsWith("artwork") ||
      text.startsWith("wallpaper") ||
      text.startsWith("logo") ||
      text.startsWith("icon") ||
      text.startsWith("sketch") ||
      text.startsWith("draw") ||
      text.startsWith("paint") ||
      text.startsWith("illustration") ||
      text.startsWith("render")
    ) {
      isImage = true;
    }
  }

  if (!isImage) {
    return { isImageRequest: false, imagePrompt: "" };
  }

  // Extract clean image prompt
  let imagePrompt = promptText
    .replace(/^(please\s+)?(can\s+you\s+)?(could\s+you\s+)?(generate|create|draw|make|paint|illustrate|design|render|produce|build|show\s+me|give\s+me)\s+(me\s+|us\s+)?(an?\s+)?(new\s+)?(image|images|picture|pictures|photo|photos|illustration|illustrations|artwork|artworks|art|drawing|graphic|logo|banner|portrait|landscape|sketch|wallpaper|icon)?(\s+of|\s+for|\s+showing|\s+depicting|\s+with|\s+about)?/i, "")
    .replace(/^(image|images|picture|pictures|photo|photos|artwork|drawing|sketch|painting|wallpaper|logo|icon|illustration|render|portrait|avatar)\s+(of|for|showing|depicting|with|about)?\s*/i, "")
    .replace(/^with\s+prompt\s*:\s*/i, "")
    .replace(/^variation\s+of\s*:\s*/i, "")
    .trim();

  if (!imagePrompt || imagePrompt.length < 2) {
    imagePrompt = promptText.trim();
  }

  return { isImageRequest: true, imagePrompt };
}

/**
 * Detects if a user prompt explicitly requests a specific document format to be created, generated, converted, or exported.
 */
export function detectDocumentFormatRequest(promptText: string): { isDocumentRequest: boolean; format: DocumentFormat; title: string } {
  if (!promptText) return { isDocumentRequest: false, format: "pdf", title: "Document" };

  // If this is an image request, it is NOT a document request
  const imageCheck = isImageGenerationRequest(promptText);
  if (imageCheck.isImageRequest) {
    return { isDocumentRequest: false, format: "pdf", title: "Document" };
  }

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

  // Only consider it a document request if an explicit document format (pdf, docx, xlsx, pptx, csv, md, json, html, txt) was detected
  if (!detectedFormat) {
    return { isDocumentRequest: false, format: "pdf", title: "Document" };
  }

  const isDocumentRequest = true;

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

  // If the user prompt was an image request, NEVER parse or return a document
  if (userPrompt && isImageGenerationRequest(userPrompt).isImageRequest) {
    return null;
  }

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
