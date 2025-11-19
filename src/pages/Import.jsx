import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';

export default function Import() {
    const navigate = useNavigate();
    const { addArticle } = useArticles();
    const [formData, setFormData] = useState({
        title: '',
        language: 'English',
        level: 'Beginner',
        content: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) return;

        addArticle(formData);
        navigate('/');
    };

    return (
        <div className="max-w-2xl mx-auto p-6 text-gray-900 dark:text-gray-100">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">Import Content</h1>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                        type="text"
                        required
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Daily News"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Language</label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.language}
                            onChange={e => setFormData({ ...formData, language: e.target.value })}
                        >
                            <option>English</option>
                            <option>French</option>
                            <option>Spanish</option>
                            <option>German</option>
                            <option>Chinese</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Level</label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.level}
                            onChange={e => setFormData({ ...formData, level: e.target.value })}
                        >
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                    <textarea
                        required
                        rows={10}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        placeholder="Paste your text here..."
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-brand-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                >
                    Import Lesson
                </button>
            </form>
        </div>
    );
}
