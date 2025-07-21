"use client";

import { useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import { useRemoteParticipants } from "@livekit/components-react";

interface VideoStream {
  participantId: string;
  videoElement: HTMLVideoElement;
}

export default function CanvasVideoCompositor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const videoStreamsRef = useRef<Map<string, VideoStream>>(new Map());
  const participants = useRemoteParticipants();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(participants.length === 0);
    
    participants.forEach((participant) => {
      const videoTrack = participant.getTrack(Track.Source.Camera);
      
      if (videoTrack?.track && !videoStreamsRef.current.has(participant.identity)) {
        const videoElement = document.createElement("video");
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        videoTrack.track.attach(videoElement);
        
        videoStreamsRef.current.set(participant.identity, {
          participantId: participant.identity,
          videoElement,
        });
      }
    });
    
    const currentStreams = Array.from(videoStreamsRef.current.keys());
    currentStreams.forEach((identity) => {
      const participantExists = participants.find(p => p.identity === identity);
      if (!participantExists) {
        const stream = videoStreamsRef.current.get(identity);
        if (stream) {
          stream.videoElement.remove();
          videoStreamsRef.current.delete(identity);
        }
      }
    });
  }, [participants]);

  useEffect(() => {
    const processFrame = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const streams = Array.from(videoStreamsRef.current.values());
      const gridSize = Math.ceil(Math.sqrt(streams.length));
      const cellWidth = canvas.width / gridSize;
      const cellHeight = canvas.height / gridSize;
      
      for (let i = 0; i < streams.length; i++) {
        const stream = streams[i];
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        if (stream.videoElement.readyState === 4) {
          ctx.drawImage(stream.videoElement, x, y, cellWidth, cellHeight);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };
    
    processFrame();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center">
      {isLoading ? (
        <div className="text-white">Waiting for participants...</div>
      ) : (
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}