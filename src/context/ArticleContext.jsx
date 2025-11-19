import React, { createContext, useState, useContext, useEffect } from 'react';
import { mockArticles } from '../store/mockData';

const ArticleContext = createContext();

export function ArticleProvider({ children }) {
    // Initialize from localStorage or fallback to mock data
    const [articles, setArticles] = useState(() => {
        const saved = localStorage.getItem('lingq_articles');
        return saved ? JSON.parse(saved) : mockArticles;
    });

    // Persist to localStorage whenever articles change
    useEffect(() => {
        localStorage.setItem('lingq_articles', JSON.stringify(articles));
    }, [articles]);

    const addArticle = (article) => {
        const newArticle = {
            ...article,
            id: Date.now(), // Simple ID generation
            image: article.image || `https://placehold.co/600x400?text=${encodeURIComponent(article.title)}`
        };
        setArticles(prev => [newArticle, ...prev]);
    };

    const getArticle = (id) => {
        return articles.find(a => a.id === parseInt(id));
    };

    const deleteArticle = (id) => {
        setArticles(prev => prev.filter(a => a.id !== parseInt(id)));
    };

    return (
        <ArticleContext.Provider value={{ articles, addArticle, getArticle, deleteArticle }}>
            {children}
        </ArticleContext.Provider>
    );
}

export function useArticles() {
    return useContext(ArticleContext);
}
