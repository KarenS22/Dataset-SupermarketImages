"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEventHandler } from "react";
import ReactMarkdown from "react-markdown";
import { ImageInput } from "@/components/ui/image-input";
import { Plus, Trash2, BrainCircuit, Loader2, Save, Eye, Eraser, Pen, History, Undo } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrainPage() {

    const URL_Link = "https://6wnwj9t1-5000.brs.devtunnels.ms/";
    const [loading, setLoading] = useState(false);
    const [markdownResult, setMarkdownResult] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Tuning State
    const [threshold, setThreshold] = useState(0.04);
    const [previewKeypointsImage, setPreviewKeypointsImage] = useState<string | null>(null);
    const [keypointCount, setKeypointCount] = useState<number | null>(null);

    // Canvas State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(80);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const [hasDrawn, setHasDrawn] = useState(false);

    // History State
    const [versions, setVersions] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Load versions
    const loadVersions = async () => {
        try {
            const res = await fetch(`${URL_Link}/mlflow/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data);
            }
        } catch (e) {
            console.error("Failed to load versions", e);
        }
    };

    useEffect(() => {
        if (showHistory) {
            loadVersions();
        }
    }, [showHistory]);

    const handleRestore = async (runId: string) => {
        if (!confirm("Are you sure? This will overwrite the current database with this version.")) return;
        setLoading(true);
        try {
            const res = await fetch(`${URL_Link}/mlflow/restore`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ run_id: runId })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                loadVersions(); // Refresh
            } else {
                alert("Error: " + data.error);
            }
        } catch (e: any) {
            alert("Restore failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Load image into canvas context
    useEffect(() => {
        if (imageFile) {
            setHasDrawn(false);
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setImagePreview(e.target.result as string);
                }
            };
            reader.readAsDataURL(imageFile);
        } else {
            setImagePreview(null);
            setPreviewKeypointsImage(null);
            setHasDrawn(false);
        }
    }, [imageFile]);

    // Initialize Canvas size to match image display
    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;

        if (canvas && maskCanvas) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            maskCanvas.width = img.naturalWidth;
            maskCanvas.height = img.naturalHeight;

            const ctx = canvas.getContext("2d");
            const maskCtx = maskCanvas.getContext("2d");

            if (ctx && maskCtx) {
                // Initialize clean (Transparent)
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            }
        }
    };

    // Drawing Logic
    const startDrawing = (e: MouseEvent) => {
        setIsDrawing(true);
        if (!hasDrawn) setHasDrawn(true);
        draw(e);
    };

    const startDrawingMobile= (e:React.TouchEvent<HTMLCanvasElement>) =>{
        e.preventDefault();
        setIsDrawing(true);
        if(!hasDrawn) setHasDrawn(true);
        drawMobile(e);
    }

    const stopDrawing = () => {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext("2d");
        const maskCtx = maskCanvasRef.current?.getContext("2d");
        if (ctx) ctx.beginPath(); // Reset path
        if (maskCtx) maskCtx.beginPath();
    };

    const drawMobile = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;

        const ctx = canvas.getContext("2d");
        const maskCtx = maskCanvas.getContext("2d");
        if (!ctx || !maskCtx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const touch = e.touches[0];


        const x = (touch.clientX - rect.left) * scaleX;
        const y = (touch.clientY - rect.top) * scaleY;

        // UI Canvas (Red/Transparent)
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Mask Canvas (Opaque/Transparent)
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = "round";
        maskCtx.lineJoin = "round";

        if (tool === "pen") {
            // UI
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Green for "Keep"

            // Mask
            maskCtx.globalCompositeOperation = "source-over";
            maskCtx.strokeStyle = "black"; // Solid color
        } else {
            // UI
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";

            // Mask
            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.strokeStyle = "rgba(0,0,0,1)";
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        maskCtx.lineTo(x, y);
        maskCtx.stroke();
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);
    };

    const draw = (e: MouseEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;

        const ctx = canvas.getContext("2d");
        const maskCtx = maskCanvas.getContext("2d");
        if (!ctx || !maskCtx) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // UI Canvas (Red/Transparent)
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Mask Canvas (Opaque/Transparent)
        maskCtx.lineWidth = brushSize;
        maskCtx.lineCap = "round";
        maskCtx.lineJoin = "round";

        if (tool === "pen") {
            // UI
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "rgba(0, 255, 0, 0.5)"; // Green for "Keep"

            // Mask
            maskCtx.globalCompositeOperation = "source-over";
            maskCtx.strokeStyle = "black"; // Solid color
        } else {
            // UI
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";

            // Mask
            maskCtx.globalCompositeOperation = "destination-out";
            maskCtx.strokeStyle = "rgba(0,0,0,1)";
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);

        maskCtx.lineTo(x, y);
        maskCtx.stroke();
        maskCtx.beginPath();
        maskCtx.moveTo(x, y);
    };

    // Helper to get the masked image (Image clipped by Mask, on Black BG)
    const getMaskedImageBlob = async (): Promise<Blob | null> => {
        const maskCanvas = maskCanvasRef.current;
        if (!imageFile || !maskCanvas) return null;

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                const ctx = tempCanvas.getContext("2d");
                if (!ctx) { resolve(null); return; }

                // 1. Draw Image
                ctx.drawImage(img, 0, 0);

                // 2. Clip to Mask (Keep only what's drawn)
                ctx.globalCompositeOperation = "destination-in";
                ctx.drawImage(maskCanvas, 0, 0);

                // 3. Composite onto Black Background
                // We need another canvas or to composite 'source-over' onto a black canvas.
                // Easiest is to create a final canvas.
                const finalCanvas = document.createElement("canvas");
                finalCanvas.width = img.naturalWidth;
                finalCanvas.height = img.naturalHeight;
                const finalCtx = finalCanvas.getContext("2d");
                if (!finalCtx) { resolve(null); return; }

                // Black BG
                finalCtx.fillStyle = "black";
                finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

                // Draw Clipped Image
                finalCtx.drawImage(tempCanvas, 0, 0);

                finalCanvas.toBlob(resolve, "image/jpeg");
            };
            img.src = URL.createObjectURL(imageFile);
        });
    };

    const handlePreview = async () => {
        if (!imageFile) return;
        setLoading(true);

        const formData = new FormData();
        formData.append("threshold", threshold.toString());

        if (hasDrawn) {
            const maskedBlob = await getMaskedImageBlob();
            if (maskedBlob) {
                formData.append("image", maskedBlob, "masked_image.jpg");
            } else {
                formData.append("image", imageFile);
            }
        } else {
            formData.append("image", imageFile);
        }

        try {
            const res = await fetch(`${URL_Link}/preview_keypoints`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                // Try to parse error
                try {
                    const err = await res.json();
                    throw new Error(err.error || "Server error");
                } catch {
                    throw new Error(`Request failed with status ${res.status}`);
                }
            }

            const data = await res.json();
            if (data.keypoint_image) {
                setPreviewKeypointsImage(`data:image/jpeg;base64,${data.keypoint_image}`);
                setKeypointCount(data.count);
            }
        } catch (e: any) {
            console.error(e);
            alert("Preview failed: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // Auto-preview when image is loaded
    useEffect(() => {
        if (imageFile) {
            handlePreview();
        }
    }, [imageFile]);

    const handleRegister = async () => {
        if (!name || !imageFile) {
            alert("Please provide Name and Image");
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("threshold", threshold.toString());

        if (hasDrawn) {
            const maskedBlob = await getMaskedImageBlob();
            if (maskedBlob) {
                formData.append("image", maskedBlob, "masked_image.jpg");
            } else {
                formData.append("image", imageFile);
            }
        } else {
            formData.append("image", imageFile);
        }

        try {
            const response = await fetch(`${URL_Link}/register`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                try {
                    const err = await response.json();
                    throw new Error(err.error || "Registration failed");
                } catch {
                    throw new Error(`Request failed with status ${response.status}`);
                }
            }

            const data = await response.json();
            setMarkdownResult(`
# Registration Success ✅
**Product**: ${name}
**Status**: ${data.message}
**Features**: ${keypointCount ? keypointCount + " (from preview)" : "Unknown"}
`);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 pb-32 flex flex-col gap-8">
            <header>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">
                    Train / Register
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Manually segment the object and tune features.
                </p>
            </header>

            {markdownResult ? (
                <div className="animate-in fade-in slide-in-from-bottom-8">
                    <div className="prose dark:prose-invert bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <ReactMarkdown>{markdownResult}</ReactMarkdown>
                    </div>
                    <button
                        onClick={() => { setMarkdownResult(null); setImageFile(null); }}
                        className="mt-6 w-full py-3 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                    >
                        Register another
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* Name */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Product Name</label>
                        <input
                            className="px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                            placeholder="e.g. Doritos"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Image Upload */}
                    {!imageFile && (
                        <ImageInput
                            label="Reference Image"
                            multiple={false}
                            onChange={(file) => setImageFile(file ? file as File : null)}
                        />
                    )}

                    {/* Editor & Preview Area */}
                    {imagePreview && (
                        <div className="flex flex-col gap-4">
                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setTool("pen")}
                                        className={cn("p-2 rounded border transition-colors", tool === "pen" ? "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700" : "hover:bg-zinc-200 dark:hover:bg-zinc-800")}
                                        title="Draw to Keep"
                                    >
                                        <Pen className="w-4 h-4 text-green-700 dark:text-green-400" />
                                    </button>
                                    <button
                                        onClick={() => setTool("eraser")}
                                        className={cn("p-2 rounded border transition-colors", tool === "eraser" ? "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" : "hover:bg-zinc-200 dark:hover:bg-zinc-800")}
                                        title="Eraser"
                                    >
                                        <Eraser className="w-4 h-4 text-red-700 dark:text-red-400" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto px-2">
                                    <span className="text-xs font-medium whitespace-nowrap">Brush Size: {brushSize}px</span>
                                    <input
                                        type="range"
                                        min="50"
                                        max="200"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-full sm:w-32"
                                    />
                                </div>

                                <button onClick={() => setImageFile(null)} className="ml-auto text-red-500 text-sm font-medium hover:underline">
                                    Clear Image
                                </button>
                            </div>

                            <p className="text-xs text-zinc-500 text-center">
                                <span className="text-green-600 font-bold">TIP:</span> Everything you OVERLAY with GREEN will be kept. Everything else will be masked black.
                            </p>

                            <div className="relative border rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900 w-full h-[500px] flex items-center justify-center shadow-inner">
                                {/* Base Image */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imagePreview}
                                    onLoad={onImageLoad}
                                    alt="Reference"
                                    className="absolute max-w-full max-h-full object-contain pointer-events-none select-none"
                                />

                                {/* Overlay Canvas (UI) */}
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={stopDrawing}
                                    onMouseLeave={stopDrawing}
                                    onTouchMove={drawMobile}
                                    onTouchStart={startDrawingMobile}
                                    onTouchEnd={stopDrawing}
                                    style={{ touchAction: "none" }}
                                    className="absolute max-w-full max-h-full object-contain cursor-crosshair opacity-60"
                                />
                                {/* Hidden Mask Canvas */}
                                <canvas
                                    ref={maskCanvasRef}
                                    className="absolute max-w-full max-h-full z-11 object-contain pointer-events-none opacity-0"
                                    style={{ visibility: 'hidden' }}
                                />
                            </div>

                            {/* Tuning & Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-lg border space-y-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Feature Sensitivity</label>
                                        <span className="text-xs font-mono">{threshold.toFixed(3)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.01"
                                        max="0.2"
                                        step="0.005"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        className="w-full"
                                    />

                                    <button
                                        onClick={handlePreview}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-3 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition font-medium"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                        Update Preview
                                    </button>
                                </div>

                                <div className="bg-zinc-50 dark:bg-zinc-900/30 p-4 rounded-lg border flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Results</p>
                                        {keypointCount !== null ? (
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{keypointCount} <span className="text-sm font-normal text-zinc-500">features found</span></p>
                                        ) : (
                                            <p className="text-sm text-zinc-400 italic">No prediction yet</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleRegister}
                                        disabled={loading}
                                        className="mt-4 w-full h-12 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Register Product
                                    </button>
                                </div>
                            </div>

                            {/* Preview Result */}
                            {previewKeypointsImage && (
                                <div className="border rounded-lg overflow-hidden bg-black">
                                    <p className="bg-zinc-100 dark:bg-zinc-800 text-xs text-center py-1 font-mono uppercase tracking-widest text-zinc-500">Processed Image Preview</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewKeypointsImage} className="w-full object-contain max-h-[500px]" alt="Keypoints Preview" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* MLflow History */}
            <div className="mt-12 border-t pt-8">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium"
                >
                    <History className="w-4 h-4" />
                    {showHistory ? "Hide Version History" : "Show Version History (MLflow)"}
                </button>

                {showHistory && (
                    <div className="mt-4 border rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Products</th>
                                    <th className="px-4 py-3">Run ID</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {versions.map((v) => (
                                    <tr key={v.run_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                        <td className="px-4 py-3">{v.date}</td>
                                        <td className="px-4 py-3">{v.product_count}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{v.run_id.substring(0, 8)}...</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleRestore(v.run_id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-xs font-medium dark:bg-blue-900/20 dark:text-blue-400"
                                            >
                                                <Undo className="w-3 h-3" />
                                                Restore
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {versions.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No versions found in MLflow.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}