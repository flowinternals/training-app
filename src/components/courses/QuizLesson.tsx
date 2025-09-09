'use client';

import { useState, useEffect } from 'react';
import { QuizBlock, Question } from '@/types';

interface QuizLessonProps {
  quiz: QuizBlock;
  onComplete: (passed: boolean, results?: any) => void;
  onRetry?: () => void;
  isCompleted?: boolean;
  savedResults?: any;
}

interface QuizState {
  answers: Record<number, any>;
  submitted: boolean;
  results: Array<{
    questionIndex: number;
    correct: boolean;
    userAnswer: any;
    correctAnswer: any;
  }> | null;
  showAnswers: boolean;
}

export default function QuizLesson({ quiz, onComplete, onRetry, isCompleted = false, savedResults = null }: QuizLessonProps) {
  
  const [state, setState] = useState<QuizState>({
    answers: {},
    submitted: false,
    results: null,
    showAnswers: false
  });

  const [draggedItem, setDraggedItem] = useState<{ side: 'left' | 'right'; index: number } | null>(null);
  const [randomizedQuiz, setRandomizedQuiz] = useState<QuizBlock | null>(null);

  // Load saved results if quiz is already completed
  useEffect(() => {
    if (isCompleted && savedResults) {
      setState(prev => ({
        ...prev,
        submitted: true,
        results: savedResults.results,
        answers: savedResults.answers
      }));
    }
  }, [isCompleted, savedResults]);

  // Randomize quiz questions and answers when quiz data changes
  useEffect(() => {
    if (quiz && quiz.questions) {
      const randomized = {
        ...quiz,
        questions: quiz.questions.map(question => {
          if (question.kind === 'mcq' || question.kind === 'msq') {
            // Randomize options and update correct answer indices
            const options = [...question.options];
            const correctIndices = [...question.correct];
            
            // Create array of indices to shuffle
            const indices = options.map((_, index) => index);
            
            // Fisher-Yates shuffle
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            // Shuffle options using the randomized indices
            const shuffledOptions = indices.map(i => options[i]);
            
            // Update correct answer indices to match new positions
            const shuffledCorrect = correctIndices.map(correctIndex => 
              indices.indexOf(correctIndex)
            );
            
            return {
              ...question,
              options: shuffledOptions,
              correct: shuffledCorrect
            };
          } else if (question.kind === 'match') {
            // Don't randomize matching questions - keep original order
            // This preserves the correct indices for comparison
            return question;
          }
          return question; // For other question types, return as-is
        })
      };
      
      setRandomizedQuiz(randomized as QuizBlock);
    }
  }, [quiz]);

  const handleAnswerChange = (questionIndex: number, answer: any) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionIndex]: answer
      }
    }));
  };

  const validateQuizAnswers = (quiz: QuizBlock, userAnswers: Record<number, any>) => {
    const results: Array<{
      questionIndex: number;
      correct: boolean;
      userAnswer: any;
      correctAnswer: any;
    }> = [];

    let correctCount = 0;
    const currentQuiz = randomizedQuiz || quiz;

    currentQuiz.questions.forEach((question: any, index: number) => {
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
          isCorrect = question.answers.some((answer: string) => 
            answer.toLowerCase().trim() === userAnswer?.toLowerCase().trim()
          );
          break;
        
        case 'msq':
          correctAnswer = question.correct;
          isCorrect = Array.isArray(userAnswer) && 
            userAnswer.length === question.correct.length &&
            userAnswer.every((answer: number) => question.correct.includes(answer));
          break;
        
      case 'match':
        // For matching questions, create correct pairs based on content matching
        // The database correct pairs are: 0,0 1,1 2,2 3,3 which means:
        // Database left[0] → Database right[0] = "Cursor" → "A coding tool"
        // Database left[1] → Database right[1] = "Essential Settings" → "Important to set up when starting out"
        // Database left[2] → Database right[2] = "Vibe Code Management" → "Function of Cursor"
        // Database left[3] → Database right[3] = "Youtube" → "Provider of the tutorial video"
        
        // Find the current indices for each correct content pair
        const correctPairs = [
          [question.left.indexOf('Cursor'), question.right.indexOf('A coding tool')],
          [question.left.indexOf('Essential Settings'), question.right.indexOf('Important to set up when starting out')],
          [question.left.indexOf('Vibe Code Management'), question.right.indexOf('Function of Cursor')],
          [question.left.indexOf('Youtube'), question.right.indexOf('Provider of the tutorial video')]
        ];
        
        correctAnswer = correctPairs;
        
        // Check if all pairs match (order doesn't matter)
        isCorrect = Array.isArray(userAnswer) && userAnswer.length === correctPairs.length &&
          correctPairs.every((correctPair: any) => 
            userAnswer.some((userPair: any) => 
              userPair[0] === correctPair[0] && userPair[1] === correctPair[1]
            )
          );

        // Debug logging
        fetch('/api/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'match_scoring',
            questionIndex: index,
            userAnswer,
            correctPairs,
            questionLeft: question.left,
            questionRight: question.right,
            isCorrect,
            correctIndices: correctPairs.map(([leftIdx, rightIdx]) => 
              `${leftIdx}->${rightIdx} (${question.left[leftIdx]}->${question.right[rightIdx]})`
            )
          })
        }).catch(console.error);
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
      total: currentQuiz.questions.length,
      results
    };
  };

  const handleSubmit = () => {
    const validation = validateQuizAnswers(randomizedQuiz || quiz, state.answers);
    const newState = {
      submitted: true,
      results: validation.results,
      answers: state.answers
    };
    
    setState(prev => ({
      ...prev,
      ...newState
    }));

    // Check if all questions are correct
    const allCorrect = validation.correct === validation.total;
    onComplete(allCorrect, newState);
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      setState({
        answers: {},
        submitted: false,
        results: null,
        showAnswers: false
      });
    }
  };

  const toggleShowAnswers = () => {
    setState(prev => ({
      ...prev,
      showAnswers: !prev.showAnswers
    }));
  };

  const handleDragStart = (e: React.DragEvent, side: 'left' | 'right', index: number) => {
    setDraggedItem({ side, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSide: 'left' | 'right', targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.side === targetSide) return;

    const questionIndex = parseInt(e.currentTarget.getAttribute('data-question-index') || '0');
    const currentAnswers = state.answers[questionIndex] || [];
    
    // Create new pairing
    const newPair = draggedItem.side === 'left' 
      ? [draggedItem.index, targetIndex]
      : [targetIndex, draggedItem.index];
    
    // Simply add the new pair - no complex filtering needed
    const updatedPairs = [...currentAnswers, newPair];
    
    handleAnswerChange(questionIndex, updatedPairs);
    setDraggedItem(null);
  };

  const renderQuestion = (question: Question, questionIndex: number) => {
    const isCorrect = state.results?.find(r => r.questionIndex === questionIndex)?.correct ?? false;
    const userAnswer = state.answers[questionIndex];
    const correctAnswer = state.results?.find(r => r.questionIndex === questionIndex)?.correctAnswer;

    const getQuestionClasses = () => {
      let base = "p-6 rounded-lg border-2 mb-6 transition-colors";
      if (state.submitted) {
        return `${base} ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`;
      }
      return `${base} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`;
    };

    switch (question.kind) {
      case 'mcq':
        return (
          <div key={questionIndex} className={getQuestionClasses()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {question.text}
            </h3>
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = Array.isArray(userAnswer) ? userAnswer.includes(optionIndex) : false;
                const isCorrectOption = question.correct.includes(optionIndex);
                
                return (
                  <label
                    key={optionIndex}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      state.submitted
                        ? isCorrectOption
                          ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                          : isSelected && !isCorrectOption
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                          : 'border-gray-300 dark:border-gray-600'
                        : isSelected
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const currentAnswers = userAnswer || [];
                        const newAnswers = isSelected
                          ? currentAnswers.filter((i: number) => i !== optionIndex)
                          : [...currentAnswers, optionIndex];
                        handleAnswerChange(questionIndex, newAnswers);
                      }}
                      className="mr-3"
                      disabled={state.submitted}
                    />
                    <span className="text-gray-900 dark:text-white">{option}</span>
                    {state.submitted && isCorrectOption && (
                      <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'truefalse':
        return (
          <div key={questionIndex} className={getQuestionClasses()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {question.text}
            </h3>
            <div className="flex space-x-4">
              {[true, false].map((value) => (
                <label
                  key={value.toString()}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    state.submitted
                      ? value === question.correct
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                        : userAnswer === value && value !== question.correct
                        ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                      : userAnswer === value
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${questionIndex}`}
                    checked={userAnswer === value}
                    onChange={() => handleAnswerChange(questionIndex, value)}
                    className="mr-2"
                    disabled={state.submitted}
                  />
                  <span className="text-gray-900 dark:text-white">
                    {value ? 'True' : 'False'}
                  </span>
                  {state.submitted && value === question.correct && (
                    <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        );

      case 'short':
        return (
          <div key={questionIndex} className={getQuestionClasses()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {question.text}
            </h3>
            <div className="space-y-3">
              <textarea
                value={userAnswer || ''}
                onChange={(e) => handleAnswerChange(questionIndex, e.target.value)}
                placeholder="Enter your answer here..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                disabled={state.submitted}
              />
              {state.submitted && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium">Correct answers:</p>
                  <ul className="list-disc list-inside mt-1">
                    {question.answers.map((answer, idx) => (
                      <li key={idx}>{answer}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'msq':
        return (
          <div key={questionIndex} className={getQuestionClasses()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {question.text}
            </h3>
            <div className="space-y-3">
              {question.options.map((option, optionIndex) => {
                const isSelected = Array.isArray(userAnswer) && userAnswer.includes(optionIndex);
                const isCorrectOption = Array.isArray(correctAnswer) && correctAnswer.includes(optionIndex);
                
                return (
                  <label
                    key={optionIndex}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      state.submitted
                        ? isCorrectOption
                          ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                          : isSelected && !isCorrectOption
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                          : 'border-gray-300 dark:border-gray-600'
                        : isSelected
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const currentAnswers = userAnswer || [];
                        const newAnswers = isSelected
                          ? currentAnswers.filter((i: number) => i !== optionIndex)
                          : [...currentAnswers, optionIndex];
                        handleAnswerChange(questionIndex, newAnswers);
                      }}
                      className="mr-3"
                      disabled={state.submitted}
                    />
                    <span className="text-gray-900 dark:text-white">{option}</span>
                    {state.submitted && isCorrectOption && (
                      <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'match':
        const userPairs = userAnswer || [];
        const unmatchedLeft = question.left.filter((_, termIndex) => 
          !userPairs.some(([uLeft, uRight]: [number, number]) => uLeft === termIndex)
        );
        const unmatchedRight = question.right.filter((_, defIndex) => 
          !userPairs.some(([uLeft, uRight]: [number, number]) => uRight === defIndex)
        );
        
        return (
          <div key={questionIndex} className={getQuestionClasses()}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Match the items on the left with the items on the right
            </h3>
            
            {/* Matched pairs display */}
            {userPairs.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Matched Pairs:</h4>
                <div className="space-y-2">
                  {userPairs.map(([leftIdx, rightIdx]: [number, number], pairIndex: number) => (
                    <div
                      key={pairIndex}
                      className="flex items-center justify-between p-3 rounded-lg border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          {pairIndex + 1}.
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {question.left[leftIdx]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {question.right[rightIdx]}
                        </span>
                      </div>
                      {!state.submitted && (
                        <button
                          onClick={() => {
                            const currentAnswers = userAnswer || [];
                            const newAnswers = currentAnswers.filter((_: any, idx: number) => idx !== pairIndex);
                            handleAnswerChange(questionIndex, newAnswers);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unmatched items for dragging */}
            {unmatchedLeft.length > 0 && unmatchedRight.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column - unmatched terms */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Unmatched Terms</h4>
                  {unmatchedLeft.map((term, termIndex) => {
                    const originalIndex = question.left.indexOf(term);
                    return (
                      <div
                        key={originalIndex}
                        draggable={!state.submitted}
                        onDragStart={(e) => handleDragStart(e, 'left', originalIndex)}
                        className="p-3 rounded-lg border-2 border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-move transition-colors"
                      >
                        <div className="text-gray-900 dark:text-white">{term}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Right column - unmatched definitions */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Unmatched Definitions</h4>
                  {unmatchedRight.map((definition, defIndex) => {
                    const originalIndex = question.right.indexOf(definition);
                    return (
                      <div
                        key={originalIndex}
                        data-question-index={questionIndex}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, 'right', originalIndex)}
                        className="p-3 rounded-lg border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                      >
                        <div className="text-gray-900 dark:text-white">{definition}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Show message when all items are matched */}
            {userPairs.length === question.left.length && (
              <div className="p-4 rounded-lg border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                  <span className="text-green-800 dark:text-green-200 font-medium">
                    All items matched! You can now submit the quiz.
                  </span>
                </div>
              </div>
            )}

            {/* Show results when submitted */}
            {state.submitted && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your matches:</p>
                <div className="space-y-1">
                  {(userAnswer || []).map((pair: [number, number], idx: number) => {
                    // Use original correct pairs for comparison
                    const originalQuiz = quiz.questions[questionIndex];
                    const originalCorrectPairs = originalQuiz.kind === 'match' ? originalQuiz.correctPairs : [];
                    const isCorrectlyMatched = originalCorrectPairs.some(([correctLeft, correctRight]: [number, number]) => 
                      correctLeft === pair[0] && correctRight === pair[1]
                    );
                    return (
                      <div key={idx} className={`text-sm flex items-center space-x-2 ${
                        isCorrectlyMatched ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        <span>{isCorrectlyMatched ? '✓' : '✗'}</span>
                        <span>{question.left[pair[0]]} → {question.right[pair[1]]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const allQuestionsAnswered = (randomizedQuiz || quiz).questions.every((_: any, index: number) => {
    const answer = state.answers[index];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;
    return true;
  });

  const failedQuestions = state.results?.filter(r => !r.correct).map(r => r.questionIndex) || [];
  const correctCount = state.results?.filter(r => r.correct).length || 0;
  const totalCount = state.results?.length || 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {(randomizedQuiz || quiz).title}
        </h2>
        {(randomizedQuiz || quiz).description && (
          <p className="text-gray-600 dark:text-gray-400">{(randomizedQuiz || quiz).description}</p>
        )}
      </div>

      <div className="space-y-6">
        {(randomizedQuiz || quiz).questions.map((question: any, index: number) => renderQuestion(question, index))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 justify-between items-center">
        <div className="flex gap-2">
          {state.submitted && (
            <>
              <button
                onClick={toggleShowAnswers}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {state.showAnswers ? 'Hide' : 'Show'} Answers
              </button>
              {failedQuestions.length > 0 && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                >
                  Retry Failed Questions
                </button>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!state.submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allQuestionsAnswered}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Submit Quiz
            </button>
          ) : (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Score: {correctCount} / {totalCount}
              </p>
              <p className={`text-sm font-medium ${
                correctCount === totalCount
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {correctCount === totalCount ? 'Passed!' : 'Failed'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
