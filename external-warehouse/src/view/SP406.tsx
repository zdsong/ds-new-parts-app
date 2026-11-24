import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DecodeHintType, MultiFormatReader } from '@zxing/library';

import useApiRequest from '../adapters/apiUtil';
import FormInput from '../compontent/FormInput';
import { spFormInputSx, spSx, spSquareInputStyle, SP_INPUT_HEIGHT } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';
import type { OptionItem } from '../utils/palletData';
import { buildBarcodeSvg } from '../utils/palletNumberSheet';
import type { MoveLine, MoveRequestDetail, ScannedPallet } from '../utils/moveData';

/** 読み取りライブラリ（ZXing）のモジュール型 */
type ZxingModule = typeof import('@zxing/library');

/**
 * ZXing はサイズが大きいため、画面を開いた時点では読み込まず
 * 「バーコードを読み取る」を押したときに遅延読み込みする。
 */
let zxingPromise: Promise<ZxingModule> | null = null;
const loadZxing = (): Promise<ZxingModule> => {
    if (!zxingPromise) {
        zxingPromise = import('@zxing/library').catch((error) => {
            zxingPromise = null;
            throw error;
        });
    }
    return zxingPromise;
};

/** 読み取りを試す間隔（ミリ秒） */
const SCAN_INTERVAL_MS = 150;
/** 解析に使う画像の最大幅（ピクセル） */
const MAX_DECODE_WIDTH = 1024;
/** ガイド枠（画面に対する割合） */
const CROP_WIDTH_RATIO = 0.86;
const CROP_HEIGHT_RATIO = 0.26;

/** カメラを利用できない理由を、利用者に分かる言葉で返す */
const getCameraErrorMessage = (error?: unknown): string => {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    const isInAppBrowser = /MicroMessenger|Line\/|FBAN|FBAV|Instagram/i.test(ua);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'HTTPS でないためカメラを利用できません。https:// または localhost で開いてください。';
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return isInAppBrowser
            ? 'このアプリ内ブラウザではカメラを利用できません。Safari または Chrome で開いてください。'
            : 'このブラウザではカメラを利用できません。Safari または Chrome で開いてください。';
    }

    const name = (error as { name?: string } | undefined)?.name ?? '';
    switch (name) {
        case 'NotAllowedError':
        case 'SecurityError':
            return 'カメラの使用が許可されていません。ブラウザの設定でカメラを許可してください。';
        case 'NotFoundError':
        case 'OverconstrainedError':
            return '利用できるカメラが見つかりませんでした。';
        case 'NotReadableError':
            return 'カメラが他のアプリで使用中です。他のアプリを閉じてから再度お試しください。';
        default:
            return 'カメラを起動できませんでした。カメラの使用を許可してください。';
    }
};

const palletHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
};

const palletNumberStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    border: 'none',
};

const palletLineStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid #e0e0e0',
    paddingTop: '8px',
};

const palletDeleteStyle: React.CSSProperties = {
    flex: 'none',
    height: SP_INPUT_HEIGHT,
    padding: '0 10px',
    border: '1px solid #d32f2f',
    borderRadius: 0,
    backgroundColor: '#ffffff',
    color: '#d32f2f',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
};

const palletFieldRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    width: '100%',
};

const palletFieldCellStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
};

const linkSx = {
    color: '#0b5cab',
    fontSize: 'clamp(12px, 3.4vw, 14px)',
    textDecoration: 'underline',
    cursor: 'pointer',
};

/** 移動読取 API の依頼 */
interface ScanRequest {
    requestNo?: string;
    destinationLabel?: string;
    requester?: string;
    desiredDate?: string;
    remark?: string;
}

/** 移動読取 API の品目 */
interface ScanLine {
    id: string;
    itemCode: string;
    itemName?: string;
    category?: string;
    moveQty?: number;
    storageQty?: number;
    palletNo?: string;
    storagePlace?: string;
    request?: ScanRequest | null;
}

/** GET /api/pallet/scan/{palletNo} */
interface PalletScanResult {
    palletNo?: string;
    lines?: ScanLine[];
}

/** GET /api/transfer/detail の明細 */
interface TransferDetailLine {
    detailNo: number;
    itemCode: string;
    itemName?: string;
    storageQty?: number | null;
    usedQty?: number | null;
    lostDamagedQty?: number | null;
    disposalQty?: number | null;
    palletNo?: string;
}

/** GET /api/transfer/detail */
interface TransferDetail {
    requestNo: string;
    destWhCd?: string;
    destWarehouse?: string;
    desiredDate?: string;
    requester?: string;
    memo?: string;
    details?: TransferDetailLine[];
}

/** POST /api/transfer/update に返す依頼。明細は依頼の全行 */
interface TransferOrderSnapshot {
    requestNo: string;
    destWhCd: string;
    desiredDate: string;
    requester: string;
    memo: string;
    details: Array<{
        detailNo: number;
        itemCode: string;
        itemName: string;
        storageQty: number | null;
        usedQty: number | null;
        lostDamagedQty: number | null;
        disposalQty: number | null;
        palletNo: string;
    }>;
}

/** 画面の移動依頼詳細 */
const toRequest = (detail: TransferDetail, request?: ScanRequest | null): MoveRequestDetail => ({
    requestNo: request?.requestNo || detail.requestNo,
    destinationLabel: request?.destinationLabel || detail.destWarehouse || detail.destWhCd || '',
    requester: request?.requester || detail.requester || '',
    desiredDate: request?.desiredDate || detail.desiredDate || '',
    remark: request?.remark || detail.memo || '',
});

/** 読取行を画面の品目にする。在庫行が無いときは依頼明細を使う */
const toMoveLines = (
    scanLines: ScanLine[] | undefined,
    detail: TransferDetail,
    palletNo: string
): MoveLine[] => {
    const source = (scanLines ?? []).filter((line) => line.itemCode);
    if (source.length > 0) {
        return source.map((line) => ({
            id: line.id,
            itemCode: line.itemCode,
            itemName: line.itemName ?? '',
            category: line.category === '1' ? '1' : '3',
            moveQty: Number(line.moveQty ?? line.storageQty ?? 0),
            storageQty: Number(line.storageQty ?? 0),
            palletNo: line.palletNo || palletNo,
            storagePlace: line.storagePlace ?? '',
            request: line.request?.requestNo ? toRequest(detail, line.request) : null,
        }));
    }
    return (detail.details ?? [])
        .filter((line) => !line.palletNo || line.palletNo === palletNo)
        .map((line) => ({
            id: `${detail.requestNo}-${line.detailNo}`,
            itemCode: line.itemCode,
            itemName: line.itemName ?? '',
            category: '3' as const,
            moveQty: Number(line.usedQty ?? line.storageQty ?? 0),
            storageQty: Number(line.storageQty ?? 0),
            palletNo: line.palletNo || palletNo,
            storagePlace: '',
            request: toRequest(detail, null),
        }));
};

const backButtonStyle: React.CSSProperties = {
    flex: 1,
    maxWidth: '180px',
    height: '46px',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#6f9fd0',
    color: 'white',
    fontSize: 'clamp(14px, 4vw, 17px)',
    fontWeight: 600,
    cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
    ...backButtonStyle,
    backgroundColor: '#0b5cab',
};

/** カード内の項目名と値 */
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={spSx.fieldValue}>{children}</span>
    </div>
);

/** 移動依頼がある品目の折りたたみ。複数行を同時に開く */
const RequestDetail: React.FC<{ line: MoveLine; open: boolean; onToggle: () => void }> = ({
    line,
    open,
    onToggle,
}) => {
    if (!line.request) return null;
    return (
        <div style={spSx.subSection}>
            <div style={spSx.subSectionHeader} onClick={onToggle} role="button" aria-expanded={open}>
                <span>移動依頼詳細</span>
                <span>{open ? '－' : '＋'}</span>
            </div>
            {open ? (
                <div style={spSx.subItem}>
                    <span style={spSx.subItemLabel}>移動依頼番号</span>
                    <span style={spSx.subItemValue}>{line.request.requestNo}</span>
                    <span style={spSx.subItemLabel}>移動先</span>
                    <span style={spSx.subItemValue}>{line.request.destinationLabel}</span>
                    <span style={spSx.subItemLabel}>依頼者</span>
                    <span style={spSx.subItemValue}>{line.request.requester}</span>
                    <span style={spSx.subItemLabel}>移動希望日</span>
                    <span style={spSx.subItemValue}>{line.request.desiredDate}</span>
                    <span style={spSx.subItemLabel}>備考</span>
                    <span style={spSx.subItemValue}>{line.request.remark || '－'}</span>
                </div>
            ) : null}
        </div>
    );
};

/**
 * 入庫で移動番号があるパレット 1 件。
 * パレット番号はカードの中に置き、品目は横線で分ける。
 */
const ReceiveResult: React.FC<{
    pallet: ScannedPallet;
    location: string;
    done: boolean;
    openRequestIds: Set<string>;
    warehouseChoices: OptionItem[];
    locationChoices: OptionItem[];
    onToggleRequest: (lineId: string) => void;
    onLocationChange: (value: string) => void;
    onRemove: () => void;
}> = ({
    pallet,
    location,
    done,
    openRequestIds,
    warehouseChoices,
    locationChoices,
    onToggleRequest,
    onLocationChange,
    onRemove,
}) => {
    if (!pallet.inbound) return null;
    const inbound = pallet.inbound;
    return (
        <div style={spSx.listCard}>
            <div style={palletHeaderStyle}>
                <div style={palletNumberStyle}>
                    <Field label="移動番号">{inbound.moveNo}</Field>
                    <Field label="パレット番号">{pallet.palletNo}</Field>
                </div>
                <button type="button" style={palletDeleteStyle} onClick={onRemove}>
                    削除
                </button>
            </div>
            <SimpleForm
                toolbar={false}
                sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                onSubmit={() => undefined}
                defaultValues={{
                    destinationWh: inbound.destinationWh,
                    destinationLoc: location || inbound.destinationLoc,
                    remark: inbound.remark,
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={palletFieldRowStyle}>
                        <div style={palletFieldCellStyle}>
                            <FormInput
                                type={'filter-select'}
                                source="destinationWh"
                                label="移動先"
                                structure="top-bottom"
                                sx={spFormInputSx}
                                choices={warehouseChoices}
                                disabled
                            />
                        </div>
                        <div style={palletFieldCellStyle}>
                            <FormInput
                                type={'filter-select'}
                                source="destinationLoc"
                                label="ロケ番"
                                structure="top-bottom"
                                sx={spFormInputSx}
                                choices={locationChoices}
                                disabled={done}
                                onChange={(value) => onLocationChange(normalizeChoiceValue(value))}
                            />
                        </div>
                    </div>
                    <FormInput
                        type={'text'}
                        source="remark"
                        label="備考"
                        structure="top-bottom"
                        sx={spFormInputSx}
                        disabled
                    />
                    <Field label="移動登録者">{inbound.registrar}</Field>
                    {done ? <Field label="移動状況">移動完了</Field> : null}
                    {pallet.lines.map((line) => (
                        <div key={line.id} style={palletLineStyle}>
                            <Field label="品目コード">{line.itemCode}</Field>
                            <Field label="品目名">{line.itemName}</Field>
                            <Field label={line.request ? '移動数量' : '保管数量'}>
                                {line.request ? line.moveQty : line.storageQty}
                            </Field>
                            {line.request ? (
                                <RequestDetail
                                    line={line}
                                    open={openRequestIds.has(line.id)}
                                    onToggle={() => onToggleRequest(line.id)}
                                />
                            ) : (
                                <>
                                    <FormInput
                                        type={'text'}
                                        source={`lineRemark_${line.id.replace(/[^A-Za-z0-9_]/g, '_')}`}
                                        label="備考"
                                        structure="top-bottom"
                                        sx={spFormInputSx}
                                        multiline
                                        inputHeight={80}
                                        defaultValue=""
                                    />
                                    <Field label="移動登録者">{inbound.registrar}</Field>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </SimpleForm>
        </div>
    );
};

/**
 * パレット受取のバーコード読み取り画面（SP406）
 *
 * 設計書：③移動管理 2. パレットを受け取る場合（移動先）
 *   パレット番号表を複数読み、未完了の移動があるパレットだけカードにする。
 *   読取は GET /api/pallet/scan/{palletNo}。移動依頼があるとき
 *   GET /api/transfer/detail で移動先を取り、カードにする。
 *   移動完了は POST /api/transfer/update。明細は依頼の全行を返し、他パレットを消さない。
 *   移動番号がない番号はカードにせず、画面下の通知で知らせる。
 */
const SP406: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const { request } = useApiRequest();
    const [searchParams] = useSearchParams();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const scanningRef = useRef(false);
    const lastScanAtRef = useRef(0);
    const zxingRef = useRef<ZxingModule | null>(null);
    const readerRef = useRef<MultiFormatReader | null>(null);
    // 読み取り済みの番号。カメラは同じ番号を連続で返す
    const scannedNosRef = useRef<Set<string>>(new Set());
    const lastCameraCodeRef = useRef('');
    const onCodeRef = useRef<(value: string) => void>(() => undefined);
    // 移動完了で依頼全体を更新するための、読取時の依頼内容
    const orderByPalletRef = useRef<Map<string, TransferOrderSnapshot>>(new Map());

    const [codeSvg, setCodeSvg] = useState('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    // 移動番号があるパレットだけ積む
    const [scannedPallets, setScannedPallets] = useState<ScannedPallet[]>([]);
    const [locations, setLocations] = useState<Record<string, string>>({});
    const [locationOptions, setLocationOptions] = useState<Record<string, OptionItem[]>>({});
    const [openRequestIds, setOpenRequestIds] = useState<Set<string>>(() => new Set());
    const [inboundDone, setInboundDone] = useState(false);
    // TODO 削除: 開発完了後に消す。カメラの代わりにバーコードを手入力して同じ読取処理を通す
    const [testBarcode, setTestBarcode] = useState('');

    const stopCamera = () => {
        scanningRef.current = false;
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const handleCloseCamera = () => {
        stopCamera();
        setCameraOpen(false);
    };

    /** 移動先倉庫のロケ番を読み込む */
    const ensureLocationOptions = useCallback(async (whCd: string) => {
        if (!whCd) return;
        const result = await request(
            'get',
            `api/common/${encodeURIComponent(whCd)}/location/options`,
            {},
            {},
            false,
            false
        );
        const options = (result?.data || []) as OptionItem[];
        setLocationOptions((prev) => ({ ...prev, [whCd]: options }));
    }, [request]);

    /**
     * 読み取り結果をカードへ足す。
     * 移動番号がない場合はカードを出さず、画面下の通知だけ出す。
     * カメラ読取のときは閉じずに次の番号も読めるようにする。
     */
    const applyScanResult = useCallback(async (value: string, fromCamera = false) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (fromCamera) {
            if (lastCameraCodeRef.current === trimmed) return;
            lastCameraCodeRef.current = trimmed;
        } else {
            stopCamera();
            setCameraOpen(false);
        }
        if (scannedNosRef.current.has(trimmed)) {
            if (!fromCamera) notify('このパレットは読み取り済みです。', { type: 'warning' });
            return;
        }
        scannedNosRef.current.add(trimmed);
        setCodeSvg(buildBarcodeSvg(trimmed));
        try {
            const result = await request(
                'get',
                `api/pallet/scan/${encodeURIComponent(trimmed)}`,
                {},
                {},
                true,
                false
            );
            if (!result || result.code !== 200 || !result.data) {
                scannedNosRef.current.delete(trimmed);
                return;
            }
            const scan = result.data as PalletScanResult;
            const requestNo = (scan.lines ?? []).find((line) => line.request?.requestNo)?.request?.requestNo;
            if (!requestNo) {
                scannedNosRef.current.delete(trimmed);
                notify('移動登録情報を確認できません。', { type: 'error' });
                return;
            }
            const detailResult = await request(
                'get',
                'api/transfer/detail',
                {},
                { requestNo },
                true,
                false
            );
            if (!detailResult || detailResult.code !== 200) {
                scannedNosRef.current.delete(trimmed);
                return;
            }
            const detail = detailResult.data as TransferDetail | null;
            if (!detail?.requestNo || !detail.destWhCd) {
                scannedNosRef.current.delete(trimmed);
                notify('移動登録情報を確認できません。', { type: 'error' });
                return;
            }
            const palletNo = scan.palletNo || trimmed;
            if (scannedNosRef.current.has(palletNo) && palletNo !== trimmed) {
                scannedNosRef.current.delete(trimmed);
                if (!fromCamera) notify('このパレットは読み取り済みです。', { type: 'warning' });
                return;
            }
            const lines = toMoveLines(scan.lines, detail, palletNo);
            const pallet: ScannedPallet = {
                palletNo,
                dependent: lines.some((line) => line.request),
                lines,
                inbound: {
                    moveNo: detail.requestNo,
                    destinationWh: detail.destWhCd,
                    destinationWhNm: detail.destWarehouse || detail.destWhCd,
                    destinationLoc: '',
                    remark: detail.memo || '',
                    registrar: detail.requester || '',
                },
            };
            orderByPalletRef.current.set(palletNo, {
                requestNo: detail.requestNo,
                destWhCd: detail.destWhCd,
                desiredDate: detail.desiredDate || '',
                requester: detail.requester || '',
                memo: detail.memo || '',
                details: (detail.details ?? []).map((line) => ({
                    detailNo: line.detailNo,
                    itemCode: line.itemCode,
                    itemName: line.itemName ?? '',
                    storageQty: line.storageQty ?? null,
                    usedQty: line.usedQty ?? null,
                    lostDamagedQty: line.lostDamagedQty ?? null,
                    disposalQty: line.disposalQty ?? null,
                    palletNo: line.palletNo ?? '',
                })),
            });
            scannedNosRef.current.add(palletNo);
            setScannedPallets((prev) => (prev.some((item) => item.palletNo === palletNo) ? prev : [...prev, pallet]));
            setLocations((prev) => (prev[palletNo] ? prev : { ...prev, [palletNo]: '' }));
            setOpenRequestIds((current) => {
                const requestIds = lines.filter((line) => line.request).map((line) => line.id);
                if (requestIds.every((id) => current.has(id))) return current;
                const next = new Set(current);
                requestIds.forEach((id) => next.add(id));
                return next;
            });
            setInboundDone(false);
            void ensureLocationOptions(detail.destWhCd);
        } catch {
            scannedNosRef.current.delete(trimmed);
        }
    }, [ensureLocationOptions, notify, request]);

    /** 読み取ったパレットを一覧から外す */
    const handleRemovePallet = (palletNo: string) => {
        const target = scannedPallets.find((pallet) => pallet.palletNo === palletNo);
        const lineIds = new Set(target?.lines.map((line) => line.id) ?? []);
        setScannedPallets((prev) => prev.filter((pallet) => pallet.palletNo !== palletNo));
        setLocations((prev) => {
            if (!(palletNo in prev)) return prev;
            const next = { ...prev };
            delete next[palletNo];
            return next;
        });
        setOpenRequestIds((current) => {
            if (!Array.from(lineIds).some((id) => current.has(id))) return current;
            const next = new Set(current);
            lineIds.forEach((id) => next.delete(id));
            return next;
        });
        scannedNosRef.current.delete(palletNo);
        orderByPalletRef.current.delete(palletNo);
        if (lastCameraCodeRef.current === palletNo) lastCameraCodeRef.current = '';
    };

    onCodeRef.current = (value: string) => applyScanResult(value, true);

    /**
     * TODO 削除: 開発完了後にこの関数と画面のテスト用入力を削除する。
     * 入力したバーコードを、カメラ読取と同じ applyScanResult に渡す。
     */
    const handleTestBarcodeSearch = () => {
        applyScanResult(testBarcode);
    };

    const decodeCanvas = (
        zxing: ZxingModule,
        reader: MultiFormatReader,
        canvas: HTMLCanvasElement,
        context: CanvasRenderingContext2D
    ): string => {
        const { width, height } = canvas;
        if (!width || !height) return '';

        let imageData: ImageData;
        try {
            imageData = context.getImageData(0, 0, width, height);
        } catch {
            return '';
        }

        const luminances = new Uint8ClampedArray(width * height);
        const { data } = imageData;
        for (let src = 0, dst = 0; dst < luminances.length; src += 4, dst += 1) {
            luminances[dst] = (data[src] * 0.299 + data[src + 1] * 0.587 + data[src + 2] * 0.114) | 0;
        }

        try {
            const source = new zxing.RGBLuminanceSource(luminances, width, height);
            const bitmap = new zxing.BinaryBitmap(new zxing.HybridBinarizer(source));
            return reader.decodeWithState(bitmap)?.getText() ?? '';
        } catch {
            return '';
        }
    };

    const scanOnce = (): string => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const zxing = zxingRef.current;
        const reader = readerRef.current;
        if (!video || !canvas || !zxing || !reader || video.readyState < 2) return '';

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        if (!videoWidth || !videoHeight) return '';

        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return '';

        const fullScale = Math.min(1, MAX_DECODE_WIDTH / videoWidth);
        canvas.width = Math.max(1, Math.round(videoWidth * fullScale));
        canvas.height = Math.max(1, Math.round(videoHeight * fullScale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const fullResult = decodeCanvas(zxing, reader, canvas, context);
        if (fullResult) return fullResult;

        const cropWidth = Math.round(videoWidth * CROP_WIDTH_RATIO);
        const cropHeight = Math.round(videoHeight * CROP_HEIGHT_RATIO);
        const cropScale = Math.min(1, MAX_DECODE_WIDTH / cropWidth);
        canvas.width = Math.max(1, Math.round(cropWidth * cropScale));
        canvas.height = Math.max(1, Math.round(cropHeight * cropScale));
        context.drawImage(
            video,
            Math.round((videoWidth - cropWidth) / 2),
            Math.round((videoHeight - cropHeight) / 2),
            cropWidth,
            cropHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );
        return decodeCanvas(zxing, reader, canvas, context);
    };

    const scanFrame = () => {
        if (!scanningRef.current) return;
        frameRef.current = requestAnimationFrame(scanFrame);

        const now = Date.now();
        if (now - lastScanAtRef.current < SCAN_INTERVAL_MS) return;
        lastScanAtRef.current = now;

        const value = scanOnce();
        if (value) onCodeRef.current(value);
    };

    useEffect(() => {
        if (!cameraOpen) return;
        let cancelled = false;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setErrorMessage(getCameraErrorMessage());
                setCameraOpen(false);
                return;
            }

            let zxing: ZxingModule;
            try {
                zxing = await loadZxing();
            } catch {
                if (!cancelled) {
                    setErrorMessage('バーコード読取機能の読み込みに失敗しました。通信環境を確認して、もう一度お試しください。');
                    setCameraOpen(false);
                }
                return;
            }
            if (cancelled) return;

            const reader = new zxing.MultiFormatReader();
            const hints = new Map<DecodeHintType, unknown>();
            hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
                zxing.BarcodeFormat.CODE_128,
                zxing.BarcodeFormat.EAN_13,
                zxing.BarcodeFormat.CODE_39,
                zxing.BarcodeFormat.ITF,
                zxing.BarcodeFormat.EAN_8,
            ]);
            hints.set(zxing.DecodeHintType.TRY_HARDER, true);
            reader.setHints(hints);
            zxingRef.current = zxing;
            readerRef.current = reader;

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                });
                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    try {
                        await videoRef.current.play();
                    } catch {
                        // iOS では自動再生が拒否されることがある
                    }
                }

                lastScanAtRef.current = 0;
                lastCameraCodeRef.current = '';
                scanningRef.current = true;
                scanFrame();
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(getCameraErrorMessage(error));
                    setCameraOpen(false);
                }
            }
        };

        startCamera();
        return () => {
            cancelled = true;
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraOpen]);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopCamera();
                setCameraOpen(false);
            }
        };
        const handlePageHide = () => {
            stopCamera();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

    const handleStartScan = () => {
        setErrorMessage('');
        setCameraOpen(true);
    };

    /** ロケ番を確定し、移動完了をサーバへ送る */
    const handleReceiveComplete = async () => {
        if (scannedPallets.length === 0 || scannedPallets.some((pallet) => !pallet.inbound)) {
            notify('移動登録情報を確認できません。', { type: 'error' });
            return;
        }
        if (scannedPallets.some((pallet) => !locations[pallet.palletNo])) {
            notify('ロケ番を選択してください。', { type: 'warning' });
            return;
        }
        const sent = new Set<string>();
        for (const pallet of scannedPallets) {
            const order = orderByPalletRef.current.get(pallet.palletNo);
            if (!order || sent.has(order.requestNo)) continue;
            sent.add(order.requestNo);
            const result = await request(
                'post',
                'api/transfer/update',
                {
                    requestNo: order.requestNo,
                    destWhCd: order.destWhCd,
                    destLocCd: locations[pallet.palletNo],
                    desiredDate: order.desiredDate,
                    requester: order.requester,
                    memo: order.memo,
                    details: order.details,
                },
                {},
                true,
                false
            );
            if (!result || result.code !== 200) return;
        }
        setInboundDone(true);
        notify('移動完了にしました。', { type: 'success' });
    };

    const handleToggleRequest = (lineId: string) => {
        setOpenRequestIds((current) => {
            const next = new Set(current);
            if (next.has(lineId)) next.delete(lineId);
            else next.add(lineId);
            return next;
        });
    };

    // カメラが使えない確認用
    const palletQuery = searchParams.get('pallet');
    useEffect(() => {
        if (!palletQuery) return;
        applyScanResult(palletQuery, false);
        // 初回のクエリだけ読む
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [palletQuery]);

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '520px',
                    minHeight: 'calc(var(--app-vh) - 140px)',
                    backgroundColor: 'white',
                    border: '1px solid #d0d0d0',
                    boxSizing: 'border-box',
                }}
            >
                <Box sx={{ padding: '12px 14px 10px', fontSize: 'clamp(13px, 3.6vw, 15px)', color: '#212121' }}>
                    バーコード読み取り
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px',
                        backgroundColor: '#7d7d7d',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: 'clamp(120px, 38vw, 190px)',
                            padding: '10px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box',
                        }}
                    >
                        {codeSvg ? (
                            <Box
                                dangerouslySetInnerHTML={{ __html: codeSvg }}
                                sx={{ width: '100%', height: '100%', '& svg': { width: '100%', height: '100%', display: 'block' } }}
                                aria-label="読み取り結果のバーコード"
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: '70%',
                                    background:
                                        'repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 5px, #000 5px 8px, transparent 8px 10px, #000 10px 11px, transparent 11px 15px)',
                                }}
                            />
                        )}
                    </Box>

                    <Box
                        sx={{
                            width: '100%',
                            padding: '6px 0',
                            textAlign: 'center',
                            color: 'white',
                            fontSize: 'clamp(13px, 3.8vw, 16px)',
                            fontWeight: 700,
                            lineHeight: 1.4,
                        }}
                    >
                        パレット番号表の
                        <br />
                        バーコードをスキャンしてください
                    </Box>

                    <button type="button" onClick={handleStartScan} style={{
                        width: '100%',
                        height: '48px',
                        border: 'none',
                        borderRadius: '5px',
                        backgroundColor: '#0b5cab',
                        color: 'white',
                        fontSize: 'clamp(14px, 4vw, 17px)',
                        fontWeight: 700,
                        cursor: 'pointer',
                    }}>
                        バーコードを読み取る
                    </button>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        padding: '12px 18px',
                        backgroundColor: '#f7f7f7',
                    }}
                >
                    <Box component="span" onClick={() => navigate('/SP404')} sx={linkSx}>
                        移動依頼検索
                    </Box>
                    <Box component="span" onClick={() => navigate('/SP403')} sx={linkSx}>
                        品目検索
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 14px 0' }}>
                    {/* TODO 削除: 開発完了後にこのテスト用バーコード入力を削除する */}
                    <Box component="span" sx={{ fontSize: '12px', color: '#c62828', fontWeight: 700 }}>
                        テスト用（開発完了後に削除）
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            aria-label="テスト用バーコード"
                            value={testBarcode}
                            placeholder="バーコード"
                            onChange={(event) => setTestBarcode(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleTestBarcodeSearch();
                                }
                            }}
                            style={{ ...spSquareInputStyle, flex: 1, minWidth: 0 }}
                        />
                        <button
                            type="button"
                            onClick={handleTestBarcodeSearch}
                            style={{
                                flex: 'none',
                                boxSizing: 'border-box',
                                height: SP_INPUT_HEIGHT,
                                padding: '0 14px',
                                border: 'none',
                                borderRadius: '5px',
                                backgroundColor: '#0b5cab',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            検索
                        </button>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px' }}>
                    <Box component="span" sx={spSx.sectionTitle}>
                        ■読み取り結果
                    </Box>
                    {scannedPallets.map((pallet) => (
                        <ReceiveResult
                            key={pallet.palletNo}
                            pallet={pallet}
                            location={locations[pallet.palletNo] || ''}
                            done={inboundDone}
                            openRequestIds={openRequestIds}
                            warehouseChoices={
                                pallet.inbound
                                    ? [{
                                        key: pallet.inbound.destinationWh,
                                        value: pallet.inbound.destinationWhNm || pallet.inbound.destinationWh,
                                    }]
                                    : []
                            }
                            locationChoices={
                                pallet.inbound ? locationOptions[pallet.inbound.destinationWh] || [] : []
                            }
                            onToggleRequest={handleToggleRequest}
                            onLocationChange={(value) =>
                                setLocations((prev) => ({ ...prev, [pallet.palletNo]: value }))
                            }
                            onRemove={() => handleRemovePallet(pallet.palletNo)}
                        />
                    ))}
                </Box>

                <Box sx={{ display: 'flex', gap: '14px', padding: '12px 14px 18px' }}>
                    <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
                        戻る
                    </button>
                    <button
                        type="button"
                        style={primaryButtonStyle}
                        onClick={handleReceiveComplete}
                        disabled={inboundDone}
                    >
                        移動完了
                    </button>
                </Box>
            </Box>

            {cameraOpen ? (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 'var(--app-vh)',
                        zIndex: 2000,
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'black',
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '48px',
                            padding: '0 14px',
                            color: 'white',
                            backgroundColor: '#333333',
                        }}
                    >
                        <Box component="span" sx={{ fontSize: '15px', fontWeight: 600 }}>
                            バーコード読み取り
                        </Box>
                        <button
                            type="button"
                            onClick={handleCloseCamera}
                            style={{
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'white',
                                fontSize: '14px',
                                cursor: 'pointer',
                            }}
                        >
                            閉じる
                        </button>
                    </Box>
                    <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video
                            ref={videoRef}
                            playsInline
                            muted
                            autoPlay
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                width: `${CROP_WIDTH_RATIO * 100}%`,
                                height: `${CROP_HEIGHT_RATIO * 100}%`,
                                maxWidth: '420px',
                                maxHeight: '150px',
                                border: '3px solid white',
                                borderRadius: '8px',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                                pointerEvents: 'none',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '8px',
                                    right: '8px',
                                    height: '2px',
                                    backgroundColor: 'rgba(255, 82, 82, 0.9)',
                                    transform: 'translateY(-50%)',
                                }}
                            />
                        </Box>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </Box>
                    <Box sx={{ padding: '14px', color: 'white', textAlign: 'center', fontSize: '13px' }}>
                        {errorMessage ? (
                            <Box component="span" sx={{ color: '#ff8a80' }}>
                                {errorMessage}
                            </Box>
                        ) : (
                            '枠内にバーコードを横に合わせてください'
                        )}
                    </Box>
                </Box>
            ) : null}
        </Box>
    );
};

export default SP406;
