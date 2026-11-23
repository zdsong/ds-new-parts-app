/**
 * パレット番号表（A4サイズ）の印刷テンプレート
 *
 * 設計書：②仕入先から部品が届いた時 (3) 印刷したパレット番号表を、パレットに張り付ける
 *  ・①製品　… 見出しが白地・黒文字
 *  ・②仕掛品… 見出しが黒地・白文字
 * 上記以外のレイアウトは共通で、区分によって見出しの配色だけが変わる。
 *
 * 帳票は「パレット番号 1 件 = A4 縦 1 枚」で出力する（積載明細が複数あっても 1 枚にまとめる）。
 * 明細が複数ある場合は、品番・品名・備考２を改行で並べ、数量は合計を印字する。
 * ブラウザの印刷ダイアログをそのまま使うため、画面に表示しない iframe に
 * HTML を書き出して印刷する（別ウィンドウを開くと、印刷プレビュー以外に用紙が見えてしまう）。
 *
 * スマホはクリックと同じ処理の流れで print() し、システムの印刷プレビューを出す。
 * 遅延や画面の描き換えを挟むと、プレビューが出ずに直接印刷される。
 */

import { isIosDevice, prefersHandheldPrint } from './deviceUtil';

/** パレット番号表 1 枚分の印字内容 */
export interface PalletNumberSheetLabel {
    /** 区分（1:製品 / 3:仕掛品） */
    category: string;
    /** パレット番号 */
    palletNo: string;
    /** 品番（積載明細が複数ある場合は改行区切り） */
    itemCode: string;
    /** 数量（積載明細が複数ある場合は合計） */
    quantity: string | number;
    /** 品名（積載明細が複数ある場合は改行区切り） */
    itemName: string;
    /** 備考１ */
    remark1?: string;
    /** 備考２（積載明細が複数ある場合は改行区切り） */
    remark2?: string;
    /**
     * バーコードに変換する値。
     * 13桁のJANコードを指定した場合はEAN-13、それ以外はCODE128で描画する。
     * 未指定の場合はパレット番号をCODE128で描画する。
     */
    barcodeValue?: string;
}

/** 見出し行の高さの比率（設計書の図から採取したピクセル比） */
const ROW_RATIOS = [60, 101, 112, 62, 62, 61, 59, 62];

/** 帳票 1 枚の高さ（mm）。比率から各行の高さを求めるのに使う */
const SHEET_HEIGHT_MM = 277;

/** 比率の合計（各行の高さ＝SHEET_HEIGHT_MM × 比率 ÷ 合計） */
const ROW_RATIO_TOTAL = ROW_RATIOS.reduce((total, ratio) => total + ratio, 0);

/** 行の高さ（mm） */
const getRowHeightMm = (rowIndex: number): number =>
    (SHEET_HEIGHT_MM * ROW_RATIOS[rowIndex]) / ROW_RATIO_TOTAL;

/** 値の欄の幅（mm）。190mm のうち項目名が 22.6% を占める */
const VALUE_WIDTH_MM = 190 * (1 - 0.226);

/** 品番・数量・品名・備考の基準文字サイズ（mm） */
const VALUE_FONT_SIZE_MM = 10;

/** 値を印字するときの最小文字サイズ（mm）。これ以上は小さくしない */
const MIN_FONT_SIZE_MM = 4;

/**
 * 値の欄に印字できる最大行数（最小文字サイズで割り付けた行数）。
 * これを超える明細は「ほか N 件」にまとめて、読めない大きさになるのを防ぐ。
 */
const getMaxLines = (rowIndex: number): number =>
    Math.max(1, Math.floor((getRowHeightMm(rowIndex) * 0.88) / (MIN_FONT_SIZE_MM * 1.2)));

/**
 * 値を指定の行数に収める。超えた場合は末尾の行を「ほか N 件」に置き換える。
 */
const clampLines = (value: string, maxLines: number): string => {
    const lines = value.split('\n');
    if (lines.length <= maxLines) return value;
    const keep = Math.max(1, maxLines - 1);
    return [...lines.slice(0, keep), `ほか ${lines.length - keep} 件`].join('\n');
};

/**
 * 値の行数を見積もる。
 * 改行で指定された行に加え、1 行に収まらない長い文字列は折り返し分も数える。
 */
const estimateLines = (value: string, fontSizeMm: number): number =>
    value
        .split('\n')
        .reduce((total, segment) => {
            // 英数字は約 0.6em、日本語は約 1em の幅として 1 行あたりの文字数を求める
            const charsPerLine = Math.max(1, Math.floor(VALUE_WIDTH_MM / (fontSizeMm * 0.8)));
            return total + Math.max(1, Math.ceil(segment.length / charsPerLine));
        }, 0)
    || 1;

/**
 * 行に収まる文字サイズを求める（行数が多いほど小さくする）。
 * 収まる場合は基準サイズをそのまま返す。
 */
const fitFontSize = (rowIndex: number, value: string, base = VALUE_FONT_SIZE_MM): string => {
    const lines = estimateLines(value, base);
    const fitted = Math.min(base, (getRowHeightMm(rowIndex) * 0.88) / (lines * 1.2));
    return `${fitted.toFixed(1)}mm`;
};

/** 区分ごとの見出し文言 */
const CATEGORY_LABELS: Record<string, string> = {
    '1': '製品',
    '2': '仕掛品',
    '3': '仕掛品',
};

const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/**
 * 改行を <br> に変換してエスケープする。
 * 積載明細が複数あるとき、品番・品名・備考を 1 枚の中に並べて印字するために使う。
 */
const escapeMultiline = (value: unknown): string =>
    escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />');

/**
 * EAN-13 のモジュール列（バー＝1、スペース＝0 の 95 桁）を作る。
 * 13桁でない、またはチェックディジットが不正な場合は null を返す。
 */
const buildEan13Modules = (value: string): string | null => {
    const code = value.replace(/\D/g, '');
    if (code.length !== 13) return null;

    // チェックディジットの検証（左から奇数桁×1、偶数桁×3）
    const sum = code
        .slice(0, 12)
        .split('')
        .reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    if ((10 - (sum % 10)) % 10 !== Number(code[12])) return null;

    const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
    const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
    const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
    // 先頭桁で決まる左側 6 桁のパリティ（L＝奇数 parity、G＝偶数 parity）
    const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

    const parity = PARITY[Number(code[0])];
    let modules = '101';
    for (let i = 0; i < 6; i += 1) {
        const digit = Number(code[i + 1]);
        modules += parity[i] === 'L' ? L[digit] : G[digit];
    }
    modules += '01010';
    for (let i = 0; i < 6; i += 1) {
        modules += R[Number(code[i + 7])];
    }
    return modules + '101';
};

/** CODE128-B のパターン表（各シンボル 6 要素の幅。STOP のみ 7 要素） */
const CODE128_PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

/**
 * CODE128-B のモジュール列を作る（ASCII 32〜126 のみ対応。それ以外は '?' に置換）。
 */
const buildCode128Modules = (value: string): string => {
    const chars = value
        .split('')
        .map((char) => {
            const code = char.charCodeAt(0);
            return code >= 32 && code <= 126 ? code : 63;
        });

    const START_B = 104;
    const values = [START_B, ...chars.map((code) => code - 32)];
    // チェックサム＝開始コード＋Σ(位置×値) を 103 で割った余り
    const checksum =
        values.reduce((acc, code, index) => acc + (index === 0 ? code : code * index), 0) % 103;
    const symbols = [...values, checksum, 106];

    let modules = '';
    symbols.forEach((symbol) => {
        const pattern = CODE128_PATTERNS[symbol];
        if (!pattern) return;
        pattern.split('').forEach((width, index) => {
            modules += (index % 2 === 0 ? '1' : '0').repeat(Number(width));
        });
    });
    return modules;
};

/**
 * バーコードの SVG を生成する。
 * EAN-13 は両端にクワイエットゾーンを取るため、左右に余白を入れている。
 *
 * パレット番号表の印刷だけでなく、SP401（バーコード読み取り）の
 * 読み取り結果プレビューでも同じ見た目になるよう外部公開している。
 */
export const buildBarcodeSvg = (value: string): string => {
    const raw = (value || '').trim();
    if (!raw) {
        // 値が無い場合はバーを描かず、高さだけ確保する
        return '<svg class="ps-bars-svg" viewBox="0 0 100 60" preserveAspectRatio="none"></svg>';
    }

    const ean13 = buildEan13Modules(raw);
    const modules = ean13 ?? buildCode128Modules(raw);
    const asEan = ean13 !== null;
    // EAN-13 は左右 9 モジュールずつの余白（クワイエットゾーン）を付ける
    const padding = asEan ? 9 : 10;
    const total = modules.length + padding * 2;

    let rects = '';
    let x = padding;
    let index = 0;
    while (index < modules.length) {
        const isBar = modules[index] === '1';
        let width = 1;
        while (index + width < modules.length && modules[index + width] === modules[index]) {
            width += 1;
        }
        if (isBar) {
            rects += `<rect x="${x}" y="0" width="${width}" height="60"/>`;
        }
        x += width;
        index += width;
    }

    return (
        `<svg class="ps-bars-svg" viewBox="0 0 ${total} 60" preserveAspectRatio="none" ` +
        `shape-rendering="crispEdges" role="img" aria-label="バーコード ${escapeHtml(raw)}">${rects}</svg>`
    );
};

/** 1 枚分のラベル HTML */
const buildLabelHtml = (label: PalletNumberSheetLabel): string => {
    const categoryLabel = CATEGORY_LABELS[label.category] ?? '';
    const headClass = label.category === '2' || label.category === '3' ? 'ps-head ps-head--work' : 'ps-head ps-head--product';
    const barcodeValue = label.barcodeValue || label.palletNo || '';
    const quantity =
        label.quantity === undefined || label.quantity === null || label.quantity === ''
            ? ''
            : String(label.quantity);

    // パレット番号は折り返さず 1 行で収める。桁数に応じて字を詰める
    // （値の欄の幅は約 141mm、太字英数字 1 文字あたり約 0.75em として算出する）
    const palletNoLength = Math.max((label.palletNo || '').length, 1);
    const palletNoFontSize = `${Math.min(17, 141 / palletNoLength / 0.75).toFixed(1)}mm`;

    // 明細が複数ある場合は改行で並べ、行数に応じて文字を詰めて 1 枚に収める
    // （行が多すぎると読めなくなるため、上限を超えた分は「ほか N 件」にまとめる）
    const itemCode = clampLines(label.itemCode ?? '', getMaxLines(3));
    const itemName = clampLines(label.itemName ?? '', getMaxLines(5));
    const remark1 = clampLines(label.remark1 ?? '', getMaxLines(6));
    const remark2 = clampLines(label.remark2 ?? '', getMaxLines(7));

    return `
    <section class="ps">
      <div class="${headClass}" style="flex: ${ROW_RATIOS[0]} 1 0">${escapeHtml(categoryLabel)}</div>
      <div class="ps-barcode" style="flex: ${ROW_RATIOS[1]} 1 0">
        ${buildBarcodeSvg(barcodeValue)}
        <div class="ps-barcode-no">${escapeHtml(barcodeValue)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[2]} 1 0">
        <div class="ps-key"><span>パレット番号</span></div>
        <div class="ps-value ps-value--palletno" style="font-size: ${palletNoFontSize}">${escapeHtml(label.palletNo)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[3]} 1 0">
        <div class="ps-key"><span>品番</span></div>
        <div class="ps-value ps-value--multi" style="font-size: ${fitFontSize(3, itemCode)}">${escapeMultiline(itemCode)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[4]} 1 0">
        <div class="ps-key"><span>数量</span></div>
        <div class="ps-value ps-value--multi" style="font-size: ${fitFontSize(4, quantity)}">${escapeMultiline(quantity)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[5]} 1 0">
        <div class="ps-key"><span>品名</span></div>
        <div class="ps-value ps-value--multi" style="font-size: ${fitFontSize(5, itemName)}">${escapeMultiline(itemName)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[6]} 1 0">
        <div class="ps-key"><span>備考１</span></div>
        <div class="ps-value ps-value--multi" style="font-size: ${fitFontSize(6, remark1)}">${escapeMultiline(remark1)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[7]} 1 0">
        <div class="ps-key"><span>備考２</span></div>
        <div class="ps-value ps-value--multi" style="font-size: ${fitFontSize(7, remark2)}">${escapeMultiline(remark2)}</div>
      </div>
    </section>`;
};

/** 印刷用スタイル（A4 縦・1 枚 1 ラベル / 印刷時のみ有効な指定） */
const SHEET_PRINT_STYLE = `
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "YuGothic", "Meiryo", sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ps {
      width: 190mm;
      height: 277mm;
      display: flex;
      flex-direction: column;
      background: #ffffff;
      border: 0.4mm solid #000000;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .ps:last-of-type { page-break-after: auto; break-after: auto; }
    .ps > * + * { border-top: 0.4mm solid #000000; }

    /* 見出し（区分） */
    .ps-head {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24mm;
      font-weight: 700;
      letter-spacing: 0.12em;
      line-height: 1;
    }
    .ps-head--product { background: #ffffff; color: #000000; }
    .ps-head--work { background: #000000; color: #ffffff; }

    /* バーコード */
    .ps-barcode {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2mm;
    }
    .ps-bars-svg {
      width: 110mm;
      height: 26mm;
      display: block;
      fill: #000000;
    }
    .ps-barcode-no {
      font-size: 9mm;
      font-weight: 600;
      letter-spacing: 0.02em;
      line-height: 1;
    }

    /* 明細行 */
    .ps-row {
      display: flex;
      min-height: 0;
      overflow: hidden;
    }
    .ps-key {
      width: 22.6%;
      flex: 0 0 22.6%;
      background: #f2f2f2;
      border-right: 0.4mm solid #000000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* 項目名は縦書き（1 文字ずつ縦に並べる） */
    .ps-key span {
      writing-mode: vertical-rl;
      text-orientation: upright;
      font-size: 7.5mm;
      letter-spacing: 0.06em;
      line-height: 1;
    }
    .ps-value {
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10mm;
      line-height: 1.2;
      padding: 0 3mm;
      text-align: center;
      word-break: break-all;
    }
    /* パレット番号は 1 行で収める（折り返すと帳票として読めなくなるため） */
    .ps-value--palletno {
      font-size: 17mm;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
      word-break: keep-all;
    }
    /*
     * 積載明細が複数ある場合の値（品番・数量・品名・備考）。
     * 改行で並べるため、flex ではなく通常のブロックとして縦方向に中央寄せする。
     * 文字サイズは行数に応じて HTML 側で詰めている。
     */
    .ps-value--multi {
      display: block;
      align-self: center;
      max-height: 100%;
      overflow: hidden;
      white-space: normal;
      word-break: break-all;
    }
`;

/** 画面で確認するときのスタイル（別ウィンドウで開いた場合のみ有効） */
const SHEET_SCREEN_STYLE = `
    @media screen {
      body { background: #e8e8e8; padding: 10mm 0 24mm; }
      .ps { margin: 0 auto 10mm; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25); background: #ffffff; }
      .ps-back {
        display: block;
        position: fixed;
        left: 0;
        bottom: 0;
        z-index: 20;
        box-sizing: border-box;
        width: 33.333vw;
        height: 48px;
        margin: 0;
        padding: 0 8px;
        border: none;
        border-radius: 0;
        background: #6f9fd0;
        color: #ffffff;
        font-size: 16px;
        font-weight: 700;
      }
    }
    @media print {
      .ps-back { display: none !important; }
    }
`;

/** 別ウィンドウに書き出すときのスタイル一式（印刷用＋画面確認用） */
const SHEET_STYLE = SHEET_PRINT_STYLE + SHEET_SCREEN_STYLE;

/** 印字内容（ラベル）を HTML 断片に変換する（呼び出し側でコンテナに差し込む） */
const buildLabelsHtml = (labels: PalletNumberSheetLabel[]): string => labels.map(buildLabelHtml).join('\n');

/**
 * 印刷用 HTML 一式を組み立てる。
 * ラベルが空の場合は白紙 1 枚にならないよう、空文字を返す。
 */
export const buildPalletNumberSheetHtml = (labels: PalletNumberSheetLabel[]): string => {
    if (!labels || labels.length === 0) return '';
    const body = buildLabelsHtml(labels);

    return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>パレット番号表</title>
    <style>${SHEET_STYLE}</style>
  </head>
  <body>
${body}
  </body>
</html>`;
};

/** 現在の画面に差し込む印刷用要素の ID */
const PRINT_ROOT_ID = 'pallet-print-root';
const PRINT_STYLE_ID = 'pallet-print-style';
/** 印刷中は画面側も帳票だけにする。iOS はプリンタ選択で再描画するとき画面用の体裁を使う */
const PRINTING_CLASS = 'pallet-printing';

/** 現在の画面に差し込んだ印刷用の要素を片付ける */
const removeInPlacePrintNodes = () => {
    document.getElementById(PRINT_ROOT_ID)?.remove();
    document.getElementById(PRINT_STYLE_ID)?.remove();
    document.documentElement.classList.remove(PRINTING_CLASS);
    document.body.classList.remove(PRINTING_CLASS);
};

/**
 * システムの印刷プレビューを閉じたあとに呼ぶ。
 * プレビュー表示中に画面を描き換えると、端末によってはプレビューが閉じて直接印刷される。
 */
const runAfterSystemPreview = (target: Window, onPrinted?: () => void) => {
    if (!onPrinted) return;
    let finished = false;
    const finish = () => {
        if (finished) return;
        finished = true;
        target.removeEventListener('afterprint', finish);
        document.removeEventListener('visibilitychange', onVisible);
        onPrinted();
    };
    let leftPage = false;
    const onVisible = () => {
        if (document.visibilityState === 'hidden') {
            leftPage = true;
            return;
        }
        if (leftPage && document.visibilityState === 'visible') finish();
    };
    target.addEventListener('afterprint', finish);
    document.addEventListener('visibilitychange', onVisible);
};

/**
 * iOS は表示中の画面や iframe を print() すると、
 * プリンタや用紙サイズを変えた再プレビューが白紙になる。
 * 帳票だけの文書を 1 つのウィンドウで開く。
 * 読み込み完了前に print() すると「読み込みが終わっていません」と出る。
 * プリンタや用紙の変更でも afterprint が来るため、そのタイミングでは画面を戻さない。
 */
const PRINT_DONE_CALLBACK = '__palletPrintDone';
const PRINT_RETURN_FLAG = 'ewPalletPrintReturn';
const PRINT_WINDOW_NAME = 'palletNumberSheetPrint';

const withIosPrintControls = (html: string): string => {
    const script = `
<button type="button" class="ps-back" id="ps-back">元の画面へ戻る</button>
<style>
  @media screen {
    html, body { width: 100%; max-width: 100%; overflow-x: hidden; }
    body { padding: 8px 0 56px !important; }
    #ps-slot { overflow: hidden; margin: 0 auto; }
    #ps-fit { transform-origin: top left; }
  }
  @media print {
    #ps-slot, #ps-fit {
      width: auto !important;
      height: auto !important;
      transform: none !important;
      overflow: visible !important;
      margin: 0 !important;
    }
  }
</style>
<script>
(function () {
  function goBack() {
    try { sessionStorage.setItem(${JSON.stringify(PRINT_RETURN_FLAG)}, '1'); } catch (error) {}
    try {
      var opener = window.opener;
      if (opener && !opener.closed) {
        if (opener.${PRINT_DONE_CALLBACK}) opener.${PRINT_DONE_CALLBACK}();
        opener.focus();
      }
    } catch (error) {}
    window.close();
    setTimeout(function () {
      if (!window.closed && history.length > 1) history.back();
    }, 0);
  }
  function fitSheet() {
    var slot = document.getElementById('ps-slot');
    var fit = document.getElementById('ps-fit');
    if (!slot || !fit) return;
    fit.style.transform = 'none';
    slot.style.width = 'auto';
    slot.style.height = 'auto';
    var sheetWidth = fit.scrollWidth;
    var sheetHeight = fit.scrollHeight;
    if (!sheetWidth || !sheetHeight) return;
    var maxWidth = window.innerWidth;
    var maxHeight = window.innerHeight - 56;
    var scale = Math.min(maxWidth / sheetWidth, maxHeight / sheetHeight);
    fit.style.transform = 'scale(' + scale + ')';
    slot.style.width = (sheetWidth * scale) + 'px';
    slot.style.height = (sheetHeight * scale) + 'px';
  }
  function placeButton() {
    var back = document.getElementById('ps-back');
    if (!back) return;
    var viewport = window.visualViewport;
    var zoom = viewport && viewport.scale ? viewport.scale : 1;
    var visibleWidth = viewport ? viewport.width : window.innerWidth;
    var visibleHeight = viewport ? viewport.height : window.innerHeight;
    var offsetLeft = viewport ? viewport.offsetLeft : 0;
    var offsetTop = viewport ? viewport.offsetTop : 0;
    var layoutHeight = document.documentElement.clientHeight || window.innerHeight;
    back.style.width = (visibleWidth / 3) + 'px';
    back.style.height = (48 / zoom) + 'px';
    back.style.fontSize = (16 / zoom) + 'px';
    back.style.left = offsetLeft + 'px';
    back.style.bottom = Math.max(0, layoutHeight - offsetTop - visibleHeight) + 'px';
  }
  function layoutPreview() {
    fitSheet();
    placeButton();
  }
  var back = document.getElementById('ps-back');
  if (back) back.addEventListener('click', goBack);
  window.addEventListener('resize', layoutPreview);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layoutPreview);
    window.visualViewport.addEventListener('scroll', placeButton);
  }
  window.addEventListener('load', function () {
    layoutPreview();
    window.print();
  });
})();
</script>`;
    return html
        .replace(
            '<meta charset="utf-8" />',
            '<meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />'
        )
        .replace('<body>', `<body>${script}<div id="ps-slot"><div id="ps-fit">`)
        .replace('</body>', '</div></div></body>');
};

const printInOwnDocument = (html: string, onPrinted?: () => void): boolean => {
    // about:blank に書き出すと、用紙サイズ変更で文書が読み直されて白紙になる。
    // 同じ内容を指す URL にして、読み直しても帳票が残るようにする。
    // 印刷のたびに新しい画面を開かず、同じウィンドウを使う。
    const blob = new Blob([withIosPrintControls(html)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const child = window.open(url, PRINT_WINDOW_NAME);
    if (!child) {
        URL.revokeObjectURL(url);
        return false;
    }

    const host = window as Window & { [PRINT_DONE_CALLBACK]?: () => void };
    let done = false;
    const notifyDone = () => {
        if (done) return;
        done = true;
        delete host[PRINT_DONE_CALLBACK];
        try {
            sessionStorage.removeItem(PRINT_RETURN_FLAG);
        } catch (error) {
            console.error(error);
        }
        window.setTimeout(() => {
            try {
                if (child.closed) URL.revokeObjectURL(url);
            } catch (error) {
                console.error(error);
            }
        }, 1000);
        onPrinted?.();
    };
    host[PRINT_DONE_CALLBACK] = notifyDone;

    const onPageShow = () => {
        let pending = false;
        try {
            pending = sessionStorage.getItem(PRINT_RETURN_FLAG) === '1';
        } catch (error) {
            console.error(error);
        }
        if (!pending) return;
        window.removeEventListener('pageshow', onPageShow);
        notifyDone();
    };
    window.addEventListener('pageshow', onPageShow);

    try {
        child.focus();
    } catch (error) {
        console.error(error);
    }
    return true;
};

/**
 * iOS で別ウィンドウを開けなかったときの予備。
 * 画面用の体裁でも帳票だけが見えるようにし、再プレビューの beforeprint で差し直す。
 * プリンタ選択の afterprint では帳票を外さない。
 */
const printInCurrentPage = (labelsHtml: string, onPrinted?: () => void): boolean => {
    if (typeof window === 'undefined' || typeof window.print !== 'function') return false;

    const mount = () => {
        removeInPlacePrintNodes();

        const style = document.createElement('style');
        style.id = PRINT_STYLE_ID;
        style.textContent = `
        html.${PRINTING_CLASS}, body.${PRINTING_CLASS} {
          height: auto !important;
          overflow: visible !important;
          background: #ffffff !important;
        }
        body.${PRINTING_CLASS} > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
        #${PRINT_ROOT_ID} {
          display: block !important;
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          overflow: auto;
          background: #ffffff;
        }
        ${SHEET_PRINT_STYLE}`;

        const root = document.createElement('div');
        root.id = PRINT_ROOT_ID;
        root.innerHTML = labelsHtml;

        document.head.appendChild(style);
        document.body.appendChild(root);
        document.documentElement.classList.add(PRINTING_CLASS);
        document.body.classList.add(PRINTING_CLASS);
    };

    mount();

    const printMedia = window.matchMedia('print');
    let settled = false;
    let finishTimer = 0;

    const finish = () => {
        if (settled || printMedia.matches) return;
        settled = true;
        window.clearTimeout(finishTimer);
        printMedia.removeEventListener('change', onPrintMedia);
        window.removeEventListener('beforeprint', onBeforePrint);
        window.removeEventListener('afterprint', onAfterPrint);
        removeInPlacePrintNodes();
        onPrinted?.();
    };

    const scheduleFinish = () => {
        window.clearTimeout(finishTimer);
        finishTimer = window.setTimeout(() => {
            if (printMedia.matches) return;
            finish();
        }, 1500);
    };

    const onBeforePrint = () => {
        window.clearTimeout(finishTimer);
        mount();
    };

    const onPrintMedia = () => {
        if (printMedia.matches) {
            window.clearTimeout(finishTimer);
            return;
        }
        scheduleFinish();
    };

    const onAfterPrint = () => {
        if (printMedia.matches) return;
        scheduleFinish();
    };

    printMedia.addEventListener('change', onPrintMedia);
    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);

    try {
        void document.body.offsetHeight;
        window.print();
    } catch (error) {
        console.error(error);
        settled = true;
        printMedia.removeEventListener('change', onPrintMedia);
        window.removeEventListener('beforeprint', onBeforePrint);
        window.removeEventListener('afterprint', onAfterPrint);
        removeInPlacePrintNodes();
        return false;
    }
    return true;
};

/** 画面に表示しない印刷用 iframe の ID */
const PRINT_FRAME_ID = 'pallet-print-frame';

/**
 * 画面に表示しない iframe に帳票を書き出し、システムの印刷プレビューを開く。
 *
 * Android では幅 0 の iframe を setTimeout してから print() すると、
 * クリックの操作が途切れ、プレビューを出さずに既定のプリンタへ直接送る。
 * スマホでは用紙サイズの iframe に書き出した直後、同じクリックの中で print() する。
 */
const printInHiddenFrame = (html: string, onPrinted?: () => void, immediate = false): boolean => {
    document.getElementById(PRINT_FRAME_ID)?.remove();

    const frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('tabindex', '-1');
    frame.style.cssText = immediate
        ? 'position: fixed; left: -10000px; top: 0; width: 210mm; height: 297mm; border: 0;'
        : 'position: fixed; right: 0; bottom: 0; width: 0; height: 0; border: 0;';
    document.body.appendChild(frame);

    const frameWindow = frame.contentWindow;
    const frameDocument = frameWindow?.document;
    if (!frameWindow || !frameDocument) {
        frame.remove();
        return false;
    }

    const cleanup = () => {
        window.setTimeout(() => frame.remove(), 1000);
    };
    frameWindow.addEventListener('afterprint', cleanup);
    runAfterSystemPreview(frameWindow, onPrinted);

    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();

    const triggerPrint = () => {
        try {
            frameWindow.focus();
            frameWindow.print();
        } catch (error) {
            console.error(error);
            frame.remove();
        }
    };
    // スマホはクリックと同じ処理の流れで開く。PC は描画を少し待ってから開く。
    if (immediate) {
        triggerPrint();
    } else {
        window.setTimeout(triggerPrint, 200);
    }
    return true;
};

/**
 * パレット番号表を印刷する。
 * PC では画面に表示しない iframe に書き出してから印刷ダイアログを開くため、
 * 印刷プレビュー以外に用紙が表示されることはない。
 * スマホはシステムの印刷プレビューを、クリックと同じ処理の流れで開く。
 */
export const printPalletNumberSheet = (
    labels: PalletNumberSheetLabel[],
    targetWindow?: Window | null,
    _onUnsupported?: () => void,
    onPrinted?: () => void
): boolean => {
    if (!labels || labels.length === 0) {
        targetWindow?.close();
        return false;
    }

    // スマホは自前の確認画面を出さず、システムの印刷プレビューを開く
    if (prefersHandheldPrint()) {
        targetWindow?.close();
        if (isIosDevice()) {
            const html = buildPalletNumberSheetHtml(labels);
            if (!html) return false;
            // 別ウィンドウが開けない端末だけ、今の画面に帳票を載せて印刷する
            if (printInOwnDocument(html, onPrinted)) return true;
            return printInCurrentPage(buildLabelsHtml(labels), onPrinted);
        }
        const html = buildPalletNumberSheetHtml(labels);
        if (!html) return false;
        return printInHiddenFrame(html, onPrinted, true);
    }

    const html = buildPalletNumberSheetHtml(labels);
    if (!html) {
        targetWindow?.close();
        return false;
    }

    // 呼び出し側で開いたウィンドウがある場合のみ、そのウィンドウを再利用する
    // （更新などの非同期処理を待ってから開くとポップアップがブロックされるため）
    if (targetWindow && !targetWindow.closed) {
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();

        // フォントと SVG の描画が終わってから印刷ダイアログを開く
        const triggerWindowPrint = () => {
            targetWindow.focus();
            targetWindow.print();
        };
        runAfterSystemPreview(targetWindow, onPrinted);
        if (targetWindow.document.readyState === 'complete') {
            window.setTimeout(triggerWindowPrint, 200);
        } else {
            targetWindow.addEventListener('load', () => window.setTimeout(triggerWindowPrint, 200), { once: true });
        }
        return true;
    }

    // 呼び出し側がウィンドウを開いていない場合は、画面に表示されない iframe で印刷する
    return printInHiddenFrame(html, onPrinted, false);
};

/**
 * 区分から見出し文言を取得する（画面側でラベル表示に使う）
 */
export const getCategoryLabel = (category: string): string => CATEGORY_LABELS[category] ?? '';
