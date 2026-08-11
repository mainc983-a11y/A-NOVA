export type DocumentFormat = 
  | "pdf" 
  | "docx" 
  | "pptx" 
  | "xlsx" 
  | "csv" 
  | "md" 
  | "txt" 
  | "json" 
  | "html";

export interface DocumentTableRow {
  [key: string]: string | number | boolean | null;
}

export interface DocumentMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

export interface DocumentSection {
  id: string;
  title?: string;
  level?: 1 | 2 | 3;
  type: "paragraph" | "bullets" | "table" | "metrics" | "quote" | "code" | "callout";
  content?: string;
  bullets?: string[];
  tableHeaders?: string[];
  tableRows?: (string | number)[][];
  metrics?: DocumentMetric[];
  codeLanguage?: string;
}

export interface DocumentSlide {
  id: string;
  slideNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints?: string[];
  keyTakeaway?: string;
  stats?: { label: string; value: string }[];
  layout?: "title" | "bullets" | "split" | "metrics" | "conclusion";
}

export interface SpreadsheetColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "currency" | "date" | "percentage";
}

export interface SpreadsheetSheet {
  name: string;
  columns: SpreadsheetColumn[];
  rows: Record<string, any>[];
}

export interface GeneratedDocument {
  id: string;
  title: string;
  subtitle?: string;
  format: DocumentFormat;
  filename: string;
  author?: string;
  date?: string;
  summary?: string;
  sections: DocumentSection[];
  slides?: DocumentSlide[];
  sheets?: SpreadsheetSheet[];
  rawMarkdown?: string;
  jsonData?: any;
  htmlContent?: string;
  themeColor?: string;
}
