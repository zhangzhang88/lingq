import React, { createContext, useState, useContext, useEffect } from 'react';

const SettingsContext = createContext();
const defaultSettings = {
    accent: 'us', // 'us' or 'uk'
    targetLanguage: 'zh-Hans',
    showTranslations: false, // Show translations above marked words
    translationProvider: 'default', // 'default' | 'deepseek'
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat'
};

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('lingq_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('lingq_settings', JSON.stringify(settings));
    }, [settings]);

    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    return useContext(SettingsContext);
}
