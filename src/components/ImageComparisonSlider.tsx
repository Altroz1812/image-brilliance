import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImageComparisonSliderProps {
  leftImage: string;
  rightImage: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

export function ImageComparisonSlider({
  leftImage,
  rightImage,
  leftLabel,
  rightLabel,
  className,
}: ImageComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panMode, setPanMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const minZoom = 1;
  const maxZoom = 5;
  const zoomStep = 0.5;

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoom === 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleSliderMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current || panMode) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [panMode]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    if (panMode && zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else {
      setIsDraggingSlider(true);
    }
  }, [panMode, zoom, pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning && zoom > 1) {
        const newX = e.clientX - panStart.x;
        const newY = e.clientY - panStart.y;
        
        // Limit pan to prevent image from going too far off screen
        const maxPan = (zoom - 1) * 150;
        setPan({
          x: Math.max(-maxPan, Math.min(maxPan, newX)),
          y: Math.max(-maxPan, Math.min(maxPan, newY)),
        });
      } else if (isDraggingSlider) {
        handleSliderMove(e.clientX);
      }
    },
    [isPanning, isDraggingSlider, zoom, panStart, handleSliderMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSlider(false);
    setIsPanning(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDraggingSlider(false);
    setIsPanning(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (panMode && zoom > 1) {
      setIsPanning(true);
      setPanStart({ 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      });
    } else {
      setIsDraggingSlider(true);
    }
  }, [panMode, zoom, pan]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isPanning && zoom > 1) {
        const newX = e.touches[0].clientX - panStart.x;
        const newY = e.touches[0].clientY - panStart.y;
        
        const maxPan = (zoom - 1) * 150;
        setPan({
          x: Math.max(-maxPan, Math.min(maxPan, newX)),
          y: Math.max(-maxPan, Math.min(maxPan, newY)),
        });
      } else if (isDraggingSlider) {
        handleSliderMove(e.touches[0].clientX);
      }
    },
    [isPanning, isDraggingSlider, zoom, panStart, handleSliderMove]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDraggingSlider(false);
    setIsPanning(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!panMode) {
        handleSliderMove(e.clientX);
      }
    },
    [panMode, handleSliderMove]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    setZoom(prev => Math.max(minZoom, Math.min(maxZoom, prev + delta)));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(maxZoom, prev + zoomStep));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(minZoom, prev - zoomStep));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSliderPosition(50);
    setPanMode(false);
  }, []);

  const togglePanMode = useCallback(() => {
    setPanMode(prev => !prev);
  }, []);

  const imageStyle = {
    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
    transformOrigin: 'center center',
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={panMode ? "default" : "outline"}
                size="sm"
                onClick={togglePanMode}
                disabled={zoom <= 1}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {panMode ? 'Pan mode (click to drag)' : 'Enable pan mode'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= minZoom}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom out</TooltipContent>
          </Tooltip>

          <div className="px-2 py-1 text-sm font-medium bg-muted rounded min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= maxZoom}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom in</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset view</TooltipContent>
          </Tooltip>
        </div>

        <div className="text-xs text-muted-foreground">
          {zoom > 1 ? (panMode ? 'Drag to pan' : 'Click pan button to move') : 'Scroll to zoom'}
        </div>
      </div>

      {/* Slider container */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full aspect-square overflow-hidden rounded-lg select-none bg-muted',
          panMode && zoom > 1 ? 'cursor-grab' : 'cursor-ew-resize',
          isPanning && 'cursor-grabbing',
          className
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        onWheel={handleWheel}
      >
        {/* Right image (background) */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={rightImage}
            alt="Right comparison"
            className="w-full h-full object-cover transition-transform duration-75"
            style={imageStyle}
            draggable={false}
          />
          {rightLabel && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-20">
              {rightLabel}
            </div>
          )}
        </div>

        {/* Left image (clipped) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div 
            className="h-full overflow-hidden"
            style={{ width: containerRef.current?.offsetWidth || '100%' }}
          >
            <img
              src={leftImage}
              alt="Left comparison"
              className="h-full object-cover transition-transform duration-75"
              style={{ 
                ...imageStyle,
                width: containerRef.current?.offsetWidth || '100%',
                maxWidth: 'none'
              }}
              draggable={false}
            />
          </div>
          {leftLabel && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-20">
              {leftLabel}
            </div>
          )}
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
          style={{ left: `calc(${sliderPosition}% - 2px)` }}
        >
          {/* Handle circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary">
            <div className="flex items-center gap-0.5">
              <svg
                className="w-3 h-3 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
              <svg
                className="w-3 h-3 text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </div>
          </div>

          {/* Vertical line extensions */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-[calc(50%-20px)] bg-white/80" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-[calc(50%-20px)] bg-white/80" />
        </div>

        {/* Zoom indicator overlay */}
        {zoom > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-20">
            {Math.round(zoom * 100)}% zoom
          </div>
        )}
      </div>
    </div>
  );
}
