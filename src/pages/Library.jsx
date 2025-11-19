import React from 'react';
import { Link } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';
import { useVocabulary } from '../context/VocabularyContext';
import { getArticleProgress } from '../utils/progressStorage';

const WORD_SPLIT_REGEX = /([a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*)/;
const WORD_ONLY_REGEX = /^[a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*$/;

const getArticleStats = (article, getStatus) => {
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

const splitSentences = (text) => {
    return text
        .replace(/\r?\n+/g, ' ')
        .split(/(?<=[.!?。！？])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
};

export default function Library() {
    const { articles, deleteArticle } = useArticles();
    const { getStatus } = useVocabulary();

    const handleDelete = (e, articleId, articleTitle) => {
        e.preventDefault();
        if (window.confirm(`确定要删除文章 "${articleTitle}" 吗？`)) {
            deleteArticle(articleId);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8  flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Library</h1>
                <Link to="/vocabulary" className="text-brand-600 dark:text-brand-300 hover:underline font-medium">
                    My Vocabulary
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => {
                    const stats = getArticleStats(article, getStatus);
                    const sentences = splitSentences(article.content);
                    const completed = getArticleProgress(article.id);
                    const progressPercent = sentences.length > 0
                        ? Math.min(100, Math.round((completed / sentences.length) * 100))
                        : 0;

                    return (
                        <div key={article.id} className="group relative">
                            <Link to={`/read/${article.id}`}>
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-800">
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
                                        <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs font-bold text-gray-700 dark:text-gray-100">
                                            {article.language}
                                        </div>
                                        <div className="absolute bottom-2 left-2 right-2 space-y-1 text-[11px] font-medium text-white">
                                        <div className="bg-black/50 rounded-full px-4 py-1 backdrop-blur flex items-center gap-4">
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-300 border border-blue-400" />
                                                <span>{stats.newWords} 新词</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-400" />
                                                <span>{stats.lingqs} LingQs</span>
                                            </span>
                                        </div>
                                            <div className="bg-black/40 rounded-full px-3 py-1 flex items-center gap-2 backdrop-blur">
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded-full bg-white border border-gray-200" />
                                                    <span>{stats.known} 已知词</span>
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="w-3 h-3 rounded-full bg-red-300 border border-red-400" />
                                                    <span>{stats.unknown} 困难</span>
                                                </span>
                                                <span className="ml-2 text-brand-100">{stats.newPercent}% 新词</span>
                                            </div>
                                            <div className="bg-black/30 rounded-full w-full overflow-hidden h-1.5" aria-label={`Progress ${progressPercent}%`}>
                                                <div className="bg-brand-400 h-full transition-all" style={{ width: `${progressPercent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 transition-colors">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                            <span className="text-brand-600 dark:text-brand-300 font-medium">{stats.newPercent}% 新词</span>
                                            <span className="text-gray-600 dark:text-gray-300">{article.level}</span>
                                        </p>
                                    </div>
                                </div>
                            </Link>

                            <button
                                onClick={(e) => handleDelete(e, article.id, article.title)}
                                className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="删除文章"
                            >
                                <span className="text-lg leading-none">×</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
