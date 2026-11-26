import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DecodeHintType, MultiFormatReader } from '@zxing/library';

import useApiRequest from '../adapters/apiUtil';
import FormInput from '../compontent/FormInput';
import { spFormInputSx, spSx, spSquareInputStyle, spSquareReadonlyStyle, SP_INPUT_HEIGHT } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';
import { buildBarcodeSvg } from '../utils/palletNumberSheet';
import {
    canMixCategory,
    findScannedPallet,
} from '../utils/moveData';
import type { MoveCategory, MoveLine, MoveRequestDetail, ScannedPallet } from '../utils/moveData';

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
            // 失敗した Promise を保持すると再試行できないため、次回のために捨てる
            zxingPromise = null;
            throw error;
        });
    }
    return zxingPromise;
};

/** 読み取りを試す間隔（ミリ秒）。毎フレーム解析すると端末が重くなる */
const SCAN_INTERVAL_MS = 150;
/** 解析に使う画像の最大幅（ピクセル）。大きすぎると 1 コマの解析が重くなる */
const MAX_DECODE_WIDTH = 1024;
/** ガイド枠（画面に対する割合）。1 回目で読めないときにこの範囲を等倍で解析し直す */
const CROP_WIDTH_RATIO = 0.86;
const CROP_HEIGHT_RATIO = 0.26;

/**
 * カメラを利用できない理由を、利用者に分かる言葉で返す
 *
 * スマートフォンのブラウザは「安全なコンテキスト（HTTPS または localhost）」でしか
 * カメラを公開しない。開発中に http://192.168.x.x:8001 のような URL で開くと
 * navigator.mediaDevices 自体が存在せず、ボタンを押しても何も起きないように見える。
 */
const getCameraErrorMessage = (error?: unknown): string => {
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    // アプリ内ブラウザ（微信・LINE 等）はカメラ API を持たない、または制限される
    const isInAppBrowser = /MicroMessenger|Line\/|FBAN|FBAV|Instagram/i.test(ua);

    if (typeof window !== 'undefined' && !window.isSecureContext) {
        return 'HTTPS でないためカメラを利用できません。https:// または localhost で開いてください。';
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return isInAppBrowser
            ? 'このアプリ内ブラウザではカメラを利用できません。Safari または Chrome で開いてください。'
            : 'このブラウザではカメラを利用できません。Safari または Chrome で開いてください。';
    }

    // getUserMedia が返したエラーの種類ごとに案内を変える
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

/**
 * バーコード読み取り画面（SP401）
 *
 * 設計書：③移動管理（スマホ）4.1
 *   移動…パレット番号表を複数読み、品目を移動候補に追加して移動登録（SP402）へ進む。
 *   読み取ったパレットは 1 件ずつカードにし、右上の削除でそのパレットだけ外せる。
 *   入庫…同じ番号の別画面。移動番号があるときだけロケ番を変えて移動完了にする。
 *   入庫は /SP401?kind=receive で開く。
 *   「品目検索」は在庫検索（SP403）、「移動依頼検索」は移動依頼（SP404）を開く。
 */
const SP401: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const { request } = useApiRequest();
    const [searchParams] = useSearchParams();
    /** 4.1 は移動と入庫で番号が同じため、クエリで切り替える */
    const kind = searchParams.get('kind') === 'receive' ? 'receive' : 'move';
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const scanningRef = useRef(false);
    const lastScanAtRef = useRef(0);
    const zxingRef = useRef<ZxingModule | null>(null);
    const readerRef = useRef<MultiFormatReader | null>(null);
    // 読み取り済みの番号。カメラは同じ番号を連続で返すため、追加済みは無視する
    const scannedNosRef = useRef<Set<string>>(new Set());
    // カメラが今向けている番号。同じ番号の連続通知を止める
    const lastCameraCodeRef = useRef('');
    // パレット番号と、それを読み取ったバーコードの対応（削除時に両方外す）
    const codeByPalletRef = useRef<Map<string, string>>(new Map());
    // 最初に読み取ったパレットの依存有無。2 枚目以降は同じ依存有無だけを許可する
    const dependentModeRef = useRef<boolean | null>(null);
    // 最初に読み取ったパレットの品目区分。製品と部品は混在できない
    const categoryModeRef = useRef<MoveCategory | null>(null);

    // 読み取り結果（バーコードの内容）
    const [scannedValue, setScannedValue] = useState('');
    // 読み取り結果から再生成したバーコードの SVG
    const [codeSvg, setCodeSvg] = useState('');
    // カメラ起動状態
    const [cameraOpen, setCameraOpen] = useState(false);
    // エラーメッセージ
    const [errorMessage, setErrorMessage] = useState('');
    // 読み取ったパレット（未知の番号は null）。入庫は 1 件だけ
    const [scannedPallet, setScannedPallet] = useState<ScannedPallet | null>(null);
    // 移動で読み取ったパレット（複数）。あとから削除できる
    const [scannedPallets, setScannedPallets] = useState<ScannedPallet[]>([]);
    // 移動候補（「追加」した品目）
    const [candidates, setCandidates] = useState<MoveLine[]>([]);
    // 読み取り結果で開いている移動依頼詳細。複数行を同時に開く
    const [openRequestIds, setOpenRequestIds] = useState<Set<string>>(() => new Set());
    // 入庫で変更できるロケ番
    const [inboundLocation, setInboundLocation] = useState('');
    // 入庫の移動完了を押したか
    const [inboundDone, setInboundDone] = useState(false);
    // TODO 削除: 開発完了後に消す。カメラの代わりにバーコードを手入力して同じ読取処理を通す
    const [testBarcode, setTestBarcode] = useState('');

    /**
     * カメラとスキャン処理を停止する
     */
    const stopCamera = () => {
        scanningRef.current = false;
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
        if (videoRef.current) {
            // 映像要素からもカメラのストリームを切り離す
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    /**
     * カメラを停止して画面を閉じる
     */
    const handleCloseCamera = () => {
        stopCamera();
        setCameraOpen(false);
    };

    /**
     * 読み取った番号を画面のバーコードへ描く
     */
    const showScannedCode = (trimmed: string) => {
        setErrorMessage('');
        setScannedValue(trimmed);
        // 読み取った内容を、印刷時と同じ規格（13 桁は EAN-13、それ以外は CODE128）で再描画する
        setCodeSvg(buildBarcodeSvg(trimmed));
    };

    /**
     * 移動の読取結果をパレット番号・在庫・移動依頼から組み立て、一覧へ追加する。
     * カメラは同じ番号を繰り返し返すため、追加済みの番号は足さない。
     */
    const loadMoveScan = useCallback(async (code: string, fromCamera = false) => {
        const trimmed = code.trim();
        if (!trimmed) return;
        if (fromCamera) {
            if (lastCameraCodeRef.current === trimmed) return;
            lastCameraCodeRef.current = trimmed;
            // 読取できた時点でカメラを閉じる。同じ番号の連続検出で画面に留まるのを防ぐ
            stopCamera();
            setCameraOpen(false);
        }
        if (scannedNosRef.current.has(trimmed)) {
            if (!fromCamera) notify('notify.pallet.already_scanned', { type: 'warning' });
            return;
        }
        scannedNosRef.current.add(trimmed);
        showScannedCode(trimmed);
        try {
            const result = await request('get', `api/pallet/scan/${encodeURIComponent(trimmed)}`, {}, {}, true, false);
            if (!result || result.code !== 200 || !result.data) {
                scannedNosRef.current.delete(trimmed);
                notify(result?.message || 'notify.pallet.not_found', { type: 'warning' });
                return;
            }
            const data = result.data as {
                palletNo?: string;
                dependent?: boolean;
                transferRequested?: boolean;
                warningMessage?: string | null;
                lines?: Array<{
                    id: string;
                    itemCode: string;
                    itemName: string;
                    category: string;
                    moveQty: number;
                    storageQty: number;
                    palletNo: string;
                    storagePlace: string;
                    version?: number;
                    request: MoveRequestDetail | null;
                }>;
            };
            if (data.warningMessage) {
                notify(data.warningMessage, { type: 'warning' });
            }
            const lines: MoveLine[] = (data.lines ?? []).map((line) => ({
                id: line.id,
                itemCode: line.itemCode,
                itemName: line.itemName ?? '',
                category: line.category === '1' ? '1' : '3',
                moveQty: Number(line.moveQty ?? line.storageQty ?? 0),
                storageQty: Number(line.storageQty ?? 0),
                palletNo: line.palletNo,
                storagePlace: line.storagePlace ?? '',
                request: line.request ?? null,
                version: line.version ?? null,
            }));
            if (!lines.length && !data.transferRequested) {
                scannedNosRef.current.delete(trimmed);
                const message = data.warningMessage || 'notify.pallet.stock_not_found';
                notify(message, { type: 'warning' });
                return;
            }
            const palletNo = data.palletNo || trimmed;
            if (scannedNosRef.current.has(palletNo) && palletNo !== trimmed) {
                scannedNosRef.current.delete(trimmed);
                if (!fromCamera) notify('notify.pallet.already_scanned', { type: 'warning' });
                return;
            }
            // 最初に読み取ったパレットと依存有無が違う場合は、混在させず読み取りを取り消す
            const dependent = Boolean(data.dependent);
            const dependentMode = dependentModeRef.current;
            if (dependentMode !== null && dependentMode !== dependent) {
                scannedNosRef.current.delete(trimmed);
                scannedNosRef.current.delete(palletNo);
                const message = 'notify.pallet.dependent_mix';
                notify(message, { type: 'warning' });
                return;
            }
            // 品目区分（製品・部品）が最初のパレットと違う場合も、混在させず読み取りを取り消す
            const category = lines[0]?.category;
            const categoryMode = categoryModeRef.current;
            if (category && categoryMode !== null && categoryMode !== category) {
                scannedNosRef.current.delete(trimmed);
                scannedNosRef.current.delete(palletNo);
                const message = 'notify.pallet.category_mix';
                notify(message, { type: 'warning' });
                return;
            }
            const pallet: ScannedPallet = {
                palletNo,
                dependent,
                lines,
                inbound: null,
            };
            dependentModeRef.current = dependent;
            if (category) {
                categoryModeRef.current = category;
            }
            scannedNosRef.current.add(palletNo);
            codeByPalletRef.current.set(palletNo, trimmed);
            setScannedPallets((prev) => (prev.some((item) => item.palletNo === palletNo) ? prev : [...prev, pallet]));
            const requestId = lines.find((line) => line.request)?.id;
            if (requestId) {
                setOpenRequestIds((current) => {
                    if (current.has(requestId)) return current;
                    const next = new Set(current);
                    next.add(requestId);
                    return next;
                });
            }
            setErrorMessage('');
        } catch {
            scannedNosRef.current.delete(trimmed);
            notify('notify.pallet.not_found', { type: 'warning' });
        }
    }, [notify, request]);

    /**
     * 読み取り結果を画面へ反映する。
     * バーコードを読めた時点でカメラ画面は閉じ、結果は一覧へ足す。
     */
    const applyScanResult = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        if (kind === 'receive') {
            stopCamera();
            setCameraOpen(false);
            showScannedCode(trimmed);
            const pallet = findScannedPallet(trimmed);
            setScannedPallet(pallet);
            setOpenRequestIds(new Set(pallet?.lines.filter((line) => line.request).map((line) => line.id) ?? []));
            setInboundLocation(pallet?.inbound?.destinationLoc || '');
            setInboundDone(false);
            return;
        }
        void loadMoveScan(trimmed, false);
    };

    /** 読み取ったパレットを一覧と移動候補から外す */
    const handleRemovePallet = (palletNo: string) => {
        const target = scannedPallets.find((pallet) => pallet.palletNo === palletNo);
        const lineIds = new Set(target?.lines.map((line) => line.id) ?? []);
        const remaining = scannedPallets.filter((pallet) => pallet.palletNo !== palletNo);
        // すべて外したら、次の読み取りで依存有無と品目区分を決め直せるようにする
        if (remaining.length === 0) {
            dependentModeRef.current = null;
            categoryModeRef.current = null;
        }
        setScannedPallets(remaining);
        setCandidates((prev) => prev.filter((line) => line.palletNo !== palletNo && !lineIds.has(line.id)));
        setOpenRequestIds((current) => {
            if (!Array.from(lineIds).some((id) => current.has(id))) return current;
            const next = new Set(current);
            lineIds.forEach((id) => next.delete(id));
            return next;
        });
        const code = codeByPalletRef.current.get(palletNo);
        codeByPalletRef.current.delete(palletNo);
        scannedNosRef.current.delete(palletNo);
        if (code) scannedNosRef.current.delete(code);
        if (lastCameraCodeRef.current === palletNo || lastCameraCodeRef.current === code) {
            lastCameraCodeRef.current = '';
        }
    };

    /**
     * TODO 削除: 開発完了後にこの関数と画面のテスト用入力を削除する。
     * 入力したバーコードを、カメラ読取と同じ applyScanResult に渡す。
     */
    const handleTestBarcodeSearch = () => {
        applyScanResult(testBarcode);
    };

    /** 読み取り結果の品目を移動候補へ追加する。製品と部品は混載できない */
    const handleAddScanned = (line: MoveLine) => {
        if (candidates.some((item) => item.id === line.id)) return;
        if (!canMixCategory(candidates, line.category)) {
            notify('notify.pallet.category_mix', { type: 'warning' });
            return;
        }
        setCandidates((prev) => [...prev, { ...line, request: line.request ? { ...line.request } : null }]);
    };

    /** 移動依頼詳細の開閉 */
    const toggleRequestDetail = (lineId: string) => {
        setOpenRequestIds((current) => {
            const next = new Set(current);
            if (next.has(lineId)) next.delete(lineId);
            else next.add(lineId);
            return next;
        });
    };

    /** 依存番号のリンクから、対応する品目の移動依頼詳細を開閉する */
    const toggleRequestByNo = (requestNo: string) => {
        const line = scannedPallets
            .flatMap((pallet) => pallet.lines)
            .find((item) => item.request?.requestNo === requestNo);
        if (line) toggleRequestDetail(line.id);
    };

    /**
     * canvas に描かれた画像から一次元コードを解析する
     */
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

        // ZXing には 1 画素 1 バイトの輝度データを渡す（緑を重視した係数）
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
            // 見つからない場合（NotFoundException）は次のコマで再挑戦する
            return '';
        }
    };

    /**
     * 現在の映像から 1 回だけ読み取りを試す
     *
     * 1 回目は画面全体を縮小して解析し、読めなかった場合は
     * ガイド枠の範囲を等倍で解析し直す（バーコードが小さい場合に効く）。
     */
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

        // 1 回目：画面全体
        const fullScale = Math.min(1, MAX_DECODE_WIDTH / videoWidth);
        canvas.width = Math.max(1, Math.round(videoWidth * fullScale));
        canvas.height = Math.max(1, Math.round(videoHeight * fullScale));
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const fullResult = decodeCanvas(zxing, reader, canvas, context);
        if (fullResult) return fullResult;

        // 2 回目：ガイド枠の範囲（中央）を等倍で
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

    /**
     * カメラ映像を繰り返し走査してバーコードを検出する
     */
    const scanFrame = () => {
        if (!scanningRef.current) return;
        frameRef.current = requestAnimationFrame(scanFrame);

        const now = Date.now();
        if (now - lastScanAtRef.current < SCAN_INTERVAL_MS) return;
        lastScanAtRef.current = now;

        const value = scanOnce();
        if (!value) return;
        if (kind === 'move') {
            void loadMoveScan(value, true);
            return;
        }
        applyScanResult(value);
    };

    // カメラ起動・停止の制御
    useEffect(() => {
        if (!cameraOpen) return;
        let cancelled = false;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                // カメラが使えない環境では真っ黒な画面を出さず、理由を画面に残す
                setErrorMessage(getCameraErrorMessage());
                setCameraOpen(false);
                return;
            }

            // 読み取りライブラリを先に用意する（読み込めない場合はカメラを開かない）
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
            // パレット番号表は CODE128 か EAN-13。周辺の規格も一応読めるようにする
            hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [
                zxing.BarcodeFormat.CODE_128,
                zxing.BarcodeFormat.EAN_13,
                zxing.BarcodeFormat.CODE_39,
                zxing.BarcodeFormat.ITF,
                zxing.BarcodeFormat.EAN_8,
            ]);
            // 精度優先（横持ちでなくても読めるよう 90 度回転も試す）
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
                        // iOS では自動再生が拒否されることがあるが、
                        // autoPlay 属性とユーザー操作後の再開で再生できるため停止しない
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
        // カメラ起動状態が変わったときだけ実行する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraOpen]);

    // 画面終了時にカメラを解放する
    useEffect(() => {
        return () => stopCamera();
    }, []);

    // 画面が非表示になったとき・ページを離れるときはカメラを停止する
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

    /**
     * 読み取り開始
     */
    const handleStartScan = () => {
        setErrorMessage('');
        setCameraOpen(true);
    };

    /**
     * 内容を確認：追加した品目で新しいパレットを作る移動登録へ進む
     */
    const handleConfirm = () => {
        // 追加品目があるときだけ内容確認へ進める。無い場合は通知で知らせる
        if (candidates.length === 0) {
            notify('notify.transfer.add_candidates', { type: 'warning' });
            return;
        }
        setErrorMessage('');
        const dependent = scannedPallets.length === 1
            ? scannedPallets[0].dependent
            : candidates.some((line) => line.request);
        navigate('/SP402', {
            state: {
                view: 'register',
                dependent,
                // 内容確認からはパレット番号を引き継がない
                palletNo: '',
                lines: candidates,
                // 内容確定からは数量を編集可
                readOnlyQty: false,
            },
        });
    };

    /** パレット番号を発番せず、読み取ったパレットをそのまま移動する */
    const handleMoveWholePallet = () => {
        if (scannedPallets.length === 0) {
            setErrorMessage('パレットの読み取り結果がありません。');
            return;
        }
        setErrorMessage('');
        const only = scannedPallets.length === 1 ? scannedPallets[0] : null;
        const lines = scannedPallets.flatMap((pallet) => pallet.lines);
        navigate('/SP402', {
            state: {
                view: 'register',
                dependent: only ? only.dependent : lines.some((line) => line.request),
                palletNo: only && !only.dependent ? only.palletNo : '',
                lines,
                // パレット毎移動するからは数量を編集禁止
                readOnlyQty: true,
            },
        });
    };

    /** 入庫：ロケ番を確定し、移動完了にする（画面内だけで状態を変える） */
    const handleReceiveComplete = () => {
        if (!scannedPallet?.inbound) {
            setErrorMessage('移動登録情報を確認できません。');
            return;
        }
        if (!inboundLocation) {
            setErrorMessage('ロケ番を選択してください。');
            return;
        }
        setErrorMessage('');
        setInboundDone(true);
        notify('notify.transfer.move_completed', { type: 'success' });
    };

    // カメラが使えない確認用。?pallet=番号 で読み取り後の画面を開く
    const palletQuery = searchParams.get('pallet');
    useEffect(() => {
        if (!palletQuery) return;
        if (kind === 'receive') {
            setScannedValue(palletQuery);
            setCodeSvg(buildBarcodeSvg(palletQuery));
            const pallet = findScannedPallet(palletQuery);
            setScannedPallet(pallet);
            setOpenRequestIds(new Set(pallet?.lines.filter((line) => line.request).map((line) => line.id) ?? []));
            setInboundLocation(pallet?.inbound?.destinationLoc || '');
            setInboundDone(false);
            return;
        }
        void loadMoveScan(palletQuery);
    }, [palletQuery, kind, loadMoveScan]);

    const addedIds = new Set(candidates.map((line) => line.id));
    // 読み取ったパレットの依存番号（重複なし）。追加品目の下にリンクで出す
    const dependencyNumbers = Array.from(
        new Set(
            scannedPallets
                .flatMap((pallet) => pallet.lines)
                .map((line) => line.request?.requestNo)
                .filter((no): no is string => Boolean(no))
        )
    );

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
                {/* サブタイトル */}
                <Box sx={{ padding: '12px 14px 10px', fontSize: 'clamp(13px, 3.6vw, 15px)', color: '#212121' }}>
                    バーコード読み取り
                </Box>

                {/* 読み取り領域 */}
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
                                // 印刷時と同じ SVG をそのまま表示する
                                dangerouslySetInnerHTML={{ __html: codeSvg }}
                                sx={{ width: '100%', height: '100%', '& svg': { width: '100%', height: '100%', display: 'block' } }}
                                aria-label="読み取り結果のバーコード"
                            />
                        ) : (
                            // 読み取り前のバーコードイメージ
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

                    <button
                        type="button"
                        onClick={handleStartScan}
                        style={{
                            width: '100%',
                            height: '48px',
                            border: 'none',
                            borderRadius: '5px',
                            backgroundColor: 'var(--mui-page-header-color)',
                            color: 'white',
                            fontSize: 'clamp(14px, 4vw, 17px)',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        バーコードを読み取る
                    </button>
                </Box>

                {/* 別画面へのリンク（画面イメージは移動依頼検索と品目検索） */}
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
                    <Box
                        component="span"
                        onClick={() => navigate('/SP404')}
                        sx={linkSx}
                    >
                        移動依頼検索
                    </Box>
                    <Box component="span" onClick={() => navigate('/SP403')} sx={linkSx}>
                        品目検索
                    </Box>
                </Box>

                {kind === 'move' ? (
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
                                    backgroundColor: 'var(--mui-page-header-color)',
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
                ) : null}

                {kind === 'move' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 14px 6px' }}>
                        <div style={spSquareReadonlyStyle}>{`追加品目（${candidates.length}件）`}</div>
                        {/* 依存のあるパレットを読み取った場合は、その依存番号をリンクで出す */}
                        {dependencyNumbers.map((requestNo) => (
                            <div key={requestNo} style={dependencyRowStyle}>
                                <span style={dependencyLabelStyle}>依存番号</span>
                                <span style={dependencyLinkStyle} onClick={() => toggleRequestByNo(requestNo)}>
                                    {requestNo}
                                </span>
                            </div>
                        ))}
                    </Box>
                ) : null}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px' }}>
                    <Box component="span" sx={spSx.sectionTitle}>
                        ■読み取り結果
                    </Box>
                    {kind === 'receive' ? (
                        <ReceiveResult
                            scannedValue={scannedValue}
                            pallet={scannedPallet}
                            location={inboundLocation}
                            done={inboundDone}
                            onLocationChange={setInboundLocation}
                        />
                    ) : scannedPallets.length > 0 ? (
                        scannedPallets.map((pallet) => (
                            <div key={pallet.palletNo} style={spSx.listCard}>
                                <div style={palletHeaderStyle}>
                                    <div style={palletNumberStyle}>
                                        <Field label="パレット番号" valueStyle={palletNumberValueStyle}>
                                            {pallet.palletNo}
                                        </Field>
                                    </div>
                                    <button
                                        type="button"
                                        style={palletDeleteStyle}
                                        onClick={() => handleRemovePallet(pallet.palletNo)}
                                    >
                                        削除
                                    </button>
                                </div>
                                {pallet.lines.map((line) => (
                                    <div key={`${pallet.palletNo}-${line.id}`} style={palletLineStyle}>
                                        <Field label="品目コード">{line.itemCode}</Field>
                                        <Field label="品目名">{line.itemName}</Field>
                                        {line.request ? (
                                            <Field label="移動数量/保管数量">{`${line.moveQty} / ${line.storageQty}`}</Field>
                                        ) : (
                                            <Field label="保管数量">{line.storageQty}</Field>
                                        )}
                                        {line.request ? (
                                            <RequestDetail
                                                line={line}
                                                open={openRequestIds.has(line.id)}
                                                onToggle={() => toggleRequestDetail(line.id)}
                                            />
                                        ) : null}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            {addedIds.has(line.id) ? (
                                                <span style={{ ...spSx.link, color: '#9e9e9e', cursor: 'default' }}>
                                                    追加済
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    style={spSx.smallButton}
                                                    onClick={() => handleAddScanned(line)}
                                                >
                                                    追加
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    ) : scannedValue ? (
                        <div style={spSx.empty}>該当するパレットが見つかりません。</div>
                    ) : null}
                    {errorMessage ? (
                        <Box sx={{ color: '#d32f2f', fontSize: '12px' }}>{errorMessage}</Box>
                    ) : null}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px 18px' }}>
                    <Box sx={{ display: 'flex', gap: '14px' }}>
                        <button type="button" style={spSx.actionBackButton} onClick={() => navigate(-1)}>
                            戻る
                        </button>
                        {kind === 'receive' ? (
                            <button
                                type="button"
                                style={primaryButtonStyle}
                                onClick={handleReceiveComplete}
                                disabled={inboundDone}
                            >
                                移動完了
                            </button>
                        ) : (
                            <button
                                type="button"
                                style={
                                    candidates.length === 0
                                        ? { ...primaryButtonStyle, ...spSx.buttonDisabled }
                                        : primaryButtonStyle
                                }
                                onClick={handleConfirm}
                                disabled={candidates.length === 0}
                            >
                                内容を確認
                            </button>
                        )}
                    </Box>
                    {kind === 'move' && scannedPallets.length > 0 ? (
                        <button
                            type="button"
                            style={{ ...primaryButtonStyle, flex: 'none', width: '100%', maxWidth: 'none' }}
                            onClick={handleMoveWholePallet}
                        >
                            パレット毎移動する
                        </button>
                    ) : null}
                </Box>
            </Box>

            {/* カメラ読み取りモーダル */}
            {cameraOpen ? (
                <Box
                    sx={{
                        position: 'fixed',
                        // ブラウザの下部ツールバーまで覆わないよう、--app-vh（dvh）で高さを決める
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
                            バーコード読み取り(移動)
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
                        {/* 読み取りガイド枠（バーコードは横長のため、横に広い枠にする） */}
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
                            {/* 中央の狙い線 */}
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

const linkSx = {
    color: 'var(--mui-page-header-color)',
    fontSize: 'clamp(12px, 3.4vw, 14px)',
    textDecoration: 'underline',
    cursor: 'pointer',
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

/** パレット番号は太字・黒で目立たせる */
const palletNumberValueStyle: React.CSSProperties = {
    fontWeight: 700,
    color: '#000000',
};

/** 依存番号の行（追加ボタンの下） */
const dependencyRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: '6px',
};

const dependencyLabelStyle: React.CSSProperties = {
    color: '#5f5f5f',
    fontSize: '12px',
};

/** 依存番号のリンク */
const dependencyLinkStyle: React.CSSProperties = {
    ...spSx.cardLink,
    paddingLeft: 0,
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

const palletLineStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid #e0e0e0',
    paddingTop: '8px',
};

const primaryButtonStyle: React.CSSProperties = {
    ...spSx.actionBackButton,
    backgroundColor: 'var(--mui-page-header-color)',
};

/** カード内の項目名と値。valueStyle で値だけ見た目を変えられる */
const Field: React.FC<{ label: string; children: React.ReactNode; valueStyle?: React.CSSProperties }> = ({
    label,
    children,
    valueStyle,
}) => (
    <div style={spSx.field}>
        <span style={spSx.fieldLabel}>{label}</span>
        <span style={{ ...spSx.fieldValue, ...valueStyle }}>{children}</span>
    </div>
);

/** 移動依頼がある品目の折りたたみ */
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

/** 入庫の読み取り結果。移動番号があるときだけロケ番を変えられる */
const ReceiveResult: React.FC<{
    scannedValue: string;
    pallet: ScannedPallet | null;
    location: string;
    done: boolean;
    onLocationChange: (value: string) => void;
}> = ({ scannedValue, pallet, location, done, onLocationChange }) => {
    const { request } = useApiRequest();
    const [locationOptions, setLocationOptions] = useState<Array<{ key: string; value: string }>>([]);

    // 移動先（行田工場）のロケ番を共通 API から取得する
    useEffect(() => {
        if (!pallet?.inbound) {
            setLocationOptions([]);
            return;
        }
        const loadLocations = async () => {
            const result = await request('get', 'api/common/10/location/options', {}, {}, false, false);
            setLocationOptions(Array.isArray(result?.data) ? result.data : []);
        };
        loadLocations();
    }, [pallet, request]);

    if (!scannedValue) return null;
    if (!pallet?.inbound) {
        return <div style={spSx.empty}>移動登録情報を確認できません。</div>;
    }
    const inbound = pallet.inbound;
    return (
        <div style={spSx.listCard}>
            <Field label="移動番号">{inbound.moveNo}</Field>
            <Field label="パレット番号">{pallet.palletNo}</Field>
            <SimpleForm
                toolbar={false}
                sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                onSubmit={() => undefined}
                defaultValues={{ destinationLoc: location || inbound.destinationLoc }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <FormInput
                        type={'text'}
                        source="destinationWh"
                        label="移動先"
                        structure="top-bottom"
                        sx={spFormInputSx}
                        defaultValue="行田工場"
                        disabled
                    />
                    <FormInput
                        type={'filter-select'}
                        source="destinationLoc"
                        label="ロケ番"
                        structure="top-bottom"
                        sx={spFormInputSx}
                        choices={locationOptions}
                        disabled={done}
                        onChange={(value) => onLocationChange(normalizeChoiceValue(value))}
                    />
                    <FormInput
                        type={'text'}
                        source="remark"
                        label="備考"
                        structure="top-bottom"
                        sx={spFormInputSx}
                        defaultValue={inbound.remark}
                        disabled
                    />
                </div>
            </SimpleForm>
            <Field label="移動登録者">{inbound.registrar}</Field>
            {done ? <Field label="移動状況">移動完了</Field> : null}
            {pallet.lines.map((line) => (
                <div key={line.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <Field label="品目コード">{line.itemCode}</Field>
                    <Field label="品目名">{line.itemName}</Field>
                    <Field label={line.request ? '移動数量' : '保管数量'}>
                        {line.request ? line.moveQty : line.storageQty}
                    </Field>
                </div>
            ))}
        </div>
    );
};

export default SP401;