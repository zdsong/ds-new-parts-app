/**
 * SP（スマートフォン）画面向けの共通スタイル
 *
 * 参考：external-warehouse-sp の pageSx / cardSx を、本プロジェクト（ew）の
 * 画面でも使えるようにまとめたもの。PC 画面（P3xx）と違い、1 列・縦積みを前提とする。
 */
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
    /** タイトルバー（左：画面名、右：操作リンク） */
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
        fontWeight: 600,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap' as const,
    },
    /** タイトルバー右側の操作（確認・番号表印刷など） */
    actionLink: {
        color: 'var(--mui-page-header-color)',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        '&:hover': { textDecoration: 'underline' },
    },
    /** 操作できない状態のリンク */
    actionLinkDisabled: {
        color: '#9e9e9e',
        fontSize: '14px',
        fontWeight: 600,
        whiteSpace: 'nowrap' as const,
        cursor: 'not-allowed',
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
        padding: '10px 12px',
        border: '1px solid #cccccc',
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
    },
    stepperButton: {
        width: '34px',
        height: '34px',
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
        height: '34px',
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
};

/**
 * 明細カード内の FormInput 用スタイル
 *
 * カード内の他の行（品目コード・品目名）と同じ「ラベル 4.5rem ＋ 値」の並びにし、
 * 入力枠の高さも 34px に揃える。数量・保管区分・使用可否で共通に使う。
 */
export const spItemFieldSx = {
    gap: '8px',
    marginTop: 0,
    height: '34px',
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
            height: '34px',
            borderRadius: '5px',
            backgroundColor: 'white',
        },
        // カード（#fafafa）上でも枠が分かるよう、枠線色を他項目と同じ灰色にする
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#c4c4c4',
        },
        '& .MuiInputBase-input': {
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
    height: '34px',
    input: spItemFieldSx.input,
};
