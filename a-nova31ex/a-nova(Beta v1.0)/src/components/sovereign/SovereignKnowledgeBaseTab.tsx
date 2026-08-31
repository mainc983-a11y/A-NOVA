import React, { useState, useEffect } from "react";
import { 
  Database, 
  Upload, 
  FileText, 
  Trash2, 
  Eye, 
  Search, 
  Lock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Table,
  Plus
} from "lucide-react";
import { KnowledgeDocument, SovereignWorkspace } from "../../types/sovereign";
import { 
  getWorkspaceDocuments, 
  saveWorkspaceDocument, 
  deleteWorkspaceDocument, 
  chunkDocumentText, 
  searchKnowledgeBase 
} from "../../services/localRagEngine";
import { appendAuditLog } from "../../services/sovereignEngine";

interface SovereignKnowledgeBaseTabProps {
  workspace: SovereignWorkspace;
  isDark?: boolean;
}

export const SovereignKnowledgeBaseTab: React.FC<SovereignKnowledgeBaseTabProps> = ({
  workspace,
  isDark = true
}) => {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    const docs = getWorkspaceDocuments(workspace.id);
    setDocuments(docs);
  }, [workspace.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let extractedText = "";
        const fileExt = file.name.split(".").pop()?.toLowerCase() || "txt";

        if (fileExt === "json" || fileExt === "txt" || fileExt === "csv" || fileExt === "md") {
          extractedText = await file.text();
        } else {
          // Binary or standard documents
          const text = await file.text().catch(() => "");
          extractedText = text || `[Document content: ${file.name} - ${file.size} bytes]`;
        }

        const docId = "doc_" + Math.random().toString(36).substring(2, 11);
        const chunks = chunkDocumentText(docId, file.name, extractedText);

        const newDoc: KnowledgeDocument = {
          id: docId,
          name: file.name,
          type: fileExt,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          workspaceId: workspace.id,
          chunks,
          tokens: chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0),
          confidentialityLevel: "Confidential"
        };

        saveWorkspaceDocument(newDoc);

        appendAuditLog({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          actor: "Organizational User",
          role: workspace.memberRole,
          action: `Indexed Confidential Document: ${file.name}`,
          category: "upload",
          severity: "info",
          details: { name: file.name, size: file.size, chunksCount: chunks.length },
          status: "success"
        });
      } catch (err) {
        console.error("Failed to parse file:", err);
      }
    }

    const updated = getWorkspaceDocuments(workspace.id);
    setDocuments(updated);
    setIsUploading(false);
    e.target.value = "";
  };

  const handleDelete = (docId: string, docName: string) => {
    deleteWorkspaceDocument(workspace.id, docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (selectedDoc?.id === docId) setSelectedDoc(null);

    appendAuditLog({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      actor: "Organizational User",
      role: workspace.memberRole,
      action: `Deleted Confidential Document: ${docName}`,
      category: "upload",
      severity: "notice",
      details: { docId, docName },
      status: "success"
    });
  };

  const handleTestSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchKnowledgeBase(searchQuery, documents, 5, 0.1);
    setSearchResults(results);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Private Knowledge Base (RAG)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Encrypted Local Storage
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Upload organizational PDF, DOCX, CSV, TXT, or JSON files. Documents are parsed and indexed on-premise without ever sending plaintext to cloud providers.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black transition-all cursor-pointer shadow-xs shrink-0">
          <Upload className="w-4 h-4" />
          <span>Upload Confidential Document</span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.csv,.json,.md,.png,.jpg"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Semantic Search Tester */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50 border-zinc-200"
      }`}>
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
          Semantic Query & Retrieval Tester
        </span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTestSearch()}
              placeholder="Search across private knowledge chunks..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-colors ${
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100 focus:border-amber-500"
                  : "bg-white border-zinc-300 text-zinc-900 focus:border-amber-500"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={handleTestSearch}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
          >
            Search Chunks
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2">
            {searchResults.map((res, rIdx) => (
              <div
                key={`res_${rIdx}`}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isDark ? "bg-zinc-950/80 border-zinc-800" : "bg-white border-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-400">{res.documentName}</span>
                  <span className="font-mono text-[10px] text-emerald-400 font-semibold">
                    {(res.similarity * 100).toFixed(0)}% Similarity
                  </span>
                </div>
                <p className="text-zinc-400 font-mono text-[11px] line-clamp-2">
                  "{res.chunkText}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200"
      }`}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between border-zinc-800">
          <span className="text-xs font-semibold">Indexed Workspace Documents ({documents.length})</span>
          <span className="text-xs text-zinc-500 font-mono">Workspace: {workspace.name}</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs">
            No documents uploaded yet in this workspace. Upload PDFs, reports, or data files above.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60 overflow-x-auto">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-zinc-850/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-zinc-200 truncate">{doc.name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2 mt-0.5">
                      <span>{(doc.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{doc.chunks.length} chunks</span>
                      <span>•</span>
                      <span>{doc.tokens || 0} tokens</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {doc.confidentialityLevel || "Confidential"}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Inspect Chunks"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id, doc.name)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunk Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
            isDark ? "bg-zinc-950 border-zinc-800 text-zinc-100" : "bg-white border-zinc-200 text-zinc-900"
          }`}>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold">{selectedDoc.name}</h4>
                <p className="text-[11px] text-zinc-400 font-mono">
                  {selectedDoc.chunks.length} indexed chunks ({selectedDoc.tokens} tokens)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-3 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {selectedDoc.chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className="p-3 rounded-xl border border-zinc-850 bg-zinc-900/50 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>Chunk #{idx + 1}</span>
                    {chunk.pageNumber && <span>Page {chunk.pageNumber}</span>}
                  </div>
                  <p className="text-xs font-mono leading-relaxed text-zinc-300 whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
