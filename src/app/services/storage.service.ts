import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private storage: Storage,
    private logger: LoggerService
  ) {}

  async uploadImage(file: File, path: string): Promise<string> {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 5MB limit');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    try {
      const storageRef = ref(this.storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    } catch (error: unknown) {
      this.logger.error('Error uploading image:', error);
      throw error;
    }
  }

  async deleteImage(path: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
    } catch (error: unknown) {
      this.logger.error('Error deleting image:', error);
    }
  }

  generateImagePath(workspaceId: string, nodeId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `workspaces/${workspaceId}/nodes/${nodeId}/${timestamp}_${sanitized}`;
  }
}
