const STORAGE_KEY = 'lingq_sentence_translation_cache';

const readCache = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) return {};
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.warn('Failed to read sentence translation cache', err);
        return {};
    }
};

const writeCache = (cache) => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (err) {
        console.warn('Failed to write sentence translation cache', err);
    }
};

const buildKey = (sentence = '', language = '') => {
    const lang = language || 'unknown';
    return `${lang}::${sentence.trim()}`;
};

export const getSentenceTranslationFromCache = (sentence, language = '') => {
    if (!sentence) return undefined;
    const cache = readCache();
    const key = buildKey(sentence, language);
    return cache[key];
};

export const setSentenceTranslationInCache = (sentence, language = '', translation) => {
    if (!sentence) return;
    const cache = readCache();
    const key = buildKey(sentence, language);
    if (translation === undefined || translation === null) {
        delete cache[key];
    } else {
        cache[key] = translation;
    }
    writeCache(cache);
};

export const buildSentenceTranslationMap = (sentences = [], language = '') => {
    const cache = readCache();
    const map = {};
    sentences.forEach((sentence, idx) => {
        if (!sentence) return;
        const key = buildKey(sentence, language);
        if (cache[key] !== undefined) {
            map[idx] = cache[key];
        }
    });
    return map;
};
