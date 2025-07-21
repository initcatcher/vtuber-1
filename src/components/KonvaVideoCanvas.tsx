"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import { createLocalVideoTrack } from "livekit-client";
import useResizeObserver from "use-resize-observer";
import Konva from "konva";

type Props = {
  onCanvasStreamChanged: (canvasStream: MediaStream | null) => void;
};

export const KonvaVideoCanvas = ({ onCanvasStreamChanged }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  const size = useResizeObserver({ ref: resizeRef });

  // Video dimensions
  const videoWidth = 250;
  const videoHeight = 250;

  // Video position state
  const [videoPosition, setVideoPosition] = useState({
    x: 275, // Default center-ish position
    y: 175
  });

  // Video element for Konva
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Setup video capture
  useEffect(() => {
    createLocalVideoTrack({
      resolution: { width: 1280, height: 720 },
    }).then((track) => {
      if (videoRef.current) {
        track.attach(videoRef.current);
        console.log("Video track attached");
        setVideoElement(videoRef.current);
        
        // Wait for video to be ready
        const checkReady = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log("Video ready, starting capture stream setup");
            setupCanvasStream();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      }
    }).catch((error) => {
      console.error("Failed to create video track:", error);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Setup canvas stream from Konva stage
  const setupCanvasStream = () => {
    if (!stageRef.current) return;
    
    const canvas = stageRef.current.getCanvas()._canvas;
    if (canvas) {
      canvasStreamRef.current = canvas.captureStream(60);
      onCanvasStreamChanged(canvasStreamRef.current);
      console.log("Konva canvas stream created:", canvasStreamRef.current);
    }
  };

  // Handle video position change (when drag ends)
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    setVideoPosition({ x: newX, y: newY });
    console.log(`Video dragged to position: (${newX}, ${newY})`);
    
    // Recreate canvas stream with new position
    setTimeout(() => {
      setupCanvasStream();
    }, 100);
  };

  // Update position when canvas size changes
  useEffect(() => {
    if (size.width && size.height) {
      const centerX = (size.width - videoWidth) / 2;
      const centerY = (size.height - videoHeight) / 2;
      setVideoPosition({ x: centerX, y: centerY });
      console.log(`Canvas resized to ${size.width}x${size.height}, centering video`);
    }
  }, [size.width, size.height]);

  return (
    <div className="relative h-full w-full">
      <div className="overflow-hidden h-full" ref={resizeRef}>
        <Stage
          width={size.width || 800}
          height={size.height || 600}
          ref={stageRef}
        >
          <Layer>
            {videoElement && (
              <KonvaImage
                x={videoPosition.x}
                y={videoPosition.y}
                width={videoWidth}
                height={videoHeight}
                image={videoElement}
                draggable
                onDragEnd={handleDragEnd}
                onMouseEnter={() => {
                  document.body.style.cursor = 'grab';
                }}
                onMouseLeave={() => {
                  document.body.style.cursor = 'default';
                }}
                onMouseDown={() => {
                  document.body.style.cursor = 'grabbing';
                }}
                onMouseUp={() => {
                  document.body.style.cursor = 'grab';
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>
      
      {/* Small preview of the actual video */}
      <div className="absolute w-[150px] h-[100px] bottom-4 right-4 overflow-hidden rounded border-2 border-white">
        <video 
          className="h-full w-full object-cover" 
          ref={videoRef}
          autoPlay
          playsInline
          muted
        />
      </div>
      
      <div className="absolute top-4 left-4 text-white bg-black bg-opacity-50 p-2 rounded text-sm">
        <div>Canvas: {size.width || 0}x{size.height || 0}</div>
        <div>Video Position: ({Math.round(videoPosition.x)}, {Math.round(videoPosition.y)})</div>
        <div>Stream: {canvasStreamRef.current ? 'Active' : 'Inactive'}</div>
      </div>
    </div>
  );
};