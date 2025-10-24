import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import config from '../configThomas.js';

const formatTime = (millis) => {
  if (!millis || millis < 0) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5, 2.0];

const AudioPlayerThomas = forwardRef(({
  audioUrl,
  autoPlay = false,
  onPlaybackStatusUpdateProp,
  onError,
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

  // Animaciones para el modo Thomas
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // --- Animación de pulso para el botón de play ---
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  // --- Animación de rotación para el icono de tren ---
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isPlaying]);

  // --- Carga y Descarga del Audio ---
  useEffect(() => {
      let isMounted = true;

      const loadSound = async () => {
        if (!audioUrl) {
            setIsLoading(false);
            console.warn("AudioPlayerThomas: No audioUrl provided.");
            if (onError) onError(new Error("No audio URL provided"));
            return;
        }

        setIsLoading(true);
        setIsPlaying(false);
        setPlaybackPosition(0);
        setPlaybackDuration(0);
        setPlaybackRate(1.0);
        console.log(`AudioPlayerThomas: Loading ${audioUrl}`);

        try {
          if (soundInstanceRef.current) {
            console.log("AudioPlayerThomas: Unloading previous sound.");
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

          console.log(`AudioPlayerThomas: Attempting to load with initial rate: ${playbackRate}`);
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
              console.log("AudioPlayerThomas: Sound loaded. Initial Status:", status);
              soundInstanceRef.current = newSound;
              setSound(newSound);
              if (status.isLoaded) {
                   await newSound.setStatusAsync({ rate: playbackRate, shouldCorrectPitch: true, isLooping: false });
              }
          } else {
              console.log("AudioPlayerThomas: Unmounted during load, unloading sound.");
              newSound.unloadAsync();
          }

        } catch (error) {
            console.error('AudioPlayerThomas: Error loading sound:', error);
            if (isMounted) {
                setIsLoading(false);
                setIsPlaying(false);
                setSound(null);
                if (onError) onError(error);
            }
        }
      };

      loadSound();

      return () => {
          isMounted = false;
          console.log("AudioPlayerThomas: Unmounting, unloading sound.");
          soundInstanceRef.current?.unloadAsync();
          soundInstanceRef.current = null;
      };
  }, [audioUrl, autoPlay]);

  // --- Effect to apply rate changes ---
   useEffect(() => {
        const applyRate = async () => {
            if (sound && soundInstanceRef.current) {
                try {
                    console.log(`AudioPlayerThomas: Applying rate ${playbackRate}`);
                    await soundInstanceRef.current.setStatusAsync({ 
                        rate: playbackRate, 
                        shouldCorrectPitch: true,
                        isLooping: false
                    });
                } catch (error) {
                    console.error("AudioPlayerThomas: Error setting playback rate:", error);
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
             console.error(`AudioPlayerThomas Playback Error: ${status.error}`);
             setIsLoading(false);
             setIsPlaying(false);
             if (onError) onError(new Error(status.error));
         }
         return;
     }

     setIsLoading(status.isBuffering && !status.isPlaying);
     setIsBuffering(status.isBuffering);
     setIsPlaying(status.isPlaying);
     setPlaybackDuration(status.durationMillis || 0);
     setPlaybackRate(status.rate);

     if (!isSeeking.current) {
         setPlaybackPosition(status.positionMillis || 0);
     }

     if (status.didJustFinish && !status.isLooping) {
         console.log("AudioPlayerThomas: Playback finished.");
         setIsPlaying(false);
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
         console.error("AudioPlayerThomas: Play/Pause error:", error);
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
        console.error("AudioPlayerThomas: Restart error:", error);
        if (onError) onError(error);
    }
  };

  // --- Rate Change Handler ---
  const handleRateChange = (newRate) => {
    if (sound && newRate !== playbackRate) {
        console.log(`AudioPlayerThomas: Setting rate to ${newRate}`);
        setPlaybackRate(newRate);
    }
  };

  // --- Seeking Function ---
  const handleSeek = async (event) => {
    if (!sound || !playbackDuration || progressBarWidth <= 0 || isLoading) {
        console.log("AudioPlayerThomas: Seek aborted (no sound, duration, width, or loading)");
        return;
    }

    try {
        const touchX = event.nativeEvent.locationX;
        const seekRatio = Math.max(0, Math.min(1, touchX / progressBarWidth));
        const seekPositionMillis = Math.floor(seekRatio * playbackDuration);

        console.log(`AudioPlayerThomas: Seeking to ${seekPositionMillis}ms (${(seekRatio * 100).toFixed(1)}%)`);

        setPlaybackPosition(seekPositionMillis);
        await soundInstanceRef.current?.setPositionAsync(seekPositionMillis);

    } catch (error) {
        console.error("AudioPlayerThomas: Seek error:", error);
        if (onError) onError(error);
    }
  };

  // --- Expose methods to parent component ---
  useImperativeHandle(ref, () => ({
    stop: async () => {
      try {
        if (soundInstanceRef.current && isPlaying) {
          console.log("AudioPlayerThomas: Stopping playback via ref method");
          await soundInstanceRef.current.stopAsync();
          await soundInstanceRef.current.setPositionAsync(0);
          await soundInstanceRef.current.setStatusAsync({ isLooping: false });
        }
      } catch (error) {
        console.error("AudioPlayerThomas: Error stopping playback:", error);
      }
    },
    pause: async () => {
      try {
        if (soundInstanceRef.current && isPlaying) {
          console.log("AudioPlayerThomas: Pausing playback via ref method");
          await soundInstanceRef.current.pauseAsync();
        }
      } catch (error) {
        console.error("AudioPlayerThomas: Error pausing playback:", error);
      }
    }
  }));

  // --- Renderizado del Componente ---
  return (
    <View style={styles.audioPlayerContainer}>
      {isLoading && !isPlaying ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={config.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>🚂 Cargando audio...</Text>
          </View>
      ) : !sound && !isLoading ? (
          <View style={styles.loadingContainer}>
              <Ionicons name="train" size={50} color={config.COLORS.SECONDARY} />
              <Text style={[styles.loadingText, { marginTop: 10 }]}>¡Ups! Error al cargar audio</Text>
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
                <Ionicons name="play-skip-back" size={30} color={!sound ? config.COLORS.LIGHT_ACCENT : config.COLORS.PRIMARY} />
             </TouchableOpacity>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.playPauseButton, (!sound || (isLoading && !isPlaying)) && styles.playPauseDisabled]}
                  onPress={handlePlayPause}
                  disabled={!sound || (isLoading && !isPlaying)}
                >
                  {isBuffering && isPlaying ? (
                      <ActivityIndicator size="small" color="#fff" />
                  ) : (
                      <Animated.View style={{ 
                        transform: [{ 
                          rotate: rotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }] 
                      }}>
                        <Ionicons 
                          name={isPlaying ? 'pause' : 'play'} 
                          size={40} 
                          color="#fff" 
                        />
                      </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
             <TouchableOpacity
                style={styles.controlButton}
                disabled={true}
             >
                <Ionicons name="play-skip-forward" size={30} color={config.COLORS.LIGHT_ACCENT} />
             </TouchableOpacity>
          </View>

          {/* Playback Speed Controls */}
          <View style={styles.speedControlsContainer}>
              <Text style={styles.speedLabel}>🚀 Velocidad:</Text>
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
              <Text style={styles.timeText}>⏱️ {formatTime(playbackPosition)}</Text>
              <Text style={styles.timeText}>⏱️ {formatTime(playbackDuration)}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
});

AudioPlayerThomas.displayName = 'AudioPlayerThomas';

// Styles específicos para el modo Thomas
const styles = StyleSheet.create({
  audioPlayerContainer: {
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 25,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 200,
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: config.COLORS.PRIMARY + '30',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 15,
    color: config.COLORS.DARK_ACCENT,
    fontSize: 18,
    fontFamily: 'industrial',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: config.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: config.COLORS.THOMAS_BLUE,
  },
  playPauseDisabled: {
    backgroundColor: config.COLORS.LIGHT_ACCENT,
    elevation: 0,
    shadowOpacity: 0,
    borderColor: config.COLORS.LIGHT_ACCENT,
  },
  controlButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: config.COLORS.LIGHT_ACCENT + 'A0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speedControlsContainer: {
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  speedLabel: {
    fontSize: 16,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  speedButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  speedButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: config.COLORS.PRIMARY + 'A0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  speedButtonSelected: {
    backgroundColor: config.COLORS.PRIMARY,
    borderColor: config.COLORS.PRIMARY,
    transform: [{ scale: 1.1 }],
  },
  speedButtonText: {
    fontSize: 14,
    color: config.COLORS.PRIMARY,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
  speedButtonTextSelected: {
    color: '#fff',
  },
  progressContainer: {
    marginTop: 10,
    paddingHorizontal: 10,
  },
  progressBarBackground: {
    height: 20,
    justifyContent: 'center',
    backgroundColor: config.COLORS.LIGHT_ACCENT + '60',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: config.COLORS.PRIMARY + '30',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: config.COLORS.PRIMARY,
    borderRadius: 4,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeText: {
    fontSize: 14,
    color: config.COLORS.DARK_ACCENT,
    fontFamily: 'industrial',
    fontWeight: 'bold',
  },
});

export default AudioPlayerThomas; 