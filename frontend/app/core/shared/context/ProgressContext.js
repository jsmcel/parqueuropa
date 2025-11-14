import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTenant } from './TenantContext.js';

const ProgressContext = createContext({
  isStopVisited: () => false,
  markStopVisited: () => {},
  resetVisitedStops: () => {},
  itineraryStops: [],
  getStopOrder: () => null,
  getStopMeta: () => null,
  lastCompletedOrder: null,
});

export const normalizeStopId = (value) => {
  if (value == null) return '';
  return String(value).trim().toLowerCase();
};

const serializeVisited = (visitedSet = new Set()) =>
  JSON.stringify(Array.from(visitedSet));

export function ProgressProvider({ children }) {
  const { id: tenantId, config } = useTenant();
  const [visitedStops, setVisitedStops] = useState(() => new Set());
  const storageKey = useMemo(
    () => `visitedStops:${tenantId}`,
    [tenantId],
  );

  const itineraryStops = useMemo(() => {
    const rawStops = Array.isArray(config?.ITINERARY_STOPS)
      ? config.ITINERARY_STOPS
      : [];
    return rawStops
      .map((stop, index) => {
        const stopId =
          stop?.id ||
          stop?.slug ||
          stop?.pieceId ||
          stop?.identifier ||
          null;
        if (!stopId) return null;
        const normalizedId = normalizeStopId(stopId);
        const order =
          typeof stop?.order === 'number'
            ? stop.order
            : typeof stop?.itineraryOrder === 'number'
            ? stop.itineraryOrder
            : index + 1;
        return {
          id: stopId,
          normalizedId,
          order,
          data: stop,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }, [config?.ITINERARY_STOPS]);

  const itineraryMap = useMemo(() => {
    const map = new Map();
    itineraryStops.forEach((entry) => {
      if (entry.normalizedId) {
        map.set(entry.normalizedId, entry);
      }
    });
    return map;
  }, [itineraryStops]);

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!isMounted) return;
        if (value) {
          try {
            const parsed = JSON.parse(value);
            const next = Array.isArray(parsed) ? parsed : [];
            setVisitedStops(new Set(next.map((item) => normalizeStopId(item))));
          } catch (error) {
            console.warn(
              'ProgressContext: Failed to parse visited stops',
              error,
            );
            setVisitedStops(new Set());
          }
        } else {
          setVisitedStops(new Set());
        }
      })
      .catch((error) => {
        console.warn(
          'ProgressContext: Unable to load visited stops from storage',
          error,
        );
        setVisitedStops(new Set());
      });

    return () => {
      isMounted = false;
    };
  }, [storageKey]);

  const persistVisited = useCallback(
    (nextSet) => {
      AsyncStorage.setItem(storageKey, serializeVisited(nextSet)).catch(
        (error) => {
          console.warn(
            'ProgressContext: Failed to persist visited stops',
            error,
          );
        },
      );
    },
    [storageKey],
  );

  const markStopVisited = useCallback(
    (stopId) => {
      const normalized = normalizeStopId(stopId);
      if (!normalized) return;
      setVisitedStops((prev) => {
        if (prev.has(normalized)) return prev;
        const next = new Set(prev);
        next.add(normalized);
        persistVisited(next);
        return next;
      });
    },
    [persistVisited],
  );

  const resetVisitedStops = useCallback(() => {
    setVisitedStops(() => {
      const empty = new Set();
      persistVisited(empty);
      return empty;
    });
  }, [persistVisited]);

  const isStopVisited = useCallback(
    (stopId) => {
      const normalized = normalizeStopId(stopId);
      if (!normalized) return false;
      return visitedStops.has(normalized);
    },
    [visitedStops],
  );

  const getStopMeta = useCallback(
    (stopId) => {
      const normalized = normalizeStopId(stopId);
      if (!normalized) return null;
      return itineraryMap.get(normalized) || null;
    },
    [itineraryMap],
  );

  const getStopOrder = useCallback(
    (stopId) => {
      const entry = getStopMeta(stopId);
      return entry ? entry.order : null;
    },
    [getStopMeta],
  );

  const lastCompletedOrder = useMemo(() => {
    let maxOrder = null;
    visitedStops.forEach((normalizedId) => {
      const entry = itineraryMap.get(normalizedId);
      if (entry) {
        if (maxOrder === null || entry.order > maxOrder) {
          maxOrder = entry.order;
        }
      }
    });
    return maxOrder;
  }, [visitedStops, itineraryMap]);

  const contextValue = useMemo(
    () => ({
      isStopVisited,
      markStopVisited,
      resetVisitedStops,
      itineraryStops,
      getStopOrder,
      getStopMeta,
      lastCompletedOrder,
    }),
    [
      isStopVisited,
      markStopVisited,
      resetVisitedStops,
      itineraryStops,
      getStopOrder,
      getStopMeta,
      lastCompletedOrder,
    ],
  );

  return (
    <ProgressContext.Provider value={contextValue}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
