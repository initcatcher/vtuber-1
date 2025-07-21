"use client";

import { useEffect, useRef, useState } from "react";
import { useRemoteParticipants, useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

interface ParticipantCompositorProps {
  localVideoStream: MediaStream | null;
}

interface ParticipantVideo {
  participantId: string;
  displayName: string;
  videoElement: HTMLVideoElement;
  isLocal: boolean;
}

export default function ParticipantCompositor({ 
  localVideoStream 
}: ParticipantCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const participantVideosRef = useRef<Map<string, ParticipantVideo>>(new Map());
  const [participantCount, setParticipantCount] = useState(0);
  
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  
  // Track remote participants
  useEffect(() => {
    // Add new remote participants
    remoteParticipants.forEach((participant) => {
      const videoTrack = participant.getTrack(Track.Source.Camera);
      
      if (videoTrack?.track && !participantVideosRef.current.has(participant.identity)) {
        const videoElement = document.createElement("video");
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        
        videoTrack.track.attach(videoElement);
        
        participantVideosRef.current.set(participant.identity, {
          participantId: participant.identity,
          displayName: participant.name || participant.identity,
          videoElement,
          isLocal: false,
        });
      }
    });
    
    // Remove participants who left
    const currentParticipantIds = remoteParticipants.map(p => p.identity);
    participantVideosRef.current.forEach((video, participantId) => {
      if (!video.isLocal && !currentParticipantIds.includes(participantId)) {
        video.videoElement.remove();
        participantVideosRef.current.delete(participantId);
      }
    });
    
    // Update participant count to trigger canvas re-render
    setParticipantCount(participantVideosRef.current.size);
  }, [remoteParticipants]);

  // Track local participant
  useEffect(() => {
    const localId = "local-participant";
    
    if (localVideoStream) {
      console.log("Setting up local video stream:", localVideoStream);
      // Add or update local participant
      if (!participantVideosRef.current.has(localId)) {
        const videoElement = document.createElement("video");
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;
        
        participantVideosRef.current.set(localId, {
          participantId: localId,
          displayName: localParticipant?.name || "You",
          videoElement,
          isLocal: true,
        });
        console.log("Created local video element");
      }
      
      const localVideo = participantVideosRef.current.get(localId);
      if (localVideo) {
        localVideo.videoElement.srcObject = localVideoStream;
        console.log("Set local video srcObject");
        
        // Add event listener for when video is ready
        localVideo.videoElement.addEventListener("loadedmetadata", () => {
          console.log("Local video metadata loaded, updating participant count");
          setParticipantCount(participantVideosRef.current.size);
        }, { once: true });
      }
    } else {
      console.log("No local video stream provided");
      // Remove local participant if no stream
      const localVideo = participantVideosRef.current.get(localId);
      if (localVideo) {
        localVideo.videoElement.remove();
        participantVideosRef.current.delete(localId);
      }
    }
    
    // Update participant count
    setParticipantCount(participantVideosRef.current.size);
  }, [localVideoStream, localParticipant]);

  // Canvas composition effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = 720;
    canvas.height = 720;

    const processFrame = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fill with dark background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Test: Draw a small white rectangle to verify canvas is working
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(10, 10, 50, 50);
      
      const participants = Array.from(participantVideosRef.current.values());
      const currentParticipantCount = participants.length;
      
      console.log(`Processing frame with ${currentParticipantCount} participants`);
      
      if (currentParticipantCount === 0) {
        // No participants, just show waiting message
        ctx.fillStyle = "#ffffff";
        ctx.font = "24px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Waiting for participants...", canvas.width / 2, canvas.height / 2);
      } else {
        // Draw only the first participant in the center at 250x250
        const firstParticipant = participants[0];
        const video = firstParticipant.videoElement;
        
        console.log(`First participant ${firstParticipant.displayName}: readyState=${video.readyState}, videoWidth=${video.videoWidth}, videoHeight=${video.videoHeight}`);
        
        if (video.readyState >= 1) { // HAVE_METADATA
          console.log(`Drawing first participant ${firstParticipant.displayName}`);
          
          // Fixed size and position
          const drawWidth = 250;
          const drawHeight = 250;
          const drawX = (canvas.width - drawWidth) / 2;  // Center horizontally
          const drawY = (canvas.height - drawHeight) / 2; // Center vertically
          
          // Draw video
          try {
            console.log(`Drawing video at (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            console.log("Video drawn successfully");
          } catch (error) {
            console.error("Error drawing video:", error);
          }
          
          // Draw participant name
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(drawX, drawY + drawHeight - 30, drawWidth, 30);
          ctx.fillStyle = "#ffffff";
          ctx.font = "16px Arial";
          ctx.textAlign = "left";
          ctx.fillText(
            firstParticipant.displayName + (firstParticipant.isLocal ? " (You)" : ""), 
            drawX + 10, 
            drawY + drawHeight - 10
          );
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    // Start composition
    processFrame();

    // Create and store canvas stream
    canvasStreamRef.current = canvas.captureStream(30);
    console.log("Canvas stream created:", canvasStreamRef.current);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [participantCount]);

  // Expose getCanvasStream function
  const getCanvasStream = () => {
    return canvasStreamRef.current;
  };

  // Make getCanvasStream available globally for MeetView
  useEffect(() => {
    (window as any).getCanvasStream = getCanvasStream;
    return () => {
      delete (window as any).getCanvasStream;
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      participantVideosRef.current.forEach((video) => {
        video.videoElement.remove();
      });
      participantVideosRef.current.clear();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
      />
      <div className="p-2 bg-gray-800 text-white text-sm">
        <div className="flex justify-between items-center">
          <span>
            Participants: {participantCount}
          </span>
        </div>
      </div>
    </div>
  );
}