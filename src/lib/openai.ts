import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AICourseOutlineRequest {
  topic: string;
  duration: number; // in hours
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetAudience: string;
  learningObjectives: string[];
}

export interface AICourseOutline {
  title: string;
  description: string;
  modules: {
    title: string;
    description: string;
    duration: number; // in minutes
    lessons: {
      title: string;
      description: string;
      duration: number; // in minutes
      keyPoints: string[];
    }[];
  }[];
  prerequisites: string[];
  learningOutcomes: string[];
}

export interface AILessonContentRequest {
  lessonTitle: string;
  moduleContext: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  keyPoints: string[];
}

export interface AILessonContent {
  content: string; // Markdown formatted
  summary: string;
  keyTakeaways: string[];
  suggestedActivities: string[];
  quizQuestions: {
    question: string;
    type: 'multiple-choice' | 'true-false' | 'text';
    options?: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export class AIService {
  static async generateCourseOutline(request: AICourseOutlineRequest): Promise<AICourseOutline> {
    try {
      const prompt = `
        Generate a comprehensive course outline for a ${request.difficulty} level course on "${request.topic}".
        
        Course Details:
        - Duration: ${request.duration} hours
        - Target Audience: ${request.targetAudience}
        - Learning Objectives: ${request.learningObjectives.join(', ')}
        
        Please provide:
        1. A compelling course title and description
        2. 3-8 modules with clear learning progression
        3. 2-5 lessons per module with specific learning outcomes
        4. Prerequisites and learning outcomes
        5. Realistic time estimates for each module and lesson
        
        Format the response as JSON with the following structure:
        {
          "title": "Course Title",
          "description": "Course description",
          "modules": [
            {
              "title": "Module Title",
              "description": "Module description",
              "duration": 30,
              "lessons": [
                {
                  "title": "Lesson Title",
                  "description": "Lesson description",
                  "duration": 15,
                  "keyPoints": ["Point 1", "Point 2", "Point 3"]
                }
              ]
            }
          ],
          "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
          "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert instructional designer creating comprehensive course outlines. Always respond with valid JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating course outline:', error);
      throw new Error('Failed to generate course outline');
    }
  }

  static async generateLessonContent(request: AILessonContentRequest): Promise<AILessonContent> {
    try {
      const prompt = `
        Generate comprehensive lesson content for: "${request.lessonTitle}"
        
        Context:
        - Module: ${request.moduleContext}
        - Duration: ${request.duration} minutes
        - Difficulty: ${request.difficulty}
        - Key Points: ${request.keyPoints.join(', ')}
        
        Please provide:
        1. Detailed lesson content in Markdown format
        2. A concise summary
        3. Key takeaways
        4. Suggested hands-on activities
        5. 3-5 quiz questions with explanations
        
        Format the response as JSON:
        {
          "content": "Markdown formatted lesson content",
          "summary": "Brief lesson summary",
          "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
          "suggestedActivities": ["Activity 1", "Activity 2"],
          "quizQuestions": [
            {
              "question": "Question text",
              "type": "multiple-choice",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correctAnswer": "Correct option",
              "explanation": "Why this is correct"
            }
          ]
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert educator creating engaging lesson content. Always respond with valid JSON format and use clear, accessible language."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating lesson content:', error);
      throw new Error('Failed to generate lesson content');
    }
  }

  static async generateQuizQuestions(
    content: string,
    count: number = 5,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ) {
    try {
      const prompt = `
        Generate ${count} quiz questions based on this content:
        
        ${content}
        
        Difficulty: ${difficulty}
        
        Create a mix of question types (multiple-choice, true/false, text) appropriate for the difficulty level.
        
        Format as JSON:
        {
          "questions": [
            {
              "question": "Question text",
              "type": "multiple-choice",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correctAnswer": "Correct answer",
              "explanation": "Explanation"
            }
          ]
        }
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert quiz creator. Generate educational questions that test understanding, not just memorization."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      throw new Error('Failed to generate quiz questions');
    }
  }

  static async summarizeContent(content: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating concise, informative summaries. Focus on key concepts and actionable insights."
          },
          {
            role: "user",
            content: `Please summarize this content in 2-3 sentences:\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return completion.choices[0]?.message?.content || 'Unable to generate summary';
    } catch (error) {
      console.error('Error summarizing content:', error);
      return 'Summary generation failed';
    }
  }

  static async generateTags(content: string): Promise<string[]> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert at content tagging. Generate 3-8 relevant, specific tags for educational content."
          },
          {
            role: "user",
            content: `Generate relevant tags for this content:\n\n${content}`
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        return [];
      }

      return response.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    } catch (error) {
      console.error('Error generating tags:', error);
      return [];
    }
  }

  static async extractCourseFields(text: string): Promise<{
    topic: string;
    targetAudience: string;
    duration: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    learningObjectives: string[];
  }> {
    try {
      const prompt = `
        Extract course information from the following text. Look for structured information like:
        - **Topic:** or **Course:** or similar patterns
        - **Target Audience:** or **Audience:** or similar patterns  
        - **Duration:** or **Time:** or similar patterns
        - **Difficulty:** or **Level:** or similar patterns
        - **Learning Objectives:** or **Objectives:** or numbered lists

        Return a JSON object with these exact fields:
        {
          "topic": "extracted topic or title",
          "targetAudience": "extracted target audience description", 
          "duration": number_of_hours,
          "difficulty": "beginner" or "intermediate" or "advanced",
          "learningObjectives": ["objective 1", "objective 2", "objective 3", ...]
        }

        Text to analyze:
        ${text}

        Return only valid JSON, no additional text or formatting.
      `;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert instructional designer. Extract course information from text and return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      console.log('OpenAI response:', response);
      
      // Clean up the response to ensure it's valid JSON
      const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      console.log('Cleaned response:', cleanedResponse);
      
      let extracted;
      try {
        extracted = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response that failed to parse:', cleanedResponse);
        throw new Error('Failed to parse AI response as JSON');
      }
      
      // Validate and provide defaults
      return {
        topic: extracted.topic || 'Untitled Course',
        targetAudience: extracted.targetAudience || 'General audience',
        duration: Math.max(1, Math.min(20, extracted.duration || 4)),
        difficulty: ['beginner', 'intermediate', 'advanced'].includes(extracted.difficulty) 
          ? extracted.difficulty 
          : 'beginner',
        learningObjectives: Array.isArray(extracted.learningObjectives) 
          ? extracted.learningObjectives.filter(obj => typeof obj === 'string' && obj.trim().length > 0)
          : ['Learn the fundamentals', 'Apply practical skills', 'Master advanced concepts']
      };
    } catch (error) {
      console.error('Error extracting course fields:', error);
      // Return default values on error
      return {
        topic: 'Untitled Course',
        targetAudience: 'General audience',
        duration: 4,
        difficulty: 'beginner',
        learningObjectives: ['Learn the fundamentals', 'Apply practical skills', 'Master advanced concepts']
      };
    }
  }
}
