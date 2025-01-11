import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService {
  private readonly uploadDir = 'uploads/audio';

  constructor() {
    // Ensure upload directory exists when service starts
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveAudio(file: Express.Multer.File): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);
    return fileName; // Return just the filename to store in DB
  }

  async deleteAudio(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadDir, fileName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
} 