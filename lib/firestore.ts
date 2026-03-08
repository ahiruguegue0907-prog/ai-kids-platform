import { getAdminDb } from "./firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

// ============================================
// 型定義
// ============================================

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Timestamp | FieldValue;
    safetyFlag?: string | null;
}

export interface ChatSession {
    profileId: string;
    profileName: string;
    profileTitle: string;
    grade: string;
    startedAt: Timestamp | FieldValue;
    endedAt?: Timestamp | FieldValue | null;
    messageCount: number;
    topics: string[];
    summary: string | null;
    highlightMessage: string | null;
    isActive: boolean;
}

// ============================================
// セッション管理
// ============================================

/**
 * 新しいチャットセッションを作成する
 */
export async function createChatSession(
    clerkUserId: string,
    profileId: string,
    profileName: string,
    profileTitle: string,
    grade: string
): Promise<string> {
    const db = getAdminDb();
    const sessionsRef = db.collection("users").doc(clerkUserId).collection("sessions");
    const sessionDoc = await sessionsRef.add({
        profileId,
        profileName,
        profileTitle,
        grade,
        startedAt: FieldValue.serverTimestamp(),
        endedAt: null,
        messageCount: 0,
        topics: [],
        summary: null,
        highlightMessage: null,
        isActive: true,
    });

    return sessionDoc.id;
}

/**
 * セッションにメッセージを追加する
 */
export async function addMessageToSession(
    clerkUserId: string,
    sessionId: string,
    role: "user" | "assistant",
    content: string,
    safetyFlag?: string | null
): Promise<void> {
    const db = getAdminDb();
    // メッセージをサブコレクションに追加
    const messagesRef = db
        .collection("users")
        .doc(clerkUserId)
        .collection("sessions")
        .doc(sessionId)
        .collection("messages");
    await messagesRef.add({
        role,
        content,
        timestamp: FieldValue.serverTimestamp(),
        safetyFlag: safetyFlag || null,
    });

    // セッションのメッセージ数を更新
    const sessionRef = db
        .collection("users")
        .doc(clerkUserId)
        .collection("sessions")
        .doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (sessionSnap.exists) {
        const currentCount = sessionSnap.data()?.messageCount || 0;
        await sessionRef.update({
            messageCount: currentCount + 1,
        });
    }
}

/**
 * セッションを終了する（サマリーとトピックを保存）
 */
export async function endChatSession(
    clerkUserId: string,
    sessionId: string,
    summary: string,
    topics: string[],
    highlightMessage: string | null
): Promise<void> {
    const db = getAdminDb();
    const sessionRef = db
        .collection("users")
        .doc(clerkUserId)
        .collection("sessions")
        .doc(sessionId);
    await sessionRef.update({
        endedAt: FieldValue.serverTimestamp(),
        isActive: false,
        summary,
        topics,
        highlightMessage,
    });
}

// ============================================
// データ取得（ダッシュボード用）
// ============================================

/**
 * 指定した子どもの最近のセッション一覧を取得する
 */
export async function getRecentSessions(
    clerkUserId: string,
    profileId: string,
    maxResults: number = 20
): Promise<(ChatSession & { id: string })[]> {
    const db = getAdminDb();
    const sessionsRef = db.collection("users").doc(clerkUserId).collection("sessions");
    const snapshot = await sessionsRef
        .where("profileId", "==", profileId)
        .orderBy("startedAt", "desc")
        .limit(maxResults)
        .get();

    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as ChatSession),
    }));
}

/**
 * 特定セッションの全メッセージを取得する
 */
export async function getSessionMessages(
    clerkUserId: string,
    sessionId: string
): Promise<(ChatMessage & { id: string })[]> {
    const db = getAdminDb();
    const messagesRef = db
        .collection("users")
        .doc(clerkUserId)
        .collection("sessions")
        .doc(sessionId)
        .collection("messages");
    const snapshot = await messagesRef.orderBy("timestamp", "asc").get();

    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as ChatMessage),
    }));
}
