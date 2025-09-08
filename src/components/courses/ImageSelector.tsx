'use client';

import { useState, useEffect } from 'react';
import { Search, X, ExternalLink, Loader2, Image as ImageIcon } from 'lucide-react';
import { unsplashService, UnsplashPhoto } from '@/lib/unsplash';

interface ImageSelectorProps {
  onImageSelect: (imageUrl: string, attribution: string) => void;
  currentImage?: string;
  placeholder?: string;
  className?: string;
  label?: string;
}

export default function ImageSelector({ 
  onImageSelect, 
  currentImage, 
  placeholder = "Search for images...",
  className = "",
  label = "Course Image"
}: ImageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<UnsplashPhoto | null>(null);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchImages();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchImages = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Searching for images with query:', searchQuery);
      const response = await unsplashService.searchPhotos({
        query: searchQuery,
        per_page: 12,
        orientation: 'landscape'
      });
      console.log('Search results:', response);
      setSearchResults(response.results);
    } catch (err) {
      setError('Failed to search images. Please try again.');
      console.error('Image search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (photo: UnsplashPhoto) => {
    setSelectedImage(photo);
    const imageUrl = unsplashService.getOptimizedImageUrl(photo, 'regular');
    const attribution = unsplashService.getAttribution(photo);
    console.log('ImageSelector - Selected photo:', photo);
    console.log('ImageSelector - Image URL:', imageUrl);
    console.log('ImageSelector - Attribution:', attribution);
    onImageSelect(imageUrl, attribution);
    setIsOpen(false);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    onImageSelect('', '');
  };

  const getRandomImage = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Getting random image...');
      const photo = await unsplashService.getRandomPhoto({
        orientation: 'landscape'
      }) as UnsplashPhoto;
      console.log('Random photo received:', photo);
      setSelectedImage(photo);
      const imageUrl = unsplashService.getOptimizedImageUrl(photo, 'regular');
      const attribution = unsplashService.getAttribution(photo);
      onImageSelect(imageUrl, attribution);
    } catch (err) {
      setError('Failed to get random image. Please try again.');
      console.error('Random image error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      {/* Current Image Display */}
      {currentImage && (
        <div className="relative">
          <img
            src={currentImage}
            alt="Selected course image"
            className="w-full h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image Selection Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <Search className="h-4 w-4 mr-2" />
          {currentImage ? 'Change Image' : 'Search Images'}
        </button>
        
        <button
          type="button"
          onClick={getRandomImage}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Image Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Course Image
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="p-4 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Searching images...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                  <button
                    onClick={searchImages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'No images found. Try a different search term.' : 'Enter a search term to find images.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {searchResults.map((photo) => {
                    const imageUrl = unsplashService.getOptimizedImageUrl(photo, 'small');
                    console.log('Rendering image:', photo.id, imageUrl);
                    return (
                      <div
                        key={photo.id}
                        className="relative cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors"
                        onClick={() => handleImageSelect(photo)}
                        style={{ 
                          width: '100%', 
                          height: '128px',
                          backgroundColor: '#f3f4f6',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt={photo.alt_description || photo.description}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            display: 'block'
                          }}
                          onError={(e) => {
                            console.error('Image failed to load:', imageUrl, e);
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `
                              <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f3f4f6; color: #999; font-size: 12px;">
                                Image Error
                              </div>
                            `;
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully:', imageUrl);
                          }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                          padding: '8px',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          {photo.user.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Images provided by Unsplash. Please ensure you have the right to use selected images.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
