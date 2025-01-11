import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleDriveService {
  private drive;
  private FOLDER_ID: string;

  constructor(private configService: ConfigService) {
    const clientEmail = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_EMAIL');
    const privateKey = this.configService.get<string>('GOOGLE_DRIVE_PRIVATE_KEY');
    this.FOLDER_ID = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    if (!clientEmail || !privateKey || !this.FOLDER_ID) {
      throw new Error('Missing Google Drive configuration');
    }

    // Initialize the Google Drive API client
    this.drive = google.drive({
      version: 'v3',
      auth: new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive.appdata',
        ],
      }),
    });
  }

  async uploadAudio(file: Express.Multer.File): Promise<string> {
    try {
      const buffer = file.buffer;
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileName = `${Date.now()}-${file.originalname}`;

      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: file.mimetype,
          parents: [this.FOLDER_ID],
        },
        media: {
          mimeType: file.mimetype,
          body: stream,
        },
      });

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Get the web view link
      const fileData = await this.drive.files.get({
        fileId: response.data.id,
        fields: 'webViewLink, webContentLink',
      });

      return fileData.data.webContentLink;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      throw error;
    }
  }

  async deleteAudio(fileUrl: string): Promise<void> {
    try {
      const fileId = this.getFileIdFromUrl(fileUrl);
      if (fileId) {
        await this.drive.files.delete({
          fileId: fileId,
        });
      }
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      throw error;
    }
  }

  private getFileIdFromUrl(url: string): string | null {
    const match = url.match(/\/d\/([^/]+)/);
    return match ? match[1] : null;
  }
} 