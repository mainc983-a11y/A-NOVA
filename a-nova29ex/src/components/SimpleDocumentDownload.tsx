import React from "react";
import { GeneratedDocument } from "../types/document";
import { DocumentCard } from "./DocumentCard";

interface SimpleDocumentDownloadProps {
  document: GeneratedDocument;
  isDark?: boolean;
  onOpenDocumentModal?: (doc: GeneratedDocument, mode: "preview" | "edit") => void;
  onRegenerateDocument?: (doc: GeneratedDocument) => void;
}

export const SimpleDocumentDownload: React.FC<SimpleDocumentDownloadProps> = React.memo(({
  document: doc,
  isDark = true,
  onOpenDocumentModal,
}) => {
  if (!doc) return null;

  return (
    <DocumentCard
      document={doc}
      isDark={isDark}
      onEdit={onOpenDocumentModal ? (d) => onOpenDocumentModal(d, "edit") : undefined}
    />
  );
});
