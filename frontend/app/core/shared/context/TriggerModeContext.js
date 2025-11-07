import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gpsTriggerMode';

const TriggerModeContext = createContext({
  mode: 'auto',
  setMode: () => {},
});

export const TriggerModeProvider = ({ children }) => {
  const [mode, setMode] = useState('auto');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && (saved === 'auto' || saved === 'manual') && isMounted) {
          setMode(saved);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const updateMode = useCallback(async (nextMode) => {
    const normalized = nextMode === 'manual' ? 'manual' : 'auto';
    setMode(normalized);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, normalized);
    } catch (error) {
      console.warn('TriggerModeProvider: Failed to persist trigger mode', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode: updateMode,
    }),
    [mode, updateMode],
  );

  return (
    <TriggerModeContext.Provider value={value}>
      {children}
    </TriggerModeContext.Provider>
  );
};

export const useTriggerMode = () => useContext(TriggerModeContext);
