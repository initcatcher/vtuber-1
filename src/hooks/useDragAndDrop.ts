import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragState {
  isDragging: boolean;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
}

interface UseDragAndDropOptions {
  elementWidth: number;
  elementHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  initialX?: number;
  initialY?: number;
}

export const useDragAndDrop = ({
  elementWidth,
  elementHeight,
  canvasWidth,
  canvasHeight,
  initialX,
  initialY
}: UseDragAndDropOptions) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    x: initialX ?? (canvasWidth - elementWidth) / 2,
    y: initialY ?? (canvasHeight - elementHeight) / 2,
    offsetX: 0,
    offsetY: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Helper function to get mouse/touch coordinates relative to canvas
  const getCanvasCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in event) {
      // Touch event
      clientX = event.touches[0]?.clientX || event.changedTouches[0]?.clientX || 0;
      clientY = event.touches[0]?.clientY || event.changedTouches[0]?.clientY || 0;
    } else {
      // Mouse event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Check if a point is inside the draggable element
  const isPointInElement = useCallback((x: number, y: number) => {
    const currentDragState = dragStateRef.current;
    return (
      x >= currentDragState.x &&
      x <= currentDragState.x + elementWidth &&
      y >= currentDragState.y &&
      y <= currentDragState.y + elementHeight
    );
  }, [elementWidth, elementHeight]);

  // Constrain position within canvas bounds
  const constrainPosition = useCallback((x: number, y: number) => {
    const maxX = canvasWidth - elementWidth;
    const maxY = canvasHeight - elementHeight;
    
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }, [canvasWidth, canvasHeight, elementWidth, elementHeight]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: MouseEvent) => {
    const coords = getCanvasCoordinates(event);
    
    if (isPointInElement(coords.x, coords.y)) {
      setDragState(prev => ({
        ...prev,
        isDragging: true,
        offsetX: coords.x - prev.x,
        offsetY: coords.y - prev.y,
      }));
      event.preventDefault();
    }
  }, [getCanvasCoordinates, isPointInElement]);

  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging) return;

    const coords = getCanvasCoordinates(event);
    const newX = coords.x - currentDragState.offsetX;
    const newY = coords.y - currentDragState.offsetY;
    const constrainedPos = constrainPosition(newX, newY);

    setDragState(prev => ({
      ...prev,
      x: constrainedPos.x,
      y: constrainedPos.y,
    }));
    event.preventDefault();
  }, [getCanvasCoordinates, constrainPosition]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((event: TouchEvent) => {
    const coords = getCanvasCoordinates(event);
    
    if (isPointInElement(coords.x, coords.y)) {
      setDragState(prev => ({
        ...prev,
        isDragging: true,
        offsetX: coords.x - prev.x,
        offsetY: coords.y - prev.y,
      }));
      event.preventDefault();
    }
  }, [getCanvasCoordinates, isPointInElement]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    const currentDragState = dragStateRef.current;
    if (!currentDragState.isDragging) return;

    const coords = getCanvasCoordinates(event);
    const newX = coords.x - currentDragState.offsetX;
    const newY = coords.y - currentDragState.offsetY;
    const constrainedPos = constrainPosition(newX, newY);

    setDragState(prev => ({
      ...prev,
      x: constrainedPos.x,
      y: constrainedPos.y,
    }));
    event.preventDefault();
  }, [getCanvasCoordinates, constrainPosition]);

  const handleTouchEnd = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      offsetX: 0,
      offsetY: 0,
    }));
  }, []);

  // Attach event listeners
  const attachEventListeners = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;

    // Mouse events
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch events
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      // Cleanup
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Update position when canvas size changes
  useEffect(() => {
    const constrainedPos = constrainPosition(dragState.x, dragState.y);
    if (constrainedPos.x !== dragState.x || constrainedPos.y !== dragState.y) {
      setDragState(prev => ({
        ...prev,
        x: constrainedPos.x,
        y: constrainedPos.y,
      }));
    }
  }, [canvasWidth, canvasHeight, constrainPosition, dragState.x, dragState.y]);

  return {
    dragState,
    attachEventListeners,
    setPosition: (x: number, y: number) => {
      const constrainedPos = constrainPosition(x, y);
      setDragState(prev => ({
        ...prev,
        x: constrainedPos.x,
        y: constrainedPos.y,
      }));
    }
  };
};