import React from 'react';
import { Link } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';

export default function Library() {
    const { articles, deleteArticle } = useArticles();

    const handleDelete = (e, articleId, articleTitle) => {
        e.preventDefault(); // Prevent navigation
        if (window.confirm(`确定要删除文章 "${articleTitle}" 吗？`)) {
            deleteArticle(articleId);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Library</h1>
                <Link to="/vocabulary" className="text-brand-600 hover:underline font-medium">
                    My Vocabulary
                </Link>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map(article => (
                    <div key={article.id} className="group relative">
                        <Link to={`/read/${article.id}`}>
                            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
                                <div className="h-48 bg-gray-200 relative">
                                    <img src={article.image} alt={article.title} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-gray-700">
                                        {article.language}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{article.level}</p>
                                </div>
                            </div>
                        </Link>

                        {/* Delete button */}
                        <button
                            onClick={(e) => handleDelete(e, article.id, article.title)}
                            className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="删除文章"
                        >
                            <span className="text-lg leading-none">×</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
