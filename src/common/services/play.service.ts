import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PlayHT from 'playht';

@Injectable()
export class PlayService {
  private readonly defaultArabicVoice = 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-arabic/manifest.json';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('TEXT_TO_SPEECH_API_KEY');
    const userId = this.configService.get<string>('TEXT_TO_SPEECH_USER_ID');

    if (!apiKey || !userId) {
      throw new Error('Missing Play.ht API configuration');
    }

    PlayHT.init({
      apiKey,
      userId,
      defaultVoiceId: this.defaultArabicVoice,
      defaultVoiceEngine: 'PlayHT2.0',
    });
  }

  async getAudioUrl(text: string): Promise<string> {
    try {
      const generated = await PlayHT.generate(text, {
        voiceEngine: 'PlayHT2.0',
        voiceId: this.defaultArabicVoice,
        outputFormat: 'mp3',
        quality: 'premium',
      });

      return generated.audioUrl;
    } catch (error) {
      console.error('PlayHT Error:', error);
      throw new HttpException(
        error.message || 'Text to speech conversion failed',
        HttpStatus.BAD_REQUEST
      );
    }
  }
}