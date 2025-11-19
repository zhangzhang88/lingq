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
        const palette = {
            default: 'bg-blue-100 dark:bg-blue-200 text-[#0b4d78] border border-blue-200 dark:border-blue-300',
            1: 'bg-[#FBD7DC] text-[#77202d] border border-[#F09FAF]',
            2: 'bg-[#FDE1BF] text-[#7a3a0c] border border-[#F6B772]',
            3: 'bg-[#FEF2A7] text-[#7a6507] border border-[#F6D76B]',
            4: 'bg-[#CFF5D3] text-[#1e6b34] border border-[#8FD9A2]'
        };

        if (status === undefined || status === 0) return palette.default;
        if (status >= 1 && status <= 4) return palette[status];
        return 'bg-transparent text-gray-900 dark:text-gray-100';
    };

    const getTranslationStyle = (status) => {
        const palette = {
            default: 'bg-blue-100 text-[#0b4d78] border border-blue-200',
            1: 'bg-[#FBD7DC] text-[#77202d] border border-[#F09FAF]',
            2: 'bg-[#FDE1BF] text-[#7a3a0c] border border-[#F6B772]',
            3: 'bg-[#FEF2A7] text-[#7a6507] border border-[#F6D76B]',
            4: 'bg-[#CFF5D3] text-[#1e6b34] border border-[#8FD9A2]'
        };

        if (status === undefined || status === 0) return palette.default;
        if (status >= 1 && status <= 4) return palette[status];
        return palette.default;
    };

    return (
        <div className="relative" ref={containerRef}>
            <div className="leading-relaxed text-lg text-gray-900 dark:text-gray-100">
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
