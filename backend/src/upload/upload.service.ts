import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    return new Promise((resole, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'phong_tro_vn/rooms',
            transformation: [
              { width: 1280, height: 720, crop: 'fill' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            if (error) reject(error);
            else resole(result!.secure_url);
          },
        )
        .end(file.buffer);
    });
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
