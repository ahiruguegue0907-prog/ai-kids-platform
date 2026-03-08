import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { clerkUserId, sessionId } = (await req.json()) as {
            clerkUserId: string;
            sessionId: string;
        };

        if (!clerkUserId || !sessionId) {
            return NextResponse.json(
                { error: "clerkUserId と sessionId が必要です" },
                { status: 400 }
            );
        }

        // ===== 1. Firestoreからメッセージを取得 =====
        const db = getAdminDb();
        const messagesRef = db
            .collection("users")
            .doc(clerkUserId)
            .collection("sessions")
            .doc(sessionId)
            .collection("messages");
        const snapshot = await messagesRef.orderBy("timestamp", "asc").get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: "メッセージが見つかりません" },
                { status: 404 }
            );
        }

        // 会話テキストを組み立て
        const conversationLines: string[] = [];
        for (const msgDoc of snapshot.docs) {
            const data = msgDoc.data();
            const role = data.role === "user" ? "こども" : "AIせんせい";
            const content = (data.content || "").replace(/<[^>]*>/g, "");
            conversationLines.push(`${role}: ${content}`);
        }
        const conversationText = conversationLines.join("\n");

        // ===== 2. Gemini APIで要約・分析を生成 =====
        const summaryPrompt = `あなたは子ども向けAI学習アプリ「AIせんせい」の教育アドバイザーです。
以下は子どもとAIの会話ログです。保護者向けに以下の3項目を日本語で簡潔にまとめてください。

【要約】会話の概要を2〜3文で。
【トピック】会話に出てきた主なテーマをカンマ区切りで3〜5個。
【ハイライト】子どもの発言の中で最も印象的・成長を感じる一言を1つ選び、その発言をそのまま引用してください。

出力はJSON形式で、以下のキーを使ってください：
{
  "summary": "要約テキスト",
  "topics": ["トピック1", "トピック2", "トピック3"],
  "highlightMessage": "子どもの印象的な発言"
}

--- 会話ログ ---
${conversationText}
--- ここまで ---`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: summaryPrompt }] }],
            config: {
                responseMimeType: "application/json",
            },
        });

        const rawText = response.text ?? "";
        let parsed: { summary: string; topics: string[]; highlightMessage: string };

        try {
            parsed = JSON.parse(rawText);
        } catch {
            parsed = {
                summary: rawText.slice(0, 200),
                topics: [],
                highlightMessage: "",
            };
        }

        // ===== 3. Firestoreのセッションを更新 =====
        const sessionRef = db
            .collection("users")
            .doc(clerkUserId)
            .collection("sessions")
            .doc(sessionId);
        await sessionRef.update({
            summary: parsed.summary,
            topics: parsed.topics,
            highlightMessage: parsed.highlightMessage,
            isActive: false,
            endedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            summary: parsed.summary,
            topics: parsed.topics,
            highlightMessage: parsed.highlightMessage,
        });
    } catch (error: unknown) {
        console.error("[API/summary] エラー:", error);
        return NextResponse.json(
            { error: "要約の生成に失敗しました" },
            { status: 500 }
        );
    }
}
