"use client";

import { useEffect, useRef, useState } from "react";

interface VideoProcessorProps {
  onProcessedStream: (stream: MediaStream | null) => void;
  sourceStream: MediaStream | null;
}

export default function VideoProcessor({ onProcessedStream, sourceStream }: VideoProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [backgroundRemoval, setBackgroundRemoval] = useState(false);

  // Effect for setting up video without processing
  useEffect(() => {
    if (!sourceStream) return;

    const video = videoRef.current;
    if (!video) return;

    // Set video source
    video.srcObject = sourceStream;

    // If background removal is disabled, pass original stream
    if (!backgroundRemoval) {
      onProcessedStream(sourceStream);
      return;
    }
  }, [sourceStream, backgroundRemoval, onProcessedStream]);

  // Effect for processing frames (only when background removal is enabled)
  useEffect(() => {
    if (!sourceStream || !backgroundRemoval) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Process frames with background removal
    const processFrame = () => {
      if (video.readyState === 4) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Simple background removal using color difference
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        
        if (tempCtx) {
          // Draw original frame
          tempCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get image data
          const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Simple background detection (this is very basic)
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Simple heuristic: if pixel is close to green or very light/dark, make transparent
            const isBackground = (
              (g > r + 20 && g > b + 20) || // Green-ish
              (r + g + b < 100) || // Very dark
              (r + g + b > 650 && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) // Very light/white
            );
            
            if (isBackground) {
              data[i + 3] = 0; // Make transparent
            }
          }
          
          // Put processed data back
          tempCtx.putImageData(imageData, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Setup canvas and start processing
    const setupProcessing = () => {
      if (video.readyState >= 1) { // HAVE_METADATA
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Create output stream from canvas
        const stream = canvas.captureStream(30);
        onProcessedStream(stream);
        
        // Start processing
        processFrame();
      }
    };

    if (video.readyState >= 1) {
      setupProcessing();
    } else {
      video.addEventListener("loadedmetadata", setupProcessing, { once: true });
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [sourceStream, backgroundRemoval, onProcessedStream]);

  return (
    <div className="flex flex-col">
      <div className="hidden">
        <video ref={videoRef} autoPlay playsInline muted />
        {/* Canvas only rendered when background removal is enabled */}
        {backgroundRemoval && <canvas ref={canvasRef} />}
      </div>
      <div className="p-2 bg-gray-800 text-white">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={backgroundRemoval}
            onChange={(e) => setBackgroundRemoval(e.target.checked)}
            className="form-checkbox"
          />
          <span>Enable Background Removal (Basic)</span>
        </label>
        <p className="text-xs text-gray-400 mt-1">
          {backgroundRemoval 
            ? "Background removal is active - using more memory" 
            : "Background removal is disabled - using original video stream"
          }
        </p>
      </div>
    </div>
  );
}