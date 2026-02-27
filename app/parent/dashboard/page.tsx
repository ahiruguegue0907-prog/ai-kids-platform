"use client";

import { Activity, Clock, ShieldCheck, FileText, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div className="py-6 font-sans">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">管理ダッシュボード</h1>
                    <p className="text-slate-500 mt-1">AIの利用状況や安全性の設定を確認できます。</p>
                </div>
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                    <ShieldCheck size={20} />
                    <span className="font-bold text-sm">セーフティガード有効</span>
                </div>
            </div>

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
                <motion.div variants={item} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600 mb-4">
                        <Clock size={24} className="text-blue-500" />
                        <span className="font-bold">本日の利用時間</span>
                    </div>
                    <div className="text-4xl font-extrabold text-slate-800">1 hr</div>
                    <div className="text-sm text-slate-400 mt-2">設定上限: 2時間/日</div>
                </motion.div>

                <motion.div variants={item} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-600 mb-4">
                        <Activity size={24} className="text-indigo-500" />
                        <span className="font-bold">AIへの質問数</span>
                    </div>
                    <div className="text-4xl font-extrabold text-slate-800">8 回</div>
                    <div className="text-sm text-slate-400 mt-2">よく話すテーマ: 自然科学</div>
                </motion.div>

                <motion.div variants={item} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-yellow-400">
                    <div className="flex items-center gap-3 text-slate-600 mb-4">
                        <AlertTriangle size={24} className="text-yellow-500" />
                        <span className="font-bold">ブロックされたアクセス</span>
                    </div>
                    <div className="text-4xl font-extrabold text-slate-800">0 回</div>
                    <div className="text-sm text-slate-400 mt-2">不適切な言葉や有害サイトの遮断数</div>
                </motion.div>
            </motion.div>

            <motion.div variants={item} initial="hidden" animate="show" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 text-slate-800 border-b border-slate-100 pb-4 mb-4">
                    <FileText size={24} className="text-slate-500" />
                    <h2 className="text-xl font-bold">最近の対話ログ (簡易版)</h2>
                </div>
                <div className="space-y-4">
                    {[
                        { time: "10:30", type: "質問", text: "どうして空は青いの？" },
                        { time: "10:32", type: "回答", text: "太陽の光について、わかりやすく説明しました。" },
                        { time: "10:45", type: "質問", text: "恐竜はいつからいたの？" },
                        { time: "10:47", type: "回答", text: "中生代についてのおはなしをしました。" },
                    ].map((log, i) => (
                        <div key={i} className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded-lg transition-colors">
                            <span className="text-slate-400 text-sm w-12 font-mono">{log.time}</span>
                            <span className={`text-xs px-2 py-1 rounded font-bold w-12 text-center ${log.type === "質問" ? "bg-slate-100 text-slate-600" : "bg-pink-50 text-pink-600"
                                }`}>
                                {log.type}
                            </span>
                            <span className="text-slate-700 text-sm flex-1">{log.text}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
