import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface BigButtonProps {
    icon: React.ReactNode;
    label: React.ReactNode;
    subLabel?: string;
    onClick?: () => void;
    color: "pink" | "blue" | "green" | "yellow" | "purple";
    className?: string;
}

const colorMap = {
    pink: "bg-pink-100 border-pink-300 text-pink-700 hover:bg-pink-200",
    blue: "bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200",
    green: "bg-green-100 border-green-300 text-green-700 hover:bg-green-200",
    yellow: "bg-yellow-100 border-yellow-300 text-yellow-700 hover:bg-yellow-200",
    purple: "bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200",
};

export function BigButton({ icon, label, subLabel, onClick, color, className = "" }: BigButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`relative flex flex-col items-center justify-center p-8 rounded-3xl border-4 shadow-sm transition-colors duration-200 ${colorMap[color]} ${className}`}
        >
            <div className="mb-4 text-5xl">
                {icon}
            </div>
            <span className="text-2xl font-bold tracking-wide">{label}</span>
            {subLabel && <span className="mt-2 text-sm opacity-80">{subLabel}</span>}
        </motion.button>
    );
}
