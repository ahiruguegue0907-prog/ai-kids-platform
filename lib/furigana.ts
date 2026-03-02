import path from 'path';
import kuromoji from 'kuromoji';

// --- 型定義 ---
interface KuromojiToken {
    surface_form: string;
    reading?: string;
    pos: string;
    pos_detail_1?: string;
}

interface Tokenizer {
    tokenize: (text: string) => KuromojiToken[];
}

// --- シングルトン ---
let _tokenizer: Tokenizer | null = null;
let _initPromise: Promise<Tokenizer> | null = null;

function getTokenizer(): Promise<Tokenizer> {
    if (_tokenizer) return Promise.resolve(_tokenizer);
    if (_initPromise) return _initPromise;

    const dictPath = path.join(process.cwd(), 'public/dict');
    console.log('[furigana] kuromoji dict path:', dictPath);

    _initPromise = new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: dictPath }).build((err: Error | null, tokenizer: Tokenizer) => {
            if (err) {
                console.error('[furigana] kuromoji build error:', err.message);
                _initPromise = null;
                reject(err);
            } else {
                console.log('[furigana] kuromoji loaded successfully');
                _tokenizer = tokenizer;
                resolve(tokenizer);
            }
        });
    });
    return _initPromise;
}

// --- 小学1年生の漢字リスト（80字） ---
const GRADE1_KANJI = new Set(
    '一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六'
);

// --- カスタム辞書（Kuromojiの読みを強制上書き） ---
const CUSTOM_READINGS: Record<string, string> = {
    "他": "ほか",
    "何": "なに",
    "私": "わたし",
    "今日": "きょう",
    "明日": "あした",
    "大人": "おとな"
};

// --- カタカナ→ひらがな変換 ---
function katakanaToHiragana(str: string): string {
    return str.replace(/[\u30A1-\u30F6]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

// --- 漢字を含むか ---
function containsKanji(str: string): boolean {
    return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(str);
}

// --- 単語内の漢字がすべて小1漢字かどうかを判定 ---
function isAllGrade1Kanji(str: string): boolean {
    for (const ch of str) {
        // 漢字であり、かつ小1漢字でないものがあれば false
        if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(ch) && !GRADE1_KANJI.has(ch)) {
            return false;
        }
    }
    return true;
}

// --- テキストの事前クリーニング（サニタイズ） ---
function sanitizeText(text: string): string {
    // 1. <ruby>漢字<rt>読み</rt></ruby> などのHTMLタグを除去し、漢字だけを残す
    let sanitized = text.replace(/<rt>.*?<\/rt>/g, '');
    sanitized = sanitized.replace(/<rp>.*?<\/rp>/g, '');
    sanitized = sanitized.replace(/<ruby>(.*?)<\/ruby>/g, '$1');

    // 2. 漢字(ひらがな/カタカナ) のようなカッコ書きのふりがなを除去し、漢字だけを残す
    // 半角カッコ() と 全角カッコ（） の両方に対応
    sanitized = sanitized.replace(/([\u4E00-\u9FFF\u3400-\u4DBF]+)[（(][\u3040-\u309F\u30A0-\u30FF]+[）)]/g, '$1');

    return sanitized;
}

/**
 * テキストにふりがなを付与する（<ruby> タグ形式）
 *
 * - 小1漢字のみで構成される単語はそのまま出力
 * - 小2以上の漢字が含まれる単語は <ruby>漢字<rt>ひらがな</rt></ruby> に変換
 *
 * @param text 入力テキスト（Gemini からの返答など）
 * @returns ルビ付きHTML文字列
 */
export async function addFurigana(text: string): Promise<string> {
    let tokenizer: Tokenizer;
    try {
        tokenizer = await getTokenizer();
    } catch {
        return text; // kuromoji が使えなければ生テキストを返す
    }

    // Kuromojiに渡す前にテキストをサニタイズ（余計なルビやカッコを除去）
    const cleanText = sanitizeText(text);

    const tokens: KuromojiToken[] = tokenizer.tokenize(cleanText);
    const result: string[] = [];

    for (const token of tokens) {
        const surface = token.surface_form;
        const reading = token.reading;

        // 読みがない or 漢字を含まない → そのまま
        if (!reading || !containsKanji(surface)) {
            result.push(surface);
            continue;
        }

        // 漢字部分がすべて小1漢字 → ルビなし
        if (isAllGrade1Kanji(surface)) {
            result.push(surface);
            continue;
        }

        // 小2以上の漢字が含まれている → <ruby> タグで囲む

        // カスタム辞書に登録があればそれを優先、なければKuromojiの読み（カタカナ）をひらがなに変換
        const hiraganaReading = CUSTOM_READINGS[surface] || katakanaToHiragana(reading);

        // 読みと表記が同じ（＝ひらがな表記の場合など）→ そのまま
        if (hiraganaReading === surface) {
            result.push(surface);
            continue;
        }

        result.push(`<ruby>${surface}<rt>${hiraganaReading}</rt></ruby>`);
    }

    return result.join('');
}
