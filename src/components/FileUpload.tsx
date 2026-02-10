"use client";

import { useState, useCallback, useRef } from "react";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  loadingProgress?: string;
}

export function FileUpload({ onFilesSelect, isLoading, loadingProgress }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateFiles = (files: FileList): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== "application/pdf") {
        errors.push(`${file.name}: no es PDF`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: supera 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
    } else {
      setError(null);
    }

    return validFiles;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          onFilesSelect(validFiles);
        }
      }
    },
    [onFilesSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          onFilesSelect(validFiles);
        }
      }
      // Reset input so same files can be selected again
      e.target.value = "";
    },
    [onFilesSelect]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`
          drop-zone relative p-12 cursor-pointer
          flex flex-col items-center justify-center
          min-h-[280px] transition-all duration-200
          ${isDragging ? "drag-over" : ""}
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Icon */}
        <div
          className={`
            w-16 h-16 mb-6 flex items-center justify-center
            border-2 transition-colors duration-200
            ${isDragging ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-muted)]"}
          `}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="12" y2="12" />
            <line x1="15" y1="15" x2="12" y2="12" />
          </svg>
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-lg mb-2">
            {isLoading ? (
              <span className="text-[var(--text-secondary)]">
                {loadingProgress || "Procesando..."}
              </span>
            ) : isDragging ? (
              <span className="text-[var(--accent)]">Soltá los archivos acá</span>
            ) : (
              <>
                <span className="text-[var(--text-primary)]">
                  Arrastrá tu extracto PDF
                </span>
                <span className="text-[var(--text-muted)]"> o </span>
                <span className="text-[var(--accent)] hover:underline">
                  hacé click para seleccionar
                </span>
              </>
            )}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            PDF hasta 10MB • Banco Galicia • Podés subir varios a la vez
          </p>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute bottom-6 left-6 right-6">
            <div className="progress-bar h-1">
              <div
                className="progress-bar-fill h-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 border border-[var(--negative)] bg-[var(--negative)]/10 text-[var(--negative)] text-sm">
          {error}
        </div>
      )}

      {/* Privacy notice */}
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="flex-shrink-0 mt-0.5"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>
          <strong className="text-[var(--text-secondary)]">100% privado.</strong>{" "}
          Tu archivo se procesa en tu navegador. Nunca sale de tu computadora.
        </p>
      </div>
    </div>
  );
}
