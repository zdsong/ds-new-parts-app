/**
 * SP（スマートフォン）画面向けの共通スタイル
 *
 * 参考：external-warehouse-sp の pageSx / cardSx を、本プロジェクト（ew）の
 * 画面でも使えるようにまとめたもの。PC 画面（P3xx）と違い、1 列・縦積みを前提とする。
 */

/**
 * SP 画面の入力欄の高さ
 *
 * FormInput の既定（検索欄・基本情報カードの入力欄）と同じ 25.56px に統一する。
 * 明細カードだけ高さが違うと、非活性時のグレー背景が枠全体を覆えず、
 * 枠の上下に白い帯が残って見えるため、すべての入力欄でこの値を使う。
 */
export const SP_INPUT_HEIGHT = '25.56px';

/**
 * 上下配置の入力枠・カードの値に付ける字下げ。
 * 設計書では項目名を左端に置き、その下の値と入力枠だけ一段下げる。
 */
export const SP_VALUE_INDENT = '12px';

export const spSx = {
    /** 画面全体（タイトルバー＋内容を縦に積む） */
    page: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        minHeight: '100%',
        boxSizing: 'border-box' as const,
        // 端末幅が狭いときは余白を詰め、広いときは 20px まで広げる
        padding: '0 clamp(12px, calc(6.3px + 1.48vw), 20px) 24px',
        width: '100%',
        // 横方向のはみ出しだけを切る（clip はスクロールコンテナを作らないため、
        // 将来 position: sticky を使う要素を置いても影響しない）
        overflowX: 'clip' as const,
    },
    /** タイトルバー（画面名のみ。操作ボタンは titleActionBar に置く） */
    titleBar: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 0 6px',
        borderBottom: '2px solid #7F7F7F',
        marginBottom: '4px',
    },
    title: {
        flex: 1,
        minWidth: 0,
        color: 'black',
        fontSize: 'clamp(16px, calc(14.6px + 0.37vw), 18px)',
        // 画面上部の副題（画面名）は太字にしない。
        // 太字はヘッダー（AppBar）側の見出しにだけ使い、階層を分かりやすくする。
        fontWeight: 400,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    /**
     * タイトル直下の操作行（番号表印刷・確認などの主操作を置く）
     * タイトルバーには画面名だけを残し、操作ボタンはこの行に右寄せでまとめる。
     * スマートフォンでは指で押しやすいよう、ボタン自体を縦 36px にしている。
     */
    titleActionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        width: '100%',
        marginTop: '-4px',
    },
    /**
     * 主操作ボタン（番号表印刷・確認）
     * 設計書では「番号表印刷」が青地・白文字のボタンとして示されているため、
     * リンク風の文字ではなくボタンとして表示する。色はテーマ色（既定は青）に追従する。
     */
    actionButton: {
        flexShrink: 0,
        height: '36px',
        padding: '0 16px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        '&:hover': {
            backgroundColor:
                'color-mix(in srgb, var(--mui-page-header-color) 85%, black 15%)',
        },
        // 印刷中など、一時的に操作できない状態
        '&:disabled': {
            cursor: 'not-allowed',
            opacity: 0.6,
        },
    },
    /** 操作できない状態の主操作ボタン（未発番など） */
    actionButtonDisabled: {
        flexShrink: 0,
        height: '36px',
        padding: '0 16px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: '#cccccc',
        color: '#666666',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        cursor: 'not-allowed',
        whiteSpace: 'nowrap' as const,
    },
    /** セクション見出し（■基本情報 など） */
    sectionTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        color: 'black',
        fontSize: '14px',
        fontWeight: 600,
        margin: '2px 0',
    },
    /** 白いカード（枠線付き） */
    card: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        // padding: '10px 12px',
        // border: '1px solid #cccccc',
        borderRadius: '8px',
        backgroundColor: 'white',
        boxSizing: 'border-box' as const,
        width: '100%',
    },
    /** 項目（ラベル＋値の縦積み） */
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        minWidth: 0,
    },
    fieldLabel: {
        color: '#5f5f5f',
        fontSize: '12px',
        lineHeight: 1.4,
    },
    fieldValue: {
        color: '#212121',
        fontSize: '14px',
        lineHeight: 1.5,
        wordBreak: 'break-all' as const,
        paddingLeft: SP_VALUE_INDENT,
    },
    /** 明細カード（追加した品目など） */
    itemCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 12px',
        border: '1px solid #dddddd',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        width: '100%',
        boxSizing: 'border-box' as const,
    },
    /** 明細カードの見出し行 */
    itemHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
    },
    itemTitle: {
        color: 'black',
        fontSize: '13px',
        fontWeight: 600,
    },
    /** 件数バッジ（追加した品目（3件）など） */
    count: {
        color: 'var(--mui-page-header-color)',
        fontSize: '13px',
        fontWeight: 600,
    },
    /** ボタン配置（横並び・中央） */
    buttonBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        marginTop: '4px',
    },
    /** 主ボタン（検索・発番・登録） */
    primaryButton: {
        flex: 1,
        maxWidth: '240px',
        height: '44px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    /** 副ボタン（クリア・戻る） */
    secondaryButton: {
        flex: 1,
        maxWidth: '160px',
        height: '44px',
        border: '1px solid #9e9e9e',
        borderRadius: '5px',
        backgroundColor: 'white',
        color: '#424242',
        fontSize: '15px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    /** 大きめの選択ボタン（製品・部品選択） */
    choiceButton: {
        width: '100%',
        height: 'clamp(56px, calc(44px + 3.09vw), 72px)',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        fontSize: 'clamp(16px, calc(14.6px + 0.37vw), 18px)',
        fontWeight: 600,
        cursor: 'pointer',
    },
    /** 一覧の各行（ラベル：値） */
    row: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        minWidth: 0,
    },
    rowLabel: {
        color: '#5f5f5f',
        fontSize: '12px',
        whiteSpace: 'nowrap' as const,
    },
    rowValue: {
        color: '#212121',
        fontSize: '14px',
        wordBreak: 'break-all' as const,
        paddingLeft: SP_VALUE_INDENT,
    },
    /**
     * 明細カード内のラベル（幅を固定する版）
     * 「品目コード」「品目名」「数量」など文字数が違っても値の開始位置を揃えるため、
     * カード内のラベルはすべてこのスタイルを使う。
     */
    rowLabelFixed: {
        width: '4.5rem',
        flexShrink: 0,
        color: '#5f5f5f',
        fontSize: '12px',
        lineHeight: 1.5,
        textAlign: 'left' as const,
        whiteSpace: 'nowrap' as const,
    },
    /** リンク風のテキスト（追加・削除） */
    link: {
        color: 'var(--mui-page-header-color)',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
    },
    linkDanger: {
        color: '#d32f2f',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
    },
    /** 操作できない状態のリンク（追加・削除） */
    linkDisabled: {
        color: '#9e9e9e',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'not-allowed',
        whiteSpace: 'nowrap' as const,
    },
    /** 操作できない状態のボタン（印刷済みなど） */
    buttonDisabled: {
        opacity: 0.5,
        cursor: 'default',
    },
    /** 印刷済みの案内文（番号表を印刷した後は変更できない） */
    printedNotice: {
        color: '#d32f2f',
        fontSize: '12px',
        lineHeight: 1.5,
        marginTop: '2px',
    },
    /**
     * ページ送り（設計書「①パレット番号管理 3.1 積載部品の登録」のページ番号）
     *
     * 設計書では各ページが 26×26 の枠で示され、現在のページだけが青地・白文字、
     * それ以外は白地・青枠・濃いグレー文字になる。間隔は 8px。
     */
    pagination: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap' as const,
        gap: '8px',
        width: '100%',
        marginTop: '4px',
    },
    /** ページ番号の枠（現在のページ以外） */
    paginationButton: {
        width: '26px',
        height: '26px',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        border: '1px solid var(--mui-page-header-color)',
        borderRadius: '4px',
        backgroundColor: 'white',
        color: '#404040',
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        cursor: 'pointer',
    },
    /** 現在のページ（青地・白文字） */
    paginationButtonActive: {
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        cursor: 'default',
    },
    /** ページ番号の省略記号（・・・） */
    paginationEllipsis: {
        minWidth: '26px',
        color: '#404040',
        fontSize: '13px',
        lineHeight: 1,
        textAlign: 'center' as const,
    },
    /**
     * 画面下部の操作行
     * ページ送りの下に「戻る」を左寄せで置く（設計書 ①パレット番号管理 の画面下部）。
     */
    bottomActionBar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        marginTop: '4px',
    },
    /**
     * 画面下部の戻るボタン
     * 設計書ではページ番号の下に青地・白文字の横長ボタンとして示されている。
     * 幅は画面幅に追従させつつ、PC 幅でも間延びしないよう上限を設ける。
     */
    backButton: {
        width: 'clamp(120px, 45%, 170px)',
        height: '44px',
        flexShrink: 0,
        border: 'none',
        borderRadius: '5px',
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        fontSize: '15px',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor:
                'color-mix(in srgb, var(--mui-page-header-color) 85%, black 15%)',
        },
    },
    /**
     * 検索結果のカード（SP402／SP403）
     *
     * 設計書（③移動管理／④在庫管理）では、白地・細い枠線のカードに
     * 「項目名（小・グレー）＋値」を縦に積んで表示する。
     * 既存の itemCard（#fafafa 地）より情報量が多いため、こちらは白地にする。
     */
    listCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 12px',
        border: '1px solid #bdbdbd',
        borderRadius: '4px',
        backgroundColor: 'white',
        width: '100%',
        boxSizing: 'border-box' as const,
    },
    /** カード内のリンク（移動依頼番号） */
    cardLink: {
        color: 'var(--mui-page-header-color)',
        fontSize: '14px',
        lineHeight: 1.5,
        textDecoration: 'underline',
        cursor: 'pointer',
        wordBreak: 'break-all' as const,
        paddingLeft: SP_VALUE_INDENT,
    },
    /** カード内の小見出し付きブロック（品目一覧） */
    subSection: {
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #d0d0d0',
        borderRadius: '3px',
        overflow: 'hidden',
        backgroundColor: 'white',
        width: '100%',
    },
    /** 小見出しブロックの見出し行（タップで開閉する） */
    subSectionHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        padding: '4px 8px',
        backgroundColor: '#ececec',
        color: '#212121',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        userSelect: 'none' as const,
    },
    /** 小見出しブロック内の 1 件分（上に区切り線） */
    subItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        padding: '6px 8px',
        borderTop: '1px solid #e0e0e0',
    },
    /** 小見出しブロック内の項目名 */
    subItemLabel: {
        color: '#5f5f5f',
        fontSize: '11px',
        lineHeight: 1.4,
    },
    /** 小見出しブロック内の値 */
    subItemValue: {
        color: '#212121',
        fontSize: '13px',
        lineHeight: 1.5,
        wordBreak: 'break-all' as const,
        paddingLeft: SP_VALUE_INDENT,
    },
    /** 日付範囲（開始 ～ 終了）の行 */
    dateRangeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        minWidth: 0,
    },
    /**
     * 別画面を閉じるボタン
     * 設計書（③移動管理 1-1／④在庫管理）では、ページ番号の下に
     * 淡い青地・白文字の横長ボタンとして示されている。
     */
    closeButton: {
        width: 'clamp(120px, 45%, 170px)',
        height: '44px',
        flexShrink: 0,
        border: 'none',
        borderRadius: '5px',
        backgroundColor: '#6f9fd0',
        color: 'white',
        fontSize: '15px',
        fontWeight: 600,
        fontFamily: 'inherit',
        lineHeight: 1,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#5b8dc1',
        },
    },
    /** 空メッセージ */
    empty: {
        color: '#757575',
        fontSize: '13px',
        padding: '8px 0',
    },
    /**
     * 数量の増減（－ 入力 ＋）の外枠。
     * 入力欄は SpQuantityInput（FormInput を使用）で描画するため、ここでは枠だけを定義する。
     */
    stepper: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: 1,
        minWidth: 0,
        maxWidth: '220px',
        marginLeft: SP_VALUE_INDENT,
    },
    stepperButton: {
        width: '34px',
        height: SP_INPUT_HEIGHT,
        flexShrink: 0,
        border: '1px solid #c4c4c4',
        borderRadius: '5px',
        backgroundColor: 'white',
        color: '#212121',
        fontSize: '16px',
        fontWeight: 600,
        lineHeight: 1,
        cursor: 'pointer',
    },
    /**
     * 明細カードの下に置く登録・更新情報
     * 画面には固定しない（一覧の末尾にそのまま並べる）。
     */
    footer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '8px 10px',
        border: '1px solid #d0d0d0',
        borderRadius: '6px',
        backgroundColor: '#f2f2f2',
        width: '100%',
        boxSizing: 'border-box' as const,
    },
    footerRow: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px',
        minWidth: 0,
    },
    footerLabel: {
        width: '2.5rem',
        flexShrink: 0,
        color: '#5f5f5f',
        fontSize: '11px',
    },
    footerValue: {
        color: '#424242',
        fontSize: '12px',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    /** 明細カード内の小型ボタン（追加） */
    smallButton: {
        marginLeft: 'auto',
        height: SP_INPUT_HEIGHT,
        padding: '0 16px',
        border: 'none',
        borderRadius: '5px',
        backgroundColor: 'var(--mui-page-header-color)',
        color: 'white',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
    },
} as const;

/**
 * SP 画面のフォーム入力（FormInput）用のスタイル
 * ラベルを「基本情報」カードの項目名と同じ見た目（12px・グレー・左端揃え）に揃える。
 */
export const spFormInputSx = {
    label: {
        fontSize: '12px',
        color: '#5f5f5f',
        marginLeft: 0,
        marginBottom: '2px',
    },
    // ラベルは左端のまま、入力枠だけ設計書どおり一段下げる
    input: {
        marginLeft: SP_VALUE_INDENT,
        width: `calc(100% - ${SP_VALUE_INDENT})`,
        maxWidth: `calc(100% - ${SP_VALUE_INDENT})`,
        boxSizing: 'border-box' as const,
    },
};

/**
 * 明細カード内の FormInput 用スタイル
 *
 * カード内の他の行（品目コード・品目名）と同じ「ラベル 4.5rem ＋ 値」の並びにする。
 * 入力枠の高さは基本情報カード・検索欄と同じ SP_INPUT_HEIGHT に揃える。
 * 数量・保管区分・使用可否で共通に使う。
 */
export const spItemFieldSx = {
    gap: '8px',
    marginTop: 0,
    height: SP_INPUT_HEIGHT,
    justifyContent: 'flex-start',
    label: {
        width: '4.5rem',
        flexShrink: 0,
        paddingTop: 0,
        marginLeft: 0,
        fontSize: '12px',
        color: '#5f5f5f',
    },
    input: {
        '& .MuiInputBase-root': {
            height: SP_INPUT_HEIGHT,
            paddingTop: '2px',
            paddingBottom: '2px',
            borderRadius: '5px',
            backgroundColor: 'white',
        },
        // 非活性時は入力枠全体をグレーで塗る
        // （上の backgroundColor: white と詳細度を変えないと打ち消されるため、
        //   MuiInputBase-root と Mui-disabled を併記して詳細度を上げる）
        '& .MuiInputBase-root.Mui-disabled': {
            backgroundColor: 'gainsboro',
        },
        // カード（#fafafa）上でも枠が分かるよう、枠線色を他項目と同じ灰色にする
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c4c4c4',
        },
        '& .MuiInputBase-input': {
            paddingTop: 0,
            paddingBottom: 0,
        },
        // プルダウンは既定の上下パディング（16.5px）のままだと文字が枠の外へ出るため、
        // 基本情報カードの入力欄と同じ「上下 0」にして枠内で中央に置く
        '& .MuiSelect-select': {
            paddingTop: 0,
            paddingBottom: 0,
        },
        '& .MuiAutocomplete-inputRoot': {
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
        },
    },
};

/**
 * 数量入力（「－ 入力 ＋」）の入力枠用スタイル
 *
 * SP305 の明細カードで使っている形を基準に、他の画面（SP302／SP303）でも
 * 同じ見た目になるよう共通化したもの。ラベルは外側で rowLabelFixed を使うため
 * ここでは持たない（増減ボタンの間で伸縮する入力枠だけを定義する）。
 */
export const spQuantityInputSx = {
    flex: 1,
    minWidth: 0,
    gap: 0,
    marginTop: 0,
    height: SP_INPUT_HEIGHT,
    input: spItemFieldSx.input,
};
