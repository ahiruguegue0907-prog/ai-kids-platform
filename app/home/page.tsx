"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClerk, useUser } from '@clerk/nextjs';
import { MessageCircle, Search, Gamepad2, LogOut } from 'lucide-react';

interface ChildData {
    id: string;
    name: string;
    title: string;
    icon: string;
    grade: string;
}

export default function HomePage() {
    const router = useRouter();
    const { signOut } = useClerk();
    const { user, isLoaded: isUserLoaded } = useUser();

    const [childName, setChildName] = useState<string>('');
    const [childTitle, setChildTitle] = useState<string>('');
    const [childIcon, setChildIcon] = useState<string>('🐶');
    const [childGrade, setChildGrade] = useState<string>('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [siblingsList, setSiblingsList] = useState<ChildData[]>([]);

    // ── セッションストレージから子ども情報を復元（★ Clerkフォールバック付き）──
    useEffect(() => {
        const storedName = sessionStorage.getItem('currentChildName');
        const storedTitle = sessionStorage.getItem('currentChildTitle');
        const storedIcon = sessionStorage.getItem('currentChildIcon');
        const storedGrade = sessionStorage.getItem('currentChildGrade');

        if (storedName) {
            // sessionStorage にデータがある場合はそのまま使う
            setChildName(storedName);
            if (storedTitle !== null) setChildTitle(storedTitle);
            if (storedIcon) setChildIcon(storedIcon);
            if (storedGrade) setChildGrade(storedGrade);
        } else if (isUserLoaded && user) {
            // sessionStorage が空 → Clerk のメタデータから復元
            const profile = user.unsafeMetadata?.childProfile as {
                name?: string;
                grade?: string;
                emoji?: string;
            } | undefined;

            if (profile) {
                const name = profile.name || '';
                const grade = profile.grade || '';
                const icon = profile.emoji || '🐶';
                const title = 'くん';

                setChildName(name);
                setChildTitle(title);
                setChildIcon(icon);
                setChildGrade(grade);

                // 次回のために sessionStorage にも保存
                sessionStorage.setItem('currentChildName', name);
                sessionStorage.setItem('currentChildTitle', title);
                sessionStorage.setItem('currentChildGrade', grade);
                sessionStorage.setItem('currentChildIcon', icon);

                // localStorage の兄弟リストにも追加
                const childData = {
                    id: Date.now().toString(),
                    name,
                    title,
                    icon,
                    grade,
                };
                const existing = localStorage.getItem('allChildren');
                let children: { name: string }[] = [];
                try { children = existing ? JSON.parse(existing) : []; } catch (_) { /* ignore */ }
                if (!children.find((c) => c.name === childData.name)) {
                    children.push(childData);
                }
                localStorage.setItem('allChildren', JSON.stringify(children));
            }
        }

        const storedAll = localStorage.getItem('allChildren');
        if (storedAll) {
            try { setSiblingsList(JSON.parse(storedAll)); } catch (_) { /* ignore */ }
        }
    }, [isUserLoaded, user]);

    // ログアウト処理
    const handleLogout = async () => {
        setIsDropdownOpen(false);
        sessionStorage.clear();
        await signOut();
        router.push('/onboarding');
    };

    const handleSwitchChild = (child: ChildData) => {
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

    let theme = {
        bgColor: 'bg-slate-50',
        cardBorder: 'border border-gray-200',
        cardShadow: 'shadow-md shadow-gray-200',
        greeting: displayName
            ? `${displayName}、こんにちは。本日はどのような学習をサポートしましょうか？`
            : 'こんにちは。本日はどのような学習をサポートしましょうか？',
        iconSize: 32,
        titleClass: 'text-lg font-semibold text-gray-700',
        borderRadius: 'rounded-xl',
        aiButtonText: 'AI先生と話す',
        searchButtonText: '調べる',
        playButtonText: '遊ぶ'
    };

    if (isPreschooler) {
        theme = {
            bgColor: 'bg-pink-50',
            cardBorder: 'border-4 border-pink-200',
            cardShadow: 'shadow-lg shadow-pink-100',
            greeting: displayName
                ? `${displayName}、こんにちは！ きょうも いっしょに たのしく あそぼうね！`
                : 'こんにちは！ きょうも いっしょに たのしく あそぼうね！',
            iconSize: 56,
            titleClass: 'text-2xl font-black text-gray-800',
            borderRadius: 'rounded-[3rem]',
            aiButtonText: 'あいせんせいに\nきく',
            searchButtonText: 'しらべる',
            playButtonText: 'あそぶ'
        };
    } else if (isEarlyElementary) {
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
                                    {siblingsList.map((child: ChildData) => (
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

                                {/* 保護者メニュー */}
                                <div className="p-2 border-t border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <button
                                        onClick={() => router.push('/onboarding?mode=settings')}
                                        className="w-full text-center text-sm font-medium text-gray-600 py-2"
                                    >
                                        保護者メニュー（設定）
                                    </button>
                                </div>

                                {/* ログアウトボタン */}
                                <div className="p-2 border-t border-red-100 bg-red-50 hover:bg-red-100 transition-colors">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 py-2"
                                    >
                                        <LogOut size={16} />
                                        ログアウト
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
