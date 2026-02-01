"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanFace, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-black p-4 pb-8 md:pb-4 flex justify-around items-center z-50">
            <Link
                href="/predict"
                className={cn(
                    "flex flex-col items-center gap-1 text-sm font-medium transition-colors",
                    pathname === "/predict" || pathname === "/"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
            >
                <ScanFace className="w-6 h-6" />
                <span>Predict</span>
            </Link>
            <Link
                href="/train"
                className={cn(
                    "flex flex-col items-center gap-1 text-sm font-medium transition-colors",
                    pathname === "/train"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
            >
                <BrainCircuit className="w-6 h-6" />
                <span>Train</span>
            </Link>
        </div>
    );
}
