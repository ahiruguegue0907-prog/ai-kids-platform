// app/api/chat/route.ts

import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// =========================================================
// 関数：Google カスタム検索
// =========================================================
async function googleSearch(query: string): Promise<string> {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

    if (!apiKey || !cx) {
        console.warn("Google Custom Search API Key or CX is missing.");
        return "検索エラー: 検索に必要な設定がありません。";
    }

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=3`;
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Search API returned status: ${res.status}`);
        }

        const data = await res.json() as any;

        if (!data.items || data.items.length === 0) {
            return `"${query}" についての検索結果は見つかりませんでした。`;
        }

        const results = data.items.map((item: any) => {
            return `・タイトル: ${item.title}\n  概要: ${item.snippet}`;
        }).join("\n\n");

        return `【Google検索結果】\n${results}`;
    } catch (error) {
        console.error("Google Search Error:", error);
        return "検索エラー: 検索中に問題が発生しました。";
    }
}


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
// 小学1年生で習う漢字リスト（80字）
// =========================================================
const GRADE1_KANJI = new Set([
    '一', '右', '雨', '円', '王', '音', '下', '火', '花', '貝',
    '学', '気', '九', '休', '玉', '金', '空', '月', '犬', '見',
    '五', '口', '校', '左', '三', '山', '子', '四', '糸', '字',
    '耳', '七', '車', '手', '十', '出', '女', '小', '上', '森',
    '人', '水', '正', '生', '青', '夕', '石', '赤', '千', '川',
    '先', '早', '草', '足', '村', '大', '男', '竹', '中', '虫',
    '町', '天', '田', '土', '二', '日', '入', '年', '白', '八',
    '百', '文', '木', '本', '名', '目', '立', '力', '林', '六'
]);

// =========================================================
// 小学2年生で習う漢字（160字）
// =========================================================
const GRADE2_KANJI = new Set([
    '引', '羽', '雲', '園', '遠', '何', '科', '夏', '家', '歌',
    '画', '回', '会', '海', '絵', '外', '角', '楽', '活', '間',
    '丸', '岩', '顔', '汽', '記', '帰', '弓', '牛', '魚', '京',
    '強', '教', '近', '兄', '形', '計', '元', '言', '原', '戸',
    '古', '午', '後', '語', '工', '公', '広', '交', '光', '考',
    '行', '高', '黄', '合', '谷', '国', '黒', '今', '才', '細',
    '作', '算', '止', '市', '矢', '姉', '思', '紙', '寺', '自',
    '時', '室', '社', '弱', '首', '秋', '週', '春', '書', '少',
    '場', '色', '食', '心', '新', '親', '図', '数', '西', '声',
    '星', '晴', '切', '雪', '船', '線', '前', '組', '走', '多',
    '太', '体', '台', '地', '池', '知', '茶', '昼', '長', '鳥',
    '朝', '直', '通', '弟', '店', '点', '電', '刀', '冬', '当',
    '東', '答', '頭', '同', '道', '読', '内', '南', '肉', '馬',
    '売', '買', '麦', '半', '番', '父', '風', '分', '聞', '米',
    '歩', '母', '方', '北', '毎', '妹', '万', '明', '鳴', '毛',
    '門', '夜', '野', '友', '用', '曜', '来', '里', '理', '話'
]);

// =========================================================
// 特殊読み（1年生漢字でも強制的にルビを振る語）
// =========================================================
const FORCE_RUBY_WORDS = new Set([
    '一番', '一生懸命', '一人', '二人', '三人', '四人',
    '今日', '昨日', '明日', '一日', '大人', '子供', '小学校',
    '下手', '上手', '手伝', '八百屋', '大好', '二十日', '二十歳'
]);

// =========================================================
// 各モードのJSONスキーマ定義
// =========================================================
const RESPONSE_SCHEMAS: Partial<Record<LearningMode, object>> = {
    kokugo: {
        type: "object",
        properties: {
            story: { type: "string" },
            featured_kanji: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        kanji: { type: "string" },
                        reading: { type: "string" },
                        meaning: { type: "string" },
                        example_sentence: { type: "string" }
                    },
                    required: ["kanji", "reading", "meaning", "example_sentence"]
                }
            },
            quiz: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        answer_index: { type: "integer" },
                        explanation: { type: "string" }
                    },
                    required: ["question", "options", "answer_index", "explanation"]
                }
            }
        },
        required: ["story", "featured_kanji", "quiz"]
    },

    sansu: {
        type: "object",
        properties: {
            explanation: { type: "string" },
            problem: { type: "string" },
            hint: { type: "string" },
            answer: { type: "string" },
            steps: { type: "array", items: { type: "string" } }
        },
        required: ["explanation", "problem", "hint", "answer", "steps"]
    },

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
                        explanation: { type: "string" }
                    },
                    required: ["question", "options", "answer_index", "explanation"]
                }
            }
        },
        required: ["topic", "story", "key_points", "quiz"]
    },

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
                        explanation: { type: "string" }
                    },
                    required: ["question", "options", "answer_index", "explanation"]
                }
            }
        },
        required: ["phenomenon", "story", "experiment_idea", "fun_fact", "quiz"]
    },

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
                        message: { type: "string" }
                    },
                    required: ["label", "consequence", "message"]
                }
            },
            teacher_comment: { type: "string" }
        },
        required: ["scenario", "question", "choices", "teacher_comment"]
    },

    jitsugaku: {
        type: "object",
        properties: {
            topic: { type: "string" },
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
                        explanation: { type: "string" }
                    },
                    required: ["question", "options", "answer_index", "explanation"]
                }
            }
        },
        required: ["topic", "hook", "story", "key_concept", "real_world_connection", "parent_note", "quiz"]
    }
};

// =========================================================
// ★★★ バックエンド処理：括弧書き→ルビ変換エンジン ★★★
// =========================================================

/**
 * 学年に応じた括弧書き処理のメイン関数
 */
function processTextResponse(text: string, grade: string): string {
    // 未就学児：基本的にひらがなメインなので、括弧書きがあれば除去
    if (grade.includes("年少") || grade.includes("年中") || grade.includes("年長")) {
        return text.replace(/\(([^)]+)\)/g, '');
    }

    // 小学1年生：厳密なルビ制御
    if (grade.includes("小学1年生")) {
        return processForGrade1(text);
    }

    // 小学2年生：1-2年生漢字以外にルビ
    if (grade.includes("小学2年生")) {
        return processForGrade2(text);
    }

    // 小学3年生以上：基本的にルビなし
    return text.replace(/([\u4e00-\u9faf々\u30a0-\u30ffA-Za-zａ-ｚＡ-Ｚ0-9０-９\-]+)[(（]([\u3040-\u309f\u30a0-\u30ff]+)[)）]/g, '$1');
}

/**
 * 小学1年生用の処理
 */
function processForGrade1(text: string): string {
    return text.replace(/([\u4e00-\u9faf々\u30a0-\u30ffA-Za-zａ-ｚＡ-Ｚ0-9０-９\-]+)[(（]([\u3040-\u309f\u30a0-\u30ff]+)[)）]/g, (match: string, kanji: string, yomi: string) => {

        // 1. 特殊読みリストにある場合は強制的にルビ
        if (FORCE_RUBY_WORDS.has(kanji)) {
            return `<ruby>${kanji}<rt>${yomi}</rt></ruby>`;
        }

        // 2. すべて1年生漢字かチェック
        const isAllGrade1 = Array.from(kanji).every(char => GRADE1_KANJI.has(char));

        // 3. すべて1年生漢字なら括弧を除去（ルビなし）
        if (isAllGrade1) {
            return kanji;
        }

        // 4. 未習漢字が含まれる場合はルビ化
        return `<ruby>${kanji}<rt>${yomi}</rt></ruby>`;
    });
}

/**
 * 小学2年生用の処理
 */
function processForGrade2(text: string): string {
    return text.replace(/([\u4e00-\u9faf々\u30a0-\u30ffA-Za-zａ-ｚＡ-Ｚ0-9０-９\-]+)[(（]([\u3040-\u309f\u30a0-\u30ff]+)[)）]/g, (match: string, kanji: string, yomi: string) => {

        // 特殊読みは強制ルビ
        if (FORCE_RUBY_WORDS.has(kanji)) {
            return `<ruby>${kanji}<rt>${yomi}</rt></ruby>`;
        }

        // 1-2年生漢字のみで構成されているかチェック
        const isAllGrade1or2 = Array.from(kanji).every(char =>
            GRADE1_KANJI.has(char) || GRADE2_KANJI.has(char)
        );

        if (isAllGrade1or2) {
            return kanji;
        }

        return `<ruby>${kanji}<rt>${yomi}</rt></ruby>`;
    });
}

/**
 * JSON内の全テキストフィールドを再帰的に処理
 */
function applyRubyToJSON(obj: unknown, grade: string): unknown {
    if (typeof obj === 'string') {
        return processTextResponse(String(obj), grade);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => applyRubyToJSON(item, grade));
    }

    if (obj !== null && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = applyRubyToJSON(value, grade);
        }
        return result;
    }

    return obj;
}

// =========================================================
// ★★★ システムプロンプト：括弧書き強制 ★★★
// =========================================================
function getModeSystemPrompt(mode: LearningMode, grade: string): string {

    const baseOutputRule = grade.includes("年少") || grade.includes("年中") || grade.includes("年長")
        ? `
【出力ルール】
- 基本的に「ひらがな」だけで話してください
- 難しい言葉は使わないでください
- HTMLタグは絶対に使わないでください`
        : `
【出力ルール - 1年生の先生ルールを徹底】
- 漢字には必ずカッコで読みをつけてください。例：漢字(かんじ)、学校(がっこう)
- カタカナ・数字・英語には絶対に読み（カッコ書き）をつけないでください。これは「1年生の先生ルール」として死守してください。
- ❌悪い例: テレビ(てれび)、3(さん)、AI(えーあい) -> カタカナ・数字・英語にルビはダメ！
- ⭕良い例: テレビ、3、AI
- 「ニ(ツ)」「2(ツー)」のような出力は厳禁です。
- HTMLタグ（<ruby>など）は絶対に使わず、必ず 漢字(よみがな) の形式で出力してください。`;

    const factCheckingRule = `
【事実確認とキャラクター維持ルール - 死守】
- 最新の話題や情報（ゲームの新作、最新ニュースなど）は、自分の記憶で答える前に、必ず「googleSearch」を使って検索し、その結果をもとに答えてください。
- 検索結果を回答する場合でも、AIせんせいのキャラクター（**小学1年生の目線に立った、常にやさしく共感的な口調**）を絶対に崩さないでください。ハルシネーションは厳禁です。
- ルビのルール（1年生の先生ルール）も、検索結果を話す際に必ず適用し厳守してください。`;

    const outputRule = baseOutputRule + factCheckingRule;

    let rolePrompt = "";

    switch (mode) {
        case "kokugo":
            rolePrompt = `あなたは「AIせんせい・国語の先生」です。対象学年: ${grade}
子どもがテーマや漢字を入力したら、その漢字を使った楽しいショートストーリーを作り、
漢字の読み方・意味・例文と、理解を確認するクイズを含めてください。
常にやさしく、共感的な口調で、必ずJSONフォーマットで返してください。`;
            break;

        case "sansu":
            rolePrompt = `あなたは「AIせんせい・算数の先生」です。対象学年: ${grade}
子どもの質問に対して、常にやさしく共感的に、わかりやすい説明・練習問題・ヒント・答え・解き方のステップをJSONで返してください。`;
            break;

        case "shakai":
            rolePrompt = `あなたは「AIせんせい・社会の先生」です。対象学年: ${grade}
社会のしくみ・地理・歴史などについて、常にやさしく共感的に、身近な例を使ったストーリーと
3つのキーポイント、クイズをJSONで返してください。`;
            break;

        case "rika":
            rolePrompt = `あなたは「AIせんせい・理科の先生」です。対象学年: ${grade}
科学的な現象や自然の不思議について、常にやさしく共感的に、「なぜそうなるか」の説明・
家でできる実験アイデア・びっくり豆知識・クイズをJSONで返してください。`;
            break;

        case "dotoku":
            rolePrompt = `あなたは「AIせんせい・道徳の先生」です。対象学年: ${grade}
常にやさしく共感的に日常のシナリオを提示し、「あなたならどうする？」と問いかけます。
複数の選択肢それぞれの結果と学びを示し、最後に温かいメッセージをJSONで返してください。`;
            break;

        case "jitsugaku":
            rolePrompt = `あなたは「AIせんせい・実学の先生」です。対象学年: ${grade}
お金・税金・株・政治・法律など「学校では教えてくれない本当に大切な知識」を、
常にやさしく共感的に、子どもでも理解できる言葉で教えます。JSONで返してください。`;
            break;

        default:
            rolePrompt = getDefaultChatPrompt(grade);
            break;
    }

    return `${rolePrompt}\n${outputRule}`;
}

function getDefaultChatPrompt(grade: string): string {
    const basePersona = `
【キャラクター設定 - 厳守】
- **小学1年生の目線に立ち、常にやさしく、共感的**であること。
- 「inquiring face」といったテキスト表現ではなく、実際の絵文字（🤔✨など）を1〜2個だけ使用すること。
- 回答の最後は、必ず「今日のご飯は何かな？」「足は何本かな？」のように、**その話題をさらに広げる具体的な質問**で締めること。「次はどんなことを聞く？」「他に質問はある？」といった抽象的な問いかけは禁止です。`;

    if (grade.includes("年少") || grade.includes("年中") || grade.includes("年長")) {
        return `あなたは未就学児のための「AIせんせい」です。${basePersona}
1. やさしく、ひらがなをメインに話す
2. 1回の返答は100文字以内
3. 語尾は「〜だよ」「〜だね」など`;
    }

    if (grade.includes("小学1年生")) {
        return `あなたは小学1年生のための「AIせんせい」です。${basePersona}
1. 質問にはやさしく答える
2. 1回の返答は150文字以内
3. 語尾は「〜だよ」「〜だね」など`;
    }

    if (grade.includes("小学2年生")) {
        return `あなたは小学2年生のための「AIせんせい」です。${basePersona}
1. 質問には丁寧に答える
2. 1回の返答は200文字以内
3. 語尾は「〜だよ」「〜だね」など親しみやすい口調`;
    }

    return `あなたは小学生のための「AIせんせい」です。${basePersona}
1. 質問にわかりやすく答える
2. 1回の返答は300文字以内`;
}

// =========================================================
// メインのAPIハンドラー
// =========================================================
export async function POST(req: NextRequest) {
    try {
        const { message, grade, history, mode = "chat" } = await req.json() as {
            message: string;
            grade: string;
            history: { sender: string; text: string }[];
            mode: LearningMode;
        };

        if (!message?.trim()) {
            return NextResponse.json({ error: "メッセージが空です" }, { status: 400 });
        }

        // 会話履歴の構築
        const contents: Content[] = [];
        for (const msg of (history ?? []).slice(-8)) {
            const role = (msg.sender === "user" ? "user" : "model") as "user" | "model";
            // 履歴からrubyタグを除去してAIには生テキストを渡す
            const cleanText = msg.text.replace(/<ruby>.*?<rt>.*?<\/rt><\/ruby>/g, (match) => {
                const kanjiMatch = match.match(/<ruby>(.*?)<rt>/);
                return kanjiMatch ? kanjiMatch[1] : match;
            });
            contents.push({ role, parts: [{ text: cleanText }] });
        }
        contents.push({ role: "user" as "user" | "model", parts: [{ text: message }] });

        const systemPrompt = getModeSystemPrompt(mode as LearningMode, grade ?? "");

        // 現在の日付を取得してシステムプロンプトの先頭に追加
        const now = new Date();
        const currentDateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
        const finalSystemPrompt = `【現在の日時情報】本日の日付は${currentDateStr}です。\n\n${systemPrompt}`;

        const schema = RESPONSE_SCHEMAS[mode as LearningMode];

        const generationConfig = schema
            ? {
                responseMimeType: "application/json",
                responseSchema: schema as any,
            }
            : undefined;

        const googleSearchDeclaration = {
            name: "googleSearch",
            description: "Googleで最新の情報を検索します。ユーザーから最新のゲーム（Switch 2やポケモンの新作など）や、最新の出来事、自分の知識や記憶に自信がない事実について聞かれたときに必ず使用してください。",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: {
                        type: "STRING",
                        description: "検索クエリ。例: '今日の天気', 'Switch 2 発売日', '〇〇について'"
                    }
                },
                required: ["query"]
            }
        };

        const model = ai.getGenerativeModel({
            model: "gemini-1.5-flash",
            tools: [{ functionDeclarations: [googleSearchDeclaration as any] }],
            systemInstruction: finalSystemPrompt
        });

        let result = await model.generateContent({
            contents,
            ...(generationConfig ? { generationConfig: generationConfig as any } : {}),
        });

        // =========================================================
        // Function Calling の処理ループ
        // =========================================================
        let calls = result.response.functionCalls();
        while (calls && calls.length > 0) {
            const call = calls[0];

            if (call.name === "googleSearch") {
                const { query } = call.args as { query: string };
                console.log(`[Function Calling] googleSearch triggered with query: ${query}`);

                const searchResult = await googleSearch(query);

                // 元の返答履歴に追加
                if (result.response.candidates && result.response.candidates[0].content) {
                    contents.push(result.response.candidates[0].content as Content);
                }

                // 検索結果をモデルに返す
                contents.push({
                    role: "function" as "user" | "model",
                    parts: [{
                        functionResponse: {
                            name: "googleSearch",
                            response: { result: searchResult }
                        }
                    }]
                });

                // もう一度推論を実行
                result = await model.generateContent({
                    contents,
                    ...(generationConfig ? { generationConfig: generationConfig as any } : {}),
                });
                calls = result.response.functionCalls();
            } else {
                break; // 知らない関数が呼ばれたら終了
            }
        }

        // テキストを確実にstringとして取得
        const rawText = (result.response.text() as string) || "";
        const safeGrade: string = String(grade ?? "");

        // ★★★ バックエンドで括弧書きを処理 ★★★

        // chatモードの処理
        if (mode === "chat") {
            const processedText = processTextResponse(rawText, safeGrade);
            return NextResponse.json({ mode: "chat", reply: processedText });
        }

        // 構造化モードの処理
        try {
            const parsed = JSON.parse(rawText);
            const processedData = applyRubyToJSON(parsed, safeGrade);
            return NextResponse.json({ mode, data: processedData });
        } catch {
            const processedText = processTextResponse(rawText, safeGrade);
            return NextResponse.json({ mode: "chat", reply: processedText });
        }

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[API/chat] Error:", errorMessage);
        return NextResponse.json(
            { error: "AIせんせいが困っています。もう一度試してね！", reply: "AIせんせいが困っています。もう一度試してね！" },
            { status: 500 }
        );
    }
}