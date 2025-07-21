"use client";

import { LiveKitRoom } from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";
import { ConnectionDetails } from "@/pages/api/connection_details";
import CanvasVideoCompositor from "@/components/CanvasVideoCompositor";

export default function Page({ params }: any) {
  const [connectionDetails, setConnectionDetails] =
    useState<ConnectionDetails | null>(null);
  const roomName = (params.room_name || "") as string;

  const requestConnectionDetails = useCallback(async () => {
    const response = await fetch("/api/connection_details_viewer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomName }),
    });

    if (response.status === 200) {
      return response.json();
    }

    const { error } = await response.json();
    throw error;
  }, [roomName]);

  useEffect(() => {
    requestConnectionDetails().then(setConnectionDetails);
  }, [requestConnectionDetails]);

  if (!connectionDetails) {
    return null;
  }

  // Show the room UI
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <LiveKitRoom
        token={connectionDetails.token}
        serverUrl={connectionDetails.ws_url}
        connect={true}
      >
        <CanvasVideoCompositor />
      </LiveKitRoom>
    </div>
  );
}
