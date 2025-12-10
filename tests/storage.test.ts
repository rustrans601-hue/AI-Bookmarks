import { getAISettings, saveAISettings } from '../services/storage';
import { DEFAULT_AI_SETTINGS } from '../types';
import { vi } from 'vitest';

describe('Storage Service', () => {
  it('should allow saving an empty string for ollamaModel', () => {
    const settings = { ...DEFAULT_AI_SETTINGS, ollamaModel: '' };
    saveAISettings(settings);
    const retrievedSettings = getAISettings();
    expect(retrievedSettings.ollamaModel).toBe('');
  });
});
