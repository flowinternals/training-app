# Unsplash Integration Setup

This document explains how to set up Unsplash API integration for course images.

## Environment Variables

The Unsplash API credentials are already provided in your `env keys.md` file:

```env
NEXT_PUBLIC_UNSPLASH_ACCESS_KEY=dOBXtJr2fBjWGrm1XGWgcZGnUVC7Tm_kLHeAVAjqQ6U
UNSPLASH_SECRET_KEY=sNBTk20jA9bbY3FBdZ_LY85RlR7bqC0LVzl8uqgWdvs
```

Simply copy these values to your `.env.local` file to enable the image search functionality.

## Features

- **Image Search**: Admins can search for images using keywords
- **Random Image**: Get a random image for quick selection
- **Thumbnail Support**: Course thumbnails for admin dashboard
- **Banner Images**: Large banner images for course view pages
- **Attribution**: Automatic attribution handling for Unsplash images

## Usage

1. **In Course Creation/Edit**: Use the image selector components to choose thumbnail and banner images
2. **Course View**: Banner images display at the top of course pages with title overlay
3. **Admin Dashboard**: Course thumbnails are displayed in the course list

## API Rate Limits

- Demo mode: 50 requests per hour
- Production mode: Higher limits (requires approval)

## Image Sizes

- **Thumbnail**: Small images for course cards and admin dashboard
- **Banner**: Large landscape images for course view pages
- **Search Results**: Medium-sized preview images

## Attribution

All images from Unsplash include proper attribution and links back to the original photographer.
