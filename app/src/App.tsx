import { useEffect, useState } from 'react';
import Loader from './components/Loader/Loader';
import Nav from './components/Nav/Nav';
import Hero from './components/Hero/Hero';
import Cursor from './components/Cursor/Cursor';
import Scene from './components/Scene/Scene';
import { useSiteStore } from './state/useSiteStore';
import { useSmoothScroll } from './lib/useSmoothScroll';

export default function App() {
  const [ready, setReady] = useState(false);
  const theme = useSiteStore((s) => s.theme);
  const motionLevel = useSiteStore((s) => s.motionLevel);

  // Apply the persisted theme/motion level to <html> before first paint-affecting
  // render, same as the old site's inline bootstrap script did.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-motion', String(motionLevel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSmoothScroll();

  return (
    <>
      {!ready && <Loader portraitSrc="/assets/portrait.webp" onDone={() => setReady(true)} />}
      <Scene />
      <Cursor />
      <Nav />
      <Hero ready={ready} />
    </>
  );
}
