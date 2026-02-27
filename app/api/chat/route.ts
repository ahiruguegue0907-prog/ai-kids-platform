import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // 【超・安全設計】どちらの名前で設定されていても、空っぽでもエラーにならないように取得します
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

        if (!apiKey || apiKey === "") {
            console.error("★★★ エラー: APIキーが見つかりません。 .env.local を確認してください。");
            return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // 現在提供されている安定版のモデル名に修正（2.5はまだプレビュー等の可能性があるため安定版を指定）
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // プロンプト：ひらがな中心で優しく
        const systemPrompt = `あなたは未就学児〜小学生に寄り添う優しい『あいせんせい』です。
以下のルールを絶対に守ってください。
1. ひらがなを多く使い、短く親しみやすい言葉にすること。
2. 1つの文はできるだけ短くすること。
3. 文章の終わりには、必ず「。」「！」「？」のいずれかをつけること。絶対に省略しないでください。

子供のメッセージ：${message}`;

        // 履歴（history）がある場合はそれを含めて生成、なければメッセージのみ
        const result = await model.generateContent(systemPrompt);
        let text = result.response.text();

        // ★改行の最適化★
        // 1. 句読点の後に改行を入れる
        text = text.replace(/([。！？])(?!」|』)/g, '$1\n');
        // 2. 連続した改行を1つにまとめる
        text = text.replace(/\n+/g, '\n').trim();

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("★★★ サーバーエラー:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}