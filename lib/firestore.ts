import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ============================================
// 型定義
// ============================================

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Timestamp | ReturnType<typeof serverTimestamp>;
    safetyFlag?: string | null;
}

export interface ChatSession {
    profileId: string;
    profileName: string;
    profileTitle: string;
    grade: string;
    startedAt: Timestamp | ReturnType<typeof serverTimestamp>;
    endedAt?: Timestamp | ReturnType<typeof serverTimestamp> | null;
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
    const sessionsRef = collection(db, "users", clerkUserId, "sessions");
    const sessionDoc = await addDoc(sessionsRef, {
        profileId,
        profileName,
        profileTitle,
        grade,
        startedAt: serverTimestamp(),
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
    // メッセージをサブコレクションに追加
    const messagesRef = collection(
        db,
        "users",
        clerkUserId,
        "sessions",
        sessionId,
        "messages"
    );
    await addDoc(messagesRef, {
        role,
        content,
        timestamp: serverTimestamp(),
        safetyFlag: safetyFlag || null,
    });

    // セッションのメッセージ数を更新
    const sessionRef = doc(db, "users", clerkUserId, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (sessionSnap.exists()) {
        const currentCount = sessionSnap.data().messageCount || 0;
        await updateDoc(sessionRef, {
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
    const sessionRef = doc(db, "users", clerkUserId, "sessions", sessionId);
    await updateDoc(sessionRef, {
        endedAt: serverTimestamp(),
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
    const sessionsRef = collection(db, "users", clerkUserId, "sessions");
    const q = query(
        sessionsRef,
        where("profileId", "==", profileId),
        orderBy("startedAt", "desc"),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
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
    const messagesRef = collection(
        db,
        "users",
        clerkUserId,
        "sessions",
        sessionId,
        "messages"
    );
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as ChatMessage),
    }));
}
