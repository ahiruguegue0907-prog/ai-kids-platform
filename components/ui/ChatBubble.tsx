import { motion } from "framer-motion";

interface ChatBubbleProps {
    message: string;
    isAi: boolean;
}

export const ChatBubble = ({ message, isAi }: ChatBubbleProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full ${isAi ? "justify-start" : "justify-end"}`}
        >
            <div className={`flex flex-col gap-1 max-w-[80%] ${isAi ? "items-start" : "items-end"}`}>
                <div className="flex items-center gap-2">
                    {isAi && <span className="text-2xl">🤖</span>}
                </div>

                {/* ★ここに whitespace-pre-wrap を追加しました！これで改行が反映されます★ */}
                <div
                    className={`p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${isAi
                            ? "bg-white border border-pink-100 text-slate-700 shadow-sm rounded-tl-sm"
                            : "bg-blue-500 text-white shadow-md rounded-tr-sm"
                        }`}
                >
                    {message}
                </div>
            </div>
        </motion.div>
    );
};