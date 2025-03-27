import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiLimit } from '../interfaces/api-limit.interface';

@Injectable()
export class GroqService {
  private groq: Groq;
  private apiLimits: Map<string, ApiLimit> = new Map();
  private readonly MAX_REQUESTS = 15;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  private async checkApiLimit(userId: string): Promise<boolean> {
    const now = new Date();
    const limit = this.apiLimits.get(userId);

    if (!limit) {
      this.apiLimits.set(userId, { userId, count: 1, lastReset: now });
      return true;
    }

    // Reset counter if it's a new day
    if (now.getDate() !== limit.lastReset.getDate()) {
      limit.count = 0;
      limit.lastReset = now;
    }

    if (limit.count >= this.MAX_REQUESTS) {
      throw new UnauthorizedException('Daily API limit reached. Please try again tomorrow.');
    }

    limit.count++;
    return true;
  }

  async chat(prompt: string, userId: string) {
    await this.checkApiLimit(userId);

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `أنت مساعد ذكي متخصص في الكتب والأدب.
                     يجب أن تجيب دائماً باللغة العربية الفصحى مع التشكيل الكامل.
                     إذا كان السؤال لا يتعلق بالكتب أو القراءة أو الأدب،
                     فيرجى الاعتذار بأدب وتوضيح أنك تناقش فقط المواضيع المتعلقة بالكتب.
                     احرص على استخدام التشكيل الكامل في كل إجاباتك.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content;
    } catch (error) {
      console.error('GROQ API Error:', error);
      throw error;
    }
  }

  async summarizeBook(bookDescription: string, userId: string) {
    const prompt = `قم بتلخيص هذا الكتاب بشكل موجز ودقيق مع استخدام التشكيل الكامل: ${bookDescription}`;
    return this.chat(prompt, userId);
  }

  async generateBookDescription(title: string, genre: string, userId: string) {
    const prompt = `اكتب وصفاً جذاباً لكتاب من فئة ${genre} بعنوان "${title}" مع استخدام التشكيل الكامل للنص العربي`;
    return this.chat(prompt, userId);
  }

  async getRemainingRequests(userId: string): Promise<number> {
    const limit = this.apiLimits.get(userId);
    if (!limit) return this.MAX_REQUESTS;

    const now = new Date();
    if (now.getDate() !== limit.lastReset.getDate()) {
      return this.MAX_REQUESTS;
    }

    return Math.max(0, this.MAX_REQUESTS - limit.count);
  }
} 