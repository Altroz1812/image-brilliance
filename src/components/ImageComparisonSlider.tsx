import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-square overflow-hidden rounded-lg cursor-ew-resize select-none bg-muted',
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
    >
      {/* Right image (background) */}
      <div className="absolute inset-0">
        <img
          src={rightImage}
          alt="Right comparison"
          className="w-full h-full object-cover"
          draggable={false}
        />
        {rightLabel && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
            {rightLabel}
          </div>
        )}
      </div>

      {/* Left image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={leftImage}
          alt="Left comparison"
          className="h-full object-cover"
          style={{ 
            width: containerRef.current?.offsetWidth || '100%',
            maxWidth: 'none'
          }}
          draggable={false}
        />
        {leftLabel && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
            {leftLabel}
          </div>
        )}
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
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
    </div>
  );
}
