import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTenant } from '../context/TenantContext.js';

const formatTime = (millis) => {
  if (!millis || millis < 0) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatTimeWeb = (seconds) => {
  if (!seconds || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5, 2.0];

// ========================================
// WEB AUDIO PLAYER (Solo para web)
// ========================================
const WebAudioPlayer = forwardRef(({
  audioUrl,
  autoPlay = false,
  onError,
  styles,
  colors,
  onPlaybackChange,
}, ref) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);

  const updateIsPlaying = useCallback((value) => {
    setIsPlaying(value);
    if (onPlaybackChange) {
      onPlaybackChange(value);
    }
  }, [onPlaybackChange]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => setIsLoading(true);
    const handleLoadedData = () => {
      setIsLoading(false);
      setDuration(audio.duration || 0);
    };
    const handlePlay = () => updateIsPlaying(true);
    const handlePause = () => updateIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const handleError = (e) => {
      setIsLoading(false);
      if (onError) onError(new Error('Error loading audio'));
    };
    const handleEnded = () => {
      updateIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onError]);

  // Actualizar velocidad de reproducción
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Actualizar barra de progreso
  useEffect(() => {
    if (duration > 0) {
      setProgressBarWidth((currentTime / duration) * 100);
    }
  }, [currentTime, duration]);

  useImperativeHandle(ref, () => ({
    stop: async () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        updateIsPlaying(false);
      }
    },
    pause: async () => {
      if (audioRef.current) {
        audioRef.current.pause();
        updateIsPlaying(false);
      }
    }
  }));

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (!isPlaying) {
        audioRef.current.play();
      }
    }
  };

  const handleRateChange = (newRate) => {
    setPlaybackRate(newRate);
  };

  const handleSeek = (event) => {
    if (!audioRef.current || !duration) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const newTime = (x / width) * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <View style={styles.audioPlayerContainer}>
      {/* Audio element oculto */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        autoPlay={autoPlay}
        style={{ display: 'none' }}
      />
      
      {/* Controles */}
      <View style={styles.audioControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRestart}
          disabled={isLoading}
        >
          <Ionicons
            name="play-skip-back-outline"
            size={28}
            color={isLoading ? colors.LIGHT_ACCENT || '#a8dadc' : colors.PRIMARY || '#1a3c6e'}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.playPauseButton, isLoading && styles.playPauseDisabled]}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={isPlaying ? 'pause-outline' : 'play-outline'} size={36} color="#fff" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          disabled={true}
        >
          <Ionicons
            name="play-skip-forward-outline"
            size={28}
            color={colors.LIGHT_ACCENT || '#a8dadc'}
          />
        </TouchableOpacity>
      </View>

      {/* Controles de velocidad */}
      <View style={styles.speedControlsContainer}>
        <Text style={styles.speedLabel}>Velocidad:</Text>
        <View style={styles.speedButtonsContainer}>
          {PLAYBACK_RATES.map((rate) => (
            <TouchableOpacity
              key={rate}
              style={[
                styles.speedButton,
                playbackRate === rate && styles.speedButtonSelected,
              ]}
              onPress={() => handleRateChange(rate)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  playbackRate === rate && styles.speedButtonTextSelected,
                ]}
              >
                {rate.toFixed(rate === 1.0 || rate === 2.0 ? 1 : 2)}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Barra de progreso interactiva */}
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTimeWeb(currentTime)}</Text>
        <TouchableOpacity
          style={styles.progressBarContainer}
          onPress={handleSeek}
          activeOpacity={0.8}
        >
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressBarWidth}%` }
              ]}
            />
            <View
              style={[
                styles.progressBarThumb,
                { left: `${progressBarWidth}%` }
              ]}
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.timeText}>{formatTimeWeb(duration)}</Text>
      </View>
    </View>
  );
});

// ========================================
// MOBILE AUDIO PLAYER (Código original intacto)
// ========================================
const MobileAudioPlayer = forwardRef(({
  audioUrl,
  autoPlay = false,
  onPlaybackStatusUpdateProp,
  onError,
  styles,
  colors,
  onPlaybackChange,
}, ref) => {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const isSeeking = useRef(false);
  const soundInstanceRef = useRef(null);

  const notifyIsPlaying = useCallback((value) => {
    setIsPlaying(value);
    if (onPlaybackChange) {
      onPlaybackChange(value);
    }
  }, [onPlaybackChange]);

  // --- Carga y Descarga del Audio ---
  useEffect(() => {
      let isMounted = true;

      const loadSound = async () => {
        if (!audioUrl) {
            setIsLoading(false);
            console.warn("AudioPlayer: No audioUrl provided.");
            if (onError) onError(new Error("No audio URL provided"));
            return;
        }

        setIsLoading(true);
        notifyIsPlaying(false);
        setPlaybackPosition(0);
        setPlaybackDuration(0);
        setPlaybackRate(1.0);
        console.log(`AudioPlayer: Loading ${audioUrl}`);

        try {
          if (soundInstanceRef.current) {
            console.log("AudioPlayer: Unloading previous sound.");
            await soundInstanceRef.current.unloadAsync();
            soundInstanceRef.current = null;
            setSound(null);
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          console.log(`AudioPlayer: Attempting to load with initial rate: ${playbackRate}`);
          const { sound: newSound, status } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            {
              shouldPlay: autoPlay,
              progressUpdateIntervalMillis: 500,
              rate: playbackRate,
              shouldCorrectPitch: true,
              isLooping: false,
            },
            (statusUpdate) => {
              if (isMounted) {
                handlePlaybackStatusUpdate(statusUpdate);
              }
            }
          );

          if (isMounted) {
              console.log("AudioPlayer: Sound loaded. Initial Status:", status);
              soundInstanceRef.current = newSound;
              setSound(newSound);
              if (status.isLoaded) {
                   await newSound.setStatusAsync({ rate: playbackRate, shouldCorrectPitch: true });
              }
          } else {
              console.log("AudioPlayer: Unmounted during load, unloading sound.");
              newSound.unloadAsync();
          }

        } catch (error) {
            console.error('AudioPlayer: Error loading sound:', error);
            if (isMounted) {
                setIsLoading(false);
                notifyIsPlaying(false);
                setSound(null);
                if (onError) onError(error);
            }
        }
      };

      loadSound();

      return () => {
          isMounted = false;
          console.log("AudioPlayer: Unmounting, unloading sound.");
          soundInstanceRef.current?.unloadAsync();
          soundInstanceRef.current = null;
      };
  }, [audioUrl, autoPlay]);

  // --- Effect to apply rate changes ---
   useEffect(() => {
        const applyRate = async () => {
            if (sound && soundInstanceRef.current) {
                try {
                    console.log(`AudioPlayer: Applying rate ${playbackRate}`);
                    await soundInstanceRef.current.setStatusAsync({ 
                        rate: playbackRate, 
                        shouldCorrectPitch: true,
                        isLooping: false
                    });
                } catch (error) {
                    console.error("AudioPlayer: Error setting playback rate:", error);
                    if (onError) onError(new Error(`Failed to set playback rate: ${error.message}`));
                }
            }
        };
        applyRate();
   }, [playbackRate, sound]);

  // --- Manejador de Actualización de Estado ---
  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (onPlaybackStatusUpdateProp) {
        onPlaybackStatusUpdateProp(status);
     }

     if (!status.isLoaded) {
         if (status.error) {
             console.error(`AudioPlayer Playback Error: ${status.error}`);
             setIsLoading(false);
             notifyIsPlaying(false);
             if (onError) onError(new Error(status.error));
         }
         return;
     }

     setIsLoading(status.isBuffering && !status.isPlaying);
     setIsBuffering(status.isBuffering);
     notifyIsPlaying(status.isPlaying);
     setPlaybackDuration(status.durationMillis || 0);
     setPlaybackRate(status.rate);

     if (!isSeeking.current) {
         setPlaybackPosition(status.positionMillis || 0);
     }

     if (status.didJustFinish && !status.isLooping) {
         console.log("AudioPlayer: Playback finished.");
         notifyIsPlaying(false);
         setPlaybackPosition(0);
     }
  }, [onPlaybackStatusUpdateProp, onError]);

  // --- Controles de Reproducción ---
  const handlePlayPause = async () => {
     if (!sound || (isLoading && !isPlaying)) return;
     try {
         if (isPlaying) {
             await sound.pauseAsync();
         } else {
             if (playbackPosition >= playbackDuration - 100 && playbackDuration > 0) {
                 await sound.setPositionAsync(0);
                 await sound.setStatusAsync({ isLooping: false });
             }
             await sound.playAsync();
         }
     } catch (error) {
         console.error("AudioPlayer: Play/Pause error:", error);
         if (onError) onError(error);
     }
  };

  const handleRestart = async () => {
    if (!sound || isLoading) return;
    try {
        await sound.setPositionAsync(0);
        await sound.setStatusAsync({ isLooping: false });
        if(!isPlaying){
             await sound.playAsync();
        }
    } catch (error) {
        console.error("AudioPlayer: Restart error:", error);
        if (onError) onError(error);
    }
  };

  // --- Rate Change Handler ---
  const handleRateChange = (newRate) => {
    if (sound && newRate !== playbackRate) {
        console.log(`AudioPlayer: Setting rate to ${newRate}`);
        setPlaybackRate(newRate);
    }
  };

  // --- Seeking Function ---
  const handleSeek = async (event) => {
    if (!sound || !playbackDuration || progressBarWidth <= 0 || isLoading) {
        console.log("AudioPlayer: Seek aborted (no sound, duration, width, or loading)");
        return;
    }

    try {
        const touchX = event.nativeEvent.locationX;
        const seekRatio = Math.max(0, Math.min(1, touchX / progressBarWidth));
        const seekPositionMillis = Math.floor(seekRatio * playbackDuration);

        console.log(`AudioPlayer: Seeking to ${seekPositionMillis}ms (${(seekRatio * 100).toFixed(1)}%)`);

        setPlaybackPosition(seekPositionMillis);
        await soundInstanceRef.current?.setPositionAsync(seekPositionMillis);

    } catch (error) {
        console.error("AudioPlayer: Seek error:", error);
        if (onError) onError(error);
    }
  };

  // --- Expose methods to parent component ---
  useImperativeHandle(ref, () => ({
    stop: async () => {
      try {
        if (soundInstanceRef.current && isPlaying) {
          console.log("AudioPlayer: Stopping playback via ref method");
          await soundInstanceRef.current.stopAsync();
          await soundInstanceRef.current.setPositionAsync(0);
          await soundInstanceRef.current.setStatusAsync({ isLooping: false });
        }
      } catch (error) {
        console.error("AudioPlayer: Error stopping playback:", error);
      }
    },
    pause: async () => {
      try {
        if (soundInstanceRef.current && isPlaying) {
          console.log("AudioPlayer: Pausing playback via ref method");
          await soundInstanceRef.current.pauseAsync();
        }
      } catch (error) {
        console.error("AudioPlayer: Error pausing playback:", error);
      }
    }
  }));

  // --- Renderizado del Componente ---
  return (
    <View style={styles.audioPlayerContainer}>
      {isLoading && !isPlaying ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.PRIMARY || '#1a3c6e'} />
            <Text style={styles.loadingText}>Cargando audio...</Text>
          </View>
      ) : !sound && !isLoading ? (
          <View style={styles.loadingContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={40}
                color={colors.SECONDARY || '#e63946'}
              />
              <Text style={[styles.loadingText, { marginTop: 10 }]}>Error al cargar audio</Text>
          </View>
      ) : (
        <>
          {/* Controles Play/Pause/Restart */}
          <View style={styles.audioControls}>
             <TouchableOpacity
                style={styles.controlButton}
                onPress={handleRestart}
                disabled={isLoading || isBuffering || !sound}
             >
                <Ionicons
                  name="play-skip-back-outline"
                  size={28}
                  color={!sound ? colors.LIGHT_ACCENT || '#a8dadc' : colors.PRIMARY || '#1a3c6e'}
                />
             </TouchableOpacity>
              <TouchableOpacity
                style={[styles.playPauseButton, (!sound || (isLoading && !isPlaying)) && styles.playPauseDisabled]}
                onPress={handlePlayPause}
                disabled={!sound || (isLoading && !isPlaying)}
              >
                {isBuffering && isPlaying ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Ionicons name={isPlaying ? 'pause-outline' : 'play-outline'} size={36} color="#fff" />
                )}
              </TouchableOpacity>
             <TouchableOpacity
                style={styles.controlButton}
                disabled={true}
             >
                <Ionicons
                  name="play-skip-forward-outline"
                  size={28}
                  color={colors.LIGHT_ACCENT || '#a8dadc'}
                />
             </TouchableOpacity>
          </View>

          {/* Playback Speed Controls */}
          <View style={styles.speedControlsContainer}>
              <Text style={styles.speedLabel}>Velocidad:</Text>
              <View style={styles.speedButtons}>
                {PLAYBACK_RATES.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.speedButton,
                      playbackRate === rate && styles.speedButtonSelected,
                    ]}
                    onPress={() => handleRateChange(rate)}
                    disabled={!sound || isLoading}
                  >
                    <Text
                      style={[
                        styles.speedButtonText,
                        playbackRate === rate && styles.speedButtonTextSelected,
                      ]}
                    >
                      {rate.toFixed(rate === 1.0 || rate === 2.0 ? 1 : 2)}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
          </View>

          {/* Barra de progreso y Tiempos */}
          <View style={styles.progressContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSeek}
              disabled={!sound || isLoading || !playbackDuration}
            >
              <View
                style={styles.progressBarBackground}
                onLayout={(event) => {
                    const { width: barWidth } = event.nativeEvent.layout;
                    setProgressBarWidth(barWidth);
                }}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${playbackDuration > 0 && progressBarWidth > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` }
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.timeInfo}>
              <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
});

// ========================================
// COMPONENTE PRINCIPAL (Decide qué usar)
// ========================================
const AudioPlayer = forwardRef((props, ref) => {
  const { config } = useTenant();
  const colors = config.COLORS || {};
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (Platform.OS === 'web') {
    return <WebAudioPlayer {...props} ref={ref} styles={styles} colors={colors} />;
  }

  return <MobileAudioPlayer {...props} ref={ref} styles={styles} colors={colors} />;
});

AudioPlayer.displayName = 'AudioPlayer';

// Styles (mantener todos los estilos existentes)
const createStyles = (colors) => StyleSheet.create({
  audioPlayerContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    minHeight: 180,
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 15,
    color: colors.DARK_ACCENT || '#457b9d',
    fontSize: 16,
    fontFamily: 'industrial',
    textAlign: 'center',
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 15,
  },
  playPauseButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: colors.PRIMARY || '#1a3c6e',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  playPauseDisabled: {
    backgroundColor: colors.LIGHT_ACCENT || '#a8dadc',
    elevation: 0,
    shadowOpacity: 0,
  },
  controlButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.LIGHT_ACCENT || '#a8dadc'}A0`,
  },
  speedControlsContainer: {
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  speedLabel: {
    fontSize: 13,
    color: colors.DARK_ACCENT || '#457b9d',
    fontFamily: 'industrial',
    marginBottom: 8,
    textAlign: 'center',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  speedButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: `${colors.PRIMARY || '#1a3c6e'}A0`,
    backgroundColor: '#fff',
  },
  speedButtonSelected: {
    backgroundColor: colors.PRIMARY || '#1a3c6e',
    borderColor: colors.PRIMARY || '#1a3c6e',
  },
  speedButtonText: {
    fontSize: 13,
    color: colors.PRIMARY || '#1a3c6e',
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  speedButtonTextSelected: {
    color: '#fff',
  },
  progressContainer: {
      marginTop: 5,
      paddingHorizontal: 5,
  },
  progressBarBackground: {
    height: 16,
    justifyContent: 'center',
    backgroundColor: `${colors.LIGHT_ACCENT || '#a8dadc'}50`,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.PRIMARY || '#1a3c6e',
    borderRadius: 3,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 12,
    color: colors.DARK_ACCENT || '#457b9d',
    fontFamily: 'industrial',
  },
});

export default AudioPlayer;
