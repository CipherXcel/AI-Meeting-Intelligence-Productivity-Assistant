"use client";

import { useSession, useUser } from "@descope/nextjs-sdk/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { MeetAgentIcon } from "@/components/brand/logo";
import {
    ArrowLeft,
    Upload,
    Trash2,
    Download,
    History,
    HardDrive,
    FileText,
    ImageIcon,
    CheckCircle2,
    AlertCircle,
    Clock,
    Layers,
    Sparkles,
} from "lucide-react";

interface FileVersion {
    versionId: string;
    size: number;
    uploadedAt: string;
    isLatest: boolean;
    contentType: string;
}

interface StoredFile {
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
    isImage: boolean;
    versions: FileVersion[];
}

interface StorageQuota {
    usedBytes: number;
    maxBytes: number;
    usedPercentage: number;
    totalFiles: number;
    s3Configured: boolean;
    bucketName: string;
    region: string;
}

export default function CloudStoragePage() {
    const { isAuthenticated, sessionToken, isSessionLoading } = useSession();
    const { user } = useUser();
    const router = useRouter();

    const [files, setFiles] = useState<StoredFile[]>([]);
    const [quota, setQuota] = useState<StorageQuota | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [selectedFileVersions, setSelectedFileVersions] = useState<StoredFile | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    // 1. Fetch user's files and quota from backend
    async function fetchFiles() {
        if (!sessionToken) return;
        try {
            setLoading(true);
            const res = await fetch(`${apiUrl}/api/storage/files`, {
                headers: { Authorization: `Bearer ${sessionToken}` },
            });
            const text = await res.text();
            let data: any = {};
            try {
                data = JSON.parse(text);
            } catch {
                console.error("Non-JSON response from /api/storage/files:", text);
                return;
            }
            if (res.ok) {
                setFiles(data.files || []);
                setQuota(data.quota || null);
            }
        } catch (err) {
            console.error("Failed to load files", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (sessionToken) {
            fetchFiles();
        }
    }, [sessionToken]);

    // Format bytes into readable MB / KB
    function formatBytes(bytes: number) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    // 2. Handle File Upload
    async function onFileSelected(e: ChangeEvent<HTMLInputElement>) {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0 || !sessionToken) return;

        const file = fileList[0];
        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploading(true);
            setErrorMsg(null);
            setSuccessMsg(null);

            const res = await fetch(`${apiUrl}/api/storage/upload`, {
                method: "POST",
                headers: { Authorization: `Bearer ${sessionToken}` },
                body: formData,
            });

            const text = await res.text();
            let data: any = {};
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("Server returned non-JSON response. Please ensure backend is running.");
            }

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setSuccessMsg(`"${file.name}" uploaded successfully!`);
            await fetchFiles();
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to upload file");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    // 3. Handle File Delete
    async function onDeleteFile(fileId: string, versionId?: string) {
        if (!sessionToken || !confirm("Are you sure you want to delete this file/version?")) return;
        try {
            const url = versionId
                ? `${apiUrl}/api/storage/files/${fileId}?versionId=${versionId}`
                : `${apiUrl}/api/storage/files/${fileId}`;

            const res = await fetch(url, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${sessionToken}` },
            });

            if (res.ok) {
                if (selectedFileVersions?.id === fileId && versionId) {
                    setSelectedFileVersions((prev) =>
                        prev ? { ...prev, versions: prev.versions.filter((v) => v.versionId !== versionId) } : null
                    );
                }
                await fetchFiles();
            }
        } catch (err) {
            console.error("Delete failed", err);
        }
    }

    if (isSessionLoading) {
        return <div className="app-shell-bg flex h-svh items-center justify-center text-sm text-muted-foreground">Checking session...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="app-shell-bg flex h-svh flex-col items-center justify-center gap-4 text-center px-4">
                <p className="text-muted-foreground text-sm">Please sign in to access your cloud storage.</p>
                <Link href="/sign-in" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                    Sign In
                </Link>
            </div>
        );
    }

    const usedMB = quota ? (quota.usedBytes / (1024 * 1024)).toFixed(2) : "0.00";
    const maxMB = quota ? (quota.maxBytes / (1024 * 1024)).toFixed(0) : "500";

    return (
        <div className="relative min-h-svh app-shell-bg text-foreground">
            {/* Top Navbar */}
            <nav className="border-b border-border/60 bg-card/60 px-6 py-4 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 p-1 shadow-sm">
                            <MeetAgentIcon className="size-full" />
                        </div>
                        <span className="font-heading text-lg font-bold tracking-tight bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                            MeetAgent AI
                        </span>
                    </Link>
                    <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        Cloud Storage Keeper
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-xs font-medium backdrop-blur-sm transition-all hover:bg-muted"
                    >
                        <ArrowLeft className="size-3.5" />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="mx-auto max-w-6xl px-6 py-8">
                {/* Header Title */}
                <div className="mb-6">
                    <h1 className="font-heading text-3xl font-bold tracking-tight">
                        Cloud Object Storage & Versioning
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Store meeting attachments, flyers, whiteboards, and documents with AWS S3 Object Versioning.
                    </p>
                </div>

                {/* 50 MB Quota Progress Card */}
                <div className="mb-8 rounded-3xl border border-border/80 bg-card/80 p-6 shadow-md backdrop-blur-md">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <HardDrive className="size-6" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Storage Quota Limit
                                </p>
                                <p className="text-xl font-bold">
                                    {usedMB} MB <span className="text-sm font-normal text-muted-foreground">/ {maxMB} MB used</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1">
                                {quota?.s3Configured ? "🟢 Live AWS S3" : "📁 Local Cache"}
                            </span>
                            <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1">
                                Bucket: {quota?.bucketName}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-500"
                            style={{ width: `${quota?.usedPercentage || 0}%` }}
                        />
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                        <span>{quota?.usedPercentage || 0}% used</span>
                        <span>{quota?.totalFiles || 0} files stored</span>
                    </div>
                </div>

                {/* Upload Action Card */}
                <div className="mb-8 rounded-3xl border-2 border-dashed border-border/80 bg-card/40 p-8 text-center backdrop-blur-sm hover:border-primary/50 transition-colors">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={onFileSelected}
                        className="hidden"
                        accept="image/*,.pdf,.docx,.txt"
                    />

                    <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Upload className="size-6" />
                    </div>

                    <h3 className="text-base font-semibold">Upload Images or Documents</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Supports PNG, JPG, WEBP, SVG, GIF, PDF, DOCX, and TXT (Max 25 MB per file)
                    </p>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                        {uploading ? "Uploading..." : "Choose File to Upload"}
                    </button>

                    {/* Alerts */}
                    {errorMsg && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-destructive">
                            <AlertCircle className="size-4" />
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    {successMsg && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="size-4" />
                            <span>{successMsg}</span>
                        </div>
                    )}
                </div>

                {/* Uploaded Files Gallery */}
                <div>
                    <h2 className="font-heading text-xl font-bold mb-4">Your Stored Files ({files.length})</h2>

                    {loading ? (
                        <p className="text-xs text-muted-foreground">Loading files...</p>
                    ) : files.length === 0 ? (
                        <div className="rounded-2xl border border-border/60 bg-card/50 p-8 text-center text-xs text-muted-foreground">
                            No files uploaded yet. Click above to upload your first image or document!
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {files.map((file) => (
                                <div
                                    key={file.id}
                                    className="group rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-md hover:border-primary/40 transition-all"
                                >
                                    {/* Thumbnail / File Icon */}
                                    <div className="relative mb-3 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/50 border border-border/40">
                                        {file.isImage ? (
                                            <img
                                                src={`${apiUrl}/api/storage/download/${file.id}?token=${sessionToken}`}
                                                alt={file.originalName}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <FileText className="size-10 text-primary" />
                                                <span className="text-[11px] uppercase tracking-wider font-semibold">
                                                    {file.mimeType.split("/")[1] || "DOC"}
                                                </span>
                                            </div>
                                        )}
                                        {/* Version Badge */}
                                        <div className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                                            {file.versions.length > 1 ? `${file.versions.length} Versions` : "v1.0"}
                                        </div>
                                    </div>

                                    {/* File Info */}
                                    <h4 className="truncate font-semibold text-sm" title={file.originalName}>
                                        {file.originalName}
                                    </h4>
                                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{formatBytes(file.size)}</span>
                                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50">
                                        <a
                                            href={`${apiUrl}/api/storage/download/${file.id}?token=${sessionToken}`}
                                            download
                                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                                        >
                                            <Download className="size-3.5" />
                                            Download
                                        </a>

                                        {file.versions.length > 1 && (
                                            <button
                                                onClick={() => setSelectedFileVersions(file)}
                                                className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
                                                title="View Version History"
                                            >
                                                <History className="size-3.5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => onDeleteFile(file.id)}
                                            className="flex size-8 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                                            title="Delete File"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Version History Modal */}
                {selectedFileVersions && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <History className="size-5 text-primary" />
                                    <h3 className="font-heading text-lg font-bold">Version History</h3>
                                </div>
                                <button
                                    onClick={() => setSelectedFileVersions(null)}
                                    className="text-muted-foreground hover:text-foreground text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            <p className="text-xs text-muted-foreground mb-4 truncate font-medium">
                                File: {selectedFileVersions.originalName}
                            </p>

                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {selectedFileVersions.versions.map((v, idx) => (
                                    <div
                                        key={v.versionId}
                                        className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 p-3 text-xs"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    Version {selectedFileVersions.versions.length - idx}.0
                                                </span>
                                                {v.isLatest && (
                                                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {new Date(v.uploadedAt).toLocaleString()} · {formatBytes(v.size)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <a
                                                href={`${apiUrl}/api/storage/download/${selectedFileVersions.id}?versionId=${v.versionId}&token=${sessionToken}`}
                                                download
                                                className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                                            >
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
