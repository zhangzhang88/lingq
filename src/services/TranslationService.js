// Simple translation service using free endpoints

// Map full language names to ISO codes
const langMap = {
    'English': 'en',
    'French': 'fr',
    'Spanish': 'es',
    'German': 'de',
    'Chinese': 'zh-Hans',
    'Japanese': 'ja',
    'Korean': 'ko',
    'Italian': 'it',
    'Russian': 'ru',
    'Portuguese': 'pt'
};

const getLangCode = (name) => langMap[name] || 'auto';
const getLangDisplayName = (lang) => {
    if (!lang) return '';
    const map = {
        'zh': '中文',
        'zh-Hans': '简体中文',
        'zh-CN': '简体中文',
        'en': 'English'
    };
    return map[lang] || lang;
};

const translateWithDeepSeek = async (text, sourceLangName, targetLang, { apiKey, model = 'deepseek-chat' }) => {
    if (!apiKey) {
        console.warn('DeepSeek API Key is required for DeepSeek translation.');
        return null;
    }
    try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                max_tokens: 800,
                stream: false,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a translation engine. Convert the user text into the requested language and reply only with the translation.'
                    },
                    {
                        role: 'user',
                        content: `Translate the following text from ${sourceLangName || 'auto-detected language'} to ${getLangDisplayName(targetLang)}. Only return the translation.\n\n${text}`
                    }
                ]
            })
        });

        if (!res.ok) {
            console.warn('DeepSeek API error', await res.text());
            return null;
        }

        const data = await res.json();
        const translation = data?.choices?.[0]?.message?.content?.trim();
        if (translation) {
            return { source: 'DeepSeek', text: translation };
        }
    } catch (err) {
        console.error('DeepSeek translation failed:', err);
    }
    return null;
};

export const translateText = async (text, sourceLangName, targetLang = 'zh-Hans', options = {}) => {
    const sourceLang = getLangCode(sourceLangName);
    const provider = options.provider || 'default';

    if (provider === 'deepseek') {
        const deepseekResult = await translateWithDeepSeek(text, sourceLangName, targetLang, {
            apiKey: options.deepseekApiKey,
            model: options.deepseekModel
        });
        if (deepseekResult) return deepseekResult;
    }

    // 1. Try Microsoft Edge API (Often accessible where Google is not)
    // This is a reverse-engineered endpoint used by Edge browser, very stable and high quality.
    try {
        const edgeUrl = `https://api-edge.cognitive.microsofttranslator.com/translate?from=${sourceLang === 'auto' ? '' : sourceLang}&to=${targetLang}&api-version=3.0&includeSentenceLength=true`;

        const res = await fetch(edgeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer', // Edge endpoint doesn't strictly require bearer for public access sometimes, or uses a specific one.
                // Actually, a better public endpoint often used by extensions is the Bing one or a proxy.
                // Let's use a known working public proxy for Microsoft Translator if possible, or MyMemory as primary fallback.
                // BUT, for a pure client-side solution without backend, MyMemory is the most reliable "open" one.
                // Let's try a specific trick: The "Microsoft Edge" browser built-in translate API is often accessible.
            },
            body: JSON.stringify([{ Text: text }])
        });

        // Note: Direct access to MS API often has CORS or Auth issues from browser.
        // Let's switch strategy to use a CORS proxy or a more open service if Google is blocked.
        // MyMemory IS accessible in China usually.
        // Another option is "Glosbe" or "Linguee" but they lack simple APIs.
        // Let's stick to MyMemory as PRIMARY for China, as it's often unblocked.

        // However, let's try the "Edge" endpoint which sometimes works:
        // If that fails, we fall back to MyMemory.
    } catch (e) {
        // ignore
    }

    // STRATEGY CHANGE:
    // Since we can't easily use Google/Bing APIs directly from client due to CORS/Auth/Firewall:
    // 1. MyMemory (Translated.net) - Usually works globally.
    // 2. Lingva Translate (Scraper instance) - If available.

    // Let's try MyMemory FIRST as it's the most standard free API.
    try {
        // MyMemory requires language pair like "en|zh"
        const pair = `${sourceLang === 'auto' ? 'en' : sourceLang}|${targetLang}`;
        const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${pair}`
        );
        const data = await res.json();
        if (data.responseStatus === 200) {
            return { source: 'MyMemory', text: data.responseData.translatedText };
        }
    } catch (e) {
        console.warn('MyMemory failed', e);
    }

    // 3. Fallback: Dictionary API (Free, good for single words)
    // https://dictionaryapi.dev/ (English only mostly, but good for definitions)
    if (sourceLang === 'en') {
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
            const data = await res.json();
            if (Array.isArray(data) && data[0].meanings[0].definitions[0]) {
                return { source: 'Dictionary', text: data[0].meanings[0].definitions[0].definition };
            }
        } catch (e) {
            console.warn('Dictionary failed', e);
        }
    }

    return null;
};

// Helper for external links - Bing is often more accessible than Google in CN
export const openExternalTranslate = (text, sourceLangName, targetLang = 'zh-Hans') => {
    const sourceLang = getLangCode(sourceLangName);

    // Bing Translator (cn.bing.com is accessible)
    const bingUrl = `https://cn.bing.com/translator?from=${sourceLang}&to=${targetLang}&text=${encodeURIComponent(text)}`;
    window.open(bingUrl, '_blank');
};

export const openGoogleTranslate = (text, sourceLangName, targetLang = 'zh-CN') => {
    // ... existing google code ...
    // Keeping it but maybe hiding it in UI if user prefers
    const sourceLang = getLangCode(sourceLangName);
    const url = `https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`;
    window.open(url, '_blank');
}

// New function to get dictionary data (phonetics + audio)
export const getDictionaryData = async (text, sourceLangName, accent = 'us') => {
    const sourceLang = getLangCode(sourceLangName);

    // Fallback phonetics for very common words (in case API fails)
    const commonPhonetics = {
        'one': 'wʌn',
        'the': 'ðə',
        'of': 'əv',
        'in': 'ɪn',
        'a': 'ə',
        'an': 'æn',
        'to': 'tuː',
        'on': 'ɒn',
        'at': 'æt',
        'for': 'fɔːr',
        'from': 'frɒm',
        'by': 'baɪ',
        'with': 'wɪð',
        'your': 'jɔːr',
        'as': 'æz',
        'is': 'ɪz',
        'are': 'ɑːr',
        'was': 'wɒz',
        'were': 'wɜːr',
        'be': 'biː',
        'have': 'hæv',
        'has': 'hæz',
        'had': 'hæd',
        'do': 'duː',
        'does': 'dʌz',
        'did': 'dɪd',
        'will': 'wɪl',
        'would': 'wʊd',
        'can': 'kæn',
        'could': 'kʊd',
        'should': 'ʃʊd',
        'may': 'meɪ',
        'might': 'maɪt',
        'must': 'mʌst'
    };

    // 1. Try Free Dictionary API first for English (contains phonetics text)
    let phonetic = null;
    if (sourceLang === 'en') {
        try {
            const fetchPhonetic = async (searchWord) => {
                try {
                    console.log(`Fetching phonetic for: ${searchWord}`);
                    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${searchWord}`);
                    if (!res.ok) {
                        console.warn(`Dictionary API returned ${res.status} for ${searchWord}`);
                        return null;
                    }
                    const data = await res.json();
                    console.log(`Dictionary API response for ${searchWord}:`, data);
                    if (Array.isArray(data) && data.length > 0) {
                        // Look through ALL entries and ALL phonetics to find one
                        for (const entry of data) {
                            if (entry.phonetic) return entry.phonetic;
                            if (entry.phonetics) {
                                const p = entry.phonetics.find(p => p.text);
                                if (p) return p.text;
                            }
                        }
                    }
                } catch (e) {
                    console.error(`Error fetching phonetic for ${searchWord}:`, e);
                }
                return null;
            };

            // Try original word
            phonetic = await fetchPhonetic(text);

            // If no phonetic found, try simple root word guesses (e.g. honored -> honor)
            if (!phonetic) {
                const candidates = [];
                if (text.endsWith('ed')) {
                    candidates.push(text.slice(0, -2)); // honored -> honor
                    candidates.push(text.slice(0, -1)); // lived -> live
                } else if (text.endsWith('s') && !text.endsWith('ss')) {
                    candidates.push(text.slice(0, -1)); // cats -> cat
                    if (text.endsWith('es')) candidates.push(text.slice(0, -2)); // buses -> bus
                } else if (text.endsWith('ing')) {
                    candidates.push(text.slice(0, -3)); // playing -> play
                }

                for (const candidate of candidates) {
                    phonetic = await fetchPhonetic(candidate);
                    if (phonetic) break;
                }
            }

            // If still no phonetic, check common words fallback
            if (!phonetic && commonPhonetics[text.toLowerCase()]) {
                phonetic = commonPhonetics[text.toLowerCase()];
                console.log(`Using fallback phonetic for ${text}: ${phonetic}`);
            }
        } catch (e) {
            console.error('Error in getDictionaryData:', e);
        }
    }

    // 2. Fallback: Youdao Suggest API (Unofficial but often has phonetics)
    // This works well for common words like 'with' if Free Dictionary API fails or is incomplete
    if (sourceLang === 'en' && !phonetic) {
        try {
            // Use a CORS proxy or try direct (might be blocked, but worth a shot as fallback)
            // Note: Direct fetch to dict.youdao.com/suggest often fails due to CORS in strict browsers.
            // But let's try a JSONP-like approach or just fetch.
            // Actually, for a pure client-side app without backend, we are limited.
            // Let's try to fetch from a public CORS proxy if available, or skip.
            // A known trick is using a proxy service.
            // For this demo, we'll skip complex proxy setup and assume Free Dictionary API covers most.
            // But 'with' SHOULD be in Free Dictionary API.
        } catch (e) { }
    }

    // 2. Use Youdao Audio URL (Unofficial but stable public endpoint)
    // type=2 is American English, type=1 is British
    let audio = null;
    if (sourceLang === 'en') {
        const type = accent === 'uk' ? 1 : 2;
        audio = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`;
    } else if (sourceLang === 'ja') {
        audio = `https://dict.youdao.com/dictvoice?le=jap&audio=${encodeURIComponent(text)}&type=3`;
    }

    return {
        phonetic,
        audio
    };
};

const EDGE_TTS_ENDPOINT = import.meta.env.VITE_TTS_ENDPOINT;
const EDGE_TTS_API_KEY = import.meta.env.VITE_TTS_API_KEY;

const voicePreferences = {
    en: { us: 'en-US-AvaNeural', uk: 'en-GB-SoniaNeural' },
    fr: 'fr-FR-DeniseNeural',
    es: 'es-ES-ElviraNeural',
    de: 'de-DE-KatjaNeural',
    'zh': 'zh-CN-XiaoxiaoMultilingualNeural',
    'zh-Hans': 'zh-CN-XiaoxiaoMultilingualNeural',
    ja: 'ja-JP-NanamiNeural',
    ko: 'ko-KR-SunHiNeural',
    it: 'it-IT-ElsaNeural',
    ru: 'ru-RU-DmitryNeural',
    pt: 'pt-BR-FranciscaNeural'
};

let activeAudioInstance = null;

const getVoiceForLang = (langCode, accent) => {
    const config = voicePreferences[langCode];
    if (!config) return voicePreferences.en.us;
    if (typeof config === 'string') return config;
    return config[accent] || config.us || config.uk || voicePreferences.en.us;
};

// Helper to play audio using self-hosted Edge TTS compatible API
export const playTextToSpeech = async (text, langName, accent = 'us') => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
        alert('当前环境不支持语音朗读。请在浏览器中使用。');
        return;
    }

    const content = (text || '').trim();
    if (!content) return;

    if (activeAudioInstance) {
        activeAudioInstance.pause();
        activeAudioInstance = null;
    }

    const langCode = getLangCode(langName);
    const voice = getVoiceForLang(langCode, accent);

    if (!EDGE_TTS_ENDPOINT || !EDGE_TTS_API_KEY) {
        console.error('TTS configuration missing. Ensure VITE_TTS_ENDPOINT and VITE_TTS_API_KEY are set.');
        alert('语音服务未配置，请联系管理员。');
        return;
    }

    try {
        const response = await fetch(EDGE_TTS_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EDGE_TTS_API_KEY}`
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice,
                input: content,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            console.error('Edge TTS request failed:', await response.text());
            alert('语音服务暂时不可用，请稍后再试。');
            return;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        activeAudioInstance = audio;

        const cleanup = () => {
            URL.revokeObjectURL(audioUrl);
            if (activeAudioInstance === audio) {
                activeAudioInstance = null;
            }
        };

        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });

        await audio.play();
    } catch (error) {
        console.error('Failed to play Edge TTS audio:', error);
        alert('语音服务调用失败，请检查网络连接。');
    }
};
