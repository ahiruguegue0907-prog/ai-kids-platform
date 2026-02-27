"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ParentGate() {
    const router = useRouter();
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState(false);

    // Mock quiz: 8 x 7 = 56
    const num1 = 8;
    const num2 = 7;
    const correctAnswer = num1 * num2;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (parseInt(answer) === correctAnswer) {
            router.push("/parent/dashboard");
        } else {
            setError(true);
            setAnswer("");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-2 bg-slate-800" />

                <div className="flex justify-center mb-6">
                    <div className="bg-slate-100 p-4 rounded-full text-slate-700">
                        <Lock size={32} />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">
                    保護者専用ページ
                </h1>
                <p className="text-center text-slate-500 mb-8 text-sm">
                    これより先は保護者向けの管理画面です。アクセスするには以下の掛け算の答えを入力してください。
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-3xl font-bold text-slate-700 tracking-widest">
                            {num1} × {num2} = ?
                        </div>

                        <input
                            type="number"
                            value={answer}
                            onChange={(e) => {
                                setAnswer(e.target.value);
                                setError(false);
                            }}
                            className="text-center text-2xl p-4 w-full md:w-3/4 rounded-xl border-2 border-slate-200 focus:border-slate-800 focus:ring-0 outline-none transition-colors"
                            placeholder="答え"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-red-500 justify-center text-sm font-bold bg-red-50 p-3 rounded-lg"
                        >
                            <AlertCircle size={16} />
                            <span>答えが間違っています</span>
                        </motion.div>
                    )}

                    <button
                        type="submit"
                        disabled={!answer}
                        className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white p-4 rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <span>確認して進む</span>
                        <ArrowRight size={20} />
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
