import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu'; // CPUバックエンドを追加インポート

// 姿勢推定モデルを初期化する非同期関数
export const initializeModel = async (): Promise<any> => {
  try {
    // まずWebGLの初期化を試みる
    await tf.setBackend('webgl');
  } catch (e) {
    console.warn('WebGLの初期化に失敗しました。CPUバックエンドにフォールバックします。', e);
    // 失敗した場合はCPUバックエンドに切り替える
    await tf.setBackend('cpu');
  }
  
  await tf.ready();

  // TurbopackのESM解析エラーを回避するため、CommonJSビルドをrequireで読み込む
  const poseDetection = require('@tensorflow-models/pose-detection/dist/pose-detection.js');

  const detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
  };

  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  return detector;
};