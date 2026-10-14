import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X, Minimize2, Play, Pause } from "lucide-react";

interface Props {
  videoUrl: string;
  title?: string;
}

export default function MiniVideoPlayer({ videoUrl, title = "Vídeo" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [closed, setClosed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const miniContainerRef = useRef<HTMLDivElement | null>(null);
  const expandedContainerRef = useRef<HTMLDivElement | null>(null);

  // Cria o elemento de vídeo uma única vez para nunca pausar ao trocar de modo
  useEffect(() => {
    if (videoRef.current) return;

    const video = document.createElement("video");
    video.src = videoUrl;
    video.title = title;
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.className = "absolute inset-0 w-full h-full object-cover";

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    videoRef.current = video;
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.pause();
      video.removeAttribute("src");
      video.load();
      videoRef.current = null;
    };
  }, [videoUrl, title]);

  // Move o mesmo elemento de vídeo entre os containers sem recriá-lo
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (closed) {
      video.pause();
      return;
    }

    if (expanded) {
      expandedContainerRef.current?.appendChild(video);
      video.muted = false;
    } else {
      miniContainerRef.current?.appendChild(video);
      video.muted = true;
    }

    if (video.paused) {
      video.play().catch(() => {});
    }
  }, [expanded, closed]);

  useEffect(() => {
    if (expanded) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [expanded]);


  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = pct * video.duration;
    setProgress(pct * 100);
  };

  if (closed) return null;

  const progressBar = (
    <div className="absolute bottom-3 left-3 right-3 z-30">
      <div
        role="slider"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso do vídeo"
        onClick={seek}
        className="w-full h-1.5 bg-white/25 rounded-full cursor-pointer overflow-hidden hover:h-2 transition-all"
      >
        <div
          className="h-full bg-red-600 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const mini = (
    <div
      ref={miniContainerRef}
      className="fixed bottom-20 right-2 sm:bottom-24 sm:right-4 z-40 w-36 sm:w-56 md:w-72 rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border border-border/60 bg-black animate-in fade-in slide-in-from-bottom-4"
      style={{ aspectRatio: "16 / 9" }}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Expandir vídeo"
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors group z-10"
      >
        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5 sm:p-2">
          <Maximize2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setClosed(true);
        }}
        aria-label="Fechar vídeo"
        className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-black/60 hover:bg-black/80 rounded-full p-0.5 sm:p-1 text-white z-20"
      >
        <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      </button>
      <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-3 sm:left-3 sm:right-3 z-30">
        <div
          role="slider"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do vídeo"
          onClick={seek}
          className="w-full h-1 sm:h-1.5 bg-white/25 rounded-full cursor-pointer overflow-hidden hover:h-1.5 sm:hover:h-2 transition-all"
        >
          <div
            className="h-full bg-red-600 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  const expandedView = (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-2 sm:p-4 animate-in fade-in"
      onClick={() => setExpanded(false)}
    >
      <div
        ref={expandedContainerRef}
        className="relative w-full max-w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl rounded-lg sm:rounded-xl overflow-hidden bg-black"
        style={{ aspectRatio: "16 / 9" }}
        onClick={(e) => e.stopPropagation()}
      >
        {progressBar}

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
        >
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-3 sm:p-4">
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            ) : (
              <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" />
            )}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(false);
        }}
        aria-label="Minimizar vídeo"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white text-black rounded-full p-2 shadow-lg hover:bg-white/90 z-40"
      >
        <Minimize2 className="w-4 h-4" />
      </button>
    </div>
  );

  return createPortal(
    <>
      {mini}
      {expanded && expandedView}
    </>,
    document.body,
  );
}
