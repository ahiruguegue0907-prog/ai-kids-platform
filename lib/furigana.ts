// /lib/furigana.ts
// 文部科学省 学習指導要領に基づく学年別漢字リスト＋自動ふりがな付与エンジン

import path from "path";

// ============================================================
// 学年別漢字リスト（全1006字）
// ============================================================
const KANJI_BY_GRADE: Record<number, string> = {
    1: "一右雨円王音下火花貝学気九休玉金空月犬見五口校左三山子四糸字耳七車手十出女小上森人水正生青夕石赤千川先早草足村大男竹中虫町天田土二日入年白八百文木本名目立力林六",
    2: "引羽雲園遠何科夏家歌画回会海絵外角活間丸岩顔汽記帰弓牛魚京強教近兄形計元言原古戸午後語工公広交光考行高黄合谷国黒今才細作算止市矢姉思紙寺自時室社弱首秋週春書少場色食心新親図数星晴切雪船線前組走多太体台地池知茶昼長鳥朝直通弟店点電刀冬当東答頭同道読内南肉馬売買麦半番父風分聞米歩母方北毎妹万明鳴毛門夜野友用曜来里理話",
    3: "悪安暗医委意育員院飲運泳駅央横屋温化荷界開階寒感漢館岸起期客究急級宮球去橋業曲局銀区苦君係軽血決研県庫湖向幸港号根祭仕死使始指歯詩次事持式実写者主守取酒受州拾終習集住重宿所暑助昭消商章勝乗植申身神真深進世整昔全相送想息速族他打対待代第題炭短談着注柱丁帳調追定庭笛鉄転都度投豆島湯登等動童農波配倍箱畑発反坂板皮悲美鼻筆氷表秒病品負部服福物平返勉放味命面問役薬由油有遊予様洋羊葉陽落流旅両緑礼列練路和",
    4: "愛案以衣位囲胃印英栄塩億加果貨課芽改械害街各覚完官管観願希季旗器機議求泣救給挙漁共協鏡競極訓軍郡径型景芸欠結建健験固功好候航康告差菜最材昨札刷察参産散残士氏史司試児治辞失借種周祝順初松笑唱焼象照城臣信成省清静席積折節説浅戦選然争倉巣束側続卒孫帯隊達単置仲貯兆腸低底停的典伝徒努灯堂得特毒熱念敗梅博飯飛費必票標不夫付府副粉兵別辺変便包法望牧末満未民無約勇要養浴利陸良料量輪類令冷例歴連老労録",
    5: "圧移因永営衛易益液演応往恩仮価河過賀快解格確額刊幹慣眼基寄規技義逆久旧居許境均禁句型経潔件険検限現減故個護効厚耕鉱構興講混査再災妻採際在財罪雑支志枝師資飼示似識質舎謝授修述術準序招証象賞条状常情織職制性政勢精製税責績接設絶祖素総造像増則測属率損退貸態団断築張提程適統銅導徳独任燃能破犯判版比肥非備俵評貧布婦富武復複仏編弁保墓報豊防貿暴務夢迷綿輸余容略留領歴",
    6: "異遺域宇映延沿我灰拡革閣割株干巻看簡危机揮貴疑吸供胸郷勤筋系敬警劇激穴絹権憲源厳己呼誤后孝皇紅降鋼刻穀骨困砂座済裁策冊蚕至私姿視詞誌磁射捨尺若樹収宗就衆従縦縮熟純処署諸除将傷障蒸針仁垂推寸盛聖誠舌専泉洗染銭善奏窓創装層操蔵臓存尊宅担探誕段暖値宙忠著庁頂潮賃痛展討党糖届難乳認納脳派拝背肺俳班晩否批秘腹奮並陛閉片補暮宝訪亡忘棒枚幕密盟模訳郵優幼欲翌乱卵覧裏律臨朗論",
};

// ============================================================
// ユーティリティ
// ============================================================

function kata2hira(str: string): string {
    return str.replace(/[\u30A1-\u30F6]/g, (c) =>
        String.fromCharCode(c.charCodeAt(0) - 0x60)
    );
}

function isKanji(char: string): boolean {
    const code = char.charCodeAt(0);
    return (
        (code >= 0x4e00 && code <= 0x9fff) ||
        (code >= 0x3400 && code <= 0x4dbf)
    );
}

function buildAllowedSet(maxGrade: number): Set<string> {
    const set = new Set<string>();
    for (let g = 1; g <= maxGrade; g++) {
        for (const kanji of KANJI_BY_GRADE[g] ?? "") {
            set.add(kanji);
        }
    }
    return set;
}

function stripFurigana(text: string): string {
    return text.replace(/([一-龥々〆〇]+)（[ぁ-んァ-ヴ\s]+）/g, "$1");
}

// ============================================================
// kuromoji シングルトン
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _tokenizer: any = null;
let _initPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTokenizer(): Promise<any> {
    if (_tokenizer) return _tokenizer;

    // 同時多発呼び出しを1回に集約
    if (_initPromise) return _initPromise;

    _initPromise = new Promise((resolve, reject) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const kuromoji = require("kuromoji");
            const dicPath = path.join(process.cwd(), "node_modules/kuromoji/dict");

            console.log("[furigana] loading kuromoji dict from:", dicPath);

            kuromoji.builder({ dicPath }).build(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (err: Error | null, tokenizer: any) => {
                    if (err) {
                        console.error("[furigana] kuromoji build error:", err.message);
                        _initPromise = null; // 次回リトライできるようリセット
                        reject(err);
                    } else {
                        console.log("[furigana] kuromoji ready ✅");
                        _tokenizer = tokenizer;
                        resolve(tokenizer);
                    }
                }
            );
        } catch (requireErr) {
            console.error("[furigana] kuromoji require failed. Run: npm install kuromoji");
            _initPromise = null;
            reject(requireErr);
        }
    });

    return _initPromise;
}

// ============================================================
// メイン公開関数
// ============================================================

export async function addFuriganaByGrade(
    text: string,
    maxGrade: number
): Promise<string> {
    if (!text) return text;
    if (maxGrade <= 0) return text; // 未就学児はそのまま

    const allowedSet = buildAllowedSet(maxGrade);
    const cleanText = stripFurigana(text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tokenizer: any;
    try {
        tokenizer = await getTokenizer();
    } catch {
        console.warn("[furigana] kuromoji unavailable → returning raw text");
        return text;
    }

    const tokens: Array<{ surface_form: string; reading?: string }> =
        tokenizer.tokenize(cleanText);

    let result = "";

    for (const token of tokens) {
        const surface = token.surface_form;

        if (!/[一-龥々]/.test(surface)) {
            result += surface;
            continue;
        }

        const needsFurigana = [...surface].some(
            (c) => isKanji(c) && !allowedSet.has(c)
        );

        if (needsFurigana) {
            const reading = kata2hira(token.reading ?? "");
            if (reading && reading !== surface) {
                result += `${surface}（${reading}）`;
            } else {
                result += surface;
            }
        } else {
            result += surface;
        }
    }

    return result;
}

export function gradeToNumber(grade: string): number {
    if (!grade) return 0;
    if (grade.includes("年少") || grade.includes("年中") || grade.includes("年長")) return 0;
    if (grade.includes("小学1")) return 1;
    if (grade.includes("小学2")) return 2;
    if (grade.includes("小学3")) return 3;
    if (grade.includes("小学4")) return 4;
    if (grade.includes("小学5")) return 5;
    if (grade.includes("小学6")) return 6;
    return 0;
}
