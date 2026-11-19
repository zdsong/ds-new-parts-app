import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DecodeHintType, MultiFormatReader } from '@zxing/library';

import FormInput from '../compontent/FormInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';
import { buildBarcodeSvg } from '../utils/palletNumberSheet';
import {
    MOVE_ITEM_MASTER,
    MOVE_LOCATION_CHOICES,
    canMixCategory,
    findScannedPallet,
    lineFromMaster,
} from '../utils/moveData';
import type { MoveItemMaster, MoveLine, ScannedPallet } from '../utils/moveData';

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
 *   移動…パレット番号表を読み、品目を移動候補に追加して移動登録（SP402）へ進む。
 *   入庫…同じ番号の別画面。移動番号があるときだけロケ番を変えて移動完了にする。
 *   入庫は /SP401?kind=receive で開く。
 *   「品目検索」は別ルートを持たないため、この画面の中で切り替える。
 */
const SP401: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
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

    // 読み取り結果（バーコードの内容）
    const [scannedValue, setScannedValue] = useState('');
    // 読み取り結果から再生成したバーコードの SVG
    const [codeSvg, setCodeSvg] = useState('');
    // カメラ起動状態
    const [cameraOpen, setCameraOpen] = useState(false);
    // エラーメッセージ
    const [errorMessage, setErrorMessage] = useState('');
    // 読み取ったパレット（未知の番号は null）
    const [scannedPallet, setScannedPallet] = useState<ScannedPallet | null>(null);
    // 移動候補（「追加」した品目）
    const [candidates, setCandidates] = useState<MoveLine[]>([]);
    // 品目検索を開いているか
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    // 読み取り結果の移動依頼詳細を開いている行
    const [openRequestId, setOpenRequestId] = useState<string | null>(null);
    // 入庫で変更できるロケ番
    const [inboundLocation, setInboundLocation] = useState('');
    // 入庫の移動完了を押したか
    const [inboundDone, setInboundDone] = useState(false);

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
     * 読み取り結果を画面へ反映する
     */
    const applyScanResult = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        stopCamera();
        setCameraOpen(false);
        setErrorMessage('');
        setScannedValue(trimmed);
        // 読み取った内容を、印刷時と同じ規格（13 桁は EAN-13、それ以外は CODE128）で再描画する
        setCodeSvg(buildBarcodeSvg(trimmed));
        const pallet = findScannedPallet(trimmed);
        setScannedPallet(pallet);
        setOpenRequestId(pallet?.lines.find((line) => line.request)?.id ?? null);
        setInboundLocation(pallet?.inbound?.destinationLoc || '');
        setInboundDone(false);
    };

    /** 読み取り結果の品目を移動候補へ追加する。製品と部品は混載できない */
    const handleAddScanned = (line: MoveLine) => {
        if (candidates.some((item) => item.id === line.id)) return;
        if (!canMixCategory(candidates, line.category)) {
            notify('製品と部品は混載できません。', { type: 'warning' });
            return;
        }
        setCandidates((prev) => [...prev, { ...line, request: line.request ? { ...line.request } : null }]);
    };

    /** 品目検索で選んだ品目を移動候補へ追加する */
    const handleAddMaster = (item: MoveItemMaster, quantity: number) => {
        if (!canMixCategory(candidates, item.category)) {
            notify('製品と部品は混載できません。', { type: 'warning' });
            return;
        }
        if (candidates.some((line) => line.itemCode === item.itemCode)) {
            notify('追加済みの品目です。', { type: 'warning' });
            return;
        }
        setCandidates((prev) => [...prev, lineFromMaster(item, quantity)]);
        setItemSearchOpen(false);
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
        if (value) applyScanResult(value);
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
        if (candidates.length === 0) {
            setErrorMessage('移動候補の品目を追加してください。');
            return;
        }
        setErrorMessage('');
        navigate('/SP402', {
            state: {
                view: 'register',
                mode: 'issue',
                palletNo: '',
                lines: candidates,
            },
        });
    };

    /** パレット番号を発番せず、読み取ったパレットをそのまま移動する */
    const handleMoveWholePallet = () => {
        if (!scannedPallet) {
            setErrorMessage('パレットの読み取り結果がありません。');
            return;
        }
        setErrorMessage('');
        navigate('/SP402', {
            state: {
                view: 'register',
                mode: 'whole',
                palletNo: scannedPallet.palletNo,
                lines: scannedPallet.lines,
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
        notify('移動完了にしました。', { type: 'success' });
    };

    // カメラが使えない確認用。?pallet=B261010-001 で読み取り後の画面を開く
    const palletQuery = searchParams.get('pallet');
    useEffect(() => {
        if (!palletQuery) return;
        setScannedValue(palletQuery);
        setCodeSvg(buildBarcodeSvg(palletQuery));
        const pallet = findScannedPallet(palletQuery);
        setScannedPallet(pallet);
        setOpenRequestId(pallet?.lines.find((line) => line.request)?.id ?? null);
        setInboundLocation(pallet?.inbound?.destinationLoc || '');
        setInboundDone(false);
    }, [palletQuery]);

    if (itemSearchOpen) {
        return (
            <ItemSearchPanel
                selectedCodes={candidates.map((line) => line.itemCode)}
                onAdd={handleAddMaster}
                onBack={() => setItemSearchOpen(false)}
            />
        );
    }

    const addedIds = new Set(candidates.map((line) => line.id));

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
                            backgroundColor: '#0b5cab',
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
                        onClick={() => navigate('/SP402', { state: { view: 'search' } })}
                        sx={linkSx}
                    >
                        移動依頼検索
                    </Box>
                    {kind === 'move' ? (
                        <Box component="span" onClick={() => setItemSearchOpen(true)} sx={linkSx}>
                            品目検索
                        </Box>
                    ) : (
                        <Box component="span" onClick={() => navigate('/SP403')} sx={linkSx}>
                            在庫検索
                        </Box>
                    )}
                </Box>

                {kind === 'move' ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px 6px' }}>
                        <select
                            aria-label="追加品目"
                            value=""
                            style={selectStyle}
                            onChange={() => undefined}
                        >
                            <option value="">{`追加品目（${candidates.length}件）`}</option>
                            {candidates.map((line) => (
                                <option key={line.id} value={line.id}>
                                    {line.itemCode}
                                </option>
                            ))}
                        </select>
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
                    ) : scannedPallet ? (
                        <>
                            <div style={spSx.listCard}>
                                <Field label="パレット番号">{scannedPallet.palletNo}</Field>
                            </div>
                            {scannedPallet.lines.map((line) => (
                                <div key={line.id} style={spSx.listCard}>
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
                                            open={openRequestId === line.id}
                                            onToggle={() =>
                                                setOpenRequestId((current) =>
                                                    current === line.id ? null : line.id
                                                )
                                            }
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
                        </>
                    ) : scannedValue ? (
                        <div style={spSx.empty}>該当するパレットが見つかりません。</div>
                    ) : null}
                    {errorMessage ? (
                        <Box sx={{ color: '#d32f2f', fontSize: '12px' }}>{errorMessage}</Box>
                    ) : null}
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px 14px 18px' }}>
                    <Box sx={{ display: 'flex', gap: '14px' }}>
                        <button type="button" style={backButtonStyle} onClick={() => navigate(-1)}>
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
                            <button type="button" style={primaryButtonStyle} onClick={handleConfirm}>
                                内容を確認
                            </button>
                        )}
                    </Box>
                    {kind === 'move' && scannedPallet ? (
                        <button type="button" style={{ ...primaryButtonStyle, maxWidth: 'none' }} onClick={handleMoveWholePallet}>
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
    color: '#0b5cab',
    fontSize: 'clamp(12px, 3.4vw, 14px)',
    textDecoration: 'underline',
    cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
    width: '70%',
    maxWidth: '320px',
    height: '36px',
    border: '1px solid #9e9e9e',
    borderRadius: '1px',
    backgroundColor: 'white',
    color: '#212121',
    fontSize: 'clamp(12px, 3.4vw, 14px)',
    padding: '0 8px',
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
                        choices={MOVE_LOCATION_CHOICES.gyoda}
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

/** 品目検索（4.1 の画面内。遷移図に単独の番号が無い） */
const ItemSearchPanel: React.FC<{
    selectedCodes: string[];
    onAdd: (item: MoveItemMaster, quantity: number) => void;
    onBack: () => void;
}> = ({ selectedCodes, onAdd, onBack }) => {
    const [keyword, setKeyword] = useState({ itemCode: '', itemName: '' });
    const [formKey, setFormKey] = useState(0);
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    const results = MOVE_ITEM_MASTER.filter((item) => {
        if (keyword.itemCode && !item.itemCode.includes(keyword.itemCode.trim())) return false;
        if (keyword.itemName && !item.itemName.includes(keyword.itemName.trim())) return false;
        return true;
    });

    return (
        <Box sx={spSx.page}>
            <Box sx={spSx.titleBar}>
                <label style={spSx.title}>品目検索</label>
            </Box>
            <Box sx={spSx.sectionTitle}>■検索条件</Box>
            <Box sx={spSx.card}>
                <SimpleForm
                    key={formKey}
                    toolbar={false}
                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                    onSubmit={(values: { itemCode?: string; itemName?: string }) => {
                        setKeyword({
                            itemCode: values?.itemCode || '',
                            itemName: values?.itemName || '',
                        });
                    }}
                    defaultValues={keyword}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <FormInput
                            type={'text'}
                            source="itemCode"
                            label="品目コード"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                        <FormInput
                            type={'text'}
                            source="itemName"
                            label="品目名"
                            structure="top-bottom"
                            sx={spFormInputSx}
                            placeholder="入力してください"
                        />
                        <div style={spSx.buttonBar}>
                            <button
                                style={spSx.secondaryButton}
                                type="button"
                                onClick={() => {
                                    setKeyword({ itemCode: '', itemName: '' });
                                    setFormKey((key) => key + 1);
                                }}
                            >
                                クリア
                            </button>
                            <button style={spSx.primaryButton} type="submit">
                                検索
                            </button>
                        </div>
                    </div>
                </SimpleForm>
            </Box>
            <Box sx={spSx.sectionTitle}>{`■検索結果：${results.length}件`}</Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {results.length === 0 ? (
                    <div style={spSx.empty}>該当する品目がありません。</div>
                ) : (
                    results.map((item) => {
                        const added = selectedCodes.includes(item.itemCode);
                        const quantity = quantities[item.itemCode] ?? item.storageQty;
                        return (
                            <div key={item.itemCode} style={spSx.listCard}>
                                <Field label="品目コード">{item.itemCode}</Field>
                                <Field label="品目名">{item.itemName}</Field>
                                <Field label="保管数量">{item.storageQty}</Field>
                                <SimpleForm
                                    toolbar={false}
                                    sx={{ width: '100%', padding: '0', paddingBottom: '0 !important' }}
                                    onSubmit={() => undefined}
                                    defaultValues={{ quantity }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={spSx.fieldLabel}>移動数量</span>
                                        <FormInput
                                            type={'number'}
                                            source="quantity"
                                            label={false}
                                            structure="top-bottom"
                                            sx={spFormInputSx}
                                            disabled={added}
                                            onChange={(value) => {
                                                const next = Math.max(1, Math.floor(Number(value) || 1));
                                                setQuantities((prev) => ({ ...prev, [item.itemCode]: next }));
                                            }}
                                        />
                                        {added ? (
                                            <span style={{ ...spSx.link, color: '#9e9e9e', cursor: 'default' }}>
                                                追加済
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                style={spSx.smallButton}
                                                onClick={() => onAdd(item, quantity)}
                                            >
                                                追加
                                            </button>
                                        )}
                                    </div>
                                </SimpleForm>
                            </div>
                        );
                    })
                )}
            </Box>
            <Box sx={spSx.bottomActionBar}>
                <Box component="button" type="button" sx={spSx.backButton} onClick={onBack}>
                    戻る
                </Box>
            </Box>
        </Box>
    );
};

export default SP401;
