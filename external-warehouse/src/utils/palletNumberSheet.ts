/**
 * パレット番号表（A4サイズ）の印刷テンプレート
 *
 * 設計書：②仕入先から部品が届いた時 (3) 印刷したパレット番号表を、パレットに張り付ける
 *  ・①製品　… 見出しが白地・黒文字
 *  ・②仕掛品… 見出しが黒地・白文字
 * 上記以外のレイアウトは共通で、区分によって見出しの配色だけが変わる。
 *
 * 帳票は A4 縦 1 枚 = 1 ラベルで出力する（明細の件数だけページが増える）。
 * ブラウザの印刷ダイアログをそのまま使うため、専用ウィンドウに HTML を書き出して印刷する。
 */

/** パレット番号表 1 枚分の印字内容 */
export interface PalletNumberSheetLabel {
    /** 区分（1:製品 / 2:仕掛品） */
    category: string;
    /** パレット番号 */
    palletNo: string;
    /** 品番 */
    itemCode: string;
    /** 数量 */
    quantity: string | number;
    /** 品名 */
    itemName: string;
    /** 備考１ */
    remark1?: string;
    /** 備考２ */
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

/** 区分ごとの見出し文言 */
const CATEGORY_LABELS: Record<string, string> = {
    '1': '製品',
    '2': '仕掛品',
};

const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

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
 */
const buildBarcodeSvg = (value: string): string => {
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
    const headClass = label.category === '2' ? 'ps-head ps-head--work' : 'ps-head ps-head--product';
    const barcodeValue = label.barcodeValue || label.palletNo || '';
    const quantity =
        label.quantity === undefined || label.quantity === null || label.quantity === ''
            ? ''
            : String(label.quantity);

    // パレット番号は折り返さず 1 行で収める。桁数に応じて字を詰める
    // （値の欄の幅は約 141mm、太字英数字 1 文字あたり約 0.75em として算出する）
    const palletNoLength = Math.max((label.palletNo || '').length, 1);
    const palletNoFontSize = `${Math.min(17, 141 / palletNoLength / 0.75).toFixed(1)}mm`;

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
        <div class="ps-value">${escapeHtml(label.itemCode)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[4]} 1 0">
        <div class="ps-key"><span>数量</span></div>
        <div class="ps-value">${escapeHtml(quantity)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[5]} 1 0">
        <div class="ps-key"><span>品名</span></div>
        <div class="ps-value">${escapeHtml(label.itemName)}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[6]} 1 0">
        <div class="ps-key"><span>備考１</span></div>
        <div class="ps-value">${escapeHtml(label.remark1 ?? '')}</div>
      </div>
      <div class="ps-row" style="flex: ${ROW_RATIOS[7]} 1 0">
        <div class="ps-key"><span>備考２</span></div>
        <div class="ps-value">${escapeHtml(label.remark2 ?? '')}</div>
      </div>
    </section>`;
};

/** 印刷用スタイル（A4 縦・1 枚 1 ラベル） */
const SHEET_STYLE = `
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
    /* 画面で確認するときは用紙を並べて表示する */
    @media screen {
      body { background: #e8e8e8; padding: 10mm 0; }
      .ps { margin: 0 auto 10mm; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25); background: #ffffff; }
    }
    .ps {
      width: 190mm;
      height: 277mm;
      display: flex;
      flex-direction: column;
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
`;

/**
 * 印刷用 HTML 一式を組み立てる。
 * ラベルが空の場合は白紙 1 枚にならないよう、空文字を返す。
 */
export const buildPalletNumberSheetHtml = (labels: PalletNumberSheetLabel[]): string => {
    if (!labels || labels.length === 0) return '';
    const body = labels.map(buildLabelHtml).join('\n');

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

/**
 * パレット番号表を印刷する。
 * 別ウィンドウに書き出してから印刷ダイアログを開くため、画面のレイアウトの影響を受けない。
 */
export const printPalletNumberSheet = (labels: PalletNumberSheetLabel[]): boolean => {
    const html = buildPalletNumberSheetHtml(labels);
    if (!html) return false;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
        // ポップアップがブロックされた場合
        return false;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // フォントと SVG の描画が終わってから印刷ダイアログを開く
    const triggerPrint = () => {
        printWindow.focus();
        printWindow.print();
    };
    if (printWindow.document.readyState === 'complete') {
        window.setTimeout(triggerPrint, 200);
    } else {
        printWindow.addEventListener('load', () => window.setTimeout(triggerPrint, 200), { once: true });
    }
    return true;
};

/**
 * 区分から見出し文言を取得する（画面側でラベル表示に使う）
 */
export const getCategoryLabel = (category: string): string => CATEGORY_LABELS[category] ?? '';
