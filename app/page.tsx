import React from 'react';
import {
  ShieldCheck,
  BrainCircuit,
  Sparkles,
  Palette,
  MessageCircleQuestion,
  Tv,
  MonitorOff,
  CheckCircle2,
  ChevronRight,
  HeartHandshake,
  Lightbulb,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-200 selection:text-teal-900">

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <Sparkles size={24} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 hidden sm:block">AI Kids Platform</span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link href="#features" className="text-base font-medium text-slate-600 hover:text-teal-600 transition-colors">機能</Link>
            <Link href="#safety" className="text-base font-medium text-slate-600 hover:text-teal-600 transition-colors">安全性</Link>
            <Link href="#pricing" className="text-base font-medium text-slate-600 hover:text-teal-600 transition-colors">料金</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/parents" className="hidden sm:inline-flex text-base font-medium text-slate-600 hover:text-teal-600 transition-colors">保護者の方へ</Link>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-full bg-slate-100 px-6 text-base font-medium text-slate-900 transition-all hover:bg-slate-200 hover:scale-105 active:scale-95">ログイン</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-teal-400 opacity-20 blur-[100px]"></div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-800 mb-8 shadow-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            未就学児〜小学生の新しい学び
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1]">
            想像を、創造に。<br className="hidden sm:block" />
            子どもの可能性を無限に広げる<br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">はじめてのAIプラットフォーム</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-8 text-slate-600 text-balance">
            AIは一方通行じゃない。<br />
            『問いかけるAI』で、『考える』を楽しみ、親子で未来を創る。<br />
            テクノロジー社会を『生き抜く力』を、今その手に。
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-teal-600 px-8 py-5 text-lg font-semibold text-white shadow-md hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-all hover:scale-105 active:scale-95">
              まずは無料トライアル
              <ChevronRight className="ml-2 h-6 w-6" />
            </Link>
            <Link href="#features" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-white px-8 py-5 text-lg font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all active:scale-95">
              機能を見る
            </Link>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 sm:mt-24 mx-auto max-w-5xl rounded-2xl bg-slate-50/50 p-2 sm:p-4 ring-1 ring-inset ring-slate-200/50 backdrop-blur-sm lg:rounded-3xl">
            <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-xl bg-gradient-to-br from-slate-100 to-teal-50 ring-1 ring-inset ring-slate-200 overflow-hidden shadow-2xl relative flex items-center justify-center">
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/80 to-transparent"></div>
              <div className="relative text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg text-teal-500 mb-4 animate-bounce">
                  <BrainCircuit size={40} />
                </div>
                <p className="text-slate-500 font-medium tracking-wide">AI連携デモンストレーション画面</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="bg-slate-50 py-24 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              デジタル時代の子育て<br />
              こんなモヤモヤを感じていませんか？
            </h2>
          </div>
          <div className="mx-auto max-w-5xl grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="relative flex flex-col gap-6 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-2">
                <Tv size={28} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">受動的な動画視聴ばかり…</h3>
              <p className="text-slate-600 leading-relaxed">
                YouTubeなどをダラダラ見続けてしまい<br />
                脳の発達や「自ら生み出す力」への<br />
                影響が心配。
              </p>
            </div>
            <div className="relative flex flex-col gap-6 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 mb-2">
                <Lightbulb size={28} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">自分で考える力が育たない？</h3>
              <p className="text-slate-600 leading-relaxed">
                AIやネットですぐに<br />
                「正解らしきもの」が手に入る時代。<br />
                考える前に<br />
                答えを見てしまっていないか不安。
              </p>
            </div>
            <div className="relative flex flex-col gap-6 p-8 bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 mb-2">
                <ShieldAlert size={28} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">親の目が届かないリスク</h3>
              <p className="text-slate-600 leading-relaxed">
                知らず知らずのうちに<br />
                著作権を侵害したり<br />
                不適切な情報に触れてしまったりする<br />
                「無法地帯」が怖い。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Manifesto Section */}
      <section className="bg-white py-24 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-teal-50/30"></div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-teal-100 p-8 sm:p-16 relative">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 bg-teal-600 text-white p-4 rounded-full shadow-lg transform rotate-12 hidden sm:block">
              <HeartHandshake size={32} />
            </div>
            <div className="text-center mb-12">
              <p className="text-sm font-bold tracking-widest text-teal-600 uppercase mb-4">Our Manifesto</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl leading-snug">
                AI時代を生きる子どもたちへ。<br />
                私たちが「安全なAI体験」に<br className="sm:hidden" />こだわる理由
              </h2>
            </div>
            <div className="prose prose-lg prose-slate mx-auto text-slate-600">
              <p className="lead text-xl text-slate-700 font-medium mb-8 text-center">
                AI技術が急速に普及し、<br />
                誰もが簡単に「それらしい答え」や「作品」を生み出せる時代になりました。<br />
                しかし、私たちはKids AI Platformを単なる「便利な学習ツール」とは考えていません。<br />
                強力なテクノロジーの光と影を正しく理解し、<br />
                未来を生き抜くための「羅針盤」となる場所です。
              </p>
              <div className="space-y-10 mt-12">
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 font-bold text-2xl">1</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">「魔法の箱」ではなく、「考える力」を育むパートナーへ</h3>
                    <p>
                      AIを「すぐに正解をくれる魔法の箱」として使うと、人間の思考力は退化してしまいます。<br />
                      私たちの「AIせんせい」は、あえてすぐに答えを出さず、<br />
                      問いかけを通じて子どもたちの「なぜ？」を引き出し、自ら考え抜く力を育てます。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 text-purple-600 font-bold text-2xl">2</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">「創る楽しさ」と「創り手への敬意」を同時に学ぶ</h3>
                    <p>
                      AIを使えば、誰でも簡単に絵や音楽を作ることができます。<br />
                      だからこそ、ゼロから生み出す喜びを知ると同時に、<br />
                      「情熱をかけて作品を生み出すクリエイターへの敬意」や<br />
                      「デジタル倫理」を自然に学べる環境を徹底しています。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 font-bold text-2xl">3</div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">AIに「使われる」のではなく、「共創」する未来へ</h3>
                    <p>
                      これからの時代、AIを正しく使いこなせるかどうかで将来の選択肢は大きく変わります。<br />
                      外部から守られた安全な空間で、情報を見極める力や法律などの「実学」を提供し、<br />
                      AIと人間が互いの強みを活かし合う土台を作ります。
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-16 pt-8 border-t border-slate-200">
                <p className="text-lg font-medium text-slate-800 italic">
                  「開発者自身も日々クリエイティブな活動に関わり、<br />
                  子育てに向き合う当事者だからこそ、この課題に本気で取り組んでいます。<br />
                  子どもたちの輝く可能性をリスクから守り、無限に広げるために。<br />
                  親子の対話から始まる、はじめてのAIプラットフォームをお届けします。」
                </p>
                <p className="mt-4 text-right font-bold text-teal-700">— SOU-A　Kids AI Platform</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section (アップデート版) */}
      <section id="features" className="py-24 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-20">
            <h2 className="text-base font-bold tracking-wider text-teal-600 uppercase">3つのコア機能</h2>
            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              能動的な学びを引き出す<br />
              対話型AI体験
            </p>
          </div>

          <div className="mx-auto max-w-5xl space-y-24">
            {/* Feature 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="bg-teal-50 rounded-[2.5rem] aspect-square md:aspect-[4/3] flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100/60 to-blue-50/60"></div>
                <BrainCircuit className="w-32 h-32 text-teal-500 relative z-10 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-lg">1</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">年齢適応型「AIせんせい」</h3>
                </div>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  一方的に答えを教えるのではなく、「思考を助けるツール」として<br />
                  ソクラテス・メソッド（問いかけ）を用います。<br />
                  年齢に合わせた対話で「思考停止」を防ぎ、<br />
                  論理的思考力と問題解決能力を自然に育成します。
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> 発達段階に合わせた言葉遣いと難易度調整</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> すぐに答えを出さず、自発的な気づきを促す対話</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> AI依存を防ぎ、自分の頭で考え抜く習慣の形成</li>
                </ul>
              </div>
            </div>

            {/* Feature 2 (Reverse) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center flex-col-reverse md:flex-row-reverse">
              <div className="bg-blue-50 rounded-[2.5rem] aspect-square md:aspect-[4/3] flex items-center justify-center p-8 relative overflow-hidden order-1 md:order-2">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 to-indigo-50/60"></div>
                <MessageCircleQuestion className="w-32 h-32 text-blue-500 relative z-10 drop-shadow-sm" />
              </div>
              <div className="order-2 md:order-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">2</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">実学を学ぶ「AIロールプレイ」</h3>
                </div>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  例えば、お店屋さんごっこから<br />
                  「お金の仕組み」や「社会のルール（法律）」を学ぶなど、<br />
                  設定されたシナリオの中でAIと対話することで、<br />
                  将来のAIデバイド（格差）を乗り越えるための<br />
                  実践的なリテラシーを育みます。
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0" /> お小遣いやお店屋さんごっこによる経済の基礎体験</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0" /> トラブル対応やマナーを学ぶ実践シミュレーション</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-blue-500 shrink-0" /> AIを正しく使いこなし、社会で活かす力の習得</li>
                </ul>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
              <div className="bg-purple-50 rounded-[2.5rem] aspect-square md:aspect-[4/3] flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100/60 to-pink-50/60"></div>
                <Palette className="w-32 h-32 text-purple-500 relative z-10 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 font-bold text-lg">3</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">可能性を形にする「AIクリエイティブラボ」</h3>
                </div>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  言葉を使って想像を表現し、絵本や音楽を制作。<br />
                  ゼロから生み出す楽しさを体験すると同時に、<br />
                  「人間の創造性の価値」と「作り手への敬意」を忘れない<br />
                  デジタル倫理の基礎を体感します。
                </p>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-purple-500 shrink-0" /> 言葉で指示を出して安全な画像を生成（プロンプト基礎）</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-purple-500 shrink-0" /> クリエイターの権利や著作権への配慮を学ぶ倫理教育</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-purple-500 shrink-0" /> 自身のアイデアが形になる成功体験の積み重ね</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Absolute Safety Section */}
      <section id="safety" className="py-24 sm:py-32 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 right-0 -mr-40 ml-auto w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <div className="inline-flex items-center justify-center rounded-full bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-400 mb-6 border border-teal-500/20">
              <ShieldCheck className="mr-2 h-4 w-4" />
              親の安心を最優先に
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
              妥協のない、絶対的セーフティ設計
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              子どもたちが安全に探索できる「ウォールド・ガーデン（壁に囲まれた安全な庭）」を提供します。
            </p>
          </div>

          <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 flex items-start gap-4 hover:bg-slate-800 transition-colors">
              <div className="bg-teal-500/20 p-3 rounded-xl border border-teal-500/30 shrink-0 mt-1">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2 text-white">完全なウォールド・ガーデン</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  外部のインターネットへつながるリンクや<br />
                  ブラウザ機能を一切排除。<br />
                  安全に制御された空間内でAIと対話します。
                </p>
              </div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 flex items-start gap-4 hover:bg-slate-800 transition-colors">
              <div className="bg-teal-500/20 p-3 rounded-xl border border-teal-500/30 shrink-0 mt-1">
                <MonitorOff className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2 text-white">広告完全非表示</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  アプリ内に広告は一切表示されません。<br />
                  意図しない課金や、<br />
                  不適切な広告への誘導を根絶します。
                </p>
              </div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 flex items-start gap-4 hover:bg-slate-800 transition-colors">
              <div className="bg-teal-500/20 p-3 rounded-xl border border-teal-500/30 shrink-0 mt-1">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2 text-white">COPPA / プライバシー準拠</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  世界最高水準の<br />
                  子ども向けプライバシー保護法に準拠した設計。<br />
                  個人情報の収集・利用を厳格に管理します。
                </p>
              </div>
            </div>
            <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 flex items-start gap-4 hover:bg-slate-800 transition-colors">
              <div className="bg-teal-500/20 p-3 rounded-xl border border-teal-500/30 shrink-0 mt-1">
                <BrainCircuit className="w-6 h-6 text-teal-400" />
              </div>
              <div>
                <h4 className="text-xl font-semibold mb-2 text-white">保護者ダッシュボード完備</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  子どもの学習進捗、AIとの対話履歴のサマリーなど、<br />
                  興味関心の傾向を保護者専用画面からいつでも確認できます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder's Message Section */}
      <section className="py-24 sm:py-32 bg-teal-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-200/50 rounded-full blur-[100px] opacity-60 -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-200/50 rounded-full blur-[100px] opacity-60 translate-y-1/3 -translate-x-1/3"></div>

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <div className="mb-10 inline-flex items-center justify-center p-5 rounded-2xl bg-white shadow-sm text-teal-600 border border-teal-100">
            <Sparkles size={36} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl leading-snug mb-10">
            「不可能なことを可能にする、<br className="sm:hidden" />そのきっかけになる。」
          </h2>
          <div className="space-y-8 text-lg sm:text-xl text-slate-700 leading-relaxed text-left sm:text-center md:px-16">
            <p>
              私たちは、生成AIが持つ真の価値は「作業の効率化」ではなく、<br />
              「想像力の拡張」にあると信じています。
            </p>
            <p>
              脳が最も柔軟に成長する未就学児〜小学生の時期に、安全で良質なAIに触れること。<br />
              それは単なるプログラミング教育ではなく、自分の言葉で世界に働きかけ、<br />
              新しい何かを生み出す喜びを知る原体験になります。
            </p>
            <div className="p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-teal-100 shadow-sm">
              <p className="font-semibold text-teal-900">
                子どもの可能性は無制限です。<br />
                私たちのプラットフォームが、子どもたちの「やりたい！」「知りたい！」を形にし、<br />
                輝く未来を創るきっかけになれば幸いです。
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm font-bold tracking-widest text-teal-800 uppercase">SOU-A　Kids AI Platform 開発者より</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              シンプルで安心な料金プラン
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              追加課金なし。兄弟姉妹で利用してもお得な定額制です。
            </p>
          </div>

          <div className="bg-slate-50 rounded-[2.5rem] p-8 sm:p-12 border border-slate-200 shadow-sm relative overflow-hidden max-w-3xl mx-auto">
            <div className="absolute top-0 right-0 py-2 px-6 bg-teal-500 text-white text-sm font-bold rounded-bl-2xl">最も選ばれています</div>
            <div className="flex flex-col md:flex-row gap-10 items-center justify-between">
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">プレミアムプラン</h3>
                <p className="text-slate-600 mb-8 max-w-sm">
                  すべての機能が使い放題。<br />
                  保護者のための安心管理ツールも完全に含まれています。
                </p>
                <div className="text-slate-900 flex items-baseline justify-center md:justify-start gap-1">
                  <span className="text-6xl font-extrabold tracking-tight">¥980</span>
                  <span className="text-xl font-medium text-slate-500"> / 月</span>
                  <span className="text-sm text-slate-500 ml-1">(税込)</span>
                </div>
              </div>
              <div className="w-full md:w-auto mt-6 md:mt-0">
                <ul className="space-y-4 mb-8">
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> 年齢適応型「AIせんせい」</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> AIロールプレイ・クリエイティブラボ</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> 最大3人のお子様プロフィール登録</li>
                  <li className="flex gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-6 w-6 text-teal-500 shrink-0" /> 保護者ダッシュボード機能</li>
                </ul>
                <Link href="/signup" className="inline-flex w-full items-center justify-center rounded-full bg-teal-600 px-8 py-5 text-lg font-semibold text-white shadow-md hover:bg-teal-500 transition-all hover:scale-105 active:scale-95">
                  14日間の無料トライアル
                </Link>
                <p className="text-center text-sm text-slate-500 mt-4">無料期間中に解約した場合、料金はかかりません。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-8 text-white text-xl font-bold">
            <Sparkles className="h-6 w-6 text-teal-400" />
            <span>AI Kids Platform</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-8 text-sm font-medium">
            <Link href="#" className="hover:text-teal-400 transition-colors">運営会社</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">利用規約</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">プライバシーポリシー</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">特定商取引法に基づく表記</Link>
            <Link href="#" className="hover:text-teal-400 transition-colors">お問い合わせ</Link>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} AI Kids Platform. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}