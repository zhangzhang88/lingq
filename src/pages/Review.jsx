import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useVocabulary } from '../context/VocabularyContext';
import { useSettings } from '../context/SettingsContext';
import { translateText, playTextToSpeech, getDictionaryData } from '../services/TranslationService';

export default function Review() {
    const { vocabulary, updateStatus, getCachedWordTranslation, saveWordTranslation } = useVocabulary();
    const { settings } = useSettings();
    const translationProvider = settings.translationProvider || 'default';
    const translationOptions = {
        provider: translationProvider,
        deepseekApiKey: settings.deepseekApiKey,
        deepseekModel: settings.deepseekModel
    };

    // Filter words that need review (status 1-4)
    const reviewList = Object.entries(vocabulary)
        .map(([word, data]) => {
            const status = typeof data === 'object' ? data.status : data;
            const sentence = typeof data === 'object' ? data.sentence : null;
            const translation = typeof data === 'object' ? data.translation : null;
            const phonetic = typeof data === 'object' ? data.phonetic : null;
            return { word, status, sentence, translation, phonetic };
        })
        .filter(item => item.status >= 1 && item.status <= 4);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [finished, setFinished] = useState(false);
    const [fetchedTranslation, setFetchedTranslation] = useState(null);
    const [fetchedPhonetic, setFetchedPhonetic] = useState(null);
    const [loading, setLoading] = useState(false);

    const currentWord = reviewList[currentIndex];

    // Reset fetched data when word changes
    useEffect(() => {
        setFetchedTranslation(null);
        setFetchedPhonetic(null);
        setShowAnswer(false);
    }, [currentIndex]);

    const handleShowAnswer = async () => {
        setShowAnswer(true);

        // If no cached translation, fetch it now
        if (!currentWord.translation && !fetchedTranslation) {
            const cached = getCachedWordTranslation(currentWord.word, 'zh-Hans', translationProvider);
            if (cached?.text) {
                setFetchedTranslation(cached.text);
                return;
            }
            setLoading(true);
            try {
                const [transResult, dictResult] = await Promise.all([
                    translateText(currentWord.word, 'English', 'zh-Hans', translationOptions),
                    getDictionaryData(currentWord.word, 'English', settings.accent)
                ]);
                setFetchedTranslation(transResult?.text || null);
                if (transResult?.text) {
                    saveWordTranslation(currentWord.word, transResult, 'zh-Hans', translationProvider);
                }
                setFetchedPhonetic(dictResult?.phonetic || null);
            } catch (err) {
                console.error('Failed to fetch translation:', err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePlayAudio = () => {
        if (currentWord) {
            playTextToSpeech(currentWord.word, 'English', settings.accent);
        }
    };

    const handleNext = (newStatus) => {
        updateStatus(currentWord.word, newStatus, currentWord.sentence);
        if (currentIndex < reviewList.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowAnswer(false);
        } else {
            setFinished(true);
        }
    };

    if (reviewList.length === 0) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center pt-20 text-gray-900 dark:text-gray-100">
                <div className="text-6xl mb-6">🎉</div>
                <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">All Caught Up!</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">You have no words to review right now.</p>
                <Link to="/" className="inline-block bg-brand-600 text-white px-8 py-3 rounded-full font-bold hover:bg-brand-700 transition-colors shadow-lg hover:shadow-xl">
                    Read More Articles
                </Link>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center pt-20 text-gray-900 dark:text-gray-100">
                <div className="text-6xl mb-6">🌟</div>
                <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Session Complete!</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">You reviewed {reviewList.length} words today.</p>
                <button
                    onClick={() => {
                        setFinished(false);
                        setCurrentIndex(0);
                        setShowAnswer(false);
                    }}
                    className="bg-brand-600 text-white px-8 py-3 rounded-full font-bold hover:bg-brand-700 transition-colors shadow-lg"
                >
                    Review Again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 flex flex-col items-center min-h-[80vh] justify-center text-gray-900 dark:text-gray-100">
            <div className="w-full max-w-md">
                {/* Back button */}
                <div className="mb-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors text-sm font-medium"
                    >
                        <span>←</span>
                        <span>Back to Library</span>
                    </Link>
                </div>

                <div className="mb-6 flex justify-between text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <span>Word {currentIndex + 1} / {reviewList.length}</span>
                    <span>Level {currentWord.status}</span>
                </div>

                {/* Flashcard */}
                <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 mb-8 min-h-[320px] flex flex-col justify-center">
                    {/* Word (always visible) */}
                    <div className="text-center mb-6">
                        <h2 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-3 tracking-tight">
                            {currentWord.word}
                        </h2>

                        {/* Phonetic (if cached or fetched) */}
                        {(currentWord.phonetic || fetchedPhonetic) && (
                            <div className="text-gray-500 dark:text-gray-400 text-lg font-mono mb-4">
                                [{currentWord.phonetic || fetchedPhonetic}]
                            </div>
                        )}

                        {/* Audio button */}
                        <button
                            onClick={handlePlayAudio}
                            className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/30 text-gray-400 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-300 flex items-center justify-center transition-colors mx-auto"
                        >
                            <span className="text-2xl">🔊</span>
                        </button>
                    </div>

                    {/* Answer section (shown after clicking) */}
                    {showAnswer && (
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6">
                            {loading ? (
                                <div className="text-center text-gray-400 dark:text-gray-500 animate-pulse">
                                    Translating...
                                </div>
                            ) : (currentWord.translation || fetchedTranslation) ? (
                                <>
                                    <div className="text-3xl font-medium text-brand-700 dark:text-brand-300 mb-4 text-center">
                                        {currentWord.translation || fetchedTranslation}
                                    </div>

                                    {currentWord.sentence && (
                                        <div className="text-gray-500 dark:text-gray-300 italic text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                                            "{currentWord.sentence}"
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-400 dark:text-gray-500 text-sm">
                                    Translation not available
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="mt-6">
                    {showAnswer ? (
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { lvl: 1, color: 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50', label: 'Hard' },
                                { lvl: 2, color: 'bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-900/50', label: 'So-so' },
                                { lvl: 3, color: 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50', label: 'Good' },
                                { lvl: 4, color: 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50', label: 'Easy' }
                            ].map((btn) => (
                                <button
                                    key={btn.lvl}
                                    onClick={() => handleNext(btn.lvl)}
                                    className={`
                                        flex flex-col items-center justify-center py-4 rounded-2xl font-bold transition-all transform hover:scale-105 active:scale-95
                                        ${btn.color}
                                    `}
                                >
                                    <span className="text-2xl mb-1">{btn.lvl}</span>
                                    <span className="text-xs opacity-80 uppercase tracking-wide">{btn.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <button
                            onClick={handleShowAnswer}
                            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-gray-800 dark:bg-brand-600 dark:hover:bg-brand-500 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Show Answer
                        </button>
                    )}

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => handleNext(5)}
                            className="text-sm text-gray-400 dark:text-gray-500 hover:text-brand-600 dark:hover:text-brand-300 font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <span>I know this word</span>
                            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">Archive</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
