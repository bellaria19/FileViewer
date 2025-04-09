// File type mapping and utilities

export interface FileTypeInfo {
  icon: string; // FontAwesome icon name
  color: string;
  name: string; // Display name
  canPreview: boolean;
}

export const getFileTypeInfo = (mimeType: string | null): FileTypeInfo => {
  if (!mimeType) return DEFAULT_FILE_TYPE;

  // Text files
  if (mimeType === "text/plain") {
    return {
      icon: "file-text-o",
      color: "#3498db",
      name: "Text",
      canPreview: true,
    };
  }

  // Images
  if (mimeType.startsWith("image/")) {
    const format = mimeType.split("/")[1].toUpperCase();
    return {
      icon: "file-image-o",
      color: "#27ae60",
      name: `Image (${format})`,
      canPreview: true,
    };
  }

  // PDF
  if (mimeType === "application/pdf") {
    return {
      icon: "file-pdf-o",
      color: "#e74c3c",
      name: "PDF",
      canPreview: true,
    };
  }

  // EPUB
  if (mimeType === "application/epub+zip") {
    return {
      icon: "book",
      color: "#8e44ad",
      name: "E-Book",
      canPreview: true,
    };
  }

  // HTML files
  if (mimeType === "text/html") {
    return {
      icon: "code",
      color: "#f39c12",
      name: "HTML",
      canPreview: true,
    };
  }

  // ZIP 파일
  if (mimeType === "application/zip") {
    return {
      icon: "file-archive-o",
      color: "#f1c40f",
      name: "ZIP Archive",
      canPreview: true,
    };
  }

  // Default for unknown types
  return DEFAULT_FILE_TYPE;
};

export const DEFAULT_FILE_TYPE: FileTypeInfo = {
  icon: "file-o",
  color: "#95a5a6",
  name: "File",
  canPreview: false,
};

// Helper to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
};
