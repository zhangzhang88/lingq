import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Library from './pages/Library';
import Reader from './pages/Reader';
import Vocabulary from './pages/Vocabulary';
import Import from './pages/Import';
import Review from './pages/Review';
import Course from './pages/Course';
import { VocabularyProvider } from './context/VocabularyContext';
import { ArticleProvider } from './context/ArticleContext';
import { SettingsProvider } from './context/SettingsContext';
import { useSettings } from './context/SettingsContext';

const ThemeToggle = () => {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === 'dark';

  const handleToggle = () => {
    updateSetting('theme', isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={handleToggle}
      className="ml-4 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="切换主题"
    >
      {isDark ? '🌙 暗黑' : '☀️ 亮色'}
    </button>
  );
};

function AppShell() {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans dark:bg-gray-950 dark:text-gray-100 transition-colors">
        <nav className="bg-white/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 px-6 py-4 sticky top-0 z-50 backdrop-blur">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-brand-600 tracking-tight hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200">
              LingQ
            </Link>
            <div className="flex items-center space-x-4">
              <Link to="/review" className="text-gray-600 hover:text-brand-600 font-medium dark:text-gray-200 dark:hover:text-brand-300">复习</Link>
              <Link to="/import" className="text-gray-600 hover:text-brand-600 font-medium dark:text-gray-200 dark:hover:text-brand-300">制作课程</Link>
              <ThemeToggle />
            </div>
          </div>
        </nav>
        <main>
          <VocabularyProvider>
            <ArticleProvider>
              <Routes>
                <Route path="/" element={<Library />} />
                <Route path="/import" element={<Import />} />
                <Route path="/review" element={<Review />} />
                <Route path="/course/:courseId" element={<Course />} />
                <Route path="/read/:id" element={<Reader />} />
                <Route path="/vocabulary" element={<Vocabulary />} />
              </Routes>
            </ArticleProvider>
          </VocabularyProvider>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

export default App;
