'use client';

import React, { useRef, useEffect, useState } from 'react';
import { initializeModel } from '../lib/tfjs-setup';

export default function PoseTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  // モデルインスタンスを保持
  const detectorRef = useRef<any>(null);
  // 状態更新の頻度を制御するためのタイマー参照
  const lastUpdateRef = useRef<number>(0);
  // 現在の姿勢状態を追跡するための参照（Reactのレンダリングサイクル外で最新値を保持）
  const postureStatusRef = useRef<string>('正常');

  const [isReady, setIsReady] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('カメラとモデルを初期化中...');
  
  // UIに表示するための姿勢ステータス（正常, 注意, 危険）
  const [postureStatus, setPostureStatus] = useState<string>('正常');

  const setupCamera = async (): Promise<void> => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      videoRef.current.srcObject = stream;
      return new Promise((resolve) => {
        videoRef.current!.onloadedmetadata = () => {
          videoRef.current!.play();
          resolve();
        };
      });
    } catch (error) {
      console.error('カメラの起動に失敗しました:', error);
      setLoadingText('カメラの権限を確認してください。');
      throw error;
    }
  };

  const drawKeypoints = (keypoints: any[], ctx: CanvasRenderingContext2D) => {
    keypoints.forEach((keypoint) => {
      if (keypoint.score && keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'aqua';
        ctx.fill();
      }
    });
  };

  // ストレートネック（亀首）の判定ロジック
  const analyzePosture = (keypoints: any[]) => {
    const leftEar = keypoints.find(k => k.name === 'left_ear');
    const rightEar = keypoints.find(k => k.name === 'right_ear');
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');

    // 必要な4つの関節がすべて十分な信頼度(0.3以上)で検出されているか確認
    if (
      leftEar?.score > 0.3 && rightEar?.score > 0.3 &&
      leftShoulder?.score > 0.3 && rightShoulder?.score > 0.3
    ) {
      // 肩の幅を基準値(スケール)として計算
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      
      // 耳と肩の平均Y座標を計算
      const avgEarY = (leftEar.y + rightEar.y) / 2;
      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;

      // Y座標の差分（キャンバスでは下に行くほどYが大きいため、肩Y - 耳Y が正の値になる）
      const dy = avgShoulderY - avgEarY;

      // 肩幅に対するY座標の差分の比率を計算
      // 顔が前に出ると、正面カメラでは耳が肩の高さに近づいて見えるため比率が小さくなる
      const ratio = dy / shoulderWidth;

      let currentStatus = '正常';
      if (ratio < 0.5) {
        currentStatus = '危険'; // 頭がかなり前に出ている状態
      } else if (ratio < 0.8) {
        currentStatus = '注意'; // やや前傾姿勢
      }

      const now = performance.now();
      // パフォーマンス最適化: UIの更新は500ms(0.5秒)に1回のみ実行する
      if (now - lastUpdateRef.current > 500) {
        if (postureStatusRef.current !== currentStatus) {
          postureStatusRef.current = currentStatus;
          setPostureStatus(currentStatus);
        }
        lastUpdateRef.current = now;
      }
    }
  };

  const detectPose = async () => {
    if (!videoRef.current || !canvasRef.current || !detectorRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const poses = await detectorRef.current.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false
      });

      if (poses.length > 0) {
        const keypoints = poses[0].keypoints;
        drawKeypoints(keypoints, ctx);
        analyzePosture(keypoints); // 姿勢分析関数を呼び出し
      }
    } catch (error) {
      console.error('推論中にエラーが発生しました:', error);
    }

    requestRef.current = requestAnimationFrame(detectPose);
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await setupCamera();
        setLoadingText('AIモデルを読み込み中...');
        const detector = await initializeModel();
        detectorRef.current = detector;
        if (isMounted) {
          setIsReady(true);
          detectPose();
        }
      } catch (e) {
        console.error("初期化エラー:", e);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (detectorRef.current) detectorRef.current.dispose();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 状態に応じた背景色の動的切り替え
  const getStatusColor = () => {
    if (postureStatus === '危険') return 'bg-red-500';
    if (postureStatus === '注意') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[640px] mx-auto">
      {/* 状態表示用のステータスバー */}
      <div className={`w-full py-3 text-center rounded-lg shadow-md transition-colors duration-300 ${getStatusColor()}`}>
        <h2 className="text-xl font-bold text-white tracking-wide">
          現在の姿勢: {postureStatus}
        </h2>
      </div>

      <div className="relative w-full overflow-hidden rounded-lg shadow-xl bg-black">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900 bg-opacity-80 text-white font-semibold">
            {loadingText}
          </div>
        )}
        <video
          ref={videoRef}
          className="block w-full h-auto"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
        />
      </div>
    </div>
  );
}