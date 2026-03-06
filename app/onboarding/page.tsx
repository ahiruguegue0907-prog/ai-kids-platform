'use client';

import { useState, useEffect } from 'react';
import { useUser, useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// ── 型定義
interface ChildProfile {
  name: string;
  grade: string;
  emoji: string;
  color: string;
}

interface ChildData {
  id: string;
  name: string;
  title: string;
  icon: string;
  grade: string;
}

// ── 学年オプション
const GRADE_OPTIONS = [
  { value: '年少（3歳）', emoji: '🐣', color: '#FFE4E1', group: '幼児' },
  { value: '年中（4歳）', emoji: '🐥', color: '#FFF3CD', group: '幼児' },
  { value: '年長（5歳）', emoji: '🌟', color: '#E8F5E9', group: '幼児' },
  { value: '小学1年生', emoji: '🐶', color: '#E3F2FD', group: '小学校' },
  { value: '小学2年生', emoji: '🐱', color: '#F3E5F5', group: '小学校' },
  { value: '小学3年生', emoji: '🐰', color: '#E0F7FA', group: '小学校' },
  { value: '小学4年生', emoji: '🦊', color: '#FFF8E1', group: '小学校' },
  { value: '小学5年生', emoji: '🦁', color: '#FCE4EC', group: '小学校' },
  { value: '小学6年生', emoji: '🚀', color: '#E8EAF6', group: '小学校' },
] as const;

const STEPS = ['ログイン', 'お子さまの情報', '完了'] as const;

export default function ParentOnboardingPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const router = useRouter();

  // モード管理: 'onboarding' | 'settings' | 'edit' | 'add'
  const [mode, setMode] = useState<'onboarding' | 'settings' | 'edit' | 'add'>('onboarding');
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0);
  const [email, setEmail] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [childName, setChildName] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [childrenList, setChildrenList] = useState<ChildData[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

useEffect(() => {
  if (isLoaded && isSignedIn) {
    const params = new URLSearchParams(window.location.search);
    const isSettingsMode = params.get('mode') === 'settings';

    // localStorage から子どもリストを読み込み
    const stored = localStorage.getItem('allChildren');
    let children: ChildData[] = [];
    try { children = stored ? JSON.parse(stored) : []; } catch (_) { /* ignore */ }

    // localStorage が空なら Clerk から復元
    if (children.length === 0) {
      const meta = user?.unsafeMetadata;
      // 新形式（配列）
      const profiles = meta?.childProfiles as ChildProfile[] | undefined;
      if (profiles && Array.isArray(profiles) && profiles.length > 0) {
        children = profiles.map((p, i) => ({
          id: `clerk-${i}`,
          name: p.name,
          title: 'くん',
          icon: p.emoji,
          grade: p.grade,
        }));
      } else {
        // 旧形式（単一オブジェクト）からの移行
        const single = meta?.childProfile as ChildProfile | undefined;
        if (single && single.name) {
          children = [{
            id: 'clerk-0',
            name: single.name,
            title: 'くん',
            icon: single.emoji,
            grade: single.grade,
          }];
        }
      }
      if (children.length > 0) {
        localStorage.setItem('allChildren', JSON.stringify(children));
      }
    }

    setChildrenList(children);

    if (isSettingsMode) {
      setMode('settings');
    } else {
      const completed = user?.unsafeMetadata?.onboardingCompleted;
      if (completed) {
        router.push('/chat');
      } else {
        setMode('onboarding');
        setCurrentStep(1);
      }
    }
  }
}, [isLoaded, isSignedIn, user, router]);

  const selectedGradeOption = GRADE_OPTIONS.find(g => g.value === selectedGrade);

  // ── ストレージ保存ヘルパー
  const saveChildToStorage = (child: ChildData, oldName?: string) => {
    const stored = localStorage.getItem('allChildren');
    let children: ChildData[] = [];
    try { children = stored ? JSON.parse(stored) : []; } catch (_) { /* ignore */ }

    if (oldName) {
      // 編集: 古い名前のエントリを置き換え
      children = children.map(c => c.name === oldName ? child : c);
    } else {
      // 新規追加: 同名がなければ追加
      if (!children.find(c => c.name === child.name)) {
        children.push(child);
      }
    }
    localStorage.setItem('allChildren', JSON.stringify(children));
    setChildrenList(children);
    return children;
  };

  const deleteChildFromStorage = (index: number) => {
    const stored = localStorage.getItem('allChildren');
    let children: ChildData[] = [];
    try { children = stored ? JSON.parse(stored) : []; } catch (_) { /* ignore */ }
    children.splice(index, 1);
    localStorage.setItem('allChildren', JSON.stringify(children));
    setChildrenList(children);
  };

  const setActiveChild = (child: ChildData) => {
    sessionStorage.setItem('currentChildName', child.name);
    sessionStorage.setItem('currentChildTitle', child.title);
    sessionStorage.setItem('currentChildGrade', child.grade);
    sessionStorage.setItem('currentChildIcon', child.icon);
  };

// ── Clerk メタデータ更新（複数プロフィール対応）
const updateClerkProfiles = async (children: ChildData[]) => {
  if (!user) return;
  const profiles: ChildProfile[] = children.map(c => {
    const gradeOpt = GRADE_OPTIONS.find(g => g.value === c.grade);
    return {
      name: c.name,
      grade: c.grade,
      emoji: gradeOpt?.emoji || c.icon,
      color: gradeOpt?.color || '#E3F2FD',
    };
  });
  await user.update({
    unsafeMetadata: {
      ...user.unsafeMetadata,
      childProfiles: profiles,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
    },
  });
};

  // ── ステップインジケーター
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${idx < currentStep ? 'bg-green-400 text-white' : idx === currentStep ? 'bg-purple-500 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-400'}`}>
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <span className={`text-xs mt-1 ${idx === currentStep ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>{label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`w-10 h-0.5 mb-4 transition-all duration-300 ${idx < currentStep ? 'bg-green-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // STEP 0 ： ログイン画面
  // ─────────────────────────────────────────────────────────
  const handleGoogleLogin = () => {
    if (!signInLoaded || !signIn) return;
    signIn.authenticateWithRedirect({
      strategy: 'oauth_google',
      redirectUrl: '/onboarding',
      redirectUrlComplete: '/onboarding',
    });
  };

  const handleLineLogin = () => {
    if (!signInLoaded || !signIn) return;
    signIn.authenticateWithRedirect({
      strategy: 'oauth_line',
      redirectUrl: '/onboarding',
      redirectUrlComplete: '/onboarding',
    });
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !signInLoaded || !signIn) return;
    setIsEmailSending(true);
    setError('');
    try {
      await signIn.create({
        strategy: 'email_link',
        identifier: email.trim(),
        redirectUrl: `${window.location.origin}/onboarding`,
      });
      setEmailSent(true);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message?: string }> };
      setError(e?.errors?.[0]?.message ?? 'エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsEmailSending(false);
    }
  };

  const renderStep0 = () => (
    <div className="space-y-5">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔐</div>
        <h2 className="text-xl font-bold text-gray-800">保護者アカウントでログイン</h2>
        <p className="text-sm text-gray-500 mt-1">お子さまの学習状況の確認や、AIの設定を行うためのアカウントです。</p>
      </div>
      <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-50 active:scale-95 transition-all duration-200 text-gray-700 font-semibold">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Googleでログイン
      </button>
      <button onClick={handleLineLogin} className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-[#06C755] hover:bg-[#05a847] active:scale-95 transition-all duration-200 text-white font-semibold">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
        LINEでログイン
      </button>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">またはメールアドレスで</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      {!emailSent ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">メールアドレス</label>
            <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-gray-800" />
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">⚠️ {error}</div>}
          <button onClick={handleEmailLogin} disabled={!email.trim() || isEmailSending} className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed">
            {isEmailSending ? '送信中...' : 'メールでログイン'}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-3xl mb-2">📧</div>
          <p className="text-sm font-semibold text-green-700">ログインリンクを送りました！</p>
          <p className="text-xs text-green-600 mt-1">{email} のメールを確認してください。</p>
        </div>
      )}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-400">🔒 安心・安全な学習環境</p>
        <p className="text-xs text-purple-500 mt-0.5">当サービスはCOPPA等の国際的な児童プライバシー保護基準に準拠しています</p>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // 設定画面：子ども一覧
  // ─────────────────────────────────────────────────────────
  const handleEditChild = (index: number) => {
    const child = childrenList[index];
    setChildName(child.name);
    setSelectedGrade(child.grade);
    setEditingIndex(index);
    setError('');
    setMode('edit');
  };

  const handleAddChild = () => {
    setChildName('');
    setSelectedGrade('');
    setEditingIndex(null);
    setError('');
    setMode('add');
  };

const handleDeleteChild = async (index: number) => {
  const child = childrenList[index];
  const currentName = sessionStorage.getItem('currentChildName');
  if (currentName === child.name) {
    sessionStorage.removeItem('currentChildName');
    sessionStorage.removeItem('currentChildTitle');
    sessionStorage.removeItem('currentChildGrade');
    sessionStorage.removeItem('currentChildIcon');
  }
  deleteChildFromStorage(index);

  // Clerk も更新
  const remaining = childrenList.filter((_, i) => i !== index);
  try {
    await updateClerkProfiles(remaining);
  } catch { /* ignore */ }

  setShowDeleteConfirm(null);
};

  const renderSettings = () => (
    <div className="space-y-5">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">⚙️</div>
        <h2 className="text-xl font-bold text-gray-800">お子さまの管理</h2>
        <p className="text-sm text-gray-500 mt-1">プロフィールの編集・追加・削除ができます</p>
      </div>

      {childrenList.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">👶</div>
          <p className="text-gray-500 text-sm">まだお子さまが登録されていません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {childrenList.map((child, index) => {
            const gradeOption = GRADE_OPTIONS.find(g => g.value === child.grade);
            return (
              <div key={child.id || index} className="bg-white border-2 border-gray-100 rounded-2xl p-4 shadow-sm">
                {showDeleteConfirm === index ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      「{child.name}」を削除しますか？
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all">
                        キャンセル
                      </button>
                      <button onClick={() => handleDeleteChild(index)} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all">
                        削除する
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-3xl" style={{ backgroundColor: gradeOption?.color || '#f3f4f6' }} className="text-3xl w-12 h-12 rounded-full flex items-center justify-center">
                      {child.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{child.name}<span className="text-gray-400 text-sm">{child.title}</span></p>
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1">
                        {child.grade}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditChild(index)} className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 active:scale-95 transition-all" title="編集">
                        ✏️
                      </button>
                      <button onClick={() => setShowDeleteConfirm(index)} className="p-2 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 transition-all" title="削除">
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {childrenList.length < 6 && (
        <button onClick={handleAddChild} className="w-full py-3.5 rounded-xl border-2 border-dashed border-purple-300 text-purple-600 font-semibold hover:bg-purple-50 active:scale-95 transition-all">
          ＋ お子さまを追加する
        </button>
      )}

      <button onClick={() => router.push('/chat')} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base shadow-md hover:shadow-lg active:scale-95 transition-all">
        チャットにもどる
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // 編集・追加フォーム（共通）
  // ─────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    if (!childName.trim()) { setError('お子さまのお名前を入力してください。'); return false; }
    if (childName.trim().length > 20) { setError('お名前は20文字以内で入力してください。'); return false; }
    if (!selectedGrade) { setError('学年を選択してください。'); return false; }
    setError(''); return true;
  };

const handleSaveProfile = async () => {
  if (!validateForm() || !selectedGradeOption || !user) return;
  setIsSubmitting(true);
  setError('');

  const childData: ChildData = {
    id: editingIndex !== null ? childrenList[editingIndex].id : Date.now().toString(),
    name: childName.trim(),
    title: 'くん',
    icon: selectedGradeOption.emoji,
    grade: selectedGrade,
  };

  try {
    const oldName = editingIndex !== null ? childrenList[editingIndex].name : undefined;
    const updatedChildren = saveChildToStorage(childData, oldName);
    await updateClerkProfiles(updatedChildren);
    setActiveChild(childData);
    setMode('settings');
  } catch {
    setError('保存中にエラーが起きました。もう一度お試しください。');
  } finally {
    setIsSubmitting(false);
  }
};

    const childData: ChildData = {
      id: editingIndex !== null ? childrenList[editingIndex].id : Date.now().toString(),
      name: childName.trim(),
      title: 'くん',
      icon: selectedGradeOption.emoji,
      grade: selectedGrade,
    };

    try {
      // Clerk メタデータを更新（最後に保存したプロフィールが代表になる）
      await updateClerkMetadata(childProfile);

      // ストレージに保存
      const oldName = editingIndex !== null ? childrenList[editingIndex].name : undefined;
      saveChildToStorage(childData, oldName);

      // アクティブな子として設定
      setActiveChild(childData);

      setMode('settings');
    } catch {
      setError('保存中にエラーが起きました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

const handleSubmitOnboarding = async () => {
  if (!validateForm() || !selectedGradeOption || !user) return;
  setIsSubmitting(true);
  setError('');

  const childData: ChildData = {
    id: Date.now().toString(),
    name: childName.trim(),
    title: 'くん',
    icon: selectedGradeOption.emoji,
    grade: selectedGrade,
  };

  try {
    const updatedChildren = saveChildToStorage(childData);
    await updateClerkProfiles(updatedChildren);
    setActiveChild(childData);
    setCurrentStep(2);
  } catch {
    setError('保存中にエラーが起きました。もう一度お試しください。');
  } finally {
    setIsSubmitting(false);
  }
};

  const renderEditForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">{mode === 'edit' ? '✏️' : '👶'}</div>
        <h2 className="text-xl font-bold text-gray-800">
          {mode === 'edit' ? 'プロフィールを編集' : 'お子さまを追加'}
        </h2>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">お子さまのお名前（ニックネームでもOK）</label>
        <input type="text" value={childName} onChange={(e) => { setChildName(e.target.value); setError(''); }} placeholder="例：たろう、はなちゃん" maxLength={20} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-gray-800" />
        <p className="text-xs text-gray-400 mt-1 text-right">{childName.length}/20文字</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">学年を選んでください</label>
        <div className="mb-4">
          <p className="text-xs font-bold text-orange-500 mb-2">🌸 幼稚園・保育園</p>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_OPTIONS.filter(g => g.group === '幼児').map((grade) => (
              <button key={grade.value} onClick={() => { setSelectedGrade(grade.value); setError(''); }}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${selectedGrade === grade.value ? 'border-purple-500 bg-purple-50 shadow-md scale-105' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                <div className="text-2xl mb-1">{grade.emoji}</div>
                <div className="text-xs font-semibold text-gray-700">{grade.value}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-blue-500 mb-2">📚 小学校</p>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_OPTIONS.filter(g => g.group === '小学校').map((grade) => (
              <button key={grade.value} onClick={() => { setSelectedGrade(grade.value); setError(''); }}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${selectedGrade === grade.value ? 'border-purple-500 bg-purple-50 shadow-md scale-105' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                <div className="text-2xl mb-1">{grade.emoji}</div>
                <div className="text-xs font-semibold text-gray-700">{grade.value}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">⚠️ {error}</div>}

      <div className="flex gap-3">
        <button onClick={() => { setMode('settings'); setError(''); }} className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-95 transition-all">
          もどる
        </button>
        <button onClick={handleSaveProfile} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
          {isSubmitting ? '⏳ 保存中...' : '保存する ✓'}
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // STEP 1（初回オンボーディング用）
  // ─────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="text-5xl mb-3">👶</div>
        <h2 className="text-xl font-bold text-gray-800">お子さまのことを教えてください</h2>
        <p className="text-sm text-gray-500 mt-1">あとでいつでも変更できます</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">お子さまのお名前（ニックネームでもOK）</label>
        <input type="text" value={childName} onChange={(e) => { setChildName(e.target.value); setError(''); }} placeholder="例：たろう、はなちゃん" maxLength={20} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none text-gray-800" />
        <p className="text-xs text-gray-400 mt-1 text-right">{childName.length}/20文字</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">学年を選んでください</label>
        <div className="mb-4">
          <p className="text-xs font-bold text-orange-500 mb-2">🌸 幼稚園・保育園</p>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_OPTIONS.filter(g => g.group === '幼児').map((grade) => (
              <button key={grade.value} onClick={() => { setSelectedGrade(grade.value); setError(''); }}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${selectedGrade === grade.value ? 'border-purple-500 bg-purple-50 shadow-md scale-105' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                <div className="text-2xl mb-1">{grade.emoji}</div>
                <div className="text-xs font-semibold text-gray-700">{grade.value}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-blue-500 mb-2">📚 小学校</p>
          <div className="grid grid-cols-3 gap-2">
            {GRADE_OPTIONS.filter(g => g.group === '小学校').map((grade) => (
              <button key={grade.value} onClick={() => { setSelectedGrade(grade.value); setError(''); }}
                className={`p-3 rounded-xl border-2 text-center transition-all duration-200 ${selectedGrade === grade.value ? 'border-purple-500 bg-purple-50 shadow-md scale-105' : 'border-gray-200 bg-white hover:border-purple-300'}`}>
                <div className="text-2xl mb-1">{grade.emoji}</div>
                <div className="text-xs font-semibold text-gray-700">{grade.value}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">⚠️ {error}</div>}

      <button onClick={handleSubmitOnboarding} disabled={isSubmitting} className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base shadow-md hover:shadow-lg active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
        {isSubmitting ? '⏳ 保存中...' : 'これではじめる！ 🎉'}
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // STEP 2 ： 完了
  // ─────────────────────────────────────────────────────────
  const handleGoToChat = () => {
    router.push('/chat');
  };

  const renderStep2 = () => (
    <div className="text-center space-y-6">
      <div className="animate-bounce"><div className="text-7xl mb-4">🎊</div></div>
      <h2 className="text-2xl font-bold text-gray-800">準備完了！</h2>
      <p className="text-gray-600"><strong>{childName}さん</strong>のプロフィールが<br />できあがりました！</p>
      {selectedGradeOption && (
        <div className="rounded-2xl p-4 inline-block" style={{ backgroundColor: selectedGradeOption.color }}>
          <span className="text-3xl">{selectedGradeOption.emoji}</span>
          <span className="ml-2 font-bold text-gray-700">{selectedGrade}モード</span>
        </div>
      )}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 text-sm text-gray-700 text-left space-y-1">
        <p className="font-bold text-purple-700 mb-2">🌟 AIせんせいができること</p>
        <p>💬 なんでも質問してみよう！</p>
        <p>📖 勉強のお手伝いをするよ</p>
        <p>🎨 いっしょに絵や音楽も作れるよ</p>
      </div>
      <button onClick={handleGoToChat} className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all">
        AIせんせいとはなす！ 🚀
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // ローディング中
  // ─────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-pink-50">
        <div className="text-center"><div className="text-4xl animate-bounce">🌈</div><p className="text-gray-400 text-sm mt-2">よみこみ中...</p></div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // メインレンダー
  // ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (mode === 'settings') return renderSettings();
    if (mode === 'edit' || mode === 'add') return renderEditForm();
    // onboarding モード
    if (currentStep === 0) return renderStep0();
    if (currentStep === 1) return renderStep1();
    return renderStep2();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            🌈 AIせんせい
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'settings' || mode === 'edit' || mode === 'add' ? 'せってい' : 'はじめてのセットアップ'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          {mode === 'onboarding' && currentStep < 2 && <StepIndicator />}
          {renderContent()}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">🔒 お子さまの情報は安全に管理されます</p>
      </div>
    </div>
  );
}
