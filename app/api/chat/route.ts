// app/api/chat/route.ts

import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { createChatSession, addMessageToSession } from "@/lib/firestore";

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
const GRADE1_KANJI = new Set([
    "一", "右", "雨", "円", "王", "音", "下", "火", "花", "貝", "学", "気", "九", "休",
    "玉", "金", "空", "月", "犬", "見", "五", "口", "校", "左", "三", "山", "子", "四",
    "糸", "字", "耳", "七", "車", "手", "十", "出", "女", "小", "上", "森", "人", "水",
    "正", "生", "青", "夕", "石", "赤", "千", "川", "先", "早", "草", "足", "村", "大",
    "男", "竹", "中", "虫", "町", "天", "田", "土", "二", "日", "入", "年", "白", "八",
    "百", "文", "木", "本", "名", "目", "立", "力", "林", "六",
]);

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

// =========================================================
// kuromoji 形態素解析器（シングルトン）
// =========================================================
// eslint-disable-next-line @typescript-eslint/no-require-imports
const kuromoji = require("kuromoji");

interface KuromojiToken {
    surface_form: string;
    reading: string | undefined;
    word_type: string;
    pos: string;
    pos_detail_1: string;
    basic_form: string;
    conjugated_type: string;
    conjugated_form: string;
}

interface KuromojiTokenizer {
    tokenize(text: string): KuromojiToken[];
}

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

function getTokenizer(): Promise<KuromojiTokenizer> {
    if (!tokenizerPromise) {
        tokenizerPromise = new Promise<KuromojiTokenizer>((resolve, reject) => {
            const dicPath = path.join(
                process.cwd(),
                "node_modules",
                "kuromoji",
                "dict"
            );
            kuromoji
                .builder({ dicPath })
                .build((err: Error | null, tokenizer: KuromojiTokenizer) => {
                    if (err) {
                        tokenizerPromise = null;
                        reject(err);
                    } else {
                        resolve(tokenizer);
                    }
                });
        });
    }
    return tokenizerPromise;
}

// =========================================================
// カタカナ → ひらがな変換
// =========================================================
function katakanaToHiragana(str: string): string {
    return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

// =========================================================
// 漢字判定ヘルパー
// =========================================================
function containsKanji(str: string): boolean {
    return /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(str);
}

function allKanjiInSet(str: string, kanjiSet: Set<string>): boolean {
    const kanjiChars = str.match(/[\u4E00-\u9FFF\u3400-\u4DBF]/g);
    if (!kanjiChars) return true;
    return kanjiChars.every((ch) => kanjiSet.has(ch));
}

// =========================================================
// LLM出力クリーニング：括弧ふりがな・rubyタグ除去
// =========================================================
function cleanBracketRuby(text: string): string {
    let result = text;
    result = result.replace(/<ruby>([^<]+)<rt>[^<]+<\/rt><\/ruby>/g, "$1");
    result = result.replace(
        /([\u4E00-\u9FFF\u3400-\u4DBF][\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F]*)[（(]([ぁ-んァ-ヶ]+)[）)]/g,
        "$1"
    );
    result = result.replace(/\*\*/g, "");
    return result;
}

// =========================================================
// ✅ 新方式：LLMのインライン読み重複を正規表現で除去
// =========================================================
// LLMが「食たべ物もの」「大おおきい」「好すき」のように漢字直後に
// ひらがなの読みを書いてしまうパターンを直接除去する。
// kuromojiで壊れた文字列をトークン化しても正しく分割できないため、
// 既知パターンの正規表現マッチで対処する。

// [漢字表記, LLMが出力する誤パターン（正規表現）, 正しい置換結果]
const INLINE_READING_PATTERNS: [RegExp, string][] = [
    // ---- 送り仮名付き動詞・形容詞 ----
    [/小学校しょうがっこう/g, "小学校"],
    [/中学校ちゅうがっこう/g, "中学校"],
    [/高校こうこう/g, "高校"],
    [/保育園ほいくえん/g, "保育園"],
    [/幼稚園ようちえん/g, "幼稚園"],
    [/卒園そつえん/g, "卒園"],
    [/入学にゅうがく/g, "入学"],
    [/行いくのも/g, "行くのも"],
    [/行いくの/g, "行くの"],
    [/食たべ物もの/g, "食べ物"],
    [/食たべ/g, "食べ"],
    [/大おおきい/g, "大きい"],
    [/大おおきく/g, "大きく"],
    [/大おおきさ/g, "大きさ"],
    [/大おおきな/g, "大きな"],
    [/小ちいさい/g, "小さい"],
    [/小ちいさく/g, "小さく"],
    [/小ちいさな/g, "小さな"],
    [/好すき/g, "好き"],
    [/好こうすき/g, "好き"],  // kuromoji誤読み「こう」パターン
    [/楽たのしい/g, "楽しい"],
    [/楽たのしく/g, "楽しく"],
    [/楽たのしみ/g, "楽しみ"],
    [/楽たのしむ/g, "楽しむ"],
    [/楽たのしん/g, "楽しん"],
    [/楽たのしさ/g, "楽しさ"],
    [/新あたらしい/g, "新しい"],
    [/新あたらしく/g, "新しく"],
    [/強つよい/g, "強い"],
    [/強つよく/g, "強く"],
    [/強つよさ/g, "強さ"],
    [/弱よわい/g, "弱い"],
    [/弱よわく/g, "弱く"],
    [/高たかい/g, "高い"],
    [/高たかく/g, "高く"],
    [/高たかさ/g, "高さ"],
    [/長ながい/g, "長い"],
    [/長ながく/g, "長く"],
    [/長ながさ/g, "長さ"],
    [/広ひろい/g, "広い"],
    [/広ひろく/g, "広く"],
    [/広ひろさ/g, "広さ"],
    [/広ひろが/g, "広が"],
    [/近ちかい/g, "近い"],
    [/近ちかく/g, "近く"],
    [/近ちかづ/g, "近づ"],
    [/多おおい/g, "多い"],
    [/多おおく/g, "多く"],
    [/少すこし/g, "少し"],
    [/少すくな/g, "少な"],
    [/古ふるい/g, "古い"],
    [/古ふるく/g, "古く"],
    [/細ほそい/g, "細い"],
    [/細ほそく/g, "細く"],
    [/細こまか/g, "細か"],
    [/黒くろい/g, "黒い"],
    [/黒くろく/g, "黒く"],
    [/速はやい/g, "速い"],
    [/速はやく/g, "速く"],
    [/速はやさ/g, "速さ"],
    [/早はやい/g, "早い"],
    [/早はやく/g, "早く"],
    [/明あかるい/g, "明るい"],
    [/明あかるく/g, "明るく"],
    [/寒さむい/g, "寒い"],
    [/寒さむく/g, "寒く"],
    [/寒さむさ/g, "寒さ"],
    [/暑あつい/g, "暑い"],
    [/暑あつく/g, "暑く"],
    [/暑あつさ/g, "暑さ"],
    [/暖あたたかい/g, "暖かい"],
    [/暖あたたか/g, "暖か"],
    [/涼すずしい/g, "涼しい"],
    [/涼すずし/g, "涼し"],
    [/優やさしい/g, "優しい"],
    [/優やさしく/g, "優しく"],
    [/美うつくしい/g, "美しい"],
    [/美うつくしく/g, "美しく"],
    [/正ただしい/g, "正しい"],
    [/正ただしく/g, "正しく"],
    [/悲かなしい/g, "悲しい"],
    [/悲かなしく/g, "悲しく"],
    [/嬉うれしい/g, "嬉しい"],
    [/嬉うれしく/g, "嬉しく"],
    [/難むずかしい/g, "難しい"],
    [/難むずかしく/g, "難しく"],
    [/危あぶない/g, "危ない"],
    [/危あぶなく/g, "危なく"],
    [/深ふかい/g, "深い"],
    [/深ふかく/g, "深く"],
    [/深ふかさ/g, "深さ"],
    [/遠とおい/g, "遠い"],
    [/遠とおく/g, "遠く"],
    [/短みじかい/g, "短い"],
    [/短みじかく/g, "短く"],
    [/丸まるい/g, "丸い"],
    [/丸まるく/g, "丸く"],
    [/白しろい/g, "白い"],
    [/白しろく/g, "白く"],
    [/赤あかい/g, "赤い"],
    [/赤あかく/g, "赤く"],
    [/青あおい/g, "青い"],
    [/青あおく/g, "青く"],
    [/暗くらい/g, "暗い"],
    [/暗くらく/g, "暗く"],
    [/重おもい/g, "重い"],
    [/重おもく/g, "重く"],
    [/重おもさ/g, "重さ"],
    [/軽かるい/g, "軽い"],
    [/軽かるく/g, "軽く"],
    [/温あたたかい/g, "温かい"],
    [/温あたたか/g, "温か"],
    [/冷つめたい/g, "冷たい"],
    [/冷つめたく/g, "冷たく"],

    // ---- 動詞 ----
    [/作つくる/g, "作る"],
    [/作つくっ/g, "作っ"],
    [/作つくり/g, "作り"],
    [/作つくれ/g, "作れ"],
    [/知しる/g, "知る"],
    [/知しっ/g, "知っ"],
    [/知しり/g, "知り"],
    [/知しら/g, "知ら"],
    [/知しれ/g, "知れ"],
    [/走はしる/g, "走る"],
    [/走はしっ/g, "走っ"],
    [/走はしり/g, "走り"],
    [/走はしれ/g, "走れ"],
    [/泳およぐ/g, "泳ぐ"],
    [/泳およい/g, "泳い"],
    [/泳およぎ/g, "泳ぎ"],
    [/泳およげ/g, "泳げ"],
    [/飛とぶ/g, "飛ぶ"],
    [/飛とん/g, "飛ん"],
    [/飛とび/g, "飛び"],
    [/飛とべ/g, "飛べ"],
    [/遊あそぶ/g, "遊ぶ"],
    [/遊あそん/g, "遊ん"],
    [/遊あそび/g, "遊び"],
    [/遊あそべ/g, "遊べ"],
    [/読よむ/g, "読む"],
    [/読よん/g, "読ん"],
    [/読よみ/g, "読み"],
    [/読よめ/g, "読め"],
    [/買かう/g, "買う"],
    [/買かっ/g, "買っ"],
    [/買かい/g, "買い"],
    [/買かえ/g, "買え"],
    [/売うる/g, "売る"],
    [/売うっ/g, "売っ"],
    [/売うり/g, "売り"],
    [/売うれ/g, "売れ"],
    [/歩あるく/g, "歩く"],
    [/歩あるい/g, "歩い"],
    [/歩あるき/g, "歩き"],
    [/歩あるけ/g, "歩け"],
    [/聞きく/g, "聞く"],
    [/聞きい/g, "聞い"],
    [/聞きき/g, "聞き"],
    [/聞きけ/g, "聞け"],
    [/帰かえる/g, "帰る"],
    [/帰かえっ/g, "帰っ"],
    [/帰かえり/g, "帰り"],
    [/帰かえれ/g, "帰れ"],
    [/通とおる/g, "通る"],
    [/通とおっ/g, "通っ"],
    [/通とおり/g, "通り"],
    [/通とおれ/g, "通れ"],
    [/思おもう/g, "思う"],
    [/思おもっ/g, "思っ"],
    [/思おもい/g, "思い"],
    [/思おもえ/g, "思え"],
    [/考かんがえ/g, "考え"],
    [/考かんがえる/g, "考える"],
    [/使つかう/g, "使う"],
    [/使つかっ/g, "使っ"],
    [/使つかい/g, "使い"],
    [/使つかえ/g, "使え"],
    [/持もつ/g, "持つ"],
    [/持もっ/g, "持っ"],
    [/持もち/g, "持ち"],
    [/持もて/g, "持て"],
    [/待まつ/g, "待つ"],
    [/待まっ/g, "待っ"],
    [/待まち/g, "待ち"],
    [/待まて/g, "待て"],
    [/住すむ/g, "住む"],
    [/住すん/g, "住ん"],
    [/住すみ/g, "住み"],
    [/住すめ/g, "住め"],
    [/集あつまる/g, "集まる"],
    [/集あつまっ/g, "集まっ"],
    [/集あつまり/g, "集まり"],
    [/集あつまれ/g, "集まれ"],
    [/集あつめる/g, "集める"],
    [/集あつめ/g, "集め"],
    [/教おしえ/g, "教え"],
    [/教おしえる/g, "教える"],
    [/教おそわ/g, "教わ"],
    [/答こたえ/g, "答え"],
    [/答こたえる/g, "答える"],
    [/守まもる/g, "守る"],
    [/守まもっ/g, "守っ"],
    [/守まもり/g, "守り"],
    [/守まもれ/g, "守れ"],
    [/見みる/g, "見る"],
    [/見みて/g, "見て"],
    [/見みえ/g, "見え"],
    [/見みた/g, "見た"],
    [/生いきて/g, "生きて"],
    [/生いき/g, "生き"],
    [/生うまれ/g, "生まれ"],
    [/出でる/g, "出る"],
    [/出でて/g, "出て"],
    [/出だす/g, "出す"],
    [/出だし/g, "出し"],
    [/入はいる/g, "入る"],
    [/入はいっ/g, "入っ"],
    [/入いれ/g, "入れ"],
    [/立たつ/g, "立つ"],
    [/立たっ/g, "立っ"],
    [/立たて/g, "立て"],
    [/話はなす/g, "話す"],
    [/話はなし/g, "話し"],
    [/話はなせ/g, "話せ"],
    [/言いう/g, "言う"],
    [/言いっ/g, "言っ"],

    // ---- 漢字熟語（LLMが読みを挿入するもの） ----
    [/動物どうぶつ/g, "動物"],
    [/種類しゅるい/g, "種類"],
    [/昼間ひるま/g, "昼間"],
    [/洋服ようふく/g, "洋服"],
    [/調節ちょうせつ/g, "調節"],
    [/風邪かぜ/g, "風邪"],
    [/発売はつばい/g, "発売"],
    [/冒険ぼうけん/g, "冒険"],
    [/海藻かいそう/g, "海藻"],
    [/体長たいちょう/g, "体長"],
    [/便利べんり/g, "便利"],
    [/友達ともだち/g, "友達"],
    [/天気てんき/g, "天気"],
    [/温度おんど/g, "温度"],
    [/気温きおん/g, "気温"],
    [/湿度しつど/g, "湿度"],
    [/地球ちきゅう/g, "地球"],
    [/世界せかい/g, "世界"],
    [/地図ちず/g, "地図"],
    [/図書館としょかん/g, "図書館"],
    [/学校がっこう/g, "学校"],
    [/先生せんせい/g, "先生"],
    [/勉強べんきょう/g, "勉強"],
    [/宿題しゅくだい/g, "宿題"],
    [/練習れんしゅう/g, "練習"],
    [/問題もんだい/g, "問題"],
    [/質問しつもん/g, "質問"],
    [/意味いみ/g, "意味"],
    [/漢字かんじ/g, "漢字"],
    [/算数さんすう/g, "算数"],
    [/理科りか/g, "理科"],
    [/社会しゃかい/g, "社会"],
    [/国語こくご/g, "国語"],
    [/音楽おんがく/g, "音楽"],
    [/体育たいいく/g, "体育"],
    [/給食きゅうしょく/g, "給食"],
    [/時間じかん/g, "時間"],
    [/場所ばしょ/g, "場所"],
    [/家族かぞく/g, "家族"],
    [/兄弟きょうだい/g, "兄弟"],
    [/病院びょういん/g, "病院"],
    [/病気びょうき/g, "病気"],
    [/元気げんき/g, "元気"],
    [/安全あんぜん/g, "安全"],
    [/危険きけん/g, "危険"],
    [/自然しぜん/g, "自然"],
    [/植物しょくぶつ/g, "植物"],
    [/生物せいぶつ/g, "生物"],
    [/昆虫こんちゅう/g, "昆虫"],
    [/恐竜きょうりゅう/g, "恐竜"],
    [/水族館すいぞくかん/g, "水族館"],
    [/動物園どうぶつえん/g, "動物園"],
    [/遊園地ゆうえんち/g, "遊園地"],
    [/公園こうえん/g, "公園"],
    [/運動うんどう/g, "運動"],
    [/野菜やさい/g, "野菜"],
    [/果物くだもの/g, "果物"],
    [/料理りょうり/g, "料理"],
    [/食事しょくじ/g, "食事"],
    [/朝食ちょうしょく/g, "朝食"],
    [/昼食ちゅうしょく/g, "昼食"],
    [/夕食ゆうしょく/g, "夕食"],
    [/栄養えいよう/g, "栄養"],
    [/健康けんこう/g, "健康"],
    [/季節きせつ/g, "季節"],
    [/台風たいふう/g, "台風"],
    [/地震じしん/g, "地震"],
    [/太陽たいよう/g, "太陽"],
    [/電車でんしゃ/g, "電車"],
    [/飛行機ひこうき/g, "飛行機"],
    [/自動車じどうしゃ/g, "自動車"],
    [/新幹線しんかんせん/g, "新幹線"],
    [/方法ほうほう/g, "方法"],
    [/理由りゆう/g, "理由"],
    [/特徴とくちょう/g, "特徴"],
    [/説明せつめい/g, "説明"],
    [/紹介しょうかい/g, "紹介"],
    [/写真しゃしん/g, "写真"],
    [/映画えいが/g, "映画"],
    [/番組ばんぐみ/g, "番組"],
    [/大人おとな/g, "大人"],
    [/子供こども/g, "子供"],
    [/仲間なかま/g, "仲間"],
    [/約束やくそく/g, "約束"],
    [/準備じゅんび/g, "準備"],
    [/経験けいけん/g, "経験"],
    [/記憶きおく/g, "記憶"],
    [/想像そうぞう/g, "想像"],
    [/感動かんどう/g, "感動"],
    [/感謝かんしゃ/g, "感謝"],
    [/努力どりょく/g, "努力"],
    [/挑戦ちょうせん/g, "挑戦"],
    [/成功せいこう/g, "成功"],
    [/失敗しっぱい/g, "失敗"],
    [/未来みらい/g, "未来"],
    [/過去かこ/g, "過去"],
    [/現在げんざい/g, "現在"],
    [/今日きょう/g, "今日"],
    [/明日あした/g, "明日"],
    [/明日あす/g, "明日"],
    [/昨日きのう/g, "昨日"],
    [/毎日まいにち/g, "毎日"],
    [/毎週まいしゅう/g, "毎週"],
    [/毎月まいつき/g, "毎月"],
    [/毎年まいとし/g, "毎年"],
    // ---- 動詞・形容詞（追加分2） ----
    [/間あいだ/g, "間"],
    [/捕つかまえ/g, "捕まえ"],
    [/捕つかま/g, "捕ま"],
    [/捕とら/g, "捕ら"],
    [/捕とる/g, "捕る"],
    [/捕とっ/g, "捕っ"],
    [/動うご/g, "動"],
    [/動どう/g, "動"],
    [/生いき物もの/g, "生き物"],
    [/合あわせ/g, "合わせ"],
    [/合あわ/g, "合わ"],
    [/合あう/g, "合う"],
    [/合あっ/g, "合っ"],
    [/変かわ/g, "変わ"],
    [/変かえ/g, "変え"],
    [/変かえる/g, "変える"],
    [/変へん/g, "変"],
    [/隠かく/g, "隠"],
    [/隠かくれ/g, "隠れ"],
    [/隠かくし/g, "隠し"],
    [/隠かくす/g, "隠す"],
    [/送おく/g, "送"],
    [/送おくる/g, "送る"],
    [/送おくっ/g, "送っ"],
    [/送おくり/g, "送り"],
    [/景色けしき/g, "景色"],
    [/周まわり/g, "周り"],
    [/周まわ/g, "周"],
    [/合図あいず/g, "合図"],
    // ---- 重複語・複合語（追加分3） ----
    [/喜よろこ/g, "喜"],
    [/喜きよろこ/g, "喜ろこ"],
    [/喜きよろこん/g, "喜ろこん"],
    [/喜きよろこび/g, "喜ろこび"],
    [/喜きよろこぶ/g, "喜ろこぶ"],
    [/喜よろこん/g, "喜ん"],
    [/喜よろこび/g, "喜び"],
    [/喜よろこぶ/g, "喜ぶ"],
    [/喜よろこ/g, "喜"],
    [/人間にんげん人間にんげん/g, "人間"],
    [/人間にんげん/g, "人間"],
    [/生き物いきもの生き物いきもの/g, "生き物"],
    [/生き物いきものいきもの/g, "生き物"],
    [/生き物いきもの/g, "生き物"],
    [/海底かいてい/g, "海底"],
    [/海底かいでい/g, "海底"],
    [/サンゴ礁さんごしょう/g, "サンゴ礁"],
    [/サンゴ礁しょう/g, "サンゴ礁"],
    [/珊瑚礁さんごしょう/g, "珊瑚礁"],
    [/不思議ふしぎ/g, "不思議"],
    [/仲間なかま/g, "仲間"],
    [/種類しゅるい/g, "種類"],
    [/世界せかい/g, "世界"],
    [/探検たんけん/g, "探検"],
    [/別べつ/g, "別"],
    [/底そこ/g, "底"],
    [/森もり/g, "森"],
    [/砂すな/g, "砂"],
    [/光ひかり/g, "光"],
    [/光ひか/g, "光"],
    [/頭あたま/g, "頭"],
    [/声こえ/g, "声"],
    [/鳴な/g, "鳴"],
    [/感かん/g, "感"],
    // ---- 時間・場所・天気（追加分） ----
    [/今週こんしゅう/g, "今週"],
    [/来週らいしゅう/g, "来週"],
    [/先週せんしゅう/g, "先週"],
    [/今月こんげつ/g, "今月"],
    [/来月らいげつ/g, "来月"],
    [/先月せんげつ/g, "先月"],
    [/今年ことし/g, "今年"],
    [/来年らいねん/g, "来年"],
    [/去年きょねん/g, "去年"],
    [/昨年さくねん/g, "昨年"],
    [/土曜日どようび/g, "土曜日"],
    [/日曜日にちようび/g, "日曜日"],
    [/月曜日げつようび/g, "月曜日"],
    [/火曜日かようび/g, "火曜日"],
    [/水曜日すいようび/g, "水曜日"],
    [/木曜日もくようび/g, "木曜日"],
    [/金曜日きんようび/g, "金曜日"],
    [/土曜どよう/g, "土曜"],
    [/日曜にちよう/g, "日曜"],
    [/月曜げつよう/g, "月曜"],
    [/火曜かよう/g, "火曜"],
    [/水曜すいよう/g, "水曜"],
    [/木曜もくよう/g, "木曜"],
    [/金曜きんよう/g, "金曜"],
    [/東京とうきょう/g, "東京"],
    [/大阪おおさか/g, "大阪"],
    [/最高さいこう/g, "最高"],
    [/最低さいてい/g, "最低"],
    [/時々ときどき/g, "時々"],
    [/曇くもり/g, "曇り"],
    [/曇くも/g, "曇"],
    [/過すご/g, "過ご"],
    [/一日いちにち/g, "一日"],
    [/出かけでかけ/g, "出かけ"],
    [/出でかけ/g, "出かけ"],
    [/自然しぜん/g, "自然"],
    [/文化ぶんか/g, "文化"],
    // ---- 単漢字+読み（頻出エラー） ----
    [/海うみ/g, "海"],
    [/空そら/g, "空"],
    [/山やま/g, "山"],
    [/川かわ/g, "川"],
    [/花はな/g, "花"],
    [/木き/g, "木"],
    [/森もり/g, "森"],
    [/林はやし/g, "林"],
    [/雨あめ/g, "雨"],
    [/雪ゆき/g, "雪"],
    [/風かぜ/g, "風"],
    [/星ほし/g, "星"],
    [/月つき/g, "月"],
    [/春はる/g, "春"],
    [/夏なつ/g, "夏"],
    [/秋あき/g, "秋"],
    [/冬ふゆ/g, "冬"],
    [/色いろ/g, "色"],
    [/声こえ/g, "声"],
    [/音おと/g, "音"],
    [/光ひかり/g, "光"],
    [/水みず/g, "水"],
    [/火ひ/g, "火"],
    [/土つち/g, "土"],
    [/石いし/g, "石"],
    [/草くさ/g, "草"],
    [/虫むし/g, "虫"],
    [/犬いぬ/g, "犬"],
    [/馬うま/g, "馬"],
    [/牛うし/g, "牛"],
    [/鳥とり/g, "鳥"],
    [/魚さかな/g, "魚"],
    [/貝かい/g, "貝"],
    [/耳みみ/g, "耳"],
    [/目め/g, "目"],
    [/口くち/g, "口"],
    [/手て/g, "手"],
    [/足あし/g, "足"],
    [/体からだ/g, "体"],
    [/頭あたま/g, "頭"],
    [/顔かお/g, "顔"],
    [/心こころ/g, "心"],
    [/力ちから/g, "力"],
    [/人ひと/g, "人"],
    [/男おとこ/g, "男"],
    [/女おんな/g, "女"],
    [/子こ/g, "子"],
    [/王おう/g, "王"],
    [/友とも/g, "友"],
    [/父ちち/g, "父"],
    [/母はは/g, "母"],
    [/兄あに/g, "兄"],
    [/弟おとうと/g, "弟"],
    [/姉あね/g, "姉"],
    [/妹いもうと/g, "妹"],
    [/先さき/g, "先"],
    [/前まえ/g, "前"],
    [/後うしろ/g, "後"],
    [/後あと/g, "後"],
    [/上うえ/g, "上"],
    [/下した/g, "下"],
    [/中なか/g, "中"],
    [/外そと/g, "外"],
    [/内うち/g, "内"],
    [/右みぎ/g, "右"],
    [/左ひだり/g, "左"],
    [/北きた/g, "北"],
    [/南みなみ/g, "南"],
    [/東ひがし/g, "東"],
    [/西にし/g, "西"],
    [/朝あさ/g, "朝"],
    [/昼ひる/g, "昼"],
    [/夜よる/g, "夜"],
    [/夕ゆう/g, "夕"],
    [/町まち/g, "町"],
    [/村むら/g, "村"],
    [/国くに/g, "国"],
    [/道みち/g, "道"],
    [/門もん/g, "門"],
    [/戸と/g, "戸"],
    [/室しつ/g, "室"],
    [/家いえ/g, "家"],
    [/店みせ/g, "店"],
    [/他ほか/g, "他"],
    [/他た/g, "他"],   // kuromoji誤読み
    [/方ほう/g, "方"],
    [/方かた/g, "方"],
    [/物もの/g, "物"],
    [/事こと/g, "事"],
    [/時とき/g, "時"],
    [/何なに/g, "何"],
    [/何なん/g, "何"],
];

function cleanLLMInlineReadings(text: string): string {
    let result = text;

    // Step A: 既知パターンのスペースなし重複を除去
    for (const [pattern, replacement] of INLINE_READING_PATTERNS) {
        result = result.replace(pattern, replacement);
    }

    // Step B: スペース含みパターンを除去
    // LLMが「東京 とうきょう」のように漢字語+スペース+読みを出すケース
    result = result.replace(
        /([\u4E00-\u9FFF\u3400-\u4DBF]{1,6})([\s　]+)([\u3040-\u309F]{2,10})/g,
        (match, kanji, _space, hiragana) => {
            const combined = kanji + hiragana;
            for (const [pattern, replacement] of INLINE_READING_PATTERNS) {
                const testPattern = new RegExp(pattern.source);
                if (testPattern.test(combined)) {
                    return replacement;
                }
            }
            return kanji + hiragana;
        }
    );

    // Step C: 数字+漢字+読み パターンを除去
    result = result.replace(/(\d+月)がつ/g, "$1");
    result = result.replace(/(\d+日)にち/g, "$1");
    result = result.replace(/(\d+日)なのか/g, "$1");
    result = result.replace(/(\d+日)ついたち/g, "$1");
    result = result.replace(/(\d+日)ふつか/g, "$1");
    result = result.replace(/(\d+日)みっか/g, "$1");
    result = result.replace(/(\d+日)よっか/g, "$1");
    result = result.replace(/(\d+日)いつか/g, "$1");
    result = result.replace(/(\d+日)むいか/g, "$1");
    result = result.replace(/(\d+日)ようか/g, "$1");
    result = result.replace(/(\d+日)ここのか/g, "$1");
    result = result.replace(/(\d+日)とおか/g, "$1");
    result = result.replace(/(\d+日)はつか/g, "$1");
    result = result.replace(/(\d+時)じ/g, "$1");
    result = result.replace(/(\d+分)ふん/g, "$1");
    result = result.replace(/(\d+分)ぷん/g, "$1");
    result = result.replace(/(\d+年)ねん/g, "$1");
    result = result.replace(/(\d+度)ど/g, "$1");
    result = result.replace(/(\d+回)かい/g, "$1");
    result = result.replace(/(\d+個)こ/g, "$1");
    result = result.replace(/(\d+人)にん/g, "$1");
    result = result.replace(/(\d+人)り/g, "$1");
    result = result.replace(/(\d+匹)ひき/g, "$1");
    result = result.replace(/(\d+匹)びき/g, "$1");
    result = result.replace(/(\d+匹)ぴき/g, "$1");
    result = result.replace(/(\d+本)ほん/g, "$1");
    result = result.replace(/(\d+本)ぼん/g, "$1");
    result = result.replace(/(\d+本)ぽん/g, "$1");
    result = result.replace(/(\d+枚)まい/g, "$1");
    result = result.replace(/(\d+台)だい/g, "$1");
    result = result.replace(/(\d+階)かい/g, "$1");
    result = result.replace(/℃ど/g, "℃");
    result = result.replace(/℃（ど）/g, "℃");

    return result;
}

// =========================================================
// 汎用フォールバック：残存する漢字+ひらがな重複を検出除去
// =========================================================
// INLINE_READING_PATTERNS に登録されていないパターンへの対策。
// 漢字1〜3文字の直後に、その漢字の kuromoji 読みと一致するひらがなが
// 続いている場合に除去する。
async function cleanRemainingDuplicates(
    text: string,
    tokenizer: KuromojiTokenizer
): Promise<string> {
    // 漢字(1-4字)+ひらがな(2字以上) のパターンを探す
    const pattern = /([\u4E00-\u9FFF\u3400-\u4DBF]{1,4})([\u3040-\u309F]{2,8})/g;
    let result = text;
    const replacements: [string, string][] = [];

    let match;
    while ((match = pattern.exec(text)) !== null) {
        const kanjiPart = match[1];
        const hiraganaPart = match[2];
        const fullMatch = match[0];

        // kuromojiで漢字部分の読みを取得
        const tokens = tokenizer.tokenize(kanjiPart);
        if (tokens.length === 1 && tokens[0].reading) {
            const expectedReading = katakanaToHiragana(tokens[0].reading);
            // ひらがな部分が漢字の読みで始まっている場合 → 重複
            if (hiraganaPart.startsWith(expectedReading)) {
                const remainder = hiraganaPart.slice(expectedReading.length);
                replacements.push([fullMatch, kanjiPart + remainder]);
            }
            // ひらがな部分が読みそのもの → 完全重複
            else if (hiraganaPart === expectedReading) {
                replacements.push([fullMatch, kanjiPart]);
            }
        }
    }

    // 長いマッチから先に置換（短いマッチが部分的に壊さないように）
    replacements.sort((a, b) => b[0].length - a[0].length);
    for (const [from, to] of replacements) {
        result = result.split(from).join(to);
    }

    return result;
}

// =========================================================
// kuromoji読み補正テーブル
// =========================================================
const READING_OVERRIDES: Map<string, string> = new Map([
    ["この間", "コノアイダ"],
    ["間に", "アイダニ"],
    ["間で", "アイダデ"],
    ["間の", "アイダノ"],
    ["間を", "アイダヲ"],
    ["間は", "アイダハ"],
    ["時間", "ジカン"],
    ["人間", "ニンゲン"],
    ["仲間", "ナカマ"],
    ["昼間", "ヒルマ"],
    ["空間", "クウカン"], ["食べ", "タベ"],
    ["食べる", "タベル"],
    ["食べた", "タベタ"],
    ["食べて", "タベテ"],
    ["食べない", "タベナイ"],
    ["食べ物", "タベモノ"],
    ["食物", "ショクモツ"],
    ["作る", "ツクル"],
    ["作った", "ツクッタ"],
    ["作って", "ツクッテ"],
    ["作れ", "ツクレ"],
    ["作り", "ツクリ"],
    ["知って", "シッテ"],
    ["知る", "シル"],
    ["知ら", "シラ"],
    ["知り", "シリ"],
    ["知れ", "シレ"],
    ["遊ぶ", "アソブ"],
    ["遊び", "アソビ"],
    ["遊ん", "アソン"],
    ["遊べ", "アソベ"],
    ["走る", "ハシル"],
    ["走っ", "ハシッ"],
    ["走り", "ハシリ"],
    ["走れ", "ハシレ"],
    ["飛ぶ", "トブ"],
    ["飛ん", "トン"],
    ["飛び", "トビ"],
    ["飛べ", "トベ"],
    ["読む", "ヨム"],
    ["読ん", "ヨン"],
    ["読み", "ヨミ"],
    ["読め", "ヨメ"],
    ["買う", "カウ"],
    ["買っ", "カッ"],
    ["買い", "カイ"],
    ["買え", "カエ"],
    ["売る", "ウル"],
    ["売っ", "ウッ"],
    ["売り", "ウリ"],
    ["売れ", "ウレ"],
    ["教え", "オシエ"],
    ["教える", "オシエル"],
    ["教わ", "オソワ"],
    ["答え", "コタエ"],
    ["答える", "コタエル"],
    ["歩く", "アルク"],
    ["歩い", "アルイ"],
    ["歩き", "アルキ"],
    ["歩け", "アルケ"],
    ["聞く", "キク"],
    ["聞い", "キイ"],
    ["聞き", "キキ"],
    ["聞け", "キケ"],
    ["帰る", "カエル"],
    ["帰っ", "カエッ"],
    ["帰り", "カエリ"],
    ["帰れ", "カエレ"],
    ["通る", "トオル"],
    ["通っ", "トオッ"],
    ["通り", "トオリ"],
    ["通れ", "トオレ"],
    ["思う", "オモウ"],
    ["思っ", "オモッ"],
    ["思い", "オモイ"],
    ["思え", "オモエ"],
    ["考え", "カンガエ"],
    ["考える", "カンガエル"],
    ["使う", "ツカウ"],
    ["使っ", "ツカッ"],
    ["使い", "ツカイ"],
    ["使え", "ツカエ"],
    ["持つ", "モツ"],
    ["持っ", "モッ"],
    ["持ち", "モチ"],
    ["持て", "モテ"],
    ["待つ", "マツ"],
    ["待っ", "マッ"],
    ["待ち", "マチ"],
    ["待て", "マテ"],
    ["住む", "スム"],
    ["住ん", "スン"],
    ["住み", "スミ"],
    ["住め", "スメ"],
    ["集まる", "アツマル"],
    ["集まっ", "アツマッ"],
    ["集まり", "アツマリ"],
    ["集まれ", "アツマレ"],
    ["集める", "アツメル"],
    ["集め", "アツメ"],
    ["泳ぐ", "オヨグ"],
    ["泳い", "オヨイ"],
    ["泳ぎ", "オヨギ"],
    ["泳げ", "オヨゲ"],
    ["守る", "マモル"],
    ["守っ", "マモッ"],
    ["守り", "マモリ"],
    ["守れ", "マモレ"],
    ["見る", "ミル"],
    ["見て", "ミテ"],
    ["見え", "ミエ"],
    ["見た", "ミタ"],
    ["生きて", "イキテ"],
    ["生き", "イキ"],
    ["生まれ", "ウマレ"],
    ["出る", "デル"],
    ["出て", "デテ"],
    ["出す", "ダス"],
    ["出し", "ダシ"],
    ["入る", "ハイル"],
    ["入っ", "ハイッ"],
    ["入れ", "イレ"],
    ["立つ", "タツ"],
    ["立っ", "タッ"],
    ["立て", "タテ"],
    ["話す", "ハナス"],
    ["話し", "ハナシ"],
    ["話せ", "ハナセ"],
    ["言う", "イウ"],
    ["言っ", "イッ"],
    ["好き", "スキ"],
    ["好きな", "スキナ"],
    ["強い", "ツヨイ"],
    ["強く", "ツヨク"],
    ["強さ", "ツヨサ"],
    ["弱い", "ヨワイ"],
    ["弱く", "ヨワク"],
    ["弱さ", "ヨワサ"],
    ["楽しい", "タノシイ"],
    ["楽し", "タノシ"],
    ["楽しく", "タノシク"],
    ["楽しさ", "タノシサ"],
    ["楽しむ", "タノシム"],
    ["楽しん", "タノシン"],
    ["楽しめ", "タノシメ"],
    ["新しい", "アタラシイ"],
    ["新し", "アタラシ"],
    ["新しく", "アタラシク"],
    ["近い", "チカイ"],
    ["近く", "チカク"],
    ["近づ", "チカヅ"],
    ["長い", "ナガイ"],
    ["長く", "ナガク"],
    ["長さ", "ナガサ"],
    ["高い", "タカイ"],
    ["高く", "タカク"],
    ["高さ", "タカサ"],
    ["広い", "ヒロイ"],
    ["広く", "ヒロク"],
    ["広さ", "ヒロサ"],
    ["広が", "ヒロガ"],
    ["多い", "オオイ"],
    ["多く", "オオク"],
    ["少し", "スコシ"],
    ["少な", "スクナ"],
    ["細い", "ホソイ"],
    ["細く", "ホソク"],
    ["細か", "コマカ"],
    ["古い", "フルイ"],
    ["古く", "フルク"],
    ["明るい", "アカルイ"],
    ["明るく", "アカルク"],
    ["黒い", "クロイ"],
    ["黒く", "クロク"],
    ["速い", "ハヤイ"],
    ["速く", "ハヤク"],
    ["速さ", "ハヤサ"],
    ["早い", "ハヤイ"],
    ["早く", "ハヤク"],
    ["優しい", "ヤサシイ"],
    ["優し", "ヤサシ"],
    ["優しく", "ヤサシク"],
    ["寒い", "サムイ"],
    ["寒く", "サムク"],
    ["寒さ", "サムサ"],
    ["暑い", "アツイ"],
    ["暑く", "アツク"],
    ["暑さ", "アツサ"],
    ["暖かい", "アタタカイ"],
    ["暖か", "アタタカ"],
    ["涼しい", "スズシイ"],
    ["涼し", "スズシ"],
    ["大きい", "オオキイ"],
    ["大き", "オオキ"],
    ["大きく", "オオキク"],
    ["大きさ", "オオキサ"],
    ["大きな", "オオキナ"],
    ["小さい", "チイサイ"],
    ["小さ", "チイサ"],
    ["小さく", "チイサク"],
    ["小さな", "チイサナ"],
    ["他に", "ホカニ"],
    ["他の", "ホカノ"],
    ["他にも", "ホカニモ"],
    ["他", "ホカ"],
    ["晴れ", "ハレ"],
    ["晴れる", "ハレル"],
    ["晴れて", "ハレテ"],
    ["美しい", "ウツクシイ"],
    ["美しく", "ウツクシク"],
    ["正しい", "タダシイ"],
    ["正しく", "タダシク"],
    ["悲しい", "カナシイ"],
    ["悲しく", "カナシク"],
    ["難しい", "ムズカシイ"],
    ["難しく", "ムズカシク"],
    ["深い", "フカイ"],
    ["深く", "フカク"],
    ["深さ", "フカサ"],
    ["遠い", "トオイ"],
    ["遠く", "トオク"],
    ["短い", "ミジカイ"],
    ["短く", "ミジカク"],
    ["丸い", "マルイ"],
    ["丸く", "マルク"],
    ["白い", "シロイ"],
    ["白く", "シロク"],
    ["赤い", "アカイ"],
    ["赤く", "アカク"],
    ["青い", "アオイ"],
    ["青く", "アオク"],
    ["暗い", "クライ"],
    ["暗く", "クラク"],
    ["重い", "オモイ"],
    ["重く", "オモク"],
    ["重さ", "オモサ"],
    ["軽い", "カルイ"],
    ["軽く", "カルク"],
    ["温かい", "アタタカイ"],
    ["温か", "アタタカ"],
    ["冷たい", "ツメタイ"],
    ["冷たく", "ツメタク"],
    ["大人", "オトナ"],
    ["子供", "コドモ"],
    ["友達", "トモダチ"],
    ["食べ物", "タベモノ"],
    ["方", "ホウ"],
    ["便利", "ベンリ"],
    ["便利べんり", "ベンリ"], // 重複パターンが残った場合の保険
    ["行く", "イク"],
    ["行っ", "イッ"],
    ["行き", "イキ"],
    ["行け", "イケ"],
    ["行こう", "イコウ"],
    ["行って", "イッテ"],
    ["過ごし", "スゴシ"],
    ["過ごす", "スゴス"],
    ["過ごせ", "スゴセ"],
    ["過ごそ", "スゴソ"],
    ["曇り", "クモリ"],
    ["合わせ", "アワセ"],
    ["合わせる", "アワセル"],
    ["合う", "アウ"],
    ["合っ", "アッ"],
    ["変わる", "カワル"],
    ["変わっ", "カワッ"],
    ["変わり", "カワリ"],
    ["変われ", "カワレ"],
    ["変える", "カエル"],
    ["変え", "カエ"],
    ["隠す", "カクス"],
    ["隠し", "カクシ"],
    ["隠れ", "カクレ"],
    ["隠れる", "カクレル"],
    ["送る", "オクル"],
    ["送っ", "オクッ"],
    ["送り", "オクリ"],
    ["送れ", "オクレ"],
    ["間", "アイダ"],
    ["捕まえ", "ツカマエ"],
    ["捕まえる", "ツカマエル"],
    ["捕まえて", "ツカマエテ"],
    ["捕まり", "ツカマリ"],
    ["捕まる", "ツカマル"],
    ["捕まっ", "ツカマッ"],
    ["動く", "ウゴク"],
    ["動き", "ウゴキ"],
    ["動い", "ウゴイ"],
    ["動け", "ウゴケ"],
    ["動かす", "ウゴカス"],
    ["動かし", "ウゴカシ"],
    ["喜ん", "ヨロコン"],
    ["喜び", "ヨロコビ"],
    ["喜ぶ", "ヨロコブ"],
    ["喜ろこん", "ヨロコン"],
    ["喜ろこび", "ヨロコビ"],
    ["喜ろこぶ", "ヨロコブ"],

]);

function correctReading(token: KuromojiToken): string | undefined {
    const override = READING_OVERRIDES.get(token.surface_form);
    if (override) return override;
    return token.reading;
}

// =========================================================
// ルビ付与のコア関数
// =========================================================
async function addRubyToText(text: string, grade: string): Promise<string> {
    const isGrade1OrBelow =
        grade.includes("年少") ||
        grade.includes("年中") ||
        grade.includes("年長") ||
        grade.includes("小学1年生");

    const isGrade2 = grade.includes("小学2年生");

    if (!isGrade1OrBelow && !isGrade2) return text;

    const exemptKanji = isGrade1OrBelow
        ? GRADE1_KANJI
        : new Set([...GRADE1_KANJI, ...GRADE2_KANJI]);

    const tokenizer = await getTokenizer();

    // Step 1: <ruby>タグ・括弧ふりがなを除去
    let cleaned = cleanBracketRuby(text);

    // Step 2: 既知パターンのインライン読み重複を除去（正規表現ベース）
    cleaned = cleanLLMInlineReadings(cleaned);

    // Step 3: 残存する未知パターンの重複をkuromojiで検出除去
    cleaned = await cleanRemainingDuplicates(cleaned, tokenizer);

    // Step 4: ルビ付与
    const lines = cleaned.split("\n");
    const processedLines = lines.map((line) => {
        if (!line.trim()) return line;

        const tokens = tokenizer.tokenize(line);
        return tokens
            .map((token: KuromojiToken) => {
                const surface = token.surface_form;

                // 漢字を含まないトークンはそのまま
                if (!containsKanji(surface)) return surface;

                // 読みを取得（補正テーブル優先）
                const reading = correctReading(token);
                if (!reading) return surface;

                // 既習漢字のみで構成されている場合はルビ不要
                if (allKanjiInSet(surface, exemptKanji)) return surface;

                const hiraganaReading = katakanaToHiragana(reading);

                // 表記と読みが同じ場合はルビ不要
                if (surface === hiraganaReading) return surface;

                return buildRubyTag(surface, hiraganaReading, exemptKanji);
            })
            .join("");
    });

    return processedLines.join("\n");
}

// =========================================================
// ルビタグ構築（送り仮名対応）
// =========================================================
function buildRubyTag(
    surface: string,
    reading: string,
    exemptKanji: Set<string>
): string {
    // 末尾のひらがな・カタカナを送り仮名として分離
    const okuriganaMatch = surface.match(/([\u3040-\u309F\u30A0-\u30FF]+)$/);

    if (!okuriganaMatch) {
        // 送り仮名なし（純粋な漢字のみ）
        // 例: 動物 → <ruby>動物<rt>どうぶつ</rt></ruby>
        return `<ruby>${surface}<rt>${reading}</rt></ruby>`;
    }

    const okurigana = okuriganaMatch[1];
    const kanjiPart = surface.slice(0, surface.length - okurigana.length);

    if (!kanjiPart || !containsKanji(kanjiPart)) return surface;

    // 送り仮名のひらがな表記
    const okuriganaHiragana = katakanaToHiragana(okurigana);

    // 読みの末尾から送り仮名分を除去してルビ部分を算出
    let readingForKanji = reading;
    if (reading.endsWith(okuriganaHiragana)) {
        readingForKanji = reading.slice(
            0,
            reading.length - okuriganaHiragana.length
        );
    }

    if (!readingForKanji) {
        // 送り仮名を除去したら読みが空 → 全体にルビ
        return `<ruby>${surface}<rt>${reading}</rt></ruby>`;
    }

    // 漢字部分が既習かチェック
    if (allKanjiInSet(kanjiPart, exemptKanji)) {
        return surface; // 既習漢字 → ルビ不要
    }

    return `<ruby>${kanjiPart}<rt>${readingForKanji}</rt></ruby>${okurigana}`;
}

// =========================================================
// JSONオブジェクト内のテキストにルビ付与
// =========================================================
async function applyRubyToJSON(obj: unknown, grade: string): Promise<unknown> {
    if (typeof obj === "string") return addRubyToText(obj, grade);
    if (Array.isArray(obj)) {
        return Promise.all(obj.map((item) => applyRubyToJSON(item, grade)));
    }
    if (obj !== null && typeof obj === "object") {
        const entries = Object.entries(obj as Record<string, unknown>);
        const processed = await Promise.all(
            entries.map(
                async ([k, v]) => [k, await applyRubyToJSON(v, grade)] as const
            )
        );
        return Object.fromEntries(processed);
    }
    return obj;
}

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
        url.searchParams.set("search_lang", "jp");
        url.searchParams.set("country", "JP");

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
// 検索ツール宣言
// =========================================================
const SEARCH_TOOL = {
    functionDeclarations: [
        {
            name: "search_web",
            description:
                "インターネットをリアルタイムで検索して最新情報を取得する。" +
                "天気予報・ゲームや映画の発売日・ニュース・現在の出来事など、" +
                "AIの知識だけでは答えられない最新情報が必要なときに必ず使うこと。",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: {
                        type: Type.STRING,
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
    kokugo: {
        type: "object",
        properties: {
            story: {
                type: "string",
                description: "漢字が登場するショートストーリー（200文字以内）",
            },
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
                    required: [
                        "question",
                        "options",
                        "answer_index",
                        "explanation",
                    ],
                },
            },
        },
        required: ["story", "featured_kanji", "quiz"],
    },
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
                    required: [
                        "question",
                        "options",
                        "answer_index",
                        "explanation",
                    ],
                },
            },
        },
        required: ["topic", "story", "key_points", "quiz"],
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
                        explanation: { type: "string" },
                    },
                    required: [
                        "question",
                        "options",
                        "answer_index",
                        "explanation",
                    ],
                },
            },
        },
        required: ["phenomenon", "story", "experiment_idea", "fun_fact", "quiz"],
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
                        message: { type: "string" },
                    },
                    required: ["label", "consequence", "message"],
                },
            },
            teacher_comment: { type: "string" },
        },
        required: ["scenario", "question", "choices", "teacher_comment"],
    },
    jitsugaku: {
        type: "object",
        properties: {
            topic: {
                type: "string",
                enum: [
                    "お金",
                    "税金",
                    "株・投資",
                    "政治・選挙",
                    "法律",
                    "保険",
                    "経済",
                ],
            },
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
                    required: [
                        "question",
                        "options",
                        "answer_index",
                        "explanation",
                    ],
                },
            },
        },
        required: [
            "topic",
            "hook",
            "story",
            "key_concept",
            "real_world_connection",
            "parent_note",
            "quiz",
        ],
    },
};

// =========================================================
// ふりがなルール（システムプロンプト用）
// =========================================================
function getFuriganaRule(): string {
    return `
【最重要ルール：ふりがなについて - 違反厳禁】
あなたは絶対にふりがなを付けてはいけません。以下を厳守してください：

1. 漢字はそのまま書く。ふりがなは一切不要。システムが自動付与する。
2. <ruby>タグ禁止。
3. 括弧でのよみがな禁止。例：「色（いろ）」「発売（はつばい）」→ すべて禁止。
4. 漢字の直後にひらがなで読みを書くこと禁止。
   ❌ 食たべ物もの ❌ 大おおきい ❌ 好すき ❌ 泳およぎ ❌ 体からだ ❌ 便利べんり ❌ 方ほう
   ✅ 食べ物 ✅ 大きい ✅ 好き ✅ 泳ぎ ✅ 体 ✅ 便利 ✅ 方
5. 漢字を避けてひらがなだけで書くのも禁止。
   ❌ おおきい → ✅ 大きい
   ❌ たべもの → ✅ 食べ物
   ❌ すき → ✅ 好き

正しい出力例：
✅ クジラは海の中で生きているから、大きい体の方が泳ぎやすかったんだよ。
✅ 他にも動物のことで知りたいことがあったら聞いてね。
✅ 食べ物もたくさんあるから、体を大きくできたんだね！
✅ 今日は晴れているよ。昼間と寒さがちがうから、洋服で調節してね。
✅ イルカさんはどんなところが好きかな？

間違った出力例：
❌ 海うみの中なかで生いきているから、大おおきい体からだの方ほうが泳およぎやすかった
❌ 食たべ物ものもたくさんあるから
❌ 便利べんりなんだ
❌ どんなところが好こうすきかな？
❌ 今週こんしゅうの土曜日どようびの東京とうきょうの天気てんきは
❌ 最高さいこう気温きおんは19℃（ど）
❌ 過すごしやすい一日いちにちになりそう
❌ 3月がつ7日なのか
✅ 今週の土曜日の東京の天気は
✅ 最高気温は19℃
✅ 過ごしやすい一日になりそう
✅ 3月7日`;
}

// =========================================================
// 現在の日本時間
// =========================================================
function getCurrentJSTDateString(): string {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const month = jst.getUTCMonth() + 1;
    const day = jst.getUTCDate();
    const week = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
    const hour = String(jst.getUTCHours()).padStart(2, "0");
    const min = String(jst.getUTCMinutes()).padStart(2, "0");
    return `${year}年${month}月${day}日（${week}曜日）${hour}:${min}`;
}

// =========================================================
// 日付コンテキストプロンプト
// =========================================================
function getDateContextPrompt(): string {
    const currentDateTime = getCurrentJSTDateString();
    return `【現在の日時】${currentDateTime}（日本時間）

【重要：時間に関する推論ルール - 必ず守ること】
1. 現在の日時は上記の通り。この日付を基準に「過去」「未来」を必ず判定すること。
2. 検索結果に「〇〇予定」と書いてあっても、その日付が現在より前なら「もう済んだ」と判断。
3. 例：現在が2026年3月で「2025年10月発売予定」→「もう発売されたよ！」
4. 例：現在が2026年3月で「2026年12月発売予定」→「まだだよ。12月が楽しみだね！」
5. 「今日」「明日」「昨日」等は上記日時から正確に計算。
6. 日付に自信がないときは「おうちの人にきいてみてね」と正直に伝える。`;
}

// =========================================================
// 各モードのシステムプロンプト
// =========================================================
function getModeSystemPrompt(mode: LearningMode, grade: string): string {
    const furiganaRule = getFuriganaRule();

    switch (mode) {
        case "kokugo":
            return `あなたは「AIせんせい・国語の先生」です。対象学年: ${grade}
子どもがテーマや漢字を入力したら、その漢字を使った楽しいショートストーリーを作り、
漢字の読み方・意味・例文と、理解を確認するクイズを含めてください。
必ずJSONフォーマットで返してください。
${furiganaRule}`;

        case "sansu":
            return `あなたは「AIせんせい・算数の先生」です。対象学年: ${grade}
子どもの質問に対して、わかりやすい説明・練習問題・ヒント・答え・解き方のステップをJSONで返してください。
${furiganaRule}`;

        case "shakai":
            return `あなたは「AIせんせい・社会の先生」です。対象学年: ${grade}
社会のしくみ・地理・歴史などについて、身近な例を使ったストーリーと
3つのキーポイント、クイズをJSONで返してください。
${furiganaRule}`;

        case "rika":
            return `あなたは「AIせんせい・理科の先生」です。対象学年: ${grade}
科学的な現象や自然の不思議について、説明・実験アイデア・豆知識・クイズをJSONで返してください。
${furiganaRule}`;

        case "dotoku":
            return `あなたは「AIせんせい・道徳の先生」です。対象学年: ${grade}
日常のシナリオを提示し、「あなたならどうする？」と問いかけます。
複数の選択肢それぞれの結果と学びを示し、最後に温かいメッセージをJSONで返してください。
${furiganaRule}`;

        case "jitsugaku":
            return `あなたは「AIせんせい・実学の先生」です。対象学年: ${grade}
お金・税金・株・政治・法律など「学校では教えてくれない大切な知識」を、
子どもでも理解できる言葉で教えます。JSONで返してください。
${furiganaRule}`;

        default:
            return getDefaultSystemPrompt(grade);
    }
}

// =========================================================
// デフォルト（chat）モードのシステムプロンプト
// =========================================================
function getDefaultSystemPrompt(grade: string): string {
    const furiganaRule = getFuriganaRule();

    if (
        grade.includes("年少") ||
        grade.includes("年中") ||
        grade.includes("年長")
    ) {
        return `あなたは未就学児のための「AIせんせい」です。

【会話ルール】
1. とにかくやさしい口調で話す
2. 1回の返答は100文字以内
3. 語尾は「〜だよ」「〜だね」「〜しよ！」
4. 絵文字を1〜2個使う

【最重要：返答の最後の問いかけについて】
- 返答の最後には、必ず「話題を広げる具体的な問いかけ」をする
- 「他に知りたいことはある？」「ほかに気になることはある？」は禁止
- 今の話題から、子どもが答えたくなる楽しい質問をする
- 例：「どの色が一番好き？」「どんな動物さんに会いたい？」「もし空を飛べたら何したい？」

天気・最新ニュースなど最新情報が必要なときは search_web を使うこと。
${furiganaRule}`;
    }

    if (grade.includes("小学1年生")) {
        return `あなたは小学1年生のための「AIせんせい」です。

【会話ルール】
1. 質問にはやさしく答える
2. 1回の返答は150文字以内
3. 語尾は「〜だよ」「〜だね」
4. 絵文字を1〜2個使う
5. 漢字は普通に使う（ふりがなはシステムが自動付与）

【最重要：返答の最後の問いかけについて】
- 返答の最後には、必ず「話題を広げる具体的な問いかけ」をする
- 子どもの好奇心を刺激し、会話が自然に続くようにする
- 子どもの気持ちに寄り添い、悩み相談にも温かく応じる

以下の問いかけは禁止（ワンパターンで会話が広がらないため）：
❌「他に知りたいことはあるかな？」
❌「ほかに気になることはある？」
❌「他に質問はあるかな？」
❌「もっと知りたいことはある？」

良い問いかけの例：
✅「クジラがどうしてそんなに大きくなれたか、不思議だよね。どのくらい大きいと思う？」
✅「イルカさんのどんなところが好きかな？」
✅「もしレックウザと一緒に冒険できるとしたら、どこへ行ってみたい？」
✅「夕焼けの空は、どうして赤やオレンジ色になるか知ってる？」
✅「太陽の光は、ほかにもどんなところに役立っていると思う？」
✅「どうしたら、お互いに気持ちよく使えるか、考えてみるのはどうかな？」
✅「空の上からは、どんなものを見てみたいかな？」

ポイント：
- 今話している話題の中から、子どもが「答えたくなる」具体的な質問を考える
- 想像力を使う質問（「もし〜だったら？」「どう思う？」）が効果的
- 子どもの発言に共感してから質問する
- 悩みや気持ちの話には、まず受け止めてから優しく問いかける

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;

        if (grade.includes("小学2年生")) {
            return `あなたは小学2年生のための「AIせんせい」です。

【会話ルール】
1. 質問には丁寧に答え、考えを深める質問をする
2. 1回の返答は200文字以内
3. 語尾は「〜だよ」「〜だね」
4. 絵文字を1〜2個使う

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
        }

        if (grade.includes("小学3年生")) {
            return `あなたは小学3年生のための「AIせんせい」です。

【会話ルール】
1. 質問にはわかりやすく答える
2. 1回の返答は250文字以内
3. 知的好奇心を刺激する返答
4. 最後に関連する質問を1つ
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
4. 最後に発展的な問いかけ

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
        }

        if (grade.includes("小学5年生")) {
            return `あなたは小学5年生のための「AIせんせい」です。

【会話ルール】
1. 質問には多角的な視点で答える
2. 1回の返答は350文字以内
3. 社会や科学との関連も含めて説明
4. 最後に「あなたはどう思う？」と問いかけ

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
        }

        return `あなたは小学6年生のための「AIせんせい」です。

【会話ルール】
1. 質問には深く体系的に答える
2. 1回の返答は400文字以内
3. 将来のキャリアや社会課題とも結びつけて説明
4. 批判的思考を促す問いかけ

天気・ゲーム発売日・最新ニュースなどは search_web を使うこと。
${furiganaRule}`;
    }
    return `あなたは「AIせんせい」です。やさしく答えてね。
${furiganaRule}`;
}

// =========================================================
// ✅ リトライ付きAPI呼び出し
// =========================================================
async function callGeminiWithRetry(
    params: Parameters<typeof ai.models.generateContent>[0],
    maxRetries: number = 3
): Promise<Awaited<ReturnType<typeof ai.models.generateContent>>> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent(params);
            return response;
        } catch (error: unknown) {
            lastError = error;

            // 429 (Rate Limit) または 503 (Service Unavailable) のみリトライ
            const isRetryable =
                error instanceof Error &&
                (error.message?.includes("429") ||
                    error.message?.includes("503") ||
                    error.message?.includes("RESOURCE_EXHAUSTED") ||
                    error.message?.includes("overloaded"));

            if (!isRetryable || attempt === maxRetries - 1) {
                throw error;
            }

            // 指数バックオフ: 2秒, 4秒, 8秒...
            const waitMs = Math.pow(2, attempt + 1) * 1000;
            console.warn(
                `[callGeminiWithRetry] Attempt ${attempt + 1} failed (${error instanceof Error ? error.message : "unknown"
                }). Retrying in ${waitMs}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }

    throw lastError;
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
            clerkUserId,
            sessionId: existingSessionId,
            profileId,
            profileName,
            profileTitle,
        } = (await req.json()) as {
            message: string;
            grade: string;
            history: { sender: string; text: string }[];
            mode: LearningMode;
            clerkUserId?: string;
            sessionId?: string;
            profileId?: string;
            profileName?: string;
            profileTitle?: string;
        };

        if (!message?.trim()) {
            return NextResponse.json(
                { error: "メッセージが空です" },
                { status: 400 }
            );
        }

        const contents: Array<{
            role: string;
            parts: Array<{
                text?: string;
                functionCall?: {
                    name: string;
                    args: Record<string, unknown>;
                };
                functionResponse?: {
                    name: string;
                    response: Record<string, unknown>;
                };
            }>;
        }> = [];

        for (const msg of (history ?? []).slice(-10)) {
            const role = msg.sender === "user" ? "user" : "model";
            const cleanText = msg.text.replace(/<[^>]*>/g, "");
            contents.push({ role, parts: [{ text: cleanText }] });
        }
        contents.push({ role: "user", parts: [{ text: message }] });

        const systemPrompt =
            getDateContextPrompt() +
            "\n\n" +
            getModeSystemPrompt(mode as LearningMode, grade ?? "");

        const schema = RESPONSE_SCHEMAS[mode as LearningMode];
        const isChatMode = mode === "chat";

        const generationConfig = schema
            ? {
                responseMimeType: "application/json" as const,
                responseSchema: schema,
            }
            : undefined;

        // ✅ リトライ付きAPI呼び出し
        let response = await callGeminiWithRetry({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: systemPrompt,
                ...(generationConfig ?? {}),
                ...(isChatMode ? { tools: [SEARCH_TOOL] } : {}),
            },
        });

        let loopCount = 0;
        const MAX_LOOPS = 3;

        while (isChatMode && loopCount < MAX_LOOPS) {
            const functionCalls = response.functionCalls;
            if (!functionCalls || functionCalls.length === 0) break;

            loopCount++;
            const fc = functionCalls[0];
            console.log(
                `[chat/route] Function Call #${loopCount}: ${fc.name}`
            );

            let searchResult = "";
            if (fc.name === "search_web") {
                const query =
                    (fc.args as { query?: string })?.query ?? message;
                const rawResult = await braveSearch(query);

                const currentDateTime = getCurrentJSTDateString();
                searchResult =
                    `【重要】以下は検索結果です。現在の日時は ${currentDateTime} です。\n` +
                    `検索結果に「予定」「発売予定」と書いてあっても、\n` +
                    `その日付が現在より過去であれば「すでに発売済み」と判断してください。\n` +
                    `逆に未来であれば「まだ」と判断してください。\n\n` +
                    rawResult;
            } else {
                searchResult = `未知の関数: ${fc.name}`;
            }

            contents.push({
                role: "model",
                parts: [
                    {
                        functionCall: {
                            name: fc.name!,
                            args: (fc.args ?? {}) as Record<string, unknown>,
                        },
                    },
                ],
            });

            contents.push({
                role: "user",
                parts: [
                    {
                        functionResponse: {
                            name: fc.name!,
                            response: { result: searchResult },
                        },
                    },
                ],
            });

            // ✅ リトライ付きAPI呼び出し
            response = await callGeminiWithRetry({
                model: "gemini-2.5-flash",
                contents,
                config: {
                    systemInstruction: systemPrompt,
                    tools: [SEARCH_TOOL],
                },
            });
        }

        // ===== Firestore: セッション作成 & ユーザーメッセージ保存 =====
        let sessionId = existingSessionId || null;
        if (clerkUserId && profileId) {
            try {
                if (!sessionId) {
                    sessionId = await createChatSession(
                        clerkUserId,
                        profileId,
                        profileName || "",
                        profileTitle || "",
                        grade || ""
                    );
                }
                await addMessageToSession(clerkUserId, sessionId, "user", message);
            } catch (firestoreError) {
                console.error("[Firestore] 保存エラー（続行）:", firestoreError);
            }
        }

        const rawText = response.text ?? "";

        if (mode === "chat") {
            const withRuby = await addRubyToText(rawText, grade ?? "");
            if (clerkUserId && sessionId) {
                try { await addMessageToSession(clerkUserId, sessionId, "assistant", rawText); }
                catch (e) { console.error("[Firestore] AI応答保存エラー:", e); }
            }
            return NextResponse.json({ mode: "chat", reply: withRuby, sessionId });
        }

        try {
            const parsed = JSON.parse(rawText);
            const corrected = await applyRubyToJSON(parsed, grade ?? "");
            if (clerkUserId && sessionId) {
                try { await addMessageToSession(clerkUserId, sessionId, "assistant", rawText); }
                catch (e) { console.error("[Firestore] AI応答保存エラー:", e); }
            }
            return NextResponse.json({ mode, data: corrected, sessionId });

        } catch {
            console.warn(
                "[chat/route] JSONパース失敗、テキストにフォールバック"
            );
            const withRuby = await addRubyToText(rawText, grade ?? "");
            if (clerkUserId && sessionId) {
                try { await addMessageToSession(clerkUserId, sessionId, "assistant", rawText); }
                catch (e) { console.error("[Firestore] AI応答保存エラー:", e); }
            }
            return NextResponse.json({ mode: "chat", reply: withRuby, sessionId });

        }
    } catch (error: unknown) {
        console.error("[API/chat] エラー:", error);

        // ✅ 429エラーの場合はユーザーに待つよう案内
        const is429 =
            error instanceof Error &&
            (error.message?.includes("429") ||
                error.message?.includes("RESOURCE_EXHAUSTED"));

        const errorMessage = is429
            ? "たくさんの人が使っているみたい。少し待ってからもう一度話しかけてね！"
            : "AIせんせいが困っています。もう一度試してね！";

        return NextResponse.json(
            { error: errorMessage, reply: errorMessage },
            { status: is429 ? 429 : 500 }
        );
    }
}
