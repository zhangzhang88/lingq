const WORD_SPLIT_REGEX = /([a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*)/;
const WORD_ONLY_REGEX = /^[a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*$/;

export const getArticleStats = (article, getStatus) => {
    const words = article.content
        .split(WORD_SPLIT_REGEX)
        .filter(t => WORD_ONLY_REGEX.test(t.toLowerCase()));
    const uniqueWords = [...new Set(words)];

    const stats = {
        total: uniqueWords.length,
        newWords: 0,
        lingqs: 0,
        known: 0,
        unknown: 0
    };

    uniqueWords.forEach(word => {
        const status = getStatus(word);
        if (status === undefined || status === 0) {
            stats.newWords += 1;
        } else if (status === 5) {
            stats.known += 1;
        } else if (status === 1) {
            stats.unknown += 1;
        } else if (status >= 2 && status <= 4) {
            stats.lingqs += 1;
        }
    });

    stats.newPercent = stats.total > 0 ? Math.round((stats.newWords / stats.total) * 100) : 0;
    return stats;
};

export const splitSentences = (text = '') => {
    return text
        .replace(/\r?\n+/g, ' ')
        .split(/(?<=[.!?。！？])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
};
