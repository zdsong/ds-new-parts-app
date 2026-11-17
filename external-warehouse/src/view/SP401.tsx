import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import QRCode from 'qrcode';

/**
 * バーコード読み取り（移動）画面（SP401）
 *
 * スマートフォンでの利用を前提とした画面。
 * 「バーコードを読み取る」ボタンからカメラを起動し、
 * 読み取った二次元コードの内容を画面のコード領域へ再表示する。
 */
const SP401: React.FC = () => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const frameRef = useRef<number | null>(null);
    const scanningRef = useRef(false);

    // 読み取り結果（二次元コードの内容）
    const [scannedValue, setScannedValue] = useState('');
    // 読み取り結果から生成した二次元コード画像
    const [codeImage, setCodeImage] = useState('');
    // カメラ起動状態
    const [cameraOpen, setCameraOpen] = useState(false);
    // エラーメッセージ
    const [errorMessage, setErrorMessage] = useState('');

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
    const applyScanResult = async (value: string) => {
        stopCamera();
        setCameraOpen(false);
        setErrorMessage('');
        setScannedValue(value);
        try {
            // 読み取った内容を二次元コードとして再生成する
            const image = await QRCode.toDataURL(value, {
                width: 512,
                margin: 1,
                errorCorrectionLevel: 'M',
            });
            setCodeImage(image);
        } catch {
            setCodeImage('');
            setErrorMessage('二次元コードの生成に失敗しました。');
        }
    };

    /**
     * カメラ映像を走査して二次元コードを検出する
     */
    const scanFrame = () => {
        if (!scanningRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const result = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });
                if (result && result.data) {
                    applyScanResult(result.data);
                    return;
                }
            }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
    };

    // カメラ起動・停止の制御
    useEffect(() => {
        if (!cameraOpen) return;
        let cancelled = false;

        const startCamera = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setErrorMessage('この端末ではカメラを利用できません。HTTPS で接続してください。');
                return;
            }
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
                    await videoRef.current.play();
                    scanningRef.current = true;
                    scanFrame();
                }
            } catch {
                if (!cancelled) {
                    setErrorMessage('カメラを起動できませんでした。カメラの使用を許可してください。');
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
     * 内容確認
     */
    const handleConfirm = () => {
        if (!scannedValue) {
            setErrorMessage('読み取り結果がありません。バーコードを読み取ってください。');
            return;
        }
        setErrorMessage('');
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    maxWidth: '520px',
                    minHeight: 'calc(100vh - 140px)',
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
                        {codeImage ? (
                            <Box
                                component="img"
                                src={codeImage}
                                alt="読み取り結果の二次元コード"
                                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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

                {/* 検索リンク */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        backgroundColor: '#f7f7f7',
                    }}
                >
                    <Box
                        component="span"
                        onClick={() => navigate('/P403')}
                        sx={{
                            color: '#0b5cab',
                            fontSize: 'clamp(12px, 3.4vw, 14px)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                        }}
                    >
                        移動依頼検索
                    </Box>
                    <Box
                        component="span"
                        onClick={() => navigate('/P303')}
                        sx={{
                            color: '#0b5cab',
                            fontSize: 'clamp(12px, 3.4vw, 14px)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                        }}
                    >
                        品目検索
                    </Box>
                </Box>

                {/* 追加品目 */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 14px 6px' }}>
                    <select
                        aria-label="追加品目"
                        style={{
                            width: '70%',
                            maxWidth: '320px',
                            height: '36px',
                            border: '1px solid #9e9e9e',
                            borderRadius: '1px',
                            backgroundColor: 'white',
                            color: '#212121',
                            fontSize: 'clamp(12px, 3.4vw, 14px)',
                            padding: '0 8px',
                        }}
                    >
                        <option>追加品目（0件）</option>
                    </select>
                </Box>

                {/* 読み取り結果 */}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '10px 14px' }}>
                    <Box component="span" sx={{ fontSize: 'clamp(12px, 3.4vw, 14px)', color: '#212121' }}>
                        ■読み取り結果
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            minHeight: '120px',
                            marginTop: '10px',
                            padding: scannedValue ? '10px' : 0,
                            border: scannedValue ? '1px solid #d0d0d0' : 'none',
                            borderRadius: '5px',
                            backgroundColor: scannedValue ? '#fafafa' : 'transparent',
                            fontSize: 'clamp(12px, 3.4vw, 14px)',
                            color: '#212121',
                            wordBreak: 'break-all',
                        }}
                    >
                        {scannedValue}
                    </Box>
                    {errorMessage ? (
                        <Box sx={{ marginTop: '8px', color: '#d32f2f', fontSize: '12px' }}>{errorMessage}</Box>
                    ) : null}
                </Box>

                {/* 下部ボタン */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '12px 14px 18px',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        style={{
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
                        }}
                    >
                        戻る
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        style={{
                            flex: 1,
                            maxWidth: '180px',
                            height: '46px',
                            border: 'none',
                            borderRadius: '5px',
                            backgroundColor: '#0b5cab',
                            color: 'white',
                            fontSize: 'clamp(14px, 4vw, 17px)',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        内容を確認
                    </button>
                </Box>
            </Box>

            {/* カメラ読み取りモーダル */}
            {cameraOpen ? (
                <Box
                    sx={{
                        position: 'fixed',
                        inset: 0,
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
                        {/* 読み取りガイド枠 */}
                        <Box
                            sx={{
                                position: 'absolute',
                                width: '70%',
                                aspectRatio: '1 / 1',
                                maxWidth: '320px',
                                maxHeight: '320px',
                                border: '3px solid white',
                                borderRadius: '8px',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                                pointerEvents: 'none',
                            }}
                        />
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </Box>
                    <Box sx={{ padding: '14px', color: 'white', textAlign: 'center', fontSize: '13px' }}>
                        枠内に二次元コードを合わせてください
                    </Box>
                </Box>
            ) : null}
        </Box>
    );
};

export default SP401;
