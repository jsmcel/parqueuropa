import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchTenantMediaManifest,
  clearMediaCache,
} from '../services/mediaService.js';

const TenantMediaContext = createContext({
  status: 'idle',
  data: null,
  error: null,
});

export function TenantMediaProvider({ tenantDescriptor, children }) {
  const tenantId = tenantDescriptor?.id;
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    if (!tenantId) {
      setState({
        status: 'error',
        data: null,
        error: new Error('Tenant no definido'),
      });
      return undefined;
    }

    setState({ status: 'loading', data: null, error: null });

    fetchTenantMediaManifest(tenantId)
      .then((data) => {
        if (isMounted) {
          setState({ status: 'ready', data, error: null });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({ status: 'error', data: null, error });
        }
      });

    return () => {
      isMounted = false;
      clearMediaCache();
    };
  }, [tenantId]);

  return (
    <TenantMediaContext.Provider value={state}>
      {children}
    </TenantMediaContext.Provider>
  );
}

export function useTenantMedia() {
  const context = useContext(TenantMediaContext);
  if (!context) {
    throw new Error('useTenantMedia debe usarse dentro de TenantMediaProvider');
  }
  return context;
}
