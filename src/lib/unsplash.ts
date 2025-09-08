// Unsplash API service for image search and fetching
export interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  description: string;
  user: {
    name: string;
    username: string;
  };
  links: {
    html: string;
  };
}

export interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
  total: number;
  total_pages: number;
}

export interface UnsplashSearchParams {
  query: string;
  page?: number;
  per_page?: number;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  order_by?: 'latest' | 'oldest' | 'popular';
}

class UnsplashService {
  private accessKey: string;
  private baseUrl = 'https://api.unsplash.com';

  constructor() {
    this.accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || '';
    console.log('Unsplash access key loaded:', this.accessKey ? 'Yes' : 'No');
    if (!this.accessKey) {
      console.warn('Unsplash access key not found. Image search will be disabled.');
    }
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.accessKey) {
      console.error('Unsplash access key not configured');
      throw new Error('Unsplash access key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    console.log('Unsplash API request:', url.toString());
    console.log('Access key (first 10 chars):', this.accessKey.substring(0, 10) + '...');

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      console.log('Unsplash API response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Unsplash API error:', response.status, response.statusText, errorText);
        throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Unsplash API response data:', data);
      return data;
    } catch (error) {
      console.error('Unsplash API fetch error:', error);
      throw error;
    }
  }

  async searchPhotos(params: UnsplashSearchParams): Promise<UnsplashSearchResponse> {
    const searchParams = {
      query: params.query,
      page: params.page?.toString() || '1',
      per_page: params.per_page?.toString() || '12',
      orientation: params.orientation || 'landscape',
      order_by: params.order_by || 'relevant',
    };

    return this.makeRequest<UnsplashSearchResponse>('/search/photos', searchParams);
  }

  async getRandomPhoto(params?: {
    query?: string;
    orientation?: 'landscape' | 'portrait' | 'squarish';
    count?: number;
  }): Promise<UnsplashPhoto | UnsplashPhoto[]> {
    const searchParams: Record<string, string> = {};
    if (params?.query) searchParams.query = params.query;
    if (params?.orientation) searchParams.orientation = params.orientation;
    if (params?.count) searchParams.count = params.count.toString();

    return this.makeRequest<UnsplashPhoto | UnsplashPhoto[]>('/photos/random', searchParams);
  }

  async getPhoto(id: string): Promise<UnsplashPhoto> {
    return this.makeRequest<UnsplashPhoto>(`/photos/${id}`);
  }

  // Helper method to get optimized image URL
  getOptimizedImageUrl(photo: UnsplashPhoto, size: 'thumb' | 'small' | 'regular' | 'full' = 'regular'): string {
    const url = photo.urls[size];
    console.log(`Image URL for ${photo.id} (${size}):`, url);
    return url;
  }

  // Helper method to get attribution text
  getAttribution(photo: UnsplashPhoto): string {
    console.log('getAttribution - Photo data:', photo);
    console.log('getAttribution - User data:', photo.user);
    console.log('getAttribution - User name:', photo.user.name);
    const attribution = `Photo by ${photo.user.name} on Unsplash`;
    console.log('getAttribution - Generated attribution:', attribution);
    return attribution;
  }

  // Helper method to get attribution link
  getAttributionLink(photo: UnsplashPhoto): string {
    return photo.links.html;
  }
}

export const unsplashService = new UnsplashService();
