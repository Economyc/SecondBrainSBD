import { useLocation } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [transitionState, setTransitionState] = useState<'enter' | 'exit' | 'idle'>('enter');
  const prevPathRef = useRef(location.pathname);
  const [displayKey, setDisplayKey] = useState(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      setTransitionState('exit');
      const timer = setTimeout(() => {
        prevPathRef.current = location.pathname;
        setDisplayKey(location.pathname);
        setTransitionState('enter');
        const enterTimer = setTimeout(() => setTransitionState('idle'), 250);
        return () => clearTimeout(enterTimer);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Initial mount
  useEffect(() => {
    const timer = setTimeout(() => setTransitionState('idle'), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{
        opacity: transitionState === 'exit' ? 0 : 1,
        transform: transitionState === 'exit'
          ? 'translateY(-4px)'
          : 'translateY(0)',
      }}
    >
      {children}
    </div>
  );
}
