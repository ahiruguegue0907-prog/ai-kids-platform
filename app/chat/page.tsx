"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ============================================================
// 学年グループ判定ヘルパー（9学年 → 3グループ）
// ============================================================
const PRESCHOOL_GRADES = ['年少（3歳）', '年中（4歳）', '年長（5歳）'];
const LOWER_GRADES = ['小学1年生', '小学2年生'];
// 小学3〜6年生は UPPER（デフォルト）

type GradeGroup = 'preschool' | 'lower' | 'upper';

function getGradeGroup(grade: string): GradeGroup {
    if (PRESCHOOL_GRADES.includes(grade)) return 'preschool';
    if (LOWER_GRADES.includes(grade)) return 'lower';
    return 'upper';
}

// 学年バッジのカラークラス（ヘッダー右上）
function getGradeBadgeStyle(grade: string): string {
    if (PRESCHOOL_GRADES.includes(grade))
        return 'text-orange-600 bg-orange-50 border border-orange-100';
    if (LOWER_GRADES.includes(grade))
        return 'text-blue-600 bg-blue-50 border border-blue-100';
    if (grade === '小学3年生' || grade === '小学4年生')
        return 'text-green-600 bg-green-50 border border-green-100';
    return 'text-purple-600 bg-purple-50 border border-purple-100';
}

// 学年別 初期あいさつメッセージ
function getInitialMessage(grade: string): string {
    switch (grade) {
        case '年少（3歳）':
            return 'こんにちは！🌸\nなにをおはなしする？';
        case '年中（4歳）':
            return 'こんにちは！✨\nきょう、なにがきになる？';
        case '年長（5歳）':
            return 'こんにちは！⭐\nきょうはどんなことをおはなしする？';
        case '小学1年生':
            return 'こんにちは！AIせんせいだよ。\nきょうはどんなことをおはなしする？';
        case '小学2年生':
            return 'こんにちは！AIせんせいだよ。\nきょうはどんなことを話したい？';
        case '小学3年生':
            return 'こんにちは！AI先生だよ。\n今日はどんなことを話したい？';
        case '小学4年生':
            return 'こんにちは！AI先生だよ。\n今日はどんなことについて考えてみる？';
        case '小学5年生':
            return 'こんにちは！AI先生だよ。\n今日はどんなテーマで話してみる？';
        case '小学6年生':
            return 'こんにちは！AI先生だよ。\n今日はどんな話題に挑戦してみようか？';
        default:
            return 'こんにちは！AI先生だよ。\n今日はどんなことをお話しする？';
    }
}

// 学年グループ別 エラーメッセージ
function getErrorMessage(gradeGroup: GradeGroup): string {
    if (gradeGroup === 'preschool') return 'ごめんね！もう一回いってみて？🌸';
    if (gradeGroup === 'lower') return 'ごめんね、うまくきけなかった！もう一度おしえて？';
    return '申し訳ありません、もう一度試してみてください。';
}

// ============================================================

export default function ChatPage() {
    const router = useRouter();
    const [childName, setChildName] = useState<string>('');
    const [childTitle, setChildTitle] = useState<string>('');
    const [childIcon, setChildIcon] = useState<string>('🐶');
    const [childGrade, setChildGrade] = useState<string>('');

    const [messages, setMessages] = useState<{ id: string; text: string; sender: 'user' | 'ai' }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [siblingsList, setSiblingsList] = useState<any[]>([]);
    const [aiEmotion, setAiEmotion] = useState<'idle' | 'thinking' | 'happy'>('idle');
    const emotionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── セッションストレージから子ども情報を復元 ──────────────────
    useEffect(() => {
        const storedName = sessionStorage.getItem('currentChildName');
        const storedTitle = sessionStorage.getItem('currentChildTitle');
        const storedIcon = sessionStorage.getItem('currentChildIcon');
        const storedGrade = sessionStorage.getItem('currentChildGrade');

        if (storedName) setChildName(storedName);
        if (storedTitle !== null) setChildTitle(storedTitle);
        if (storedIcon) setChildIcon(storedIcon);
        if (storedGrade) setChildGrade(storedGrade);

        const storedAll = localStorage.getItem('allChildren');
        if (storedAll) {
            try { setSiblingsList(JSON.parse(storedAll)); } catch (_) { }
        }
    }, []);

    // ── アカウント切り替え ────────────────────────────────────────
    const handleSwitchChild = (child: any) => {
        sessionStorage.setItem('currentChildName', child.name);
        sessionStorage.setItem('currentChildTitle', child.title);
        sessionStorage.setItem('currentChildGrade', child.grade);
        sessionStorage.setItem('currentChildIcon', child.icon);
        setChildName(child.name);
        setChildTitle(child.title);
        setChildGrade(child.grade);
        setChildIcon(child.icon);
        setIsDropdownOpen(false);
        // アカウント切替時はメッセージをリセット
        setMessages([]);
    };

    // ── 学年グループ判定（UI表示の切り替えに使用）─────────────────
    const gradeGroup = getGradeGroup(childGrade);
    const isPreschooler = gradeGroup === 'preschool';
    const isLowerElementary = gradeGroup === 'lower';   // 小1・小2

    // ── 背景色（学年グループ別）──────────────────────────────────
    const bgColor = isPreschooler
        ? 'bg-[#FFF5F7]'         // 暖かいピンク（未就学児）
        : isLowerElementary
            ? 'bg-[#F0F8FF]'     // 淡いブルー（小1・小2）
            : 'bg-[#F8F9FA]';    // ニュートラルグレー（小3〜6）

    // ── ヘッダータイトル ────────────────────────────────────────
    const headerTitle = `${childName}${childTitle}、こんにちは！`;

    // ── 初期メッセージ（学年変更時に更新）──────────────────────
    const initialAiMessage = getInitialMessage(childGrade);

    useEffect(() => {
        setMessages(prev => {
            if (prev.length <= 1) {
                return [{ id: 'init', text: initialAiMessage, sender: 'ai' }];
            }
            return prev;
        });
    }, [initialAiMessage]);

    // ── メッセージ末尾へ自動スクロール ──────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // ============================================================
    // メッセージ送信（Gemini API 呼び出し）
    // ============================================================
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isTyping) return;

        const userMessage = inputValue.trim();
        const userMsg = {
            id: Date.now().toString(),
            text: userMessage,
            sender: 'user' as const,
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);
        setAiEmotion('thinking');

        if (emotionTimeoutRef.current) clearTimeout(emotionTimeoutRef.current);

        try {
            const currentHistory = messages;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    grade: childGrade,
                    history: currentHistory,
                }),
            });

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const aiReply = data.reply || getErrorMessage(gradeGroup);

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: aiReply,
                sender: 'ai',
            }]);
            setAiEmotion('happy');

        } catch (_) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                text: getErrorMessage(gradeGroup),
                sender: 'ai',
            }]);
            setAiEmotion('idle');
        } finally {
            setIsTyping(false);
            emotionTimeoutRef.current = setTimeout(() => setAiEmotion('idle'), 2000);
        }
    };
    // ============================================================

    const getAiIcon = (isLatest: boolean) => {
        if (!isLatest || aiEmotion === 'idle') return '🤖';
        if (aiEmotion === 'thinking') return '🤔';
        if (aiEmotion === 'happy') return '😆';
        return '🤖';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // バブルのベーススタイル（学年グループ別）
    const bubbleBaseClasses = isPreschooler
        ? 'text-xl rounded-3xl'
        : isLowerElementary
            ? 'text-lg rounded-2xl'
            : 'text-base sm:text-lg rounded-xl';

    // テキスト入力プレースホルダー（学年グループ別）
    const placeholder = isPreschooler
        ? 'めっせーじ...'
        : isLowerElementary
            ? 'メッセージをおくる...'
            : 'メッセージを入力...';

    // ヘッダーの学年バッジカラー
    const gradeBadgeStyle = getGradeBadgeStyle(childGrade);

    return (
        <div className={`min-h-screen ${bgColor} flex flex-col font-sans transition-colors duration-500`}>

            {/* ── ヘッダー ───────────────────────────────────────── */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-6 fixed top-0 w-full z-10 border-b border-gray-100">
                <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/home')}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-600 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm"
                        >
                            <span className="sr-only">戻る</span>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                            {childName ? headerTitle : 'こんにちは！'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* 学年バッジ（学年グループ別カラー）*/}
                        <div className="hidden sm:flex flex-col items-end">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${gradeBadgeStyle}`}>
                                {childGrade || '学年未設定'}
                            </span>
                        </div>

                        {/* アイコン＆ドロップダウン */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl shadow-sm border border-blue-200 hover:ring-2 hover:ring-blue-300 transition-all"
                            >
                                {childIcon}
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-700">
                                        アカウントをきりかえる
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {siblingsList.map((child: any) => (
                                            <button
                                                key={child.id}
                                                onClick={() => handleSwitchChild(child)}
                                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                                                    {child.icon}
                                                </span>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{child.name}{child.title}</div>
                                                    <div className={`text-xs px-1.5 py-0.5 rounded mt-0.5 inline-block ${getGradeBadgeStyle(child.grade)}`}>
                                                        {child.grade}
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <button
                                            onClick={() => router.push('/onboarding')}
                                            className="w-full text-center text-sm font-medium text-gray-600 py-2"
                                        >
                                            保護者メニュー（設定）
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── メインチャットエリア ───────────────────────────── */}
            <main className="flex-1 w-full max-w-4xl mx-auto pt-28 pb-28 px-4 sm:px-6 flex flex-col gap-6 overflow-y-auto">
                {messages.map((msg, index) => {
                    const isLatestAi = msg.sender === 'ai' && index === messages.length - 1 && !isTyping;

                    return (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-sm border transition-colors ${msg.sender === 'ai'
                                    ? (isLatestAi && aiEmotion === 'happy'
                                        ? 'bg-yellow-100 border-yellow-200'
                                        : 'bg-gray-100 border-gray-200')
                                    : 'bg-blue-100 border-blue-200'
                                }`}>
                                {msg.sender === 'ai' ? getAiIcon(isLatestAi) : childIcon}
                            </div>

                            <div className={`p-4 sm:p-5 shadow-sm border max-w-[85%] sm:max-w-[75%] ${bubbleBaseClasses} ${msg.sender === 'ai'
                                    ? 'bg-white border-gray-100 text-gray-800 rounded-tl-none'
                                    : 'bg-[#4285F4] border-blue-500 text-white rounded-tr-none'
                                }`}>
                                <p className="leading-relaxed whitespace-pre-wrap font-medium">
                                    {msg.text}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {/* タイピングインジケーター */}
                {isTyping && (
                    <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-sm border bg-gray-100 border-gray-200 ${aiEmotion === 'thinking' ? 'animate-pulse' : ''}`}>
                            {getAiIcon(true)}
                        </div>
                        <div className={`p-4 sm:p-5 shadow-sm border max-w-[85%] sm:max-w-[75%] bg-white border-gray-100 text-gray-800 rounded-tl-none ${bubbleBaseClasses}`}>
                            <div className="flex space-x-1.5 items-center h-6 px-2">
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* ── 入力フッター ───────────────────────────────────── */}
            <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 pb-6 sm:pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 py-3 px-5 sm:py-4 sm:px-6 bg-gray-100 border border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 font-medium md:text-lg"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="bg-[#4285F4] text-white w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all shadow-md flex-shrink-0"
                    >
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 transform rotate-90 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
            </footer>
        </div>
    );
}
