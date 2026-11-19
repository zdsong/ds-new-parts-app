import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SimpleForm, useNotify } from 'react-admin';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DecodeHintType, MultiFormatReader } from '@zxing/library';

import FormInput from '../compontent/FormInput';
import { spFormInputSx, spSx } from '../styles/spSx';
import { normalizeChoiceValue } from '../utils/palletData';
import { buildBarcodeSvg } from '../utils/palletNumberSheet';
import { MOVE_LOCATION_CHOICES, findScannedPallet } from '../utils/moveData';
import type { ScannedPallet } from '../utils/moveData';

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

const linkSx = {
    color: '#0b5cab',
    fontSize: 'clamp(12px, 3.4vw, 14px)',
    textDecoration: 'underline',
    cursor: 'pointer',
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

/**
 * 入庫の読み取り結果。
 * 移動番号があるときだけロケ番を変えられる。無いときは確認できない旨を出す。
 */
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
                        multiline
                        inputHeight={80}
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

/**
 * パレット受取のバーコード読み取り画面（SP406）
 *
 * 設計書：③移動管理 2. パレットを受け取る場合（移動先）
 *   パレット番号表を読み、移動番号があるときだけロケ番を変えて移動完了にする。
 *   カメラが使えない確認は /SP406?pallet=B261010-001（移動あり）
 *   または /SP406?pallet=B261010-002（移動登録情報なし）。
 */
const SP406: React.FC = () => {
    const navigate = useNavigate();
    const notify = useNotify();
    const [searchParams] = useSearchParams();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const scanningRef = useRef(false);
    const lastScanAtRef = useRef(0);
    const zxingRef = useRef<ZxingModule | null>(null);
    const readerRef = useRef<MultiFormatReader | null>(null);

    const [scannedValue, setScannedValue] = useState('');
    const [codeSvg, setCodeSvg] = useState('');
    const [cameraOpen, setCameraOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [scannedPallet, setScannedPallet] = useState<ScannedPallet | null>(null);
    const [inboundLocation, setInboundLocation] = useState('');
    const [inboundDone, setInboundDone] = useState(false);

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

    const applyScanResult = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return;
        stopCamera();
        setCameraOpen(false);
        setErrorMessage('');
        setScannedValue(trimmed);
        setCodeSvg(buildBarcodeSvg(trimmed));
        const pallet = findScannedPallet(trimmed);
        setScannedPallet(pallet);
        setInboundLocation(pallet?.inbound?.destinationLoc || '');
        setInboundDone(false);
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
        if (value) applyScanResult(value);
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

    /** ロケ番を確定し、移動完了にする（画面内だけで状態を変える） */
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

    // カメラが使えない確認用
    const palletQuery = searchParams.get('pallet');
    useEffect(() => {
        if (!palletQuery) return;
        setScannedValue(palletQuery);
        setCodeSvg(buildBarcodeSvg(palletQuery));
        const pallet = findScannedPallet(palletQuery);
        setScannedPallet(pallet);
        setInboundLocation(pallet?.inbound?.destinationLoc || '');
        setInboundDone(false);
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

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 14px' }}>
                    <Box component="span" sx={spSx.sectionTitle}>
                        ■読み取り結果
                    </Box>
                    <ReceiveResult
                        scannedValue={scannedValue}
                        pallet={scannedPallet}
                        location={inboundLocation}
                        done={inboundDone}
                        onLocationChange={setInboundLocation}
                    />
                    {errorMessage ? (
                        <Box sx={{ color: '#d32f2f', fontSize: '12px' }}>{errorMessage}</Box>
                    ) : null}
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
