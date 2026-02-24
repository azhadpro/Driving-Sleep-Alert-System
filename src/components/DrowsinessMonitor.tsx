import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { calculateEAR, LEFT_EYE_INDICES, RIGHT_EYE_INDICES } from '../utils/ear';
import { alertSound } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Camera, Eye, ShieldCheck, Activity } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EAR_THRESHOLD = 0.22;
const CONSECUTIVE_FRAMES = 20;

export default function DrowsinessMonitor() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrowsy, setIsDrowsy] = useState(false);
  const [ear, setEar] = useState(0);
  const [counter, setCounter] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fps, setFps] = useState(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!canvasRef.current || !webcamRef.current?.video) return;

      const canvasCtx = canvasRef.current.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        const leftEye = LEFT_EYE_INDICES.map(idx => landmarks[idx]);
        const rightEye = RIGHT_EYE_INDICES.map(idx => landmarks[idx]);

        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        setEar(avgEAR);

        if (avgEAR < EAR_THRESHOLD) {
          setCounter(prev => prev + 1);
        } else {
          setCounter(0);
          setIsDrowsy(false);
          alertSound.stop();
        }

        // Draw landmarks for visual feedback
        canvasCtx.fillStyle = avgEAR < EAR_THRESHOLD ? '#ef4444' : '#10b981';
        [...leftEye, ...rightEye].forEach(point => {
          canvasCtx.beginPath();
          canvasCtx.arc(point.x * canvasRef.current!.width, point.y * canvasRef.current!.height, 1, 0, 2 * Math.PI);
          canvasCtx.fill();
        });
      }

      // FPS Calculation
      const now = performance.now();
      setFps(Math.round(1000 / (now - lastTimeRef.current)));
      lastTimeRef.current = now;
    });

    let animationFrameId: number;
    const runDetection = async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        await faceMesh.send({ image: webcamRef.current.video });
        if (!isLoaded) setIsLoaded(true);
      }
      animationFrameId = requestAnimationFrame(runDetection);
    };

    runDetection();

    return () => {
      cancelAnimationFrame(animationFrameId);
      faceMesh.close();
      alertSound.stop();
    };
  }, [isLoaded]);

  useEffect(() => {
    if (counter >= CONSECUTIVE_FRAMES) {
      setIsDrowsy(true);
      alertSound.play();
    }
  }, [counter]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#E6E6E6] p-4 font-mono">
      {/* Main Hardware Widget */}
      <div className="relative w-full max-w-2xl bg-[#151619] rounded-3xl shadow-2xl overflow-hidden border-4 border-[#2A2B2F]">
        
        {/* Header / Status Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#1A1B1E]">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              isDrowsy ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            )} />
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
              System Status: {isDrowsy ? 'CRITICAL ALERT' : 'MONITORING ACTIVE'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            <div className="flex items-center gap-1">
              <Activity size={12} />
              <span>{fps} FPS</span>
            </div>
            <div className="flex items-center gap-1">
            </div>
          </div>
        </div>

        {/* Camera Viewport */}
        <div className="relative aspect-video bg-black group">
          <Webcam
            ref={webcamRef}
            mirrored
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'user' }}
            className="w-full h-full object-cover opacity-80"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            width={640}
            height={360}
          />
          
          {/* Overlay Grid */}
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div className="w-full h-full" style={{ 
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Drowsiness Overlay */}
          <AnimatePresence>
            {isDrowsy && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-red-600/20 flex flex-col items-center justify-center backdrop-blur-[2px]"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="bg-red-600 text-white px-8 py-4 rounded-xl flex flex-col items-center gap-2 shadow-2xl border-2 border-white/20"
                >
                  <AlertTriangle size={48} className="animate-bounce" />
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Wake Up!</h2>
                  <p className="text-[10px] opacity-80 font-bold">DROWSINESS DETECTED</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isLoaded && (
            <div className="absolute inset-0 bg-[#151619] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-[10px] text-emerald-500/50 uppercase tracking-[0.2em]">Initializing Camera</p>
            </div>
          )}
        </div>

        {/* Telemetry Footer */}
        <div className="p-6 grid grid-cols-3 gap-4 bg-[#1A1B1E]">
          <div className="space-y-1">
            <span className="text-[9px] text-white/30 uppercase tracking-wider block">Eye Aspect Ratio</span>
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-2xl font-bold leading-none",
                ear < EAR_THRESHOLD ? "text-red-500" : "text-emerald-500"
              )}>
                {ear.toFixed(3)}
              </span>
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden mb-1">
                <motion.div 
                  className={cn("h-full", ear < EAR_THRESHOLD ? "bg-red-500" : "bg-emerald-500")}
                  initial={false}
                  animate={{ width: `${Math.min(ear * 200, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1 border-x border-white/5 px-4">
            <span className="text-[9px] text-white/30 uppercase tracking-wider block">Closure Duration</span>
            <div className="flex items-end gap-2">
              <span className={cn(
                "text-2xl font-bold leading-none",
                counter > 0 ? "text-orange-500" : "text-white/50"
              )}>
                {counter}
              </span>
              <span className="text-[10px] text-white/20 mb-1">FRAMES</span>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <span className="text-[9px] text-white/30 uppercase tracking-wider block">Threshold</span>
            <div className="text-2xl font-bold leading-none text-white/20">
              {EAR_THRESHOLD.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Branding / Model Info */}
        <div className="px-6 py-3 bg-[#151619] flex justify-between items-center opacity-30 text-[8px] uppercase tracking-widest font-bold">
          <span>Model: MediaPipe FaceMesh V2.1</span>
          <span>Sentinel Safety Systems © 2026</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 max-w-md text-center space-y-4">
        <p className="text-black/40 text-xs leading-relaxed">
          Position your face clearly in front of the camera. The system monitors the Eye Aspect Ratio (EAR) in real-time. If your eyes remain closed for more than {CONSECUTIVE_FRAMES} frames, an audible alert will trigger.
        </p>
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-black/60 font-bold">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>SAFE</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-black/60 font-bold">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span>ALERT</span>
          </div>
        </div>
      </div>
    </div>
  );
}
