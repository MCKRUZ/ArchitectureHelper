'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { BicepFile } from '@/lib/api/bicep';

interface BicepPreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  files: BicepFile[];
  onDownloadZip: () => void;
  isLoading: boolean;
}

export function BicepPreviewPanel({
  isOpen,
  onClose,
  files,
  onDownloadZip,
  isLoading,
}: BicepPreviewPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const activeFile = files.find((f) => f.path === selectedFile) ?? files[0];

  const handleCopy = useCallback(async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
  }, [activeFile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-[720px] max-w-full h-full bg-card border-l flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Bicep Export</h2>
            <span className="text-xs text-muted-foreground">
              {files.length} files
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!activeFile}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Copy
            </button>
            <button
              onClick={onDownloadZip}
              disabled={isLoading || files.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Generating...' : 'Download ZIP'}
            </button>
            <button
              onClick={onClose}
              className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              X
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Generating Bicep files...
          </div>
        ) : files.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No files generated. Add services to your diagram first.
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* File tree */}
            <div className="w-56 border-r overflow-y-auto py-2">
              {files.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file.path)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-muted transition-colors',
                    (selectedFile === file.path ||
                      (!selectedFile && file === files[0])) &&
                      'bg-muted font-semibold'
                  )}
                >
                  {file.path}
                </button>
              ))}
            </div>

            {/* Code view */}
            <div className="flex-1 overflow-auto p-4">
              {activeFile && (
                <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
                  {activeFile.content}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
