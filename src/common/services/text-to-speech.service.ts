import { Injectable } from '@nestjs/common';
import * as googleTTS from 'google-tts-api';

@Injectable()
export class AudioService {
  async generateAudioFromText(text: string) {
    try {
      const language = 'ar-SA';
      const url = googleTTS.getAudioUrl(text, {
        lang: language,
        slow: false,
        host: 'https://translate.google.com',
      });
      return url;
    } catch (error) {
      throw new Error(`Error generating audio: ${error.message}`);
    }
  }
}