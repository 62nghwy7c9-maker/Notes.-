import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './ThemeProvider.js';
import { AppLayout } from './AppLayout.js';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />} />
          <Route path="*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
