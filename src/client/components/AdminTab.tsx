import { useCallback, useEffect, useRef, useState } from "react";
import { api, withAuthRetry } from "../api/client";
import { PdfBookViewer } from "./PdfBookViewer";
import { resolvePdfFileId, resolvePdfFileName } from "../types";
import type { EmbeddingInfo, PdfFile } from "../types";

function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EmbedOp = "idle" | "loading" | "done" | "error";

interface UploadProgress {
  total: number;
  done: number;
  errors: string[];
}

export function AdminTab() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewingFile, setViewingFile] = useState<PdfFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Embedding state
  const [embeddings, setEmbeddings] = useState<EmbeddingInfo[]>([]);
  const [embedOps, setEmbedOps] = useState<Record<string, EmbedOp>>({});
  const [embedError, setEmbedError] = useState<Record<string, string>>({});

  const loadFiles = useCallback(async () => {
    const data = await withAuthRetry(() => api.listFiles());
    setFiles(data);
  }, []);

  const loadEmbeddings = useCallback(async () => {
    try {
      const data = await api.listEmbeddings();
      setEmbeddings(data);
    } catch {
      // endpoint may not exist yet — fail silently
      setEmbeddings([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      loadFiles().catch((err) =>
        setError(err instanceof Error ? err.message : "파일 목록을 불러올 수 없습니다.")
      ),
      loadEmbeddings(),
    ]).finally(() => setLoading(false));
  }, [loadFiles, loadEmbeddings]);

  async function handleUploadMany(fileList: FileList | File[]) {
    const all = Array.from(fileList);
    const pdfs = all.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const nonPdfs = all.filter((f) => !f.name.toLowerCase().endsWith(".pdf"));

    if (pdfs.length === 0) {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    setError("");
    setUploadProgress({ total: pdfs.length, done: 0, errors: [] });

    // Upload all PDFs in parallel, track per-file results
    const results = await Promise.allSettled(
      pdfs.map((file) => withAuthRetry(() => api.uploadFile(file)))
    );

    const errors: string[] = [];
    let done = 0;
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        done++;
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : "업로드 실패";
        errors.push(`${pdfs[i].name}: ${msg}`);
      }
    });

    setUploadProgress({ total: pdfs.length, done, errors });
    await loadFiles();

    // Surface summary errors
    const summary: string[] = [];
    if (nonPdfs.length > 0) {
      summary.push(`PDF가 아닌 파일 ${nonPdfs.length}개는 건너뜀`);
    }
    if (errors.length > 0) {
      summary.push(...errors);
    }
    if (summary.length > 0) setError(summary.join("\n"));

    // Auto-clear progress after a moment if all succeeded
    if (errors.length === 0) {
      setTimeout(() => setUploadProgress(null), 2000);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) void handleUploadMany(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) void handleUploadMany(e.dataTransfer.files);
  }

  async function handleDelete(fileId: string | undefined, name: string) {
    if (!fileId) return;
    if (!confirm(`"${name}" 파일을 삭제하시겠습니까?`)) return;
    setError("");
    try {
      await withAuthRetry(() => api.deleteFile(fileId));
      setFiles((prev) => prev.filter((f) => resolvePdfFileId(f) !== fileId));
      setEmbeddings((prev) => prev.filter((e) => e.fileId !== fileId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function handleEmbed(fileId: string) {
    setEmbedOps((prev) => ({ ...prev, [fileId]: "loading" }));
    setEmbedError((prev) => { const n = { ...prev }; delete n[fileId]; return n; });
    try {
      await api.embedFile(fileId);
      await loadEmbeddings();
      setEmbedOps((prev) => ({ ...prev, [fileId]: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "임베딩 실패";
      setEmbedOps((prev) => ({ ...prev, [fileId]: "error" }));
      setEmbedError((prev) => ({ ...prev, [fileId]: msg }));
    }
  }

  async function handleDeleteEmbedding(fileId: string, name: string, ragDocumentName?: string) {
    if (!confirm(`"${name}"의 임베딩을 삭제하시겠습니까?\n(RAG 검색에서 제외됩니다.)`)) return;
    const target = ragDocumentName ?? fileId;
    setEmbedOps((prev) => ({ ...prev, [fileId]: "loading" }));
    try {
      await api.deleteEmbedding(target);
      setEmbeddings((prev) => prev.filter((e) => e.ragDocumentName !== target && e.fileId !== fileId));
      setEmbedOps((prev) => ({ ...prev, [fileId]: "idle" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "임베딩 삭제 실패";
      setEmbedOps((prev) => ({ ...prev, [fileId]: "error" }));
      setEmbedError((prev) => ({ ...prev, [fileId]: msg }));
    }
  }

  const filtered = files.filter((f) => {
    const name = resolvePdfFileName(f);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="tab-loading">
        <div className="spinner" />
        <p>파일 목록 불러오는 중…</p>
      </div>
    );
  }

  if (viewingFile) {
    return (
      <PdfBookViewer
        fileId={resolvePdfFileId(viewingFile)}
        filename={resolvePdfFileName(viewingFile)}
        onClose={() => setViewingFile(null)}
      />
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-content">
        {/* Page header */}
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">PDF 파일 관리</h1>
            <p className="admin-page-sub">
              챗봇 지식 베이스에 사용될 PDF 파일을 업로드·열람·삭제합니다.
            </p>
          </div>
          <button
            type="button"
            className="primary-btn admin-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadProgress !== null && uploadProgress.done < uploadProgress.total}
          >
            {uploadProgress !== null && uploadProgress.done < uploadProgress.total ? (
              <>
                <span className="btn-spinner" />
                {` ${uploadProgress.done} / ${uploadProgress.total} 업로드 중…`}
              </>
            ) : (
              "＋ PDF 업로드"
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
        </div>

        {error && <div className="banner-error">{error}</div>}

        {/* Search */}
        <div className="admin-search-row">
          <input
            type="search"
            className="admin-search-input"
            placeholder="파일명으로 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="admin-file-count">총 {filtered.length}개 파일</span>
        </div>

        {/* Drop zone */}
        <div
          className={`admin-drop-zone${dragOver ? " drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <span className="drop-icon">📥</span>
          <span>PDF 파일을 여기에 드래그하여 업로드 (여러 파일 동시 가능)</span>
        </div>

        {/* Upload progress */}
        {uploadProgress !== null && (
          <div className="upload-progress-bar-wrap">
            <div className="upload-progress-bar-track">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
              />
            </div>
            <span className="upload-progress-label">
              {uploadProgress.done < uploadProgress.total
                ? `${uploadProgress.done} / ${uploadProgress.total} 업로드 중…`
                : uploadProgress.errors.length > 0
                  ? `${uploadProgress.done}개 성공, ${uploadProgress.errors.length}개 실패`
                  : `${uploadProgress.done}개 업로드 완료 ✓`}
            </span>
          </div>
        )}

        {/* File grid */}
        {filtered.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📂</div>
            <p>{search ? "검색 결과가 없습니다." : "업로드된 파일이 없습니다."}</p>
          </div>
        ) : (
          <div className="admin-file-grid">
            {filtered.map((file) => {
              const fileId = resolvePdfFileId(file);
              const name = resolvePdfFileName(file);
              const size = (file.size ?? file.fileSize) as number | undefined;
              const dateStr = (file.createdAt ?? file.uploadedAt) as string | undefined;
              // Match by filename since the RAG store only knows displayName, not file UUID
              const embInfo = embeddings.find(
                (e) => e.filename?.toLowerCase() === name.toLowerCase()
              );
              const isEmbedded = Boolean(embInfo);
              const op = embedOps[fileId] ?? "idle";
              const opErr = embedError[fileId];
              return (
                <div key={fileId || name} className="admin-file-card">
                  <div className="file-card-book">
                    <div className="file-card-spine" />
                    <div className="file-card-cover">
                      <span className="file-card-icon">📄</span>
                    </div>
                  </div>
                  <div className="file-card-info">
                    <span className="file-card-name" title={name}>{name}</span>
                    <span className="file-card-meta">
                      {formatBytes(size)}{dateStr ? ` · ${formatDate(dateStr)}` : ""}
                    </span>
                    {/* Embedding badge */}
                    <span className={`embed-badge ${isEmbedded ? "embed-badge--on" : "embed-badge--off"}`}>
                      {isEmbedded
                        ? `✓ 임베딩됨${embInfo?.chunkCount ? ` (${embInfo.chunkCount} chunks)` : ""}`
                        : "미임베딩"}
                    </span>
                    {opErr && <span className="embed-op-error">{opErr}</span>}
                  </div>
                  <div className="file-card-actions">
                    <button
                      type="button"
                      className="file-action-btn file-view-btn"
                      onClick={() => setViewingFile(file)}
                      disabled={!fileId}
                    >
                      열기
                    </button>
                    {isEmbedded ? (
                      <button
                        type="button"
                        className="file-action-btn file-unembed-btn"
                        onClick={() => void handleDeleteEmbedding(fileId, name, embInfo?.ragDocumentName)}
                        disabled={op === "loading" || !fileId}
                        title="임베딩 삭제"
                      >
                        {op === "loading" ? "…" : "임베딩 삭제"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="file-action-btn file-embed-btn"
                        onClick={() => void handleEmbed(fileId)}
                        disabled={op === "loading" || !fileId}
                        title="RAG에 임베딩"
                      >
                        {op === "loading" ? "…" : "임베딩"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="file-action-btn file-delete-btn"
                      onClick={() => void handleDelete(fileId, name)}
                      disabled={!fileId}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
