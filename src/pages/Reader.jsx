import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useArticles } from '../context/ArticleContext';
import { useSettings } from '../context/SettingsContext';
import { useVocabulary } from '../context/VocabularyContext';
import TextRenderer from '../components/TextRenderer';
import { translateText, playTextToSpeech } from '../services/TranslationService';
import { buildSentenceTranslationMap, setSentenceTranslationInCache } from '../utils/sentenceCache';
import { getArticleProgress, setArticleProgress } from '../utils/progressStorage';

const splitSentences = (text) => {
    if (!text) return [];
    return text
        .replace(/\r?\n+/g, ' ')
        .split(/(?<=[.!?。！？])\s+/)
        .map(sentence => sentence.trim())
        .filter(Boolean);
};

const deriveStartIndex = (completed, total) => {
    if (total === 0) return 0;
    if (!completed || completed <= 0) return 0;
    return Math.min(total - 1, Math.max(0, completed - 1));
};

const LearningMode = ({ sentences, language, settings, initialCompleted = 0, onProgressChange }) => {
    const initialCache = useMemo(() => buildSentenceTranslationMap(sentences, language), [sentences, language]);
    const total = sentences.length;
    const [index, setIndex] = useState(deriveStartIndex(initialCompleted, total));
    const [sentenceTranslation, setSentenceTranslation] = useState(initialCache[deriveStartIndex(initialCompleted, total)] ?? null);
    const [translationLoading, setTranslationLoading] = useState(false);
    const [translationCache, setTranslationCache] = useState(initialCache);
    const [maxCompleted, setMaxCompleted] = useState(initialCompleted);

    useEffect(() => {
        const startIdx = deriveStartIndex(initialCompleted, total);
        setIndex(startIdx);
        setTranslationCache(initialCache);
        setSentenceTranslation(initialCache[startIdx] ?? null);
        setMaxCompleted(initialCompleted);
    }, [initialCompleted, initialCache, total]);
    if (total === 0) {
        return (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 text-gray-500 dark:text-gray-300">
                当前文章没有可用的句子。
            </div>
        );
    }

    const currentSentence = sentences[index];

    const updateProgress = (completed) => {
        setMaxCompleted(prev => {
            const nextValue = Math.max(prev, completed);
            if (nextValue !== prev && onProgressChange) {
                onProgressChange(nextValue);
            }
            return nextValue;
        });
    };

    const resetTranslation = (nextIndex) => {
        if (translationCache[nextIndex] !== undefined) {
            setSentenceTranslation(translationCache[nextIndex]);
        } else {
            setSentenceTranslation(null);
        }
        setTranslationLoading(false);
    };

    const handlePrev = () => {
        setIndex(prev => {
            const nextIdx = Math.max(0, prev - 1);
            resetTranslation(nextIdx);
            return nextIdx;
        });
    };

    const handleNext = () => {
        setIndex(prev => {
            const nextIdx = Math.min(total - 1, prev + 1);
            resetTranslation(nextIdx);
            updateProgress(nextIdx + 1);
            return nextIdx;
        });
    };

    const handlePlaySentence = () => {
        if (!currentSentence) return;
        playTextToSpeech(currentSentence, language, settings.accent);
    };

    const handleTranslateSentence = async () => {
        if (!currentSentence) return;
        const cached = translationCache[index];
        if (cached !== undefined) {
            setSentenceTranslation(cached);
            return;
        }
        setTranslationLoading(true);
        try {
            const res = await translateText(currentSentence, language, settings.targetLanguage || 'zh-Hans', {
                provider: settings.translationProvider || 'default',
                deepseekApiKey: settings.deepseekApiKey,
                deepseekModel: settings.deepseekModel
            });
            const text = res?.text || '翻译失败';
            setTranslationCache(prev => ({ ...prev, [index]: text }));
            setSentenceTranslation(text);
            setSentenceTranslationInCache(currentSentence, language, text);
        } catch (err) {
            console.error('Sentence translation failed', err);
            const fallback = '翻译失败';
            setTranslationCache(prev => ({ ...prev, [index]: fallback }));
            setSentenceTranslation(fallback);
            setSentenceTranslationInCache(currentSentence, language, fallback);
        } finally {
            setTranslationLoading(false);
        }
    };

    const handleCustomTranslationChange = (value) => {
        setSentenceTranslation(value);
        setTranslationCache(prev => ({ ...prev, [index]: value }));
        setSentenceTranslationInCache(currentSentence, language, value);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>学习模式</span>
                <span>{index + 1} / {total}</span>
            </div>
            <div className="mb-4">
                <TextRenderer text={currentSentence} language={language} />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={handlePlaySentence}
                    className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-200 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    🔊 朗读
                </button>
                <button
                    onClick={handleTranslateSentence}
                    disabled={translationLoading}
                    className="px-3 py-1.5 rounded border border-brand-500 text-brand-600 dark:text-brand-200 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {translationLoading ? '翻译中...' : '翻译句子'}
                </button>
                <div className="flex-1" />
                <button
                    onClick={handlePrev}
                    disabled={index === 0}
                    className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    上一句
                </button>
                <button
                    onClick={handleNext}
                    disabled={index === total - 1}
                    className="px-3 py-1.5 rounded border border-brand-600 bg-brand-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-700"
                >
                    下一句
                </button>
            </div>
            {sentenceTranslation !== null && (
                <div className="mb-4 max-w-2xl">
                    <textarea
                        value={sentenceTranslation}
                        onChange={(e) => handleCustomTranslationChange(e.target.value)}
                        className="w-full rounded-lg border border-brand-200 dark:border-gray-700 bg-brand-50 dark:bg-gray-900 text-brand-800 dark:text-gray-100 text-sm p-3 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:focus:border-brand-300 dark:focus:ring-brand-300"
                        rows={3}
                        placeholder="自定义或编辑该句的翻译..."
                    />
                </div>
            )}
        </div>
    );
};

export default function Reader() {
    const { id } = useParams();
    const { getArticle } = useArticles();
    const { settings, updateSetting } = useSettings();
    const { vocabulary, updateStatus, getStatus } = useVocabulary();
    const [validatingProvider, setValidatingProvider] = useState(false);
    const [validationStatus, setValidationStatus] = useState(null);
    const [mode, setMode] = useState('reading');
    const article = getArticle(id);
    const [completedSentences, setCompletedSentences] = useState(() => (article ? getArticleProgress(article.id) : 0));

    useEffect(() => {
        if (article?.id !== undefined) {
            setCompletedSentences(getArticleProgress(article.id));
        }
    }, [article?.id]);

    const handleProgressChange = (value) => {
        if (article?.id === undefined) return;
        setCompletedSentences(value);
        setArticleProgress(article.id, value);
    };

    if (!article) return <div>Article not found</div>;

    const WORD_SPLIT_REGEX = /([a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*)/;
    const WORD_ONLY_REGEX = /^[a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*$/;
    // Get all unique words from article (keep contractions intact)
    const words = article.content.split(WORD_SPLIT_REGEX).filter(t => WORD_ONLY_REGEX.test(t));
    const uniqueWords = [...new Set(words)];
    const sentences = useMemo(() => splitSentences(article.content), [article.content]);

    // Count new (blue) words - words that are not in vocabulary yet
    const newWords = uniqueWords.filter(word => {
        const status = getStatus(word);
        return status === undefined || status === 0;
    });

    const markAllAsKnown = () => {
        if (newWords.length === 0) {
            alert('没有新单词需要标记！');
            return;
        }

        if (!confirm(`将 ${newWords.length} 个新单词标记为已掌握？`)) {
            return;
        }

        newWords.forEach(word => {
            updateStatus(word, 5); // Mark as known
        });

        alert(`已将 ${newWords.length} 个单词标记为已掌握！`);
    };

    const handleValidateApi = async () => {
        const provider = settings.translationProvider || 'default';
        if (provider === 'default') {
            setValidationStatus({ type: 'info', message: '默认公共翻译接口无需验证。' });
            return;
        }

        if (provider === 'deepseek' && !settings.deepseekApiKey) {
            setValidationStatus({ type: 'error', message: '请先填写 DeepSeek API Key。' });
            return;
        }

        setValidatingProvider(true);
        setValidationStatus(null);
        try {
            const res = await translateText('hello world', article?.language || 'English', settings.targetLanguage || 'zh-Hans', {
                provider,
                deepseekApiKey: settings.deepseekApiKey,
                deepseekModel: settings.deepseekModel
            });
            if (res?.text) {
                setValidationStatus({ type: 'success', message: `${provider === 'deepseek' ? 'DeepSeek' : '免费接口'} 可用。` });
            } else {
                setValidationStatus({ type: 'error', message: '验证失败，请检查 API Key 或网络。' });
            }
        } catch (err) {
            console.error('Validate translation provider failed', err);
            setValidationStatus({ type: 'error', message: '验证失败，详见控制台。' });
        } finally {
            setValidatingProvider(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 text-gray-900 dark:text-gray-100">
            <div className="mb-6 flex justify-between items-center">
                <Link to="/" className="text-gray-500 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors">← Back to Library</Link>

                <div className="flex gap-2">
                    {/* Mark all as known button */}
                    {newWords.length > 0 && (
                        <button
                            onClick={markAllAsKnown}
                            className="px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700 dark:hover:bg-green-900/60"
                        >
                            <span>✓</span>
                            <span>标记新单词为已掌握 ({newWords.length})</span>
                        </button>
                    )}

                    {/* Translation toggle */}
                    <button
                        onClick={() => updateSetting('showTranslations', !settings.showTranslations)}
                        className={`
                            px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2
                            ${settings.showTranslations
                                ? 'bg-brand-600 text-white hover:bg-brand-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                            }
                        `}
                    >
                        <span>{settings.showTranslations ? '🔤' : '🔡'}</span>
                        <span>{settings.showTranslations ? '隐藏翻译' : '显示翻译'}</span>
                    </button>
                </div>
            </div>

            <div className="mb-6 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">翻译设置</div>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">翻译来源</label>
                        <select
                            value={settings.translationProvider || 'default'}
                            onChange={(e) => updateSetting('translationProvider', e.target.value)}
                            className="w-full md:w-60 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-brand-500 focus:border-brand-500"
                        >
                            <option value="default">免费翻译接口</option>
                            <option value="deepseek">DeepSeek API</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">选择翻译调用方式。</p>
                    </div>

                    {settings.translationProvider === 'deepseek' && (
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">DeepSeek API Key</label>
                            <input
                                type="password"
                                value={settings.deepseekApiKey || ''}
                                onChange={(e) => updateSetting('deepseekApiKey', e.target.value)}
                                placeholder="sk-..."
                                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-brand-500 focus:border-brand-500"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">密钥仅保存在本地浏览器，用于翻译单词与句子。</p>
                        </div>
                    )}

                    <div className="flex-1 flex justify-end items-end mt-4 md:mt-0">
                        <button
                            onClick={handleValidateApi}
                            disabled={validatingProvider}
                            className="self-start px-3 py-1.5 border border-brand-500 text-brand-600 dark:text-brand-200 rounded-lg text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {validatingProvider ? '验证中...' : '验证 API'}
                        </button>
                        {validationStatus && (
                            <p className={`text-xs mt-2 ${validationStatus.type === 'success'
                                ? 'text-green-600 dark:text-green-400'
                                : validationStatus.type === 'error'
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                {validationStatus.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">{article.title}</h1>

            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => setMode('reading')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${mode === 'reading'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                >
                    阅读模式
                </button>
                <button
                    onClick={() => setMode('learning')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${mode === 'learning'
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                >
                    学习模式
                </button>
            </div>

            {mode === 'reading' ? (
                <div className="prose prose-lg dark:prose-invert max-w-none bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 leading-loose">
                    <TextRenderer text={article.content} language={article.language} />
                </div>
            ) : (
                <LearningMode
                    sentences={sentences}
                    language={article.language}
                    settings={settings}
                    initialCompleted={completedSentences}
                    onProgressChange={handleProgressChange}
                />
            )}
        </div>
    );
}
