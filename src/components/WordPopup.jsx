import React, { useState, useEffect, useRef, useCallback } from 'react';
import { translateText, openExternalTranslate, openGoogleTranslate, getDictionaryData, playTextToSpeech } from '../services/TranslationService';
import { useSettings } from '../context/SettingsContext';
import { useVocabulary } from '../context/VocabularyContext';
import { getSentenceTranslationFromCache, setSentenceTranslationInCache } from '../utils/sentenceCache';

const splitIntoSentences = (text = '') => {
    const result = [];
    let buffer = '';
    for (const char of text) {
        buffer += char;
        if (/[。！？!?;；.]/.test(char)) {
            if (buffer.trim()) result.push(buffer.trim());
            buffer = '';
        }
    }
    if (buffer.trim()) result.push(buffer.trim());
    return result;
};

const normalizeSourceKey = (source) => {
    if (!source) return null;
    const lower = String(source).toLowerCase();
    if (lower.includes('deepseek')) return 'deepseek';
    if (lower.includes('custom') || lower.includes('自定义')) return 'custom';
    if (lower.includes('default') || lower.includes('mymemory') || lower.includes('免费')) return 'default';
    return null;
};

const formatTranslationSource = (source) => {
    if (!source) return null;
    const normalized = normalizeSourceKey(source);
    if (normalized === 'deepseek') return 'DeepSeek API';
    if (normalized === 'default') return '免费接口';
    if (normalized === 'custom') return '自定义翻译';
    if (String(source).includes('Dictionary')) return 'Dictionary API';
    return source;
};

export default function WordPopup({ word, position, language, onClose, onUpdateStatus }) {
    const { settings, updateSetting } = useSettings();
    const {
        getWordData,
        updateStatus,
        saveWordTranslation,
        saveSentenceTranslation,
        getCachedWordTranslation,
        getCachedSentenceTranslation
    } = useVocabulary();
    const [translationData, setTranslationData] = useState(null);
    const [dictionaryData, setDictionaryData] = useState(null);
    const [sentenceTranslation, setSentenceTranslation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSentence, setLoadingSentence] = useState(false);
    const popupRef = useRef(null);
    const initialTranslationRef = useRef('');
    const [translationDirty, setTranslationDirty] = useState(false);

    const handleManualTranslationSave = useCallback(() => {
        if (!word?.text) return;
        if (!translationDirty) return;
        const currentText = translationData?.text ?? '';
        const trimmed = currentText.trim();
        const wordInfo = getWordData(word.text);
        const currentStatus = wordInfo?.status ?? 1;
        const currentSentence = wordInfo?.sentence;
        const currentPhonetic = wordInfo?.phonetic;

        if (!trimmed) {
            updateStatus(word.text, currentStatus, currentSentence, null, currentPhonetic, null);
            setTranslationData(null);
            initialTranslationRef.current = '';
            setTranslationDirty(false);
            return;
        }

        updateStatus(word.text, currentStatus, currentSentence, trimmed, currentPhonetic, 'custom');
        setTranslationData({
            text: trimmed,
            source: '自定义',
            provider: 'custom'
        });
        initialTranslationRef.current = trimmed;
        setTranslationDirty(false);
    }, [word, translationData, translationDirty, getWordData, updateStatus]);

    const handleTranslationChange = useCallback((e) => {
        const nextValue = e.target.value;
        setTranslationData(prev => ({
            ...(prev || {}),
            text: nextValue,
            source: '自定义',
            provider: 'custom'
        }));
        setTranslationDirty(nextValue !== initialTranslationRef.current);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popupRef.current && !popupRef.current.contains(event.target)) {
                handleManualTranslationSave();
                onClose();
            }
        };
        if (word) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [word, onClose, handleManualTranslationSave]);

    useEffect(() => {
        if (word?.text) {
            setLoading(true);
            setTranslationData(null);
            setDictionaryData(null);
            const cachedSentenceTranslation = word.sentence ? getSentenceTranslationFromCache(word.sentence, language) : null;
            setSentenceTranslation(cachedSentenceTranslation || null);
            setTranslationDirty(false);

            const savedWordData = getWordData(word.text);
            const savedTranslation = savedWordData?.translation;
            const savedSourceKey = normalizeSourceKey(savedWordData?.translationSource);
            const savedTranslationEntry = savedTranslation ? {
                text: savedTranslation,
                source: savedWordData?.translationSource || 'custom',
                provider: savedSourceKey || (savedWordData?.translationSource ? savedWordData.translationSource : 'custom')
            } : null;

            const translationProvider = settings.translationProvider === 'deepseek' ? 'deepseek' : 'default';
            const targetLang = settings.targetLanguage || 'zh-Hans';
            const translationOptions = {
                provider: translationProvider,
                deepseekApiKey: settings.deepseekApiKey,
                deepseekModel: settings.deepseekModel
            };

            const isCustomSaved = savedTranslationEntry && savedTranslationEntry.provider === 'custom';
            const cachedTranslation = !isCustomSaved
                ? getCachedWordTranslation(word.text, targetLang, translationProvider)
                : null;
            const matchesProvider = savedTranslationEntry && savedTranslationEntry.provider === translationProvider;

            const translationPromise = isCustomSaved
                ? Promise.resolve(savedTranslationEntry)
                : cachedTranslation
                    ? Promise.resolve(cachedTranslation)
                    : matchesProvider
                        ? Promise.resolve(savedTranslationEntry)
                        : translateText(word.text, language, targetLang, translationOptions).then(res => {
                            if (res?.text) {
                                const normalizedResult = {
                                    ...res,
                                    provider: translationProvider
                                };
                                saveWordTranslation(word.text, normalizedResult, targetLang, translationProvider);
                                return normalizedResult;
                            }
                            return res;
                        });

            Promise.all([
                translationPromise,
                getDictionaryData(word.text, language, settings.accent).then(res => res)
            ]).then(([transRes, dictRes]) => {
                const finalTranslation = transRes || null;
                setTranslationData(finalTranslation);
                initialTranslationRef.current = finalTranslation?.text || '';
                setTranslationDirty(false);
                setDictionaryData(dictRes);
            }).finally(() => setLoading(false));
        }
    }, [
        word,
        language,
        settings.accent,
        settings.translationProvider,
        settings.targetLanguage,
        settings.deepseekApiKey,
        settings.deepseekModel,
        getWordData,
        getCachedWordTranslation,
        saveWordTranslation
    ]);

    const handleTranslateSentence = async () => {
        if (!word.sentence) return;
        const sessionCached = getSentenceTranslationFromCache(word.sentence, language);
        if (sessionCached) {
            setSentenceTranslation(sessionCached);
            return;
        }
        const translationProvider = settings.translationProvider || 'default';
        const targetLang = settings.targetLanguage || 'zh-Hans';
        const cachedSentence = getCachedSentenceTranslation(word.sentence, targetLang, translationProvider);
        if (cachedSentence) {
            setSentenceTranslation(cachedSentence);
            setSentenceTranslationInCache(word.sentence, language, cachedSentence);
            return;
        }
        setLoadingSentence(true);
        const res = await translateText(word.sentence, language, targetLang, {
            provider: translationProvider,
            deepseekApiKey: settings.deepseekApiKey,
            deepseekModel: settings.deepseekModel
        });
        const text = res?.text || '翻译失败';
        setSentenceTranslation(text);
        if (res?.text) {
            saveSentenceTranslation(word.sentence, res, targetLang, translationProvider);
        }
        setSentenceTranslationInCache(word.sentence, language, text);
        setLoadingSentence(false);
    };

    const handlePlaySentence = () => {
        if (word.sentence) {
            playTextToSpeech(word.sentence, language, settings.accent);
        }
    };

    const handlePlayAudio = () => {
        if (dictionaryData?.audio) {
            new Audio(dictionaryData.audio).play();
        } else {
            playTextToSpeech(word.text, language);
        }
    };


    if (!word || !position) return null;

    const statuses = [
        { level: 1, color: 'bg-red-200 hover:bg-red-300' },
        { level: 2, color: 'bg-orange-200 hover:bg-orange-300' },
        { level: 3, color: 'bg-yellow-200 hover:bg-yellow-300' },
        { level: 4, color: 'bg-green-200 hover:bg-green-300' },
        { level: 5, color: 'bg-white border border-gray-200 hover:bg-gray-50', label: '✔' },
    ];

    return (
        <div
            ref={popupRef}
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64"
            style={{
                top: position.y + 24,
                left: Math.max(10, position.x - 100) // Keep it somewhat centered but on screen
            }}
        >
            {/* Header: Word & Translation */}
            <div className="mb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            {word.text}
                            <button
                                onClick={handlePlayAudio}
                                className="text-gray-400 hover:text-brand-600 transition-colors"
                                title="Play pronunciation"
                            >
                                🔊
                            </button>
                        </div>
                        {dictionaryData?.phonetic && (
                            <div className="text-gray-500 text-sm font-mono mb-1 flex items-center gap-2">
                                <span>[{dictionaryData.phonetic}]</span>
                                {language === 'English' && (
                                    <button
                                        onClick={() => updateSetting('accent', settings.accent === 'us' ? 'uk' : 'us')}
                                        className="text-xs bg-gray-100 px-1.5 py-0.5 rounded hover:bg-gray-200 text-gray-600"
                                        title="Toggle Accent"
                                    >
                                        {settings.accent.toUpperCase()}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="min-h-[2rem] mb-2">
                    {loading ? (
                        <div className="text-gray-400 text-sm animate-pulse">Translating...</div>
                    ) : (
                        <div>
                            <div className="text-xs text-gray-500 mb-1 font-medium">翻译</div>
                            <input
                                type="text"
                                value={translationData?.text || ''}
                                onChange={handleTranslationChange}
                                onBlur={handleManualTranslationSave}
                                placeholder="添加或编辑翻译..."
                                className="w-full px-2 py-1.5 text-brand-700 font-medium text-base border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded transition-colors outline-none"
                            />
                            {formatTranslationSource(translationData?.source || translationData?.provider) && (
                                <div className="text-xs text-gray-400 mt-1">来源：{formatTranslationSource(translationData?.source || translationData?.provider)}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sentence Context */}
                {word.sentence && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-1 font-medium">SENTENCE</div>
                        <div className="text-sm text-gray-800 italic mb-2 leading-relaxed">
                            "{word.sentence.trim()}"
                        </div>

                        {sentenceTranslation && (
                            <div className="text-sm text-brand-700 mb-2 space-y-1">
                                {splitIntoSentences(sentenceTranslation).map((line, idx) => (
                                    <div key={idx} className="bg-brand-50 p-1.5 rounded">
                                        {line}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handlePlaySentence}
                                className="text-xs flex items-center gap-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 transition-colors"
                            >
                                🔊 Play
                            </button>
                            {!sentenceTranslation && (
                                <button
                                    onClick={handleTranslateSentence}
                                    disabled={loadingSentence}
                                    className="text-xs flex items-center gap-1 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded text-brand-700 transition-colors"
                                >
                                    {loadingSentence ? 'Translating...' : '文 Translate'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex gap-2 text-xs border-t border-gray-100 pt-2 mt-3">
                    <button
                        onClick={() => openExternalTranslate(word.text, language)}
                        className="text-brand-600 hover:text-brand-800 flex items-center gap-1 font-medium"
                    >
                        Bing (CN)
                    </button>
                    <button
                        onClick={() => openGoogleTranslate(word.text, language)}
                        className="text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                        Google
                    </button>
                </div>
            </div>

            {/* Status Actions */}
            <div className="flex justify-center items-center gap-3 mb-2 pt-2">
                {statuses.map((s) => (
                    <button
                        key={s.level}
                        onClick={() => {
                            onUpdateStatus(
                                word.text,
                                s.level,
                                translationData?.text,
                                translationData?.source || translationData?.provider,
                                dictionaryData?.phonetic
                            );
                            onClose();
                        }}
                        className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all hover:scale-110 shadow-sm
                            ${s.color}
                            ${s.level === 5 ? 'border-2 border-gray-200 hover:border-gray-300' : 'hover:shadow-md'}
                        `}
                        title={s.label}
                    >
                        {s.label === '✔' ? '✓' : s.level}
                    </button>
                ))}
            </div>

            {/* Close button (optional, clicking outside usually handles this) */}
            <div className="mt-2 text-right">
                <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
            </div>
        </div>
    );
}
