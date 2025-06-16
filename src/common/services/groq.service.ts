import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroqService {
  private readonly groq: Groq;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.groq = new Groq({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
    });
  }

  async chat(prompt: string) {
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

  async summarizeBook(bookDescription: string) {
    const prompt = `لخّص هذا الكتاب بأسلوب بسيط وواضح، يكون على شكل فقرة تعبّر عن فكرة الكتاب، مع ذكر النقاط الأساسية فيه. لا تُقيّد بعدد كلمات، واستخدم التشكيل الكامل في النص. هذا هو محتوى الكتاب: ${bookDescription}`;
    return this.chat(prompt);
  }

  async generateBookDescription(title: string, genre: string) {
    const prompt = `اكتب وصفاً جذاباً لكتاب من فئة ${genre} بعنوان "${title}" مع استخدام التشكيل الكامل للنص العربي بحد أقصي 100 كلمة`;
    return this.chat(prompt);
  }
}