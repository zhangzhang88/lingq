const LOCAL_KEYS = {
    articles: 'lingq_articles',
    vocabulary: 'lingq_vocabulary',
    translationCache: 'lingq_translation_cache',
    settings: 'lingq_settings',
    articleProgress: 'lingq_article_progress'
};

const SESSION_KEYS = {
    sentenceCache: 'lingq_sentence_translation_cache'
};

const readJSON = (storage, key) => {
    if (!storage) return null;
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.warn(`Failed to read storage key "${key}"`, err);
        return null;
    }
};

const writeJSON = (storage, key, value) => {
    if (!storage) return;
    try {
        if (value === undefined || value === null) {
            storage.removeItem(key);
        } else {
            storage.setItem(key, JSON.stringify(value));
        }
    } catch (err) {
        console.warn(`Failed to write storage key "${key}"`, err);
    }
};

export const exportUserData = () => {
    if (typeof window === 'undefined') return null;
    const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        local: {},
        session: {}
    };

    const localStorageAvailable = window.localStorage;
    const sessionStorageAvailable = window.sessionStorage;

    Object.entries(LOCAL_KEYS).forEach(([label, key]) => {
        payload.local[label] = readJSON(localStorageAvailable, key);
    });

    Object.entries(SESSION_KEYS).forEach(([label, key]) => {
        payload.session[label] = readJSON(sessionStorageAvailable, key);
    });

    return payload;
};

export const importUserData = (payload) => {
    if (typeof window === 'undefined' || !payload) return;
    const local = payload.local || {};
    const session = payload.session || {};

    Object.entries(LOCAL_KEYS).forEach(([label, key]) => {
        if (local.hasOwnProperty(label)) {
            writeJSON(window.localStorage, key, local[label]);
        }
    });

    Object.entries(SESSION_KEYS).forEach(([label, key]) => {
        if (session.hasOwnProperty(label)) {
            writeJSON(window.sessionStorage, key, session[label]);
        }
    });
};
