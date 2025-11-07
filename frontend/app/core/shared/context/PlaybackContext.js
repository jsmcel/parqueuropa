import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PlaybackContext = createContext({
  isPlaying: false,
  currentPieceId: null,
  setPlaybackState: () => {},
});

export const PlaybackProvider = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPieceId, setCurrentPieceId] = useState(null);

  const setPlaybackState = useCallback((playing, pieceId = null) => {
    setIsPlaying(!!playing);
    if (pieceId !== undefined) {
      setCurrentPieceId(pieceId);
    } else if (!playing) {
      setCurrentPieceId(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      isPlaying,
      currentPieceId,
      setPlaybackState,
    }),
    [isPlaying, currentPieceId, setPlaybackState],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = () => useContext(PlaybackContext);
