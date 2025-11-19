import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Library from './pages/Library';
import Reader from './pages/Reader';
import Vocabulary from './pages/Vocabulary';
import Import from './pages/Import';
import Review from './pages/Review';
import { VocabularyProvider } from './context/VocabularyContext';
import { ArticleProvider } from './context/ArticleContext';
import { SettingsProvider } from './context/SettingsContext';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-brand-600 tracking-tight hover:text-brand-700">
            LingQ
          </Link>
          <div className="space-x-4">
            <Link to="/review" className="text-gray-600 hover:text-brand-600 font-medium">Review</Link>
            <Link to="/import" className="text-gray-600 hover:text-brand-600 font-medium">Import</Link>
          </div>
        </div>
      </nav>
      <main>
        <SettingsProvider>
          <VocabularyProvider>
            <ArticleProvider>
              <Routes>
                <Route path="/" element={<Library />} />
                <Route path="/import" element={<Import />} />
                <Route path="/review" element={<Review />} />
                <Route path="/read/:id" element={<Reader />} />
                <Route path="/vocabulary" element={<Vocabulary />} />
              </Routes>
            </ArticleProvider>
          </VocabularyProvider>
        </SettingsProvider>
      </main>
    </div>
  );
}

export default App;
