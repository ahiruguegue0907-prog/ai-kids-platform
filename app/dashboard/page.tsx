"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// =========================================================
// 型定義
// =========================================================
interface SessionData {
    id: string;
    profileId: string;
    profileName: string;
    profileTitle: string;
    grade: string;
    startedAt: { seconds: number } | null;
    endedAt: { seconds: number } | null;
    messageCount: number;
    topics: string[];
    summary: string | null;
    highlightMessage: string | null;
    isActive: boolean;
}

interface MessageData {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: { seconds: number } | null;
}

// =========================================================
// 日付フォーマット
// =========================================================
function formatDate(timestamp: { seconds: number } | null): string {
    if (!timestamp) return "---";
    const date = new Date(timestamp.seconds * 1000);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// =========================================================
// HTMLタグ除去（ふりがなrubyタグなど）
// =========================================================
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
}

// =========================================================
// メインコンポーネント
// =========================================================
export default function DashboardPage() {
    const router = useRouter();
    const { user, isLoaded: isUserLoaded } = useUser();

    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);


    // セッション一覧を取得
    useEffect(() => {
        if (!isUserLoaded || !user?.id) return;

        const fetchSessions = async () => {
            setIsLoading(true);
            try {
                const sessionsRef = collection(db, "users", user.id, "sessions");
                const q = query(sessionsRef, orderBy("startedAt", "desc"));
                const snapshot = await getDocs(q);

                const sessionList: SessionData[] = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as SessionData[];

                setSessions(sessionList);
            } catch (error) {
                console.error("[Dashboard] セッション取得エラー:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSessions();
    }, [isUserLoaded, user?.id]);

    // セッションをクリックしたらメッセージを取得
    const handleSelectSession = async (session: SessionData) => {
        setSelectedSession(session);
        setIsLoadingMessages(true);
        try {
            const messagesRef = collection(
                db,
                "users",
                user!.id,
                "sessions",
                session.id,
                "messages"
            );
            const q = query(messagesRef, orderBy("timestamp", "asc"));
            const snapshot = await getDocs(q);

            const messageList: MessageData[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as MessageData[];

            setMessages(messageList);
        } catch (error) {
            console.error("[Dashboard] メッセージ取得エラー:", error);
        } finally {
            setIsLoadingMessages(false);
        }
    };

    // セッションの要約を生成
    const handleGenerateSummary = async (session: SessionData) => {
        if (!user?.id) return;
        setIsGeneratingSummary(true);
        try {
            const res = await fetch("/api/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clerkUserId: user.id,
                    sessionId: session.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                // セッション一覧を更新
                setSessions((prev) =>
                    prev.map((s) =>
                        s.id === session.id
                            ? { ...s, summary: data.summary, topics: data.topics, highlightMessage: data.highlightMessage }
                            : s
                    )
                );
                // 選択中のセッションも更新
                setSelectedSession((prev) =>
                    prev && prev.id === session.id
                        ? { ...prev, summary: data.summary, topics: data.topics, highlightMessage: data.highlightMessage }
                        : prev
                );
            } else {
                alert("要約の生成に失敗しました: " + (data.error || "不明なエラー"));
            }
        } catch (error) {
            console.error("[Dashboard] 要約生成エラー:", error);
            alert("要約の生成中にエラーが発生しました");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // 未ログイン時
    if (isUserLoaded && !user) {
        return (
            <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
                <h2>ログインが必要です</h2>
                <button
                    onClick={() => router.push("/onboarding")}
                    style={{
                        marginTop: "20px",
                        padding: "12px 24px",
                        fontSize: "16px",
                        backgroundColor: "#4F46E5",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                >
                    ログインページへ
                </button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#F9FAFB", fontFamily: "sans-serif" }}>
            {/* ヘッダー */}
            <div
                style={{
                    backgroundColor: "#4F46E5",
                    color: "white",
                    padding: "16px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "20px" }}>AIせんせい 保護者ダッシュボード</h1>
                <button
                    onClick={() => router.push("/home")}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "rgba(255,255,255,0.2)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.4)",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                    }}
                >
                    ホームに戻る
                </button>
            </div>

            <div style={{ display: "flex", maxWidth: "1200px", margin: "0 auto", padding: "24px", gap: "24px" }}>
                {/* 左カラム：セッション一覧 */}
                <div style={{ width: "360px", flexShrink: 0 }}>
                    <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#374151" }}>
                        会話セッション一覧
                    </h2>

                    {isLoading ? (
                        <p style={{ color: "#9CA3AF" }}>読み込み中...</p>
                    ) : sessions.length === 0 ? (
                        <p style={{ color: "#9CA3AF" }}>まだ会話の記録がありません</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => handleSelectSession(session)}
                                    style={{
                                        padding: "12px 16px",
                                        backgroundColor: selectedSession?.id === session.id ? "#EEF2FF" : "white",
                                        border: selectedSession?.id === session.id ? "2px solid #4F46E5" : "1px solid #E5E7EB",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontWeight: "bold", color: "#374151", fontSize: "14px" }}>
                                            {session.profileName}{session.profileTitle}
                                        </span>
                                        <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                                            {formatDate(session.startedAt)}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "4px" }}>
                                        {session.grade} ・ {session.messageCount}メッセージ
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 右カラム：会話内容 */}
                <div style={{ flex: 1 }}>
                    {!selectedSession ? (
                        <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF" }}>
                            <p style={{ fontSize: "16px" }}>← セッションを選んで会話内容を確認できます</p>
                        </div>
                    ) : (
                        <>
                            <h2 style={{ fontSize: "18px", marginBottom: "16px", color: "#374151" }}>
                                {selectedSession.profileName}{selectedSession.profileTitle} の会話
                                <span style={{ fontSize: "13px", color: "#9CA3AF", marginLeft: "8px" }}>
                                    {formatDate(selectedSession.startedAt)}
                                </span>
                            </h2>

                            {/* 要約エリア */}
                            <div style={{
                                marginBottom: "20px",
                                padding: "16px",
                                backgroundColor: "#EEF2FF",
                                borderRadius: "8px",
                                border: "1px solid #C7D2FE",
                            }}>
                                {selectedSession.summary ? (
                                    <>
                                        <div style={{ fontWeight: "bold", color: "#4F46E5", marginBottom: "8px", fontSize: "14px" }}>
                                            📝 要約
                                        </div>
                                        <p style={{ color: "#374151", fontSize: "14px", margin: "0 0 12px 0", lineHeight: "1.6" }}>
                                            {selectedSession.summary}
                                        </p>
                                        {selectedSession.topics && selectedSession.topics.length > 0 && (
                                            <div style={{ marginBottom: "12px" }}>
                                                <span style={{ fontWeight: "bold", color: "#4F46E5", fontSize: "13px" }}>🏷️ トピック: </span>
                                                {selectedSession.topics.map((topic, i) => (
                                                    <span key={i} style={{
                                                        display: "inline-block",
                                                        padding: "2px 8px",
                                                        margin: "2px 4px",
                                                        backgroundColor: "white",
                                                        borderRadius: "12px",
                                                        fontSize: "12px",
                                                        color: "#4F46E5",
                                                        border: "1px solid #C7D2FE",
                                                    }}>
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {selectedSession.highlightMessage && (
                                            <div>
                                                <span style={{ fontWeight: "bold", color: "#4F46E5", fontSize: "13px" }}>⭐ ハイライト: </span>
                                                <span style={{ color: "#374151", fontSize: "14px", fontStyle: "italic" }}>
                                                    「{selectedSession.highlightMessage}」
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: "center" }}>
                                        <p style={{ color: "#6B7280", fontSize: "14px", margin: "0 0 12px 0" }}>
                                            まだ要約が生成されていません
                                        </p>
                                        <button
                                            onClick={() => handleGenerateSummary(selectedSession)}
                                            disabled={isGeneratingSummary}
                                            style={{
                                                padding: "10px 20px",
                                                backgroundColor: isGeneratingSummary ? "#9CA3AF" : "#4F46E5",
                                                color: "white",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: isGeneratingSummary ? "not-allowed" : "pointer",
                                                fontSize: "14px",
                                            }}
                                        >
                                            {isGeneratingSummary ? "生成中..." : "✨ 要約を生成する"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isLoadingMessages ? (
                                <p style={{ color: "#9CA3AF" }}>読み込み中...</p>
                            ) : messages.length === 0 ? (
                                <p style={{ color: "#9CA3AF" }}>メッセージがありません</p>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                display: "flex",
                                                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: "75%",
                                                    padding: "10px 14px",
                                                    borderRadius: msg.role === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                                                    backgroundColor: msg.role === "user" ? "#4F46E5" : "white",
                                                    color: msg.role === "user" ? "white" : "#374151",
                                                    border: msg.role === "user" ? "none" : "1px solid #E5E7EB",
                                                    fontSize: "14px",
                                                    lineHeight: "1.6",
                                                }}
                                            >
                                                <div style={{ fontSize: "11px", color: msg.role === "user" ? "rgba(255,255,255,0.7)" : "#9CA3AF", marginBottom: "4px" }}>
                                                    {msg.role === "user" ? "👧 こども" : "🤖 AIせんせい"}
                                                </div>
                                                {stripHtml(msg.content)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
