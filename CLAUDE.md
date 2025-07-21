# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VTuber streaming application that integrates LiveKit with Canvas rendering to create animated 3D avatars. The app captures webcam video, uses MediaPipe for motion tracking, animates a VRM 3D model based on the tracked movements, renders it to a canvas, and streams the canvas output through LiveKit.

## Key Technologies

- **Next.js 13+** - React framework with app directory
- **LiveKit** - Real-time video/audio streaming infrastructure
- **Three.js** - 3D graphics rendering
- **VRM** - 3D humanoid avatar format
- **MediaPipe Holistic** - AI-based motion capture
- **KalidoKit** - MediaPipe to VRM rigging converter

## Development Commands

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

```

## Environment Setup

Create `.env.development` with:
```
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_WS_URL=wss://your-livekit-server
```

## Architecture Overview

### Canvas-LiveKit Integration Pipeline

1. **Motion Capture** (src/components/LocalAvatarView/LocalVideoView.tsx)
   - Webcam feed → MediaPipe Holistic → Face/Pose/Hand landmarks
   - Runs inference at 30 FPS in a worker loop

2. **Avatar Animation** (src/components/LocalAvatarView/rigging.tsx)
   - MediaPipe landmarks → KalidoKit → VRM bone rotations
   - Animates face expressions, body pose, hand gestures
   - Uses LERP interpolation for smooth movement

3. **Canvas Rendering** (src/components/LocalAvatarView/LocalVideoView.tsx:263)
   - Three.js renders animated VRM to canvas
   - Canvas captured as MediaStream at 60 FPS via `captureStream()`
   - Stream passed up to parent component

4. **LiveKit Publishing** (src/components/MeetView.tsx:48-56)
   - Canvas stream video track published as `Track.Source.Camera`
   - Microphone audio published separately
   - Both tracks published to LiveKit room

5. **Broadcasting** (src/pages/api/broadcast.ts)
   - LiveKit Egress API composites room
   - Streams to Twitch/YouTube via RTMP

### Key Components

- **LocalVideoView** - Core canvas rendering and motion capture
- **MeetView** - LiveKit room management and track publishing
- **Page Components**:
  - `/src/app/page.tsx` - Broadcaster interface
  - `/src/app/view/[room_name]/page.tsx` - Viewer interface

### API Endpoints

- `/api/connection_details` - Generates streamer tokens
- `/api/connection_details_viewer` - Generates viewer tokens
- `/api/broadcast` - Manages external streaming

## Important Implementation Details

### Canvas Stream Creation
```typescript
// In LocalVideoView.tsx
canvasStreamRef.current = canvasRef.current.captureStream(60);
onCanvasStreamChanged(canvasStreamRef.current);
```

### Publishing to LiveKit
```typescript
// In MeetView.tsx
const track = canvasStream!.getTracks()[0];
await localParticipant.publishTrack(track, {
  source: Track.Source.Camera,
});
```

### VRM Model Loading
- Models stored in `/public/characters/`
- Loaded via Three.js VRMLoaderPlugin
- Default model: `AvatarSample_A.vrm`

### Performance Considerations
- MediaPipe runs at 30 FPS to balance accuracy/performance
- Canvas streams at 60 FPS for smooth output
- Camera input downscaled to 640x320 for processing

## Testing

Currently no automated tests. Manual testing flow:
1. Start dev server
2. Allow camera/microphone permissions
3. Check avatar responds to movements
4. Verify stream appears in LiveKit room
5. Test viewer page at `/view/[room_name]`

## Common Tasks

### Adding New VRM Models
1. Place `.vrm` file in `/public/characters/`
2. Update model path in `LocalVideoView.tsx`

### Modifying Motion Mapping
1. Edit `/src/components/LocalAvatarView/rigging.tsx`
2. Adjust interpolation factors or bone mappings
3. See KalidoKit documentation for available mappings

### Changing Stream Settings
1. Canvas FPS: `captureStream()` parameter in LocalVideoView
2. Camera resolution: `createLocalVideoTrack()` options in page.tsx
3. MediaPipe FPS: `MEIDAPIPE_FPS` constant

## Canvas Rendering Process

### Current Implementation

The project uses Canvas in a specific way - **only for creating the VTuber avatar stream**, not for compositing multiple participants:

1. **Sender Side (Streamer)**:
   ```
   Webcam → MediaPipe → VRM Avatar Animation → Canvas → LiveKit Stream
   ```
   - Canvas is used to render the 3D avatar
   - Canvas output is captured as MediaStream using `captureStream(60)`
   - This stream is sent to LiveKit as a virtual camera

2. **Receiver Side (Viewer)**:
   ```
   LiveKit Stream → HTML Video Element → Display
   ```
   - Received streams are attached directly to `<video>` elements
   - No Canvas compositing of multiple participants
   - Each participant's video is displayed independently

### Implementing Multi-Participant Canvas Composition

If you want to composite multiple participants on a single Canvas, you would need to:

```typescript
// Example structure (not implemented in current code)
1. Subscribe to all participants' video tracks
2. Attach each track to a separate video element
3. Use Canvas 2D context to draw all videos:
   
   ctx.drawImage(video1, x1, y1, width1, height1);
   ctx.drawImage(video2, x2, y2, width2, height2);
   
4. Manage layout, positions, and sizes
5. Handle participant join/leave events
```

### Key Files for Canvas Understanding

- **Canvas Creation & Avatar Rendering**: `/src/components/LocalAvatarView/LocalVideoView.tsx`
- **Stream Publishing**: `/src/components/MeetView.tsx`
- **Stream Reception**: `/src/app/view/[room_name]/page.tsx`

## Project Goals for Analysis

This project demonstrates advanced browser-based real-time video processing:
- Capturing and processing webcam input
- Running AI inference in the browser
- Real-time 3D rendering and animation
- Streaming canvas content as virtual camera
- Integration with professional streaming infrastructure

The key innovation is using canvas as an intermediary to transform camera input into animated avatar output, all within the browser.