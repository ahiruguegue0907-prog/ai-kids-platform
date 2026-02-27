"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Plus, CheckCircle2, Loader2, Trash2, ArrowRight } from 'lucide-react';

export default function ParentOnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [childrenProfiles, setChildrenProfiles] = useState([
        { id: Date.now(), name: '', title: 'くん', grade: '', icon: '🐶' }
    ]);

    const ICONS = ['🐶', '🐱', '🐼', '🐰', '🦁', '🐻', '🐧', '🐬'];
    const GRADES = [
        '未就学児（3〜5歳）',
        '小学1年生',
        '小学2年生',
        '小学3年生',
        '小学4年生',
        '小学5年生',
        '小学6年生'
    ];

    const TITLES = [
        { label: 'くん', value: 'くん' },
        { label: 'ちゃん', value: 'ちゃん' },
        { label: 'さん', value: 'さん' },
        { label: 'よびすて', value: '' }
    ];

    // ログイン処理（モック）
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setStep(2);
        }, 1500);
    };

    // 子供フォームの追加
    const handleAddChild = () => {
        setChildrenProfiles([
            ...childrenProfiles,
            { id: Date.now(), name: '', title: 'くん', grade: '', icon: ICONS[Math.floor(Math.random() * ICONS.length)] }
        ]);
    };

    // 子供フォームの削除
    const handleRemoveChild = (id: number) => {
        if (childrenProfiles.length > 1) {
            setChildrenProfiles(childrenProfiles.filter(c => c.id !== id));
        }
    };

    // 子供フォームの更新
    const handleUpdateChild = (id: number, field: string, value: string) => {
        setChildrenProfiles(childrenProfiles.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ));
    };

    // 登録完了処理（モック）
    const handleSubmitProfiles = () => {
        if (childrenProfiles.length > 0 && childrenProfiles[0].name) {
            sessionStorage.setItem('currentChildName', childrenProfiles[0].name);
            sessionStorage.setItem('currentChildTitle', childrenProfiles[0].title);
            sessionStorage.setItem('currentChildGrade', childrenProfiles[0].grade);
            sessionStorage.setItem('currentChildIcon', childrenProfiles[0].icon);
            localStorage.setItem('allChildren', JSON.stringify(childrenProfiles));
        }
        setStep(3);
    };

    // Step 3になったら3秒後にホーム画面へ遷移
    useEffect(() => {
        if (step === 3) {
            const timer = setTimeout(() => {
                router.push('/home');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [step, router]);

    //
    // Step 1: ログイン画面
    //
    const renderStep1 = () => (
        <div className="max-w-md w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">保護者アカウントでログイン</h1>
                <p className="mt-2 text-sm text-gray-600">
                    お子様の学習状況の確認や、AIの設定を行うためのアカウントです。
                </p>
            </div>

            <div className="space-y-4 text-sm font-medium">
                <button
                    onClick={() => handleLogin({ preventDefault: () => { } } as React.FormEvent)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Googleでログイン
                </button>

                <button
                    onClick={() => handleLogin({ preventDefault: () => { } } as React.FormEvent)}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg shadow-sm bg-[#06C755] text-white hover:bg-[#05b34c] transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 3.738 8.885 8.956 9.619.349.076.818.232 1.05.545.21.282.253.684.225.992l-.18 1.085c-.046.284-.216 1.051.921.572 1.137-.478 6.136-3.614 8.665-6.393 1.554-1.706 2.363-3.955 2.363-6.42z" />
                    </svg>
                    LINEでログイン
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-50 text-gray-500">またはメールアドレスで</span>
                </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
                    <div className="mt-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition-all"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'メールでログイン'}
                </button>
            </form>

            <div className="pt-6">
                <div className="flex flex-col items-center justify-center gap-2 text-xs text-gray-500 text-center">
                    <div className="flex items-center gap-1.5 text-gray-600 pb-1">
                        <Lock className="w-4 h-4" />
                        <span className="font-medium">安心・安全な学習環境</span>
                    </div>
                    <p>
                        当サービスはCOPPA等の国際的な児童<br className="sm:hidden" />プライバシー保護基準に準拠しています
                    </p>
                </div>
            </div>
        </div>
    );

    //
    // Step 2: 子供の登録画面
    //
    const renderStep2 = () => (
        <div className="max-w-2xl w-full mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">お子様のプロフィールを作成</h1>
                <p className="mt-3 text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
                    年齢に合わせて、AIの話し方や漢字の多さを自動で最適化します。<br />
                    後から設定画面でいつでも変更・追加が可能です。
                </p>
            </div>

            <div className="space-y-6">
                {childrenProfiles.map((child, index) => (
                    <div key={child.id} className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-200 relative group transition-all">
                        {childrenProfiles.length > 1 && (
                            <button
                                onClick={() => handleRemoveChild(child.id)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                aria-label="削除"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}

                        <h3 className="text-lg font-medium text-gray-800 mb-6 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center">
                                {index + 1}
                            </span>
                            人目のプロフィール
                        </h3>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">おなまえ（ひらがな）</label>
                                <input
                                    type="text"
                                    value={child.name}
                                    onChange={(e) => handleUpdateChild(child.id, 'name', e.target.value)}
                                    placeholder="例: たろう"
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">よびかた</label>
                                <div className="flex flex-wrap gap-3">
                                    {TITLES.map(t => (
                                        <button
                                            key={t.label}
                                            onClick={() => handleUpdateChild(child.id, 'title', t.value)}
                                            className={`px-4 py-2 font-bold text-sm transition-all focus:outline-none 
                                            rounded-t-2xl rounded-br-2xl rounded-bl-sm
                                            ${child.title === t.value
                                                    ? 'bg-blue-500 text-white shadow-md scale-105 border-2 border-blue-600'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent hover:scale-105'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">年齢・学年</label>
                                <select
                                    value={child.grade}
                                    onChange={(e) => handleUpdateChild(child.id, 'grade', e.target.value)}
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white transition-colors"
                                >
                                    <option value="" disabled>選択してください</option>
                                    {GRADES.map(grade => (
                                        <option key={grade} value={grade}>{grade}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">アイコンを選択</label>
                                <div className="flex flex-wrap gap-3">
                                    {ICONS.map(icon => (
                                        <button
                                            key={icon}
                                            onClick={() => handleUpdateChild(child.id, 'icon', icon)}
                                            className={`w-14 h-14 text-2xl flex items-center justify-center rounded-full border-2 transition-all ${child.icon === icon
                                                ? 'border-blue-500 bg-blue-50 shadow-md scale-110'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-105'
                                                }`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-2">
                <button
                    onClick={handleAddChild}
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    もう一人追加する
                </button>
            </div>

            <div className="pt-8 border-t border-gray-200 mt-8">
                <button
                    onClick={handleSubmitProfiles}
                    disabled={childrenProfiles.some(c => !c.name || !c.grade)}
                    className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                    この内容で登録してはじめる
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );

    //
    // Step 3: 完了画面 (ローディング)
    //
    const renderStep3 = () => (
        <div className="max-w-md w-full mx-auto text-center space-y-6 pt-16 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex justify-center flex-col items-center">
                <div className="text-6xl mb-6 animate-bounce">
                    🎉
                </div>
                <h2 className="text-3xl font-bold text-gray-900">準備が完了しました！</h2>
            </div>
            <p className="text-lg text-gray-600">
                AIキッズのホーム画面へ移動します...
            </p>
            <div className="flex justify-center pt-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-100 selection:text-blue-900">
            <div className="w-full max-w-4xl mx-auto">

                {/* ヘッダー・ロゴ領域 */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4 shadow-sm">
                        <span className="font-bold text-xl flex items-center">
                            AI<span className="text-blue-200 text-sm ml-0.5">Kids</span>
                        </span>
                    </div>
                </div>

                {/* メインコンテンツ */}
                <div className="flex flex-col items-center w-full">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* ステップインジケーター (Step3以外で表示) */}
                {step < 3 && (
                    <div className="mt-14 flex justify-center items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${step === 1 ? 'bg-blue-600' : 'bg-blue-200'}`} />
                        <div className={`h-1 w-12 rounded-full transition-colors duration-500 ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                        <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${step === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    </div>
                )}
            </div>
        </div>
    );
}
