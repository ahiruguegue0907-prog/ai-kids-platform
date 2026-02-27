"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Search, Gamepad2 } from 'lucide-react';

export default function HomePage() {
    const router = useRouter();
    const [childName, setChildName] = useState<string>('');
    const [childTitle, setChildTitle] = useState<string>('');
    const [childIcon, setChildIcon] = useState<string>('🐶');
    const [childGrade, setChildGrade] = useState<string>('');

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [siblingsList, setSiblingsList] = useState<any[]>([]);

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

    const isPreschooler = childGrade === '未就学児（3〜5歳）';
    const isEarlyElementary = childGrade === '小学1年生' || childGrade === '小学2年生';

    const displayName = childName ? `${childName}${childTitle}` : '';

    // 年齢別UIテーマ設定
    let theme = {
        bgColor: 'bg-slate-50', // 小学3年生以上のデフォルト
        cardBorder: 'border border-gray-200',
        cardShadow: 'shadow-md shadow-gray-200',
        greeting: displayName
            ? `${displayName}、こんにちは。本日はどのような学習をサポートしましょうか？ 以下のメニューから選択してください。`
            : 'こんにちは。本日はどのような学習をサポートしましょうか？ 以下のメニューから選択してください。',
        iconSize: 32,
        titleClass: 'text-lg font-semibold text-gray-700',
        borderRadius: 'rounded-xl',
        aiButtonText: 'AI先生と話す',
        searchButtonText: '調べる',
        playButtonText: '遊ぶ'
    };

    if (isPreschooler) {
        // 未就学児向け：温かみ・極端な大きさ
        theme = {
            bgColor: 'bg-pink-50',
            cardBorder: 'border-4 border-pink-200',
            cardShadow: 'shadow-lg shadow-pink-100',
            greeting: displayName
                ? `${displayName}、こんにちは！ きょうも いっしょに たのしく あそぼうね！ なにから はじめる？`
                : 'こんにちは！ きょうも いっしょに たのしく あそぼうね！ なにから はじめる？',
            iconSize: 56,
            titleClass: 'text-2xl font-black text-gray-800',
            borderRadius: 'rounded-[3rem]', // とても丸く
            aiButtonText: 'あいせんせいに\nきく',
            searchButtonText: 'しらべる',
            playButtonText: 'あそぶ'
        };
    } else if (isEarlyElementary) {
        // 小学校低学年向け：元気・冒険心
        theme = {
            bgColor: 'bg-sky-50',
            cardBorder: 'border-2 border-sky-300',
            cardShadow: 'shadow-md shadow-sky-200',
            greeting: displayName
                ? `${displayName}、こんにちは！きょうは何をする？`
                : 'こんにちは！きょうは何をする？',
            iconSize: 48,
            titleClass: 'text-xl font-bold text-gray-800',
            borderRadius: 'rounded-3xl',
            aiButtonText: 'AIせんせいと\nはなす',
            searchButtonText: 'しらべる',
            playButtonText: 'あそぶ'
        };
    }

    return (
        <div className={`min-h-screen ${theme.bgColor} flex flex-col font-sans transition-colors duration-500`}>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm py-4 px-6 sticky top-0 z-10 w-full animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <h1 className="text-lg md:text-xl font-bold text-gray-800 leading-relaxed pr-4">
                        {theme.greeting}
                    </h1>
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-12 h-12 bg-blue-100 flex items-center justify-center text-2xl shadow-sm border border-blue-200 rounded-full flex-shrink-0 hover:ring-2 hover:ring-blue-300 transition-all"
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
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-6 sm:p-8 flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-700 delay-150">
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {/* Ask AI Teacher Card (Main Action) */}
                    <button
                        onClick={() => router.push('/chat')}
                        className={`group relative flex flex-col items-center justify-center gap-6 bg-white ${theme.cardBorder} ${theme.cardShadow} ${theme.borderRadius} p-8 aspect-square md:aspect-auto md:min-h-[300px] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center`}
                    >
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-pink-50 ${theme.borderRadius} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-100`}>
                            <MessageCircle size={theme.iconSize} className="text-pink-500" fill="currentColor" />
                        </div>
                        <h2 className={`${theme.titleClass} tracking-wide whitespace-pre-wrap`}>
                            {theme.aiButtonText}
                        </h2>
                    </button>

                    {/* Research Card */}
                    <button
                        className={`group relative flex flex-col items-center justify-center gap-6 bg-white ${theme.cardBorder} ${theme.cardShadow} ${theme.borderRadius} p-8 aspect-square md:aspect-auto md:min-h-[300px] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center`}
                    >
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-emerald-50 ${theme.borderRadius} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-100`}>
                            <Search size={theme.iconSize} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <h2 className={`${theme.titleClass} tracking-wide`}>
                            {theme.searchButtonText}
                        </h2>
                    </button>

                    {/* Play Card */}
                    <button
                        className={`group relative flex flex-col items-center justify-center gap-6 bg-white ${theme.cardBorder} ${theme.cardShadow} ${theme.borderRadius} p-8 aspect-square md:aspect-auto md:min-h-[300px] hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center`}
                    >
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 bg-orange-50 ${theme.borderRadius} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-100`}>
                            <Gamepad2 size={theme.iconSize} className="text-orange-500" fill="currentColor" strokeWidth={0} />
                        </div>
                        <h2 className={`${theme.titleClass} tracking-wide`}>
                            {theme.playButtonText}
                        </h2>
                    </button>
                </div>
            </main>
        </div>
    );
}
