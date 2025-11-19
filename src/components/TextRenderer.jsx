import React, { useState, useEffect, useRef } from 'react';
import WordPopup from './WordPopup';
import { useVocabulary } from '../context/VocabularyContext';
import { useSettings } from '../context/SettingsContext';

const WORD_SPLIT_REGEX = /([a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*)/;
const WORD_MATCH_REGEX = /^[a-zA-Z0-9À-ÿ]+(?:['’][a-zA-Z0-9À-ÿ]+)*$/;
const SENTENCE_BOUNDARY_REGEX = /[.!?;；,，、。！？\n]/;

export default function TextRenderer({ text, language }) {
    const { vocabulary, updateStatus, getStatus, getWordData } = useVocabulary();
    const { settings } = useSettings();
    const [selectedWord, setSelectedWord] = useState(null);
    const [popupPosition, setPopupPosition] = useState(null);
    const containerRef = useRef(null);

    // Simple tokenizer: split by spaces but keep punctuation
    // This regex captures words (letters/numbers/accents) and keeps separators
    const tokens = text.split(WORD_SPLIT_REGEX).filter(t => t);

    const handleWordClick = (clickedText, index, event) => {
        // Ignore non-words (punctuation/whitespace)
        if (!WORD_MATCH_REGEX.test(clickedText)) return;

        const rect = event.target.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Find sentence boundaries
        let start = index;
        while (start > 0) {
            const t = tokens[start - 1];
            if (SENTENCE_BOUNDARY_REGEX.test(t)) break;
            start--;
        }

        let end = index;
        while (end < tokens.length - 1) {
            const t = tokens[end + 1];
            if (SENTENCE_BOUNDARY_REGEX.test(t)) {
                end++; // Include the punctuation
                break;
            }
            end++;
        }

        const sentence = tokens.slice(start, end + 1).join('');

        setPopupPosition({
            x: rect.left - containerRect.left + (rect.width / 2),
            y: rect.top - containerRect.top
        });
        setSelectedWord({
            text: clickedText,
            sentence,
            translation: null,  // Will be filled by WordPopup
            phonetic: null      // Will be filled by WordPopup
        });
    };

    const handleStatusUpdate = (wordText, status, translation, translationSource, phonetic) => {
        // Pass translation and phonetic directly from WordPopup
        updateStatus(
            wordText,
            status,
            selectedWord?.sentence,
            translation,
            phonetic,
            translationSource
        );
        setSelectedWord(null); // Close popup
    };

    const getWordStyle = (text) => {
        const status = getStatus(text);
        // Default (New word) = Blue highlight
        if (status === undefined || status === 0) return 'bg-blue-100 text-blue-900 border-b-2 border-blue-200';

        // Status 1: New/Hard -> Red/Pink
        if (status === 1) return 'bg-red-100 text-red-900 border-b-2 border-red-200';
        // Status 2: Learning -> Orange
        if (status === 2) return 'bg-orange-100 text-orange-900 border-b-2 border-orange-200';
        // Status 3: Familiar -> Yellow
        if (status === 3) return 'bg-yellow-100 text-yellow-900 border-b-2 border-yellow-200';
        // Status 4: Almost Known -> Green
        if (status === 4) return 'bg-green-100 text-green-900 border-b-2 border-green-200';

        // Known (5) = No highlight
        return 'bg-transparent text-gray-900';
    };

    const getTranslationStyle = (status) => {
        if (status === 1) return 'bg-red-100 text-red-900 border border-red-200';
        if (status === 2) return 'bg-orange-100 text-orange-900 border border-orange-200';
        if (status === 3) return 'bg-yellow-100 text-yellow-900 border border-yellow-200';
        if (status === 4) return 'bg-green-100 text-green-900 border border-green-200';
        return 'bg-blue-100 text-blue-900 border border-blue-200';
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="leading-relaxed text-lg">
                {tokens.map((token, index) => {
                    const isWord = WORD_MATCH_REGEX.test(token);
                    const status = isWord ? getStatus(token) : undefined;
                    const isMarked = status !== undefined && status >= 1 && status <= 4; // Exclude status 5 (Known)
                    const wordData = isMarked ? getWordData(token) : null;
                    const translation = wordData?.translation;

                    return (
                        <span
                            key={index}
                            onClick={(e) => isWord && handleWordClick(token, index, e)}
                            className={`
                                ${isWord ? 'cursor-pointer hover:opacity-80 transition-opacity px-0.5 rounded-sm mx-0.5 inline-block' : ''}
                                ${isWord ? getWordStyle(token) : ''}
                                ${isMarked && settings.showTranslations ? 'relative' : ''}
                            `}
                        >
                            {token}
                            {/* Translation to the right of word */}
                            {isMarked && settings.showTranslations && translation && (
                                <span className={`ml-1 text-xs font-normal px-1.5 py-0.5 rounded ${getTranslationStyle(status)}`}>
                                    {translation}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>

            {selectedWord && popupPosition && (
                <WordPopup
                    word={selectedWord}
                    position={popupPosition}
                    language={language}
                    onClose={() => setSelectedWord(null)}
                    onUpdateStatus={handleStatusUpdate}
                />
            )}
        </div>
    );
}
