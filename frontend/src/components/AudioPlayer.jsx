import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button } from './ui';
// CSS styles are now in the global app.css

const AudioPlayer = ({ audioUrl }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percentage * duration;
  };

  if (!audioUrl) return null;

  return (
    <Card variant="secondary" className="audio-player">
      <div className="controls">
        <Button
          variant="secondary"
          size="large"
          onClick={togglePlay}
          className="play-button"
        >
          {isPlaying ? '⏸️' : '▶️'}
        </Button>
        
        <div className="info">
          <div className="title">{t('audioTitle')}</div>
          <div className="time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
      
      <div className="progress-container" onClick={handleSeek}>
        <div className="progress-bar">
          <div 
            className="progress" 
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>
      
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden-audio"
      />
    </Card>
  );
};

export default AudioPlayer;