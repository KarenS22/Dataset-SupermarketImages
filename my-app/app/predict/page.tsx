"use client";

import { useState } from "react";
import { ImageInput } from "@/components/ui/image-input";
import { ScanFace, Loader2 } from "lucide-react";


export default function PredictPage() {
    const URL_Link = "https://6wnwj9t1-5000.brs.devtunnels.ms/";
    const [image, setImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [cropImage, setCropImage] = useState<string | null>(null);

    const handlePredict = async () => {
        if (!image) return;

        setLoading(true);
        setResult(null);
        setCropImage(null);

        const formData = new FormData();
        formData.append("image", image);

        try {
            const response = await fetch(`${URL_Link}/predict`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Prediction failed");
            }

            const data = await response.json();

            if (data.label === 'Unknown') {
                setResult(`No match found (Matches: ${data.matches})`);
            } else {
                setResult(`Identified: ${data.label} (Matches: ${data.matches})`);
            }

            // SIFT prediction likely won't return a crop unless we implement homography cropping on backend.
            // For now, clear the crop image.
            setCropImage(null);

        } catch (error) {
            console.error(error);
            setResult("Error occurred during prediction.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Predict Image
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400">
                    Capture or upload an image to identify the product.
                </p>
            </header>

            <section className="flex flex-col gap-4">
                <ImageInput label="Product Image" onChange={setImage} />

                <button
                    onClick={handlePredict}
                    disabled={!image || loading}
                    className="w-full h-12 bg-zinc-900 text-white dark:bg-white dark:text-black rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <ScanFace className="w-5 h-5" />
                            Predict
                        </>
                    )}
                </button>
            </section>

            {result && (
                <div className="flex flex-col gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 animate-in fade-in slide-in-from-bottom-4">
                    <p className="font-semibold text-center text-lg">{result}</p>
                    {cropImage && (
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-sm opacity-80">Segmented Object:</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cropImage} alt="Segmented Crop" className="rounded-md border border-green-200 dark:border-green-700 max-h-48" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
