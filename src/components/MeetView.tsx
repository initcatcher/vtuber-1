import {
  useConnectionState,
  useLocalParticipant,
  useMediaTrack,
  useRoomInfo,
} from "@livekit/components-react";
import { ConnectionState, Track, createLocalVideoTrack } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { KonvaVideoCanvas } from "./KonvaVideoCanvas";

export function MeetView() {
  const connectionState = useConnectionState();
  const { name } = useRoomInfo();
  const { localParticipant } = useLocalParticipant();
  const [canvasStream, setCanvasStream] = useState<MediaStream | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const { track: micTrack } = useMediaTrack(
    Track.Source.Microphone,
    localParticipant
  );
  const [isLive, setIsLive] = useState(false);

  const stopBroadcast = useCallback(async () => {
    setBroadcastLoading(true);
    try {
      const publishedTracks = localParticipant.getTracks();
      const tracks = publishedTracks
        .map((t) => t.track)
        .filter((t) => t)
        .map((t) => t?.mediaStreamTrack!);
      await localParticipant.unpublishTracks(tracks);
      setIsLive(false);
    } catch (e) {
      console.log(e);
    } finally {
      setBroadcastLoading(false);
    }
  }, [localParticipant]);

  const broadcast = useCallback(async () => {
    setBroadcastLoading(true);

    try {
      if (!canvasStream) {
        throw new Error("No canvas stream available");
      }
      
      console.log("Publishing canvas stream:", canvasStream);
      const track = canvasStream.getTracks()[0];
      await localParticipant.publishTrack(track, {
        source: Track.Source.Camera,
      });
      const mic = micTrack?.mediaStream?.getTracks()[0];
      if (mic) {
        await localParticipant.publishTrack(mic);
      }
      setIsLive(true);
    } catch (e) {
      const publishedTracks = localParticipant.getTracks();
      const tracks = publishedTracks
        .map((t) => t.track)
        .filter((t) => t)
        .map((t) => t?.mediaStreamTrack!);
      await localParticipant.unpublishTracks(tracks);
      throw e;
    } finally {
      setBroadcastLoading(false);
    }
  }, [
    canvasStream,
    localParticipant,
    micTrack,
  ]);


  const broadcastButtonText = useMemo(() => {
    if (broadcastLoading) {
      return "";
    }
    return isLive ? "Stop Publishing" : "Start Publishing";
  }, [broadcastLoading, isLive]);

  if (connectionState !== ConnectionState.Connected) {
    return null;
  }

  return (
    <div className="flex h-full w-full">
      <div className="w-4/5 flex flex-col">
        <div className="flex-1">
          <KonvaVideoCanvas
            onCanvasStreamChanged={setCanvasStream}
          />
        </div>
      </div>
      <div className="flex flex-col w-1/5 h-full p-4 bg-gray-900">
        <div className="mb-4">
          <h3 className="text-white text-lg font-semibold mb-2">Room Controls</h3>
          <p className="text-gray-400 text-sm">Room: {name}</p>
        </div>
        
        <div className="grow" />
        
        <button
          className={`btn btn-primary m-2 ${broadcastLoading ? "loading" : ""}`}
          onClick={async () => {
            if (isLive) {
              await stopBroadcast();
            } else {
              await broadcast();
            }
          }}
        >
          {broadcastButtonText}
        </button>
      </div>
    </div>
  );
}
