import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVocabulary } from '../context/VocabularyContext';
import { useSettings } from '../context/SettingsContext';
import { translateText, getDictionaryData, playTextToSpeech } from '../services/TranslationService';

export default function Vocabulary() {
    const { vocabulary, getStatus, updateStatus, getCachedWordTranslation, saveWordTranslation } = useVocabulary();
    const { settings } = useSettings();
    const translationProvider = settings.translationProvider || 'default';
    const translationOptions = {
        provider: translationProvider,
        deepseekApiKey: settings.deepseekApiKey,
        deepseekModel: settings.deepseekModel
    };
    const [filter, setFilter] = useState('all'); // all, learning (1-4), known (5)
    const [fetchingTranslations, setFetchingTranslations] = useState(false);

    // Convert vocabulary to array and extract status
    const vocabList = Object.entries(vocabulary).map(([word, data]) => {
        const status = typeof data === 'object' ? data.status : data;
        const translation = typeof data === 'object' ? data.translation : null;
        const phonetic = typeof data === 'object' ? data.phonetic : null;
        return { word, status, translation, phonetic };
    });

    // Filter words
    const filteredVocab = vocabList.filter(item => {
        if (filter === 'learning') return item.status >= 1 && item.status <= 4;
        if (filter === 'known') return item.status === 5;
        return true;
    });

    // Sort by status (learning first, then known)
    const sortedVocab = [...filteredVocab].sort((a, b) => {
        if (a.status === 5 && b.status !== 5) return 1;
        if (a.status !== 5 && b.status === 5) return -1;
        return a.status - b.status;
    });

    const getStatusBadge = (status) => {
        const badges = {
            1: { color: 'bg-red-100 text-red-700 border-red-200', label: '1 - New' },
            2: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: '2 - Learning' },
            3: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '3 - Familiar' },
            4: { color: 'bg-green-100 text-green-700 border-green-200', label: '4 - Almost' },
            5: { color: 'bg-gray-100 text-gray-700 border-gray-200', label: '✓ Known' }
        };
        const badge = badges[status] || badges[1];
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const stats = {
        total: vocabList.length,
        learning: vocabList.filter(v => v.status >= 1 && v.status <= 4).length,
        known: vocabList.filter(v => v.status === 5).length,
        missingData: vocabList.filter(v => !v.translation || !v.phonetic).length
    };

    const fetchMissingTranslations = async () => {
        const wordsNeedingData = vocabList.filter(v => !v.translation || !v.phonetic);

        if (wordsNeedingData.length === 0) {
            alert('所有单词都已有完整数据！');
            return;
        }

        if (!confirm(`将为 ${wordsNeedingData.length} 个单词获取翻译和音标，可能需要一些时间。继续吗？`)) {
            return;
        }

        setFetchingTranslations(true);

        for (const item of wordsNeedingData) {
            try {
                const cached = getCachedWordTranslation(item.word, 'zh-Hans', translationProvider);
                let translationResult = cached;
                if (!translationResult) {
                    translationResult = await translateText(item.word, 'English', 'zh-Hans', translationOptions);
                    if (translationResult?.text) {
                        saveWordTranslation(item.word, translationResult, 'zh-Hans', translationProvider);
                    }
                }
                const dictResult = await getDictionaryData(item.word, 'English', settings.accent);

                // Update with translation and phonetic
                updateStatus(
                    item.word,
                    item.status,
                    null, // sentence - keep existing
                    translationResult?.text ? translationResult.text : undefined,
                    dictResult?.phonetic || item.phonetic,  // Keep existing if fetch fails
                    translationResult?.source || translationResult?.provider
                );

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`Failed to fetch data for ${item.word}:`, err);
            }
        }

        setFetchingTranslations(false);
        alert('数据获取完成！');
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <Link to="/" className="text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-2 text-sm font-medium">
                    <span>←</span>
                    <span>Back to Library</span>
                </Link>
            </div>

            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold mb-2 text-gray-800">My Vocabulary</h1>
                    <p className="text-gray-600">Manage and review your saved words</p>
                </div>

                {stats.missingData > 0 && (
                    <button
                        onClick={fetchMissingTranslations}
                        disabled={fetchingTranslations}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {fetchingTranslations ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                <span>获取中...</span>
                            </>
                        ) : (
                            <>
                                <span>📝</span>
                                <span>获取缺失数据 ({stats.missingData})</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                    <div className="text-sm text-gray-500">Total Words</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="text-2xl font-bold text-orange-600">{stats.learning}</div>
                    <div className="text-sm text-gray-500">Learning</div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.known}</div>
                    <div className="text-sm text-gray-500">Known</div>
                </div>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'all'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    All ({stats.total})
                </button>
                <button
                    onClick={() => setFilter('learning')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'learning'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Learning ({stats.learning})
                </button>
                <button
                    onClick={() => setFilter('known')}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${filter === 'known'
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    Known ({stats.known})
                </button>
            </div>

            {/* Vocabulary table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Word</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Audio</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Translation</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Phonetic</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedVocab.length > 0 ? (
                            sortedVocab.map(({ word, status, translation, phonetic }) => (
                                <tr key={word} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-900">{word}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => playTextToSpeech(word, 'English', 'us')}
                                                className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors text-xs"
                                                title="美音"
                                            >
                                                🇺🇸
                                            </button>
                                            <button
                                                onClick={() => playTextToSpeech(word, 'English', 'uk')}
                                                className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors text-xs"
                                                title="英音"
                                            >
                                                🇬🇧
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={translation || ''}
                                            onChange={(e) => {
                                                const newTranslation = e.target.value;
                                                updateStatus(word, status, null, newTranslation, phonetic, 'custom');
                                            }}
                                            placeholder="添加翻译..."
                                            className="w-full px-2 py-1 text-sm text-gray-600 border border-transparent hover:border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded transition-colors outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm font-mono">
                                        {phonetic ? `[${phonetic}]` : <span className="text-gray-400 italic">-</span>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={status}
                                            onChange={(e) => updateStatus(word, parseInt(e.target.value))}
                                            className={`
                                                px-3 py-1.5 rounded-lg text-xs font-semibold border-2 cursor-pointer transition-all
                                                focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1
                                                ${status === 1 ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : ''}
                                                ${status === 2 ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : ''}
                                                ${status === 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : ''}
                                                ${status === 4 ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : ''}
                                                ${status === 5 ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' : ''}
                                            `}
                                        >
                                            <option value={1}>1 - New</option>
                                            <option value={2}>2 - Learning</option>
                                            <option value={3}>3 - Familiar</option>
                                            <option value={4}>4 - Almost</option>
                                            <option value={5}>✓ Known</option>
                                        </select>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                                    No words found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
