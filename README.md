# Training Platform

A modern, full-stack training platform built with Next.js, Firebase, and Stripe. This platform allows subject-matter experts to create and manage training courses with AI assistance, while providing learners with an intuitive interface to access both free and paid content.

## Features

### For Learners
- **Course Discovery**: Browse courses by category, difficulty, and price
- **Interactive Learning**: Progress through modules and lessons with real-time tracking
- **Code Snippets**: Copy code examples with one-click copy-to-clipboard functionality
- **Responsive Design**: Optimized for desktop and mobile devices
- **Theme Support**: Light and dark mode options

### For Administrators
- **Course Management**: Create, edit, and publish courses with rich content
- **AI Integration**: Generate course content using AI assistance
- **User Management**: Manage user roles and permissions
- **Payment Processing**: Integrated Stripe payments for course monetization
- **Content Editor**: Rich text editor with syntax highlighting for code snippets

### Technical Features
- **Real-time Updates**: Firebase Firestore provides live content synchronization
- **Secure Authentication**: Firebase Auth with role-based access control
- **Payment Integration**: Stripe checkout and subscription management
- **Image Management**: Unsplash API integration for course imagery
- **Code Highlighting**: Prism.js syntax highlighting with copy functionality

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Code Snippet Copy Feature

The platform includes a subtle copy-to-clipboard button for all code snippets in Course and View modes. The button appears as a small icon in the top-right corner of code blocks, allowing students to easily copy code examples without any visual clutter.

### Implementation Details
- Icon-only design (no text labels)
- Positioned in top-right corner of code blocks
- Works in both light and dark themes
- Silent copy operation (no visual feedback)
- Fallback support for older browsers

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
