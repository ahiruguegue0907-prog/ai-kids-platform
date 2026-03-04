// app/api/chat/route.ts

import { GoogleGenAI, Type } from "@google/genai"; // ✅ Fix1: Type を追加
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// =========================================================
// モード定義
// =========================================================
export type LearningMode =
    | "chat"
    | "kokugo"
    | "sansu"
    | "shakai"
    | "rika"
    | "dotoku"
    | "jitsugaku";

// =========================================================
// 漢字セット定義
// =========================================================

/** 小学1年生で習う漢字（この学年の子にはふりがな不要） */
const GRADE1_KANJI = new Set([
    "一", "右", "雨", "円", "王", "音", "下", "火", "花", "貝", "学", "気", "九", "休",
    "玉", "金", "空", "月", "犬", "見", "五", "口", "校", "左", "三", "山", "子", "四",
    "糸", "字", "耳", "七", "車", "手", "十", "出", "女", "小", "上", "森", "人", "水",
    "正", "生", "青", "夕", "石", "赤", "千", "川", "先", "早", "草", "足", "村", "大",
    "男", "竹", "中", "虫", "町", "天", "田", "土", "二", "日", "入", "年", "白", "八",
    "百", "文", "木", "本", "名", "目", "立", "力", "林", "六",
]);

/** 小学2年生で習う漢字（1年生にはふりがな必要）※「知」を含む */
const GRADE2_KANJI = new Set([
    "引", "羽", "雲", "園", "遠", "何", "科", "夏", "家", "歌", "画", "回", "会", "海",
    "絵", "外", "角", "活", "間", "丸", "岩", "顔", "汽", "記", "帰", "弓", "牛", "魚",
    "京", "強", "教", "近", "兄", "形", "計", "元", "言", "原", "古", "戸", "午", "後",
    "語", "工", "公", "広", "交", "光", "考", "行", "高", "黄", "合", "谷", "国", "黒",
    "今", "才", "細", "作", "算", "止", "市", "矢", "姉", "思", "紙", "寺", "自", "時",
    "室", "社", "弱", "首", "秋", "週", "春", "書", "少", "場", "色", "食", "心", "新",
    "親", "図", "数", "西", "声", "星", "晴", "切", "雪", "船", "線", "前", "組", "走",
    "多", "体", "台", "地", "池", "知", "茶", "昼", "長", "鳥", "朝", "直", "通", "弟",
    "点", "電", "刀", "東", "当", "答", "頭", "同", "道", "読", "内", "南", "肉", "馬",
    "売", "買", "麦", "半", "番", "父", "風", "分", "聞", "米", "歩", "母", "方", "北",
    "毎", "妹", "万", "明", "鳴", "毛", "門", "夜", "野", "友", "用", "曜", "来", "里",
    "理", "話",
]);

// 未使用変数のlintエラー抑止（将来の拡張用に保持）
void GRADE1_KANJI;
void GRADE2_KANJI;

/** AIプロンプトに明示的に例示する「よく漏れる漢字」リスト */
const FORCE_RUBY_EXAMPLES = [
    { kanji: "知", reading: "し", example: '<ruby>知<rt>し</rt></ruby>ってる' },
    { kanji: "好", reading: "す", example: '<ruby>好<rt>す</rt></ruby>き' },
    { kanji: "思", reading: "おも", example: '<ruby>思<rt>おも</rt></ruby>う' },
    { kanji: "強", reading: "つよ", example: '<ruby>強<rt>つよ</rt></ruby>い' },
    { kanji: "弱", reading: "よわ", example: '<ruby>弱<rt>よわ</rt></ruby>い' },
    { kanji: "親", reading: "おや", example: '<ruby>親<rt>おや</rt></ruby>' },
];

// =========================================================
// Brave Search 関数
// =========================================================
async function braveSearch(query: string): Promise<string> {
    const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();

    if (!apiKey) {
        console.error("[braveSearch] BRAVE_SEARCH_API_KEY が設定されていません");
        return "検索エラー: APIキーが設定されていません。管理者に連絡してください。";
    }

    console.log(`[braveSearch] 検索クエリ: "${query}"`);

    try {
        const url = new URL("https://api.search.brave.com/res/v1/web/search");
        url.searchParams.set("q", query);
        url.searchParams.set("count", "3");
        url.searchParams.set("search_lang", "jp");  // ✅ Fix4: "ja" → "jp"
        url.searchParams.set("country", "JP");
        // freshness は削除（天気など最新情報の取りこぼし防止）

        const res = await fetch(url.toString(), {
            headers: {
                Accept: "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": apiKey,
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const errorBody = await res.text().catch(() => "(取得不可)");
            console.error(`[braveSearch] HTTP ${res.status}:`, errorBody);
            return `検索エラー: HTTPステータス ${res.status}`;
        }

        const data = await res.json();
        console.log(
            `[braveSearch] 結果: web=${data.web?.results?.length ?? 0}, news=${data.news?.results?.length ?? 0}`
        );

        const parts: string[] = [];

        // ニュース
        if (data.news?.results?.length) {
            const items = (
                data.news.results as Array<{
                    title?: string;
                    description?: string;
                    age?: string;
                }>
            )
                .slice(0, 2)
                .map(
                    (n) =>
                        `📰 ${n.title ?? ""}\n   ${n.description ?? ""} ${n.age ? `(${n.age})` : ""}`
                )
                .join("\n\n");
            parts.push(`【最新ニュース】\n${items}`);
        }

        // ウェブ
        if (data.web?.results?.length) {
            const items = (
                data.web.results as Array<{
                    title?: string;
                    description?: string;
                }>
            )
                .slice(0, 3)
                .map((r) => `・${r.title ?? ""}\n  ${r.description ?? ""}`)
                .join("\n\n");
            parts.push(`【検索結果】\n${items}`);
        }

        if (parts.length === 0) {
            return `"${query}" に関する情報は見つかりませんでした。`;
        }

        return parts.join("\n\n");
    } catch (err) {
        console.error("[braveSearch] 例外:", err);
        return "検索中にエラーが発生しました。しばらくしてから再試行してください。";
    }
}

// =========================================================
// 検索ツール宣言（Gemini Function Calling 用）
// =========================================================
// ✅ Fix2: type を Type enum に変更
const SEARCH_TOOL = {
    functionDeclarations: [
        {
            name: "search_web",
            description:
                "インターネットをリアルタイムで検索して最新情報を取得する。" +
                "天気予報・ゲームや映画の発売日・ニュース・現在の出来事など、" +
                "AIの知識だけでは答えられない最新情報が必要なときに必ず使うこと。",
            parameters: {
                type: Type.OBJECT,   // ✅ "object" → Type.OBJECT
                properties: {
                    query: {
                        type: Type.STRING, // ✅ "string" → Type.STRING
                        description: "検索クエリ（日本語で具体的に）",
                    },
                },
                required: ["query"],
            },
        },
    ],
};

// =========================================================
// 各モードのJSONスキーマ定義
// =========================================================
const RESPONSE_SCHEMAS: Partial<Record<LearningMode, object>> = {

    // ② 国語モード
    kokugo: {
        type: "object",
        properties: {
            story: { type: "string", description: "漢字が登場するショートストーリー（200文字以内）" },
            featured_kanji: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        kanji: { type: "string" },
                        reading: { type: "string" },
                        meaning: { type: "string" },
                        example_sentence: { type: "string" },
                    },
                    required: ["kanji", "reading", "meaning", "example_sentence"],
                },
            },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        answer_index: { type: "integer" },
                        explanation: { type: "string" },
                    },
                    required: ["question", "options", "answer_index", "explanation"],
                },
            },
        },
        required: ["story", "featured_kanji", "quiz"],
    },

    // ③ 算数モード
    sansu: {
        type: "object",
        properties: {
            explanation: { type: "string" },
            problem: { type: "string" },
            hint: { type: "string" },
            answer: { type: "string" },
            steps: { type: "array", items: { type: "string" } },
        },
        required: ["explanation", "problem", "hint", "answer", "steps"],
    },

    // ④ 社会モード
    shakai: {
        type: "object",
        properties: {
            topic: { type: "string" },
            story: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        answer_index: { type: "integer" },
                        explanation: { type: "string" },
                    },
                    required: ["question", "options", "answer_index", "explanation"],
                },
            },
        },
        required: ["topic", "story", "key_points", "quiz"],
    },

    // ⑤ 理科モード
    rika: {
        type: "object",
        properties: {
            phenomenon: { type: "string" },
            story: { type: "string" },
            experiment_idea: { type: "string" },
            fun_fact: { type: "string" },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        answer_index: { type: "integer" },
                        explanation: { type: "string" },
                    },
                    required: ["question", "options", "answer_index", "explanation"],
                },
            },
        },
        required: ["phenomenon", "story", "experiment_idea", "fun_fact", "quiz"],
    },

    // ⑥ 道徳モード
    dotoku: {
        type: "object",
        properties: {
            scenario: { type: "string" },
            question: { type: "string" },
            choices: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        label: { type: "string" },
                        consequence: { type: "string" },
                        message: { type: "string" },
                    },
                    required: ["label", "consequence", "message"],
                },
            },
            teacher_comment: { type: "string" },
        },
        required: ["scenario", "question", "choices", "teacher_comment"],
    },

    // ⑦ 実学モード
    jitsugaku: {
        type: "object",
        properties: {
            topic: { type: "string", enum: ["お金", "税金", "株・投資", "政治・選挙", "法律", "保険", "経済"] },
            hook: { type: "string" },
            story: { type: "string" },
            key_concept: { type: "string" },
            real_world_connection: { type: "string" },
            parent_note: { type: "string" },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        answer_index: { type: "integer" },
                        explanation: { type: "string" },
                    },
                    required: ["question", "options", "answer_index", "explanation"],
                },
            },
        },
        required: ["topic", "hook", "story", "key_concept", "real_world_connection", "parent_note", "quiz"],
    },
};

// =========================================================
// ★★★ ふりがなルール（全モード共通）★★★
// =========================================================
function getFuriganaRule(grade: string): string {
    const isGrade1OrBelow =
        grade.includes("年少") ||
        grade.includes("年中") ||
        grade.includes("年長") ||
        grade.includes("小学1年生");

    if (isGrade1OrBelow) {
        return `
【ふりがなルール - 絶対に守ること】
- ふりがなは必ず HTML の <ruby> タグで出力する
- 1年生で習っていない漢字（2年生以上）にはすべてふりがなをつける
- 形式: <ruby>漢字<rt>ふりがな</rt></ruby>
- 送り仮名はタグの外: <ruby>食<rt>た</rt></ruby>べる、<ruby>走<rt>はし</rt></ruby>る

【特に注意！よく漏れる漢字 - 必ずrubyタグをつけること】
${FORCE_RUBY_EXAMPLES.map((e) => `  ✅ ${e.example}`).join("\n")}

【禁止事項】
  ❌ 括弧形式: 知（し）や 好き（すき） → 絶対に使わない
  ❌ 同じ単語に2回以上ふりがなをつけない

【1年生で習う漢字（これにはふりがな不要）】
一 右 雨 円 王 音 下 火 花 貝 学 気 九 休 玉 金 空 月 犬 見 五 口 校
左 三 山 子 四 糸 字 耳 七 車 手 十 出 女 小 上 森 人 水 正 生 青 夕
石 赤 千 川 先 早 草 足 村 大 男 竹 中 虫 町 天 田 土 二 日 入 年 白
八 百 文 木 本 名 目 立 力 林 六`;
    }

    if (grade.includes("小学2年生")) {
        return `
【ふりがなルール】
- 小学3年生以上で習う難しい漢字のみ <ruby> タグをつける
- 1・2年生で習う漢字（山・川・学校・先生・知・強など）はふりがな不要
- 括弧形式（〜）は絶対に使わない`;
    }

    return `
【ふりがなルール】
- ふりがなは基本不要
- 特に難しい専門用語のみ <ruby> タグ使用可
- 括弧形式（〜）は絶対に使わない`;
}

// =========================================================
// ポストプロセス: ruby漏れを自動補正（1年生・未就学児向けのみ）
// =========================================================
function processTextResponse(text: string, grade: string): string {
    const isGrade1OrBelow =
        grade.includes("年少") ||
        grade.includes("年中") ||
        grade.includes("年長") ||
        grade.includes("小学1年生");

    if (!isGrade1OrBelow) return text;

    // すでに <ruby> タグで囲まれている部分は除外して補正
    const corrections: Array<[RegExp, string]> = [
        // 知 → <ruby>知<rt>し</rt></ruby>（「知って」「知ら」「知り」など）
        [/(?<!<[^>]*>)知(?=って|ら|り|る|れ|ろ)/g, "<ruby>知<rt>し</rt></ruby>"],
        // 好 → <ruby>好<rt>す</rt></ruby>（「好き」）
        [/(?<!<[^>]*>)好(?=き)/g, "<ruby>好<rt>す</rt></ruby>"],
        // 思 → <ruby>思<rt>おも</rt></ruby>（「思う」「思っ」「思い」）
        [/(?<!<[^>]*>)思(?=う|っ|い)/g, "<ruby>思<rt>おも</rt></ruby>"],
        // 強 → <ruby>強<rt>つよ</rt></ruby>（「強い」「強く」）
        [/(?<!<[^>]*>)強(?=い|く|さ|そ)/g, "<ruby>強<rt>つよ</rt></ruby>"],
    ];

    let result = text;
    for (const [pattern, replacement] of corrections) {
        result = result.replace(pattern, replacement);
    }
    return result;
}

/** JSONオブジェクトの全string値にruby補正を再帰適用 */
function applyRubyToJSON(obj: unknown, grade: string): unknown {
    if (typeof obj === "string") return processTextResponse(obj, grade);
    if (Array.isArray(obj)) return obj.map((item) => applyRubyToJSON(item, grade));
    if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
                k,
                applyRubyToJSON(v, grade),
            ])
        );
    }
    return obj;
}

// =========================================================
// 各モードのシステムプロンプト
// =========================================================
function getModeSystemPrompt(mode: LearningMode, grade: string): string {
    const furiganaRule = getFuriganaRule(grade);

    switch (mode) {
        case "kokugo":
            return `あなたは「AIせんせい・国語の先生」です。対象学年: ${grade}
子どもがテーマや漢字を入力したら、その漢字を使った楽しいショートストーリーを作り、
漢字の読み方・意味・例文と、理解を確認するクイズを含めてください。
必ずJSONフォーマットで返してください。
JSON内のすべてのテキストにも以下のふりがなルールを適用してください。
${furiganaRule}`;

        case "sansu":
            return `あなたは「AIせんせい・算数の先生」です。対象学年: ${grade}
子どもの質問に対して、わかりやすい説明・練習問題・ヒント・答え・解き方のステップをJSONで返してください。
答えはすぐに見えないようにして、まずヒントで考える機会を与えてください。
${furiganaRule}`;

        case "shakai":
            return `あなたは「AIせんせい・社会の先生」です。対象学年: ${grade}
社会のしくみ・地理・歴史などについて、身近な例を使ったストーリーと
3つのキーポイント、クイズをJSONで返してください。
${furiganaRule}`;

        case "rika":
            return `あなたは「AIせんせい・理科の先生」です。対象学年: ${grade}
科学的な現象や自然の不思議について、「なぜそうなるか」の説明・
家でできる実験アイデア・びっくり豆知識・クイズをJSONで返してください。
${furiganaRule}`;

        case "dotoku":
            return `あなたは「AIせんせい・道徳の先生」です。対象学年: ${grade}
日常のシナリオを提示し、「あなたならどうする？」と問いかけます。
複数の選択肢それぞれの結果と学びを示し、最後に温かいメッセージをJSONで返してください。
${furiganaRule}`;

        case "jitsugaku":
            return `あなたは「AIせんせい・実学の先生」です。対象学年: ${grade}
お金・税金・株・政治・法律など「学校では教えてくれない本当に大切な知識」を、
子どもでも理解できる言葉で教えます。
まず驚きのhook（導入）から始め、身近な例でのストーリー説明、
保護者と一緒に話せるコメントも含めてJSONで返してください。
${furiganaRule}`;

        default:
            return getDefaultSystemPrompt(grade);
    }
}

// =========================================================
// 現在の日本時間を取得するヘルパー
// =========================================================
function getCurrentJSTDateString(): string {
    const now = new Date();
    // UTC+9（日本標準時）に変換
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const month = jst.getUTCMonth() + 1;
    const day = jst.getUTCDate();
    const week = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
    const hour = String(jst.getUTCHours()).padStart(2, "0");
    const min = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日（${week}曜日）${hour}:${min}`;
}

function getDefaultSystemPrompt(grade: string): string {
    const furiganaRule = getFuriganaRule(grade);

    if (grade.includes("年少") || grade.includes("年中") || grade.includes("年長")) {
        return `あなたは未就学児のための「AIせんせい」です。

【会話ルール】
1. とにかくやさしく、ひらがなをメインに話す
2. 1回の返答は100文字以内（rubyタグを除く）
3. 語尾は「〜だよ」「〜だね」「〜しよ！」などかわいい口調
4. 絵文字を1〜2個使う
5. 最後に必ず「〇〇はすき？」「〇〇ってしってる？」など簡単な質問をする

【リアルタイム情報】
天気・最新ニュースなど最新情報が必要なときは、必ず search_web ツールを使うこと。

${furiganaRule}`;
    }

    if (grade.includes("小学1年生")) {
        return `あなたは小学1年生のための「AIせんせい」です。

【会話ルール】
1. 質問には必ずやさしく答え、最後に派生した具体的な質問をする
2. 1回の返答は150文字以内（rubyタグを除く）
3. 語尾は「〜だよ」「〜だね」などやさしい口調
4. 絵文字を1〜2個使う

【リアルタイム情報】
天気・ゲーム発売日・最新ニュースなど最新情報が必要なときは、必ず search_web ツールを使うこと。

【出力例】
<ruby>海<rt>うみ</rt></ruby>の<ruby>水<rt>みず</rt></ruby>はしょっぱいよ！🌊
それは<ruby>塩<rt>しお</rt></ruby>が<ruby>入<rt>はい</rt></ruby>っているからなんだ。

${furiganaRule}`;
    }

    if (grade.includes("小学2年生")) {
        return `あなたは小学2年生のための「AIせんせい」です。

【会話ルール】
1. 質問には丁寧に答え、最後に考えを深める質問をする
2. 1回の返答は200文字以内（rubyタグを除く）
3. 語尾は「〜だよ」「〜だね」など親しみやすい口調
4. 絵文字を1〜2個使う

【リアルタイム情報】
天気・ゲーム発売日・最新ニュースなど最新情報が必要なときは、必ず search_web ツールを使うこと。

${furiganaRule}`;
    }

    if (grade.includes("小学3年生")) {
        return `あなたは小学3年生のための「AIせんせい」です。

【会話ルール】
1. 質問には正確にわかりやすく答える
2. 1回の返答は250文字以内
3. 知的好奇心を刺激する返答を心がける
4. 最後に関連する質問を1つする
5. 絵文字を1個使う

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
    }

    if (grade.includes("小学4年生")) {
        return `あなたは小学4年生のための「AIせんせい」です。

【会話ルール】
1. 質問には正確かつ論理的に答える
2. 1回の返答は300文字以内
3. 「なぜそうなるのか」の理由まで説明する
4. 最後に発展的な問いかけをする

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
    }

    if (grade.includes("小学5年生")) {
        return `あなたは小学5年生のための「AIせんせい」です。

【会話ルール】
1. 質問には多角的な視点で答える
2. 1回の返答は350文字以内
3. 社会や科学との関連も含めて説明する
4. 最後に「あなたはどう思う？」と問いかける

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
    }

    return `あなたは小学6年生のための「AIせんせい」です。

【会話ルール】
1. 質問には深く、体系的に答える
2. 1回の返答は400文字以内
3. 将来のキャリアや社会課題とも結びつけて説明する
4. 批判的思考を促す問いかけを最後にする

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
}

// =========================================================
// メインのAPIハンドラー
// =========================================================
export async function POST(req: NextRequest) {
    try {
        const {
            message,
            grade,
            history,
            mode = "chat",
        } = (await req.json()) as {
            message: string;
            grade: string;
            history: { sender: string; text: string }[];
            mode: LearningMode;
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
        }

        // ✅ Fix3: contents の型を拡張（functionCall / functionResponse を含められるように）
        const contents: Array<{
            role: string;
            parts: Array<{
                text?: string;
                functionCall?: { name: string; args: Record<string, unknown> };
                functionResponse?: { name: string; response: Record<string, unknown> };
            }>;
        }> = [];

        // 会話履歴の構築（rubyタグを除去してトークン節約）
        for (const msg of (history ?? []).slice(-10)) {
            const role = msg.sender === "user" ? "user" : "model";
            const cleanText = msg.text.replace(/<[^>]*>/g, "");
            contents.push({ role, parts: [{ text: cleanText }] });
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        const currentDateTime = getCurrentJSTDateString();
        const systemPrompt =
            `【現在の日時】${currentDateTime}（日本時間）\n` +
            `この日時情報を正確に使い、「今日」「明日」「昨日」などの質問に答えること。\n\n` +
            getModeSystemPrompt(mode as LearningMode, grade ?? "");

        const schema = RESPONSE_SCHEMAS[mode as LearningMode];
        const isChatMode = mode === "chat";

        const generationConfig = schema
            ? { responseMimeType: "application/json", responseSchema: schema }
            : undefined;

        // 第1回APIコール
        let response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemPrompt,
                ...(generationConfig ?? {}),
                ...(isChatMode ? { tools: [SEARCH_TOOL] } : {}),
            },
        });

        // Function Callingループ（chatモードのみ・最大3回）
        let loopCount = 0;
        const MAX_LOOPS = 3;

        while (isChatMode && loopCount < MAX_LOOPS) {
            const functionCalls = response.functionCalls;
            if (!functionCalls || functionCalls.length === 0) break;

            loopCount++;
            const fc = functionCalls[0];
            console.log(`[chat/route] Function Call #${loopCount}: ${fc.name}`);

            let searchResult = "";
            if (fc.name === "search_web") {
                const query = (fc.args as { query?: string })?.query ?? message;
                searchResult = await braveSearch(query);
            } else {
                searchResult = `未知の関数: ${fc.name}`;
            }

            // モデルの function call を履歴に追加
            contents.push({
                role: "model",
                parts: [{ functionCall: { name: fc.name!, args: (fc.args ?? {}) as Record<string, unknown> } }],
            });

            // 検索結果を function response として追加
            contents.push({
                role: "user",
                parts: [{ functionResponse: { name: fc.name!, response: { result: searchResult } } }],
            });

            // 検索結果を受けて再度生成
            response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [SEARCH_TOOL],
                },
            });
        }

        // レスポンス処理
        const rawText = response.text ?? "";

        if (mode === "chat") {
            const processedText = processTextResponse(rawText, grade ?? "");
            return NextResponse.json({ mode: "chat", reply: processedText });
        }

        try {
            const parsed = JSON.parse(rawText);
            const corrected = applyRubyToJSON(parsed, grade ?? "");
            return NextResponse.json({ mode, data: corrected });
        } catch {
            console.warn("[chat/route] JSONパース失敗、テキストにフォールバック");
            const processedText = processTextResponse(rawText, grade ?? "");
            return NextResponse.json({ mode: "chat", reply: processedText });
        }

    } catch (error: unknown) {
        console.error("[API/chat] エラー:", error);
        return NextResponse.json(
            {
                error: "AIせんせいが困っています。もう一度試してね！",
                reply: "AIせんせいが困っています。もう一度試してね！",
            },
            { status: 500 }
        );
    }
}
