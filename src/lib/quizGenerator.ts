import OpenAI from 'openai';
import { QuizBlock, Question } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface QuizGenerationRequest {
  moduleContent: string;
  moduleTitle: string;
  quizTypeHints?: string[];
  questionCount?: number;
}

export class QuizGenerator {
  static async generateQuizFromContent(
    request: QuizGenerationRequest
  ): Promise<QuizBlock> {
    try {
      const prompt = `
You are a course quiz generator. Given the following module content:

Module: ${request.moduleTitle}

${request.moduleContent}

Create ${request.questionCount || 5}–7 questions that test comprehension. Mix types: multiple choice, multiple select, true/false, short answer, matching. Return JSON conforming to the QuizBlock schema provided.

Requirements:
- Multiple choice: 1-2 questions with single correct answer
- Multiple select: 1-2 questions with multiple correct answers  
- True/False: 1-2 questions
- Short answer: 1-2 questions with 2-3 acceptable answer variations
- Matching: 1 question with 4-6 pairs to match

Format the response as JSON with this exact structure:
{
  "type": "quiz",
  "title": "Module Quiz: ${request.moduleTitle}",
  "description": "Test your understanding of the module content",
  "questions": [
    {
      "kind": "mcq",
      "text": "Question text here",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct": [0]
    },
    {
      "kind": "truefalse", 
      "text": "True or false statement",
      "correct": true
    },
    {
      "kind": "short",
      "text": "Short answer question",
      "answers": ["Answer 1", "Answer 2", "Answer 3"]
    },
    {
      "kind": "match",
      "left": ["Term 1", "Term 2", "Term 3"],
      "right": ["Definition 1", "Definition 2", "Definition 3"],
      "correctPairs": [[0, 0], [1, 1], [2, 2]]
    }
  ]
}

Important:
- For MCQ: correct array contains index(es) of correct option(s)
- For multiple select: correct array contains multiple indices
- For short answer: provide 2-3 variations of correct answers
- For matching: correctPairs are [leftIndex, rightIndex] pairs
- Make questions test understanding, not just memorization
- Ensure questions are directly related to the module content
- Use clear, unambiguous language
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert quiz generator creating educational assessments. Always respond with valid JSON format matching the QuizBlock schema exactly."
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

      // Clean and parse the response
      const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const quizData = JSON.parse(cleanedResponse);

      // Validate the structure
      if (!quizData.type || quizData.type !== 'quiz') {
        throw new Error('Invalid quiz structure: missing or incorrect type');
      }

      if (!Array.isArray(quizData.questions)) {
        throw new Error('Invalid quiz structure: questions must be an array');
      }

      // Validate each question
      for (const question of quizData.questions) {
        if (!question.kind || !question.text) {
          throw new Error('Invalid question structure: missing kind or text');
        }

        switch (question.kind) {
          case 'mcq':
            if (!Array.isArray(question.options) || !Array.isArray(question.correct)) {
              throw new Error('Invalid MCQ question: missing options or correct array');
            }
            break;
          case 'truefalse':
            if (typeof question.correct !== 'boolean') {
              throw new Error('Invalid True/False question: correct must be boolean');
            }
            break;
          case 'short':
            if (!Array.isArray(question.answers)) {
              throw new Error('Invalid short answer question: answers must be array');
            }
            break;
          case 'match':
            if (!Array.isArray(question.left) || !Array.isArray(question.right) || !Array.isArray(question.correctPairs)) {
              throw new Error('Invalid matching question: missing left, right, or correctPairs arrays');
            }
            break;
          default:
            throw new Error(`Unknown question kind: ${question.kind}`);
        }
      }

      return quizData as QuizBlock;
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw new Error('Failed to generate quiz from content');
    }
  }

  static async generateQuizFromModule(moduleContent: string, moduleTitle: string): Promise<QuizBlock> {
    return this.generateQuizFromContent({
      moduleContent,
      moduleTitle,
      questionCount: 5
    });
  }

  static validateQuizAnswers(quiz: QuizBlock, userAnswers: Record<number, any>): {
    correct: number;
    total: number;
    results: Array<{
      questionIndex: number;
      correct: boolean;
      userAnswer: any;
      correctAnswer: any;
    }>;
  } {
    const results: Array<{
      questionIndex: number;
      correct: boolean;
      userAnswer: any;
      correctAnswer: any;
    }> = [];

    let correctCount = 0;

    quiz.questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      let isCorrect = false;
      let correctAnswer: any;

      switch (question.kind) {
        case 'mcq':
          correctAnswer = question.correct;
          isCorrect = Array.isArray(userAnswer) 
            ? JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correct.sort())
            : false;
          break;
        
        case 'truefalse':
          correctAnswer = question.correct;
          isCorrect = userAnswer === question.correct;
          break;
        
        case 'short':
          correctAnswer = question.answers;
          isCorrect = question.answers.some(answer => 
            answer.toLowerCase().trim() === userAnswer?.toLowerCase().trim()
          );
          break;
        
        case 'match':
          correctAnswer = question.correctPairs;
          isCorrect = Array.isArray(userAnswer) && 
            JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correctPairs.sort());
          break;
      }

      if (isCorrect) correctCount++;

      results.push({
        questionIndex: index,
        correct: isCorrect,
        userAnswer,
        correctAnswer
      });
    });

    return {
      correct: correctCount,
      total: quiz.questions.length,
      results
    };
  }
}
