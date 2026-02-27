"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
    const router = useRouter();
    const [childName, setChildName] = useState<string>('');
    const [childTitle, setChildTitle] = useState<string>('');
    const [childIcon, setChildIcon] = useState<string>('🐶');
    const [childGrade, setChildGrade] = useState<string>('');

    // 1. State管理とRefの追加
    const [messages, setMessages] = useState<{ id: string, text: string, sender: 'user' | 'ai' }[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [siblingsList, setSiblingsList] = useState<any[]>([]);
    const [aiEmotion, setAiEmotion] = useState<'idle' | 'thinking' | 'happy'>('idle');
    const emotionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // sessionStorageからオンボーディングで入力した情報を取得
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
            try {
                setSiblingsList(JSON.parse(storedAll));
            } catch (e) { }
        }
    }, []);

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
    };

    const isPreschooler = childGrade === '未就学児（3〜5歳）' || childGrade === 'preschool';
    const isEarlyElementary = childGrade === '小学1年生' || childGrade === '小学2年生' || childGrade === 'grade1' || childGrade === 'grade2';

    // 背景色の決定
    const bgColor = isPreschooler ? 'bg-[#FFF5F7]' : (isEarlyElementary ? 'bg-[#F0F8FF]' : 'bg-[#F8F9FA]');

    // テキスト変換・振り分け
    const headerTitle = `${childName}${childTitle}、こんにちは！`;

    const initialAiMessage = isPreschooler
        ? "こんにちは！\nなにをおはなしする？"
        : isEarlyElementary
            ? "こんにちは！AIせんせいだよ。\nきょうはどんなことをおはなしする？"
            : "こんにちは！AI先生(せんせい)だよ。\n今日はどんなことをお話しする？";

    useEffect(() => {
        // 初期値として、AIの最初の挨拶をmessagesにセット
        setMessages(prev => {
            if (prev.length <= 1) {
                return [{ id: 'init', text: initialAiMessage, sender: 'ai' }];
            }
            return prev;
        });
    }, [initialAiMessage]);

    // 4. 自動スクロール機能の実装
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // 2. 送信アクションの実装
    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        // ユーザーのメッセージを追加
        setMessages(prev => [...prev, { id: Date.now().toString(), text: inputValue, sender: 'user' }]);
        setInputValue('');
        setIsTyping(true);
        setAiEmotion('thinking');

        if (emotionTimeoutRef.current) clearTimeout(emotionTimeoutRef.current);

        // AIのモック返答
        setTimeout(() => {
            let aiReply = '';
            if (isPreschooler) {
                const replies = ["いいね！", "すごい", "そうなんだ", "わかった", "えー！", "なるほど"];
                aiReply = replies[Math.floor(Math.random() * replies.length)];
            } else if (isEarlyElementary) {
                aiReply = "それはとても面白(おもしろ)いね！もっと教(おし)えてくれるかな？";
            } else {
                aiReply = "なるほど、それは興味深いですね！もっと詳しく教えてください。";
            }

            setMessages(prev => [...prev, { id: Date.now().toString(), text: aiReply, sender: 'ai' }]);
            setIsTyping(false);
            setAiEmotion('happy');

            emotionTimeoutRef.current = setTimeout(() => {
                setAiEmotion('idle');
            }, 2000);
        }, 1500);
    };

    const getAiIcon = (isLatest: boolean) => {
        if (!isLatest || aiEmotion === 'idle') return '🤖';
        if (aiEmotion === 'thinking') return '🤔';
        if (aiEmotion === 'happy') return '😆';
        return '🤖';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // エンターキー送信（変換中でないこと）
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 3. 年齢別（grade）の吹き出しデザイン動的変更
    let bubbleBaseClasses = "text-base sm:text-lg rounded-xl"; // Default for grade3+
    if (isPreschooler) {
        bubbleBaseClasses = "text-xl rounded-3xl";
    } else if (isEarlyElementary) {
        bubbleBaseClasses = "text-lg rounded-2xl";
    }

    return (
        <div className={`min-h-screen ${bgColor} flex flex-col font-sans transition-colors duration-500`}>
            {/* Header */}
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
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                {childGrade || '学年未設定'}
                            </span>
                        </div>
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
                                                <span className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">{child.icon}</span>
                                                <div>
                                                    <div className="font-semibold text-gray-800">{child.name}{child.title}</div>
                                                    <div className="text-xs text-gray-500">{child.grade}</div>
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

            {/* Main Chat Area */}
            <main className="flex-1 w-full max-w-4xl mx-auto pt-28 pb-28 px-4 sm:px-6 flex flex-col gap-6 overflow-y-auto">
                {messages.map((msg, index) => {
                    const isLatestAi = msg.sender === 'ai' && index === messages.length - 1 && !isTyping;

                    return (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-sm border transition-colors ${msg.sender === 'ai'
                                    ? (isLatestAi && aiEmotion === 'happy' ? 'bg-yellow-100 border-yellow-200' : 'bg-gray-100 border-gray-200')
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
                    )
                })}

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

            {/* Message Input Bottom Bar */}
            <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 pb-6 sm:pb-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isPreschooler ? "めっせーじ..." : "メッセージを入力..."}
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
