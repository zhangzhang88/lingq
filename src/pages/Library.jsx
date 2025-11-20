import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';
import { useVocabulary } from '../context/VocabularyContext';
import { getArticleProgress } from '../utils/progressStorage';
import { exportUserData, importUserData } from '../utils/dataBackup';
import { getArticleStats, splitSentences } from '../utils/articleStats';

export default function Library() {
    const { articles, deleteArticle } = useArticles();
    const { getStatus } = useVocabulary();
    const fileInputRef = useRef(null);
    const [backupStatus, setBackupStatus] = useState(null);
    const courseList = useMemo(() => {
        const map = {};
        articles.forEach(article => {
            const courseId = article.courseId || `article-${article.id}`;
            const courseTitle = article.courseTitle || article.title;
            if (!map[courseId]) {
                map[courseId] = {
                    id: courseId,
                    title: courseTitle,
                    image: article.image,
                    description: article.courseDescription || '',
                    articles: [],
                    hasCustomCourse: Boolean(article.courseId)
                };
            }
            map[courseId].articles.push(article);
        });
        return Object.values(map);
    }, [articles]);

    const handleDelete = (e, articleId, articleTitle) => {
        e.preventDefault();
        if (window.confirm(`确定要删除文章 "${articleTitle}" 吗？`)) {
            deleteArticle(articleId);
        }
    };

    const handleExport = () => {
        try {
            const payload = exportUserData();
            if (!payload) throw new Error('无法读取本地数据。');
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `lingq-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setBackupStatus({ type: 'success', message: '已导出学习数据。' });
        } catch (err) {
            console.error('Export failed', err);
            setBackupStatus({ type: 'error', message: '导出失败，请重试。' });
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                importUserData(data);
                setBackupStatus({ type: 'success', message: '导入成功，页面将自动刷新。' });
                setTimeout(() => window.location.reload(), 800);
            } catch (err) {
                console.error('Import failed', err);
                setBackupStatus({ type: 'error', message: '导入失败，请检查文件内容。' });
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleResetCourses = () => {
        if (window.confirm('此操作会清除你保存的课程，请先导出备份。确定要更新到最新课程吗？')) {
            localStorage.removeItem('lingq_articles');
            window.location.reload();
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

            <div className="mb-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">备份 / 导入学习数据</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">导出全部文章、词汇、翻译缓存等数据，清空浏览器后可再导入恢复。</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-brand-500 text-brand-600 dark:text-brand-200 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    >
                        导出数据
                    </button>
                    <button
                        onClick={handleImportClick}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        导入数据
                    </button>
                    <button
                        onClick={handleResetCourses}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-red-500 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        点击这里更新到最新课程
                    </button>
                    <input
                        type="file"
                        accept="application/json"
                        ref={fileInputRef}
                        onChange={handleImportFile}
                        className="hidden"
                    />
                </div>
            </div>
            {backupStatus && (
                <div className={`mb-6 text-sm ${backupStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {backupStatus.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courseList.map(course => {
                    const isSingle = course.articles.length === 1 && !course.articles[0].courseId;
                    if (isSingle) {
                        const article = course.articles[0];
                        const stats = getArticleStats(article, getStatus);
                        const sentences = splitSentences(article.content);
                        const completed = getArticleProgress(article.id);
                        const progressPercent = sentences.length > 0
                            ? Math.min(100, Math.round((completed / sentences.length) * 100))
                            : 0;
                        return (
                            <div key={`article-${article.id}`} className="group relative">
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
                    }

                    const lessonCount = course.articles.length;
                    return (
                        <div key={course.id} className="group relative">
                            <Link to={`/course/${course.id}`}>
                                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100 dark:border-gray-800">
                                    <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
                                        <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                                            共 {lessonCount} 课
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                            <p className="text-sm opacity-80">课程</p>
                                            <p className="text-lg font-semibold">{course.title}</p>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            包含 {lessonCount} 篇文章，点击进入查看所有课程内容。
                                        </p>
                                        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                            <span>{course.articles[0]?.language}</span>
                                            <span>{course.articles[0]?.level}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
