import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { LazyMotion, MotionConfig } from 'motion/react';
import '@fontsource/lexend/latin-400.css';
import '@fontsource/lexend/latin-500.css';
import './styles/index.css';
import { App } from './app/App';
import { CalScreen, ExtrasScreen } from './app/routes';
import { TasksScreen } from './screens/TasksScreen';
import { AffirmScreen } from './screens/AffirmScreen';
import { DataProvider } from './data/DataProvider';
import { DayProvider } from './data/DayProvider';
import { registerServiceWorker } from './pwa';
import { dismissSplash } from './lib/splash';

const loadMotionFeatures = () => import('./lib/motionFeatures').then((mod) => mod.default);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <DataProvider>
            <DayProvider>
              <Routes>
                <Route element={<App />}>
                  <Route index element={<TasksScreen />} />
                  <Route path="affirm" element={<AffirmScreen />} />
                  <Route path="cal" element={<CalScreen />} />
                  <Route path="extras" element={<ExtrasScreen />} />
                  <Route path="*" element={<TasksScreen />} />
                </Route>
              </Routes>
            </DayProvider>
          </DataProvider>
        </BrowserRouter>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);

dismissSplash();
registerServiceWorker();
