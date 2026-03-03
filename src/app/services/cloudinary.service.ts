import { Injectable } from '@angular/core';

/**
 * Cloudinary Image Utility Service
 * Provides methods for transforming Cloudinary URLs for different use cases
 */
@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private readonly CLOUDINARY_PATTERN = /\/upload\//;

  /**
   * Generate a thumbnail URL with optimized dimensions (for card lists)
   * Maintains aspect ratio with fill crop
   * @param imageUrl - Original Cloudinary image URL
   * @param width - Thumbnail width (default: 100px)
   * @param height - Thumbnail height (default: 100px)
   * @returns Transformed URL for thumbnail display
   */
  getThumbnailUrl(imageUrl: string, width: number = 100, height: number = 100): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }
    // Use c_fill to crop intelligently while maintaining aspect
    // f_auto for automatic format selection (WebP, AVIF)
    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/w_${width},h_${height},c_fill,g_auto,q_auto,f_auto/`
    );
  }

  /**
   * Generate a preview URL (for dialogs/details view)
   * Maintains original aspect ratio by containing the image
   * @param imageUrl - Original Cloudinary image URL
   * @param width - Preview width (default: 400px)
   * @param height - Preview height (default: 400px)
   * @returns Transformed URL for preview display
   */
  getPreviewUrl(imageUrl: string, width: number = 400, height: number = 400): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }
    // Use c_scale to maintain aspect ratio without cropping
    // f_auto for automatic format selection (WebP, AVIF)
    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/w_${width},h_${height},c_scale,q_auto,f_auto/`
    );
  }

  /**
   * Generate a large display URL (for full-size image viewing)
   * Maintains original aspect ratio
   * @param imageUrl - Original Cloudinary image URL
   * @param maxWidth - Maximum width (default: 800px)
   * @returns Optimized URL with auto quality
   */
  getLargeUrl(imageUrl: string, maxWidth: number = 800): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }
    // c_limit ensures image doesn't exceed dimensions while maintaining aspect ratio
    // f_auto for automatic format selection (WebP, AVIF)
    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/w_${maxWidth},c_limit,q_auto,f_auto/`
    );
  }

  /**
   * Generate an optimized URL with auto quality and custom sizing
   * @param imageUrl - Original Cloudinary image URL
   * @param width - Image width (optional)
   * @param height - Image height (optional)
   * @param cropMode - Crop mode: 'fill', 'fit', 'scale' (default: 'fit')
   * @returns Optimized URL with auto quality
   */
  getOptimizedUrl(
    imageUrl: string,
    width?: number,
    height?: number,
    cropMode: 'fill' | 'fit' | 'scale' = 'fit'
  ): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }

    let transform = 'q_auto,f_auto';
    
    if (cropMode === 'fill' && width && height) {
      transform = `w_${width},h_${height},c_fill,g_auto,q_auto,f_auto`;
    } else if (cropMode === 'fit' && width && height) {
      transform = `w_${width},h_${height},c_scale,q_auto,f_auto`;
    } else if (width && height) {
      transform = `w_${width},h_${height},c_scale,q_auto,f_auto`;
    } else if (width) {
      transform = `w_${width},c_limit,q_auto,f_auto`;
    } else if (height) {
      transform = `h_${height},c_limit,q_auto,f_auto`;
    }

    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/${transform}/`
    );
  }

  /**
   * Check if URL is a Cloudinary URL
   * @param imageUrl - URL to check
   * @returns True if URL is from Cloudinary
   */
  isCloudinaryUrl(imageUrl: string): boolean {
    return !!imageUrl && imageUrl.includes('cloudinary.com');
  }

  /**
   * Get a Cloudinary URL with responsive sizing
   * Useful for img srcset attribute or multiple breakpoints
   * @param imageUrl - Original Cloudinary image URL
   * @returns Object with different size variants
   */
  getResponsiveSizes(imageUrl: string): {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  } {
    return {
      thumbnail: this.getThumbnailUrl(imageUrl, 100, 100),
      small: this.getThumbnailUrl(imageUrl, 200, 200),
      medium: this.getPreviewUrl(imageUrl, 400, 400),
      large: this.getPreviewUrl(imageUrl, 600, 600),
      xlarge: this.getLargeUrl(imageUrl, 1200)
    };
  }

  /**
   * Get a Cloudinary image for header/hero display
   * Optimized for banner display, lower quality since faded
   * @param imageUrl - Original Cloudinary image URL
   * @param maxWidth - Maximum width (default: 600px for banner)
   * @returns Optimized URL for hero/banner display
   */
  getHeroUrl(imageUrl: string, maxWidth: number = 600): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }
    // Banner image - lower quality since it's faded background
    // w_600 for reduced size, q_70 acceptable for blurred background
    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/w_${maxWidth},c_fit,q_70,f_auto/`
    );
  }

  /**
   * Get a Cloudinary image for detail/content display at full quality
   * @param imageUrl - Original Cloudinary image URL
   * @param maxWidth - Maximum width (default: 800px)
   * @returns Optimized URL for content display
   */
  getDetailUrl(imageUrl: string, maxWidth: number = 800): string {
    if (!imageUrl || !this.isCloudinaryUrl(imageUrl)) {
      return imageUrl;
    }
    // Full quality for content images, use limit to maintain aspect ratio
    return imageUrl.replace(
      this.CLOUDINARY_PATTERN,
      `/upload/w_${maxWidth},c_limit,q_auto,f_auto/`
    );
  }
}
