import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const useDisableBrowserBack = (tip?: string) => {
  const location = useLocation();
  const isFirstMount = useRef(true);
  const isProgrammaticNavigation = useRef(false);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isProgrammaticNavigation.current) {
        isProgrammaticNavigation.current = false;
        return;
      }

      e.preventDefault();
      window.history.pushState(
        { key: location.key },
        document.title,
        window.location.href
      );
      if (tip) {
        alert(tip);
      }
    };

    if (isFirstMount.current) {
      window.history.pushState(
        { key: location.key },
        document.title,
        window.location.href
      );
      isFirstMount.current = false;
    }

    window.addEventListener('popstate', handlePopState, { capture: true });

    const handleLocationChange = () => {
      isProgrammaticNavigation.current = true;
    };
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handlePopState, { capture: true });
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [location.key, location.pathname, tip]);
};

export default useDisableBrowserBack;