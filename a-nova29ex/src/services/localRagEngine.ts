import { KnowledgeDocument, KnowledgeChunk, DocumentCitation } from "../types/sovereign";

const STORAGE_KEY_PREFIX = "a_nova_sovereign_docs_";

export function chunkDocumentText(
  documentId: string,
  documentName: string,
  text: string,
  chunkSize: number = 600,
  overlap: number = 100
): KnowledgeChunk[] {
  if (!text || text.trim() === "") return [];

  // Look for page markers if present (e.g. "--- Page 1 ---" or "Page 1:")
  const pageSections = text.split(/(?:--- Page (\d+) ---|\[Page (\d+)\]|\n\nPage (\d+):)/i);
  const chunks: KnowledgeChunk[] = [];
  let chunkCounter = 0;

  if (pageSections.length > 1) {
    let currentPage = 1;
    for (let i = 0; i < pageSections.length; i++) {
      const part = (pageSections[i] || "").trim();
      if (!part) continue;

      if (/^\d+$/.test(part)) {
        currentPage = parseInt(part, 10);
        continue;
      }

      // Split page content into chunks
      const paragraphs = part.split(/\n\s*\n/);
      let currentChunkText = "";

      for (const p of paragraphs) {
        const cleanP = p.trim();
        if (!cleanP) continue;

        if (currentChunkText.length + cleanP.length > chunkSize) {
          if (currentChunkText.trim()) {
            chunks.push({
              id: `${documentId}_chunk_${chunkCounter++}`,
              documentId,
              documentName,
              chunkIndex: chunkCounter,
              text: currentChunkText.trim(),
              pageNumber: currentPage,
              tokenCount: Math.ceil(currentChunkText.length / 4)
            });
          }
          currentChunkText = cleanP;
        } else {
          currentChunkText += (currentChunkText ? "\n\n" : "") + cleanP;
        }
      }

      if (currentChunkText.trim()) {
        chunks.push({
          id: `${documentId}_chunk_${chunkCounter++}`,
          documentId,
          documentName,
          chunkIndex: chunkCounter,
          text: currentChunkText.trim(),
          pageNumber: currentPage,
          tokenCount: Math.ceil(currentChunkText.length / 4)
        });
      }
    }
  } else {
    // Standard sliding window chunker
    const words = text.split(/\s+/);
    const wordsPerChunk = Math.floor(chunkSize / 6);
    const wordsOverlap = Math.floor(overlap / 6);

    for (let i = 0; i < words.length; i += (wordsPerChunk - wordsOverlap)) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      if (chunkWords.length < 5) continue;
      const chunkText = chunkWords.join(" ");

      // Estimate page number assuming ~400 words per page
      const estimatedPage = Math.floor(i / 350) + 1;

      chunks.push({
        id: `${documentId}_chunk_${chunkCounter++}`,
        documentId,
        documentName,
        chunkIndex: chunkCounter,
        text: chunkText,
        pageNumber: estimatedPage,
        tokenCount: Math.ceil(chunkText.length / 4)
      });
    }
  }

  return chunks;
}

// Local Hybrid BM25 + Vector Term-Weighting Engine
export function searchKnowledgeBase(
  query: string,
  documents: KnowledgeDocument[],
  topK: number = 4,
  minScore: number = 0.15
): DocumentCitation[] {
  if (!query || !documents || documents.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s_-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));

  if (queryTerms.length === 0) return [];

  const allChunks: KnowledgeChunk[] = [];
  documents.forEach(doc => {
    if (doc.chunks && Array.isArray(doc.chunks)) {
      allChunks.push(...doc.chunks);
    }
  });

  if (allChunks.length === 0) return [];

  // Compute Term Frequency & IDF across chunks
  const totalDocs = allChunks.length;
  const termDocFreq: Record<string, number> = {};

  queryTerms.forEach(term => {
    termDocFreq[term] = allChunks.filter(c => c.text.toLowerCase().includes(term)).length;
  });

  const scoredChunks = allChunks.map(chunk => {
    const textLower = chunk.text.toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      const count = (textLower.match(new RegExp(`\\b${term}`, "gi")) || []).length;
      if (count > 0) {
        const docFreq = termDocFreq[term] || 1;
        const idf = Math.log((totalDocs + 1) / (docFreq + 0.5)) + 1;
        // BM25-like saturation curve
        const tf = (count * 2.2) / (count + 1.2);
        score += tf * idf;
      }
    });

    // Exact phrase bonus
    if (textLower.includes(query.toLowerCase().trim())) {
      score += 3.5;
    }

    return {
      chunk,
      rawScore: score
    };
  });

  // Filter and normalize scores
  const maxScore = Math.max(...scoredChunks.map(s => s.rawScore), 1);
  const results = scoredChunks
    .filter(s => s.rawScore > 0)
    .map(s => {
      const normalizedSimilarity = Math.min(0.98, Math.round((s.rawScore / maxScore) * 100) / 100);
      return {
        documentId: s.chunk.documentId,
        documentName: s.chunk.documentName,
        pageNumber: s.chunk.pageNumber,
        heading: s.chunk.heading,
        chunkText: s.chunk.text,
        similarity: normalizedSimilarity
      };
    })
    .filter(c => c.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

// Storage Helpers for Private Documents
export function getWorkspaceDocuments(workspaceId: string): KnowledgeDocument[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${workspaceId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read workspace docs:", e);
  }
  return [];
}

export function saveWorkspaceDocument(doc: KnowledgeDocument): void {
  try {
    const current = getWorkspaceDocuments(doc.workspaceId);
    const existingIdx = current.findIndex(d => d.id === doc.id);
    let updated: KnowledgeDocument[];
    if (existingIdx !== -1) {
      updated = current.map(d => (d.id === doc.id ? doc : d));
    } else {
      updated = [doc, ...current];
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${doc.workspaceId}`, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save workspace doc:", e);
  }
}

export function deleteWorkspaceDocument(workspaceId: string, documentId: string): void {
  try {
    const current = getWorkspaceDocuments(workspaceId);
    const updated = current.filter(d => d.id !== documentId);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${workspaceId}`, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to delete workspace doc:", e);
  }
}

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
  "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can", "can't", "cannot",
  "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each",
  "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd",
  "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
  "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
  "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them",
  "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're",
  "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
  "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves"
]);
