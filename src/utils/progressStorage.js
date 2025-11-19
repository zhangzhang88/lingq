const STORAGE_KEY = 'lingq_article_progress';

const readProgress = () => {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.warn('Failed to read article progress', err);
        return {};
    }
};

const writeProgress = (data) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.warn('Failed to write article progress', err);
    }
};

export const getArticleProgress = (articleId) => {
    if (!articleId) return 0;
    const data = readProgress();
    return data[articleId] || 0;
};

export const setArticleProgress = (articleId, completedSentences = 0) => {
    if (!articleId) return;
    const data = readProgress();
    const nextValue = Math.max(0, completedSentences);
    data[articleId] = nextValue;
    writeProgress(data);
};
