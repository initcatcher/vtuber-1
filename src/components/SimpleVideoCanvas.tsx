"use client";

import { useEffect, useRef, useState } from "react";
import { createLocalVideoTrack } from "livekit-client";
import useResizeObserver from "use-resize-observer";
import { useDragAndDrop } from "../hooks/useDragAndDrop";

type Props = {
  onCanvasStreamChanged: (canvasStream: MediaStream | null) => void;
};

export const SimpleVideoCanvas = ({ onCanvasStreamChanged }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  const size = useResizeObserver({ ref: resizeRef });

  // Video dimensions
  const videoWidth = 250;
  const videoHeight = 250;

  // Drag and drop functionality
  const { dragState, attachEventListeners } = useDragAndDrop({
    elementWidth: videoWidth,
    elementHeight: videoHeight,
    canvasWidth: size.width || 800, // Default size to prevent negative values
    canvasHeight: size.height || 600,
    initialX: size.width ? (size.width - videoWidth) / 2 : 275, // Center initially
    initialY: size.height ? (size.height - videoHeight) / 2 : 175,
  });

  // Debug dragState changes
  useEffect(() => {
    console.log("DragState updated:", {
      x: dragState.x,
      y: dragState.y,
      isDragging: dragState.isDragging,
      canvasSize: { width: size.width, height: size.height }
    });
  }, [dragState.x, dragState.y, dragState.isDragging, size.width, size.height]);

  // Animation loop for drawing video frames to canvas
  const animate = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video && video.readyState >= 2) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Fill with black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame to canvas using drag position
        try {
          ctx.drawImage(video, dragState.x, dragState.y, videoWidth, videoHeight);
          
          // Draw drag indicator when dragging
          if (dragState.isDragging) {
            ctx.strokeStyle = "#00ff00";
            ctx.lineWidth = 2;
            ctx.strokeRect(dragState.x, dragState.y, videoWidth, videoHeight);
          }
          
          
          console.log(`Video frame drawn to canvas at (${dragState.x}, ${dragState.y}) with size ${videoWidth}x${videoHeight}`);
        } catch (error) {
          console.error("Error drawing video to canvas:", error);
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Setup video capture
  useEffect(() => {
    createLocalVideoTrack({
      resolution: { width: 1280, height: 720 },
    }).then((track) => {
      if (videoRef.current) {
        track.attach(videoRef.current);
        console.log("Video track attached");
        
        // Wait for video to be ready before starting animation
        const startAnimation = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            animate();
          } else {
            // Wait a bit more for video to be ready
            setTimeout(startAnimation, 100);
          }
        };
        
        startAnimation();
      }
    }).catch((error) => {
      console.error("Failed to create video track:", error);
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onCanvasStreamChanged]);

  // Update canvas size when container resizes
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!size.width || !size.height) return;
    
    canvasRef.current.width = size.width;
    canvasRef.current.height = size.height;
    console.log(`Canvas resized to ${size.width}x${size.height}`);
  }, [size]);

  // Attach drag event listeners to canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const cleanup = attachEventListeners(canvasRef.current);
    return cleanup;
  }, [attachEventListeners]);

  // Create canvas stream when drag ends
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Only recreate stream when dragging ends (not during drag)
    if (!dragState.isDragging) {
      console.log("Drag ended, recreating canvas stream...");
      
      // Stop existing stream if any
      if (canvasStreamRef.current) {
        canvasStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Create new stream after drag ends
      setTimeout(() => {
        if (canvasRef.current) {
          canvasStreamRef.current = canvasRef.current.captureStream(30);
          onCanvasStreamChanged(canvasStreamRef.current);
          console.log(`Canvas stream recreated at position (${dragState.x}, ${dragState.y}):`, canvasStreamRef.current);
        }
      }, 200);
    }
  }, [dragState.isDragging, dragState.x, dragState.y, onCanvasStreamChanged]);

  // Handle canvas resize - recreate stream if needed
  useEffect(() => {
    if (!canvasRef.current || !size.width || !size.height) return;
    
    console.log(`Canvas size changed to ${size.width}x${size.height}`);
    // Size changes are already handled by the position effect above
  }, [size]);

  return (
    <div className="relative h-full w-full">
      <div className="overflow-hidden h-full" ref={resizeRef}>
        <canvas
          width={size.width}
          height={size.height}
          className={`h-full w-full bg-black ${dragState.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          ref={canvasRef}
        />
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
        <div>Video Position: ({Math.round(dragState.x)}, {Math.round(dragState.y)})</div>
        <div>Status: {dragState.isDragging ? 'Dragging' : 'Ready'}</div>
        <div>Stream: {canvasStreamRef.current ? 'Active' : 'Inactive'}</div>
      </div>
    </div>
  );
};