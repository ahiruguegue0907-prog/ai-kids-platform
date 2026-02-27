"use client";

import Link from "next/link";
import { Home, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
    const [showGate, setShowGate] = useState(false);
    const router = useRouter();

    const handleParentClick = () => {
        // Navigate to the gate route instead of a popup, or use a popup. 
        // Plan says "app/parent/gate/page.tsx", so we navigate there.
        router.push("/parent/gate");
    };

    return (
        <nav className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b-2 border-pink-100 sticky top-0 z-50">
            <Link href="/">
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 text-pink-500 font-bold text-xl"
                >
                    <div className="p-2 bg-pink-100 rounded-full">
                        <Home className="w-6 h-6" />
                    </div>
                    <span>ほーむ</span>
                </motion.div>
            </Link>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleParentClick}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors text-sm font-bold"
            >
                <ShieldAlert className="w-4 h-4" />
                <span>保護者の方へ</span>
            </motion.button>
        </nav>
    );
}
