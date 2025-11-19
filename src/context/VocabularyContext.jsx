import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { mockVocabulary } from '../store/mockData';

const VocabularyContext = createContext();
const defaultTranslationCache = {
    words: {},
    sentences: {}
};

const normalizeLang = (lang) => {
    if (!lang) return 'zh-Hans';
    const lower = lang.toLowerCase();
    if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans') return 'zh-Hans';
    return lang;
};

const buildWordKey = (word, lang) => {
    if (!word) return null;
    return `${word.toLowerCase()}::${normalizeLang(lang)}`;
};

const buildSentenceKey = (sentence, lang) => {
    if (!sentence) return null;
    return `${sentence.trim()}::${normalizeLang(lang)}`;
};

const normalizeProvider = (provider) => {
    if (!provider) return 'default';
    const value = String(provider).toLowerCase();
    if (value.includes('custom') || value.includes('自定义')) return 'custom';
    if (value.includes('deepseek')) return 'deepseek';
    if (value.includes('default') || value.includes('mymemory') || value.includes('免费')) return 'default';
    return 'default';
};

export function VocabularyProvider({ children }) {
    const [vocabulary, setVocabulary] = useState(() => {
        const saved = localStorage.getItem('lingq_vocabulary');
        return saved ? JSON.parse(saved) : mockVocabulary;
    });

    const [translationCache, setTranslationCache] = useState(() => {
        const saved = localStorage.getItem('lingq_translation_cache');
        return saved ? { ...defaultTranslationCache, ...JSON.parse(saved) } : defaultTranslationCache;
    });

    useEffect(() => {
        localStorage.setItem('lingq_vocabulary', JSON.stringify(vocabulary));
    }, [vocabulary]);

    useEffect(() => {
        localStorage.setItem('lingq_translation_cache', JSON.stringify(translationCache));
    }, [translationCache]);

    const saveWordTranslation = useCallback((word, translation, targetLang = 'zh-Hans', provider = 'default') => {
        if (!word || !translation?.text) return;
        const key = buildWordKey(word, targetLang);
        if (!key) return;
        const normalizedProvider = normalizeProvider(provider || translation?.provider || translation?.source);
        setTranslationCache(prev => ({
            ...prev,
            words: {
                ...prev.words,
                [key]: {
                    text: translation.text,
                    source: translation.source,
                    provider: normalizedProvider,
                    cachedAt: Date.now(),
                    targetLang: normalizeLang(targetLang)
                }
            }
        }));
    }, []);

    const saveSentenceTranslation = useCallback((sentence, translation, targetLang = 'zh-Hans', provider = 'default') => {
        if (!sentence || !translation?.text) return;
        const key = buildSentenceKey(sentence, targetLang);
        if (!key) return;
        const normalizedProvider = normalizeProvider(provider || translation?.provider || translation?.source);
        setTranslationCache(prev => ({
            ...prev,
            sentences: {
                ...prev.sentences,
                [key]: {
                    text: translation.text,
                    source: translation.source,
                    provider: normalizedProvider,
                    cachedAt: Date.now(),
                    targetLang: normalizeLang(targetLang)
                }
            }
        }));
    }, []);

    const getCachedWordTranslation = useCallback((word, targetLang = 'zh-Hans', provider = 'default') => {
        const key = buildWordKey(word, targetLang);
        if (!key) return null;
        const entry = translationCache.words[key];
        if (!entry) return null;
        const entryProvider = entry.provider || 'default';
        if (provider && normalizeProvider(provider) !== entryProvider) {
            return null;
        }
        return entry;
    }, [translationCache.words]);

    const getCachedSentenceTranslation = useCallback((sentence, targetLang = 'zh-Hans', provider = 'default') => {
        const key = buildSentenceKey(sentence, targetLang);
        if (!key) return null;
        const entry = translationCache.sentences[key];
        if (!entry) return null;
        const entryProvider = entry.provider || 'default';
        if (provider && normalizeProvider(provider) !== entryProvider) {
            return null;
        }
        return entry.text;
    }, [translationCache.sentences]);

    const updateStatus = useCallback((word, status, sentence = null, translation = null, phonetic = null, translationSource = null) => {
        const normalizedSource = translation ? (translationSource ? normalizeProvider(translationSource) : 'custom') : null;
        setVocabulary(prev => {
            const current = prev[word];
            const currentData = typeof current === 'object' ? current : { status: current };

            return {
                ...prev,
                [word]: {
                    ...currentData,
                    status,
                    sentence: sentence || currentData.sentence,
                    translation: translation || currentData.translation,
                    translationSource: translation
                        ? normalizedSource
                        : currentData.translationSource,
                    phonetic: phonetic || currentData.phonetic,
                    lastReviewed: Date.now()
                }
            };
        });
    }, []);

    const getStatus = useCallback((word) => {
        const entry = vocabulary[word];
        if (entry === undefined) return 0;
        return typeof entry === 'object' ? entry.status : entry;
    }, [vocabulary]);

    const getWordData = useCallback((word) => {
        const entry = vocabulary[word];
        return typeof entry === 'object' ? entry : { status: entry };
    }, [vocabulary]);

    return (
        <VocabularyContext.Provider value={{
            vocabulary,
            updateStatus,
            getStatus,
            getWordData,
            saveWordTranslation,
            saveSentenceTranslation,
            getCachedWordTranslation,
            getCachedSentenceTranslation
        }}>
            {children}
        </VocabularyContext.Provider>
    );
}

export function useVocabulary() {
    return useContext(VocabularyContext);
}
