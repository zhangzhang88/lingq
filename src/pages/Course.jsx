import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';
import { useVocabulary } from '../context/VocabularyContext';
import { getArticleStats, splitSentences } from '../utils/articleStats';
import { getArticleProgress } from '../utils/progressStorage';

export default function Course() {
    const { courseId } = useParams();
    const { articles } = useArticles();
    const { getStatus } = useVocabulary();

    const courseArticles = useMemo(() => {
        return articles.filter(article => (article.courseId || `article-${article.id}`) === courseId);
    }, [articles, courseId]);

    if (courseArticles.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400">未找到该课程。</p>
                <Link to="/" className="text-brand-600 dark:text-brand-300 hover:underline mt-4 inline-block">返回首页</Link>
            </div>
        );
    }

    const courseTitle = courseArticles[0].courseTitle || courseArticles[0].title;

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-6 flex justify-between items-center">
                <Link to="/" className="text-gray-500 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors text-sm font-medium">
                    ← 返回首页
                </Link>
                <span className="text-sm text-gray-500 dark:text-gray-400">共 {courseArticles.length} 课</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{courseTitle}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">选择一节开始学习。</p>

            <div className="space-y-4">
                {courseArticles.map((article, index) => {
                    const stats = getArticleStats(article, getStatus);
                    const sentences = splitSentences(article.content);
                    const completed = getArticleProgress(article.id);
                    const progressPercent = sentences.length > 0
                        ? Math.min(100, Math.round((completed / sentences.length) * 100))
                        : 0;
                    return (
                        <Link key={article.id} to={`/read/${article.id}`} className="block bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4">
                                <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800 relative flex-shrink-0">
                                    <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center text-2xl font-bold text-amber-300">
                                            {index + 1}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Lesson</p>
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{article.title}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{article.language} · {article.level}</p>
                                </div>
                                <div className="flex flex-col items-start text-xs text-gray-500 dark:text-gray-400 gap-1">
                                    <span>新词 {stats.newWords}</span>
                                    <span>LingQs {stats.lingqs}</span>
                                    <span>已知词 {stats.known}</span>
                                    <span>困难 {stats.unknown}</span>
                                </div>
                                <div className="w-full md:w-40">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">阅读进度</p>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-500" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{progressPercent}%</p>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
