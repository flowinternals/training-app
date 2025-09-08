'use client';

import { useState } from 'react';
import { AICourseOutlineRequest, AICourseOutline } from '@/lib/openai';
import { Course, Module, Lesson } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';

interface AICourseGeneratorProps {
  onCourseGenerated: (course: Partial<Course>) => void;
  onClose: () => void;
}

export default function AICourseGenerator({ onCourseGenerated, onClose }: AICourseGeneratorProps) {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [step, setStep] = useState<'form' | 'outline' | 'customize'>('form');
  const [importMode, setImportMode] = useState<'manual' | 'import'>('manual');
  const [importText, setImportText] = useState('');
  const [formData, setFormData] = useState<AICourseOutlineRequest>({
    topic: 'Introduction to n8n workflow automation tool',
    duration: 4,
    difficulty: 'beginner',
    targetAudience: 'Non-technical professionals, business analysts, and junior developers who want to automate tasks and integrate apps without advanced coding knowledge.',
    learningObjectives: [
      'Understand the fundamentals of workflow automation and n8n\'s role in the automation ecosystem.',
      'Navigate the n8n interface, including the workflow editor, node library, and execution logs.',
      'Build and run simple workflows using common nodes (e.g., email, webhook, Google Sheets).',
      'Configure triggers and actions to automate processes based on real-time events or schedules.',
      'Monitor, debug, and refine workflows using n8n\'s execution logs and error handling features.'
    ]
  });
  const [generatedOutline, setGeneratedOutline] = useState<AICourseOutline | null>(null);
  const [customizedCourse, setCustomizedCourse] = useState<Partial<Course>>({});
  const [tagsInput, setTagsInput] = useState('');

  const handleInputChange = (field: keyof AICourseOutlineRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddObjective = () => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: [...prev.learningObjectives, '']
    }));
  };

  const handleRemoveObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.filter((_, i) => i !== index)
    }));
  };

  const handleObjectiveChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      learningObjectives: prev.learningObjectives.map((obj, i) => 
        i === index ? value : obj
      )
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const extractFieldsFromText = async () => {
    if (!importText.trim()) return;

    setIsExtracting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/ai/extract-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ text: importText }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract fields');
      }

      const extractedFields = await response.json();
      setFormData(prev => ({
        ...prev,
        ...extractedFields
      }));
      setImportMode('manual');
    } catch (error) {
      console.error('Error extracting fields:', error);
      alert('Failed to extract fields from text. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const generateOutline = async () => {
    if (!formData.topic || !formData.targetAudience) {
      alert('Please fill in all required fields');
      return;
    }

    if (!user) {
      alert('Please log in to use AI features');
      return;
    }

    setIsGenerating(true);
    try {
      // Get the Firebase ID token
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/ai/generate-outline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outline');
      }

      const result = await response.json();
      setGeneratedOutline(result.data);
      setStep('outline');
    } catch (error) {
      console.error('Error generating outline:', error);
      alert('Failed to generate course outline. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const customizeCourse = () => {
    if (!generatedOutline) return;

    const modules: Module[] = generatedOutline.modules.map((module, moduleIndex) => ({
      id: `module-${moduleIndex}`,
      title: module.title,
      description: module.description,
      order: moduleIndex,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        id: `lesson-${moduleIndex}-${lessonIndex}`,
        title: lesson.title,
        content: lesson.description,
        order: lessonIndex,
        duration: lesson.duration,
        completedBy: []
      }))
    }));

    const course: Partial<Course> = {
      title: generatedOutline.title,
      description: generatedOutline.description,
      price: 0, // Will be set by user
      isFree: true, // Will be set by user
      published: false,
      category: 'AI Generated',
      tags: [],
      duration: generatedOutline.modules.reduce((total, module) => 
        total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + lesson.duration, 0), 0
      ),
      difficulty: formData.difficulty,
      modules
    };

    setCustomizedCourse(course);
    setTagsInput(course.tags?.join(', ') || '');
    setStep('customize');
  };

  const finalizeCourse = () => {
    onCourseGenerated(customizedCourse);
    onClose();
  };

  if (step === 'form') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-white dark:text-white">AI Course Generator</h2>
        
        {/* Import Mode Toggle */}
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setImportMode('manual')}
              className={`px-4 py-2 rounded-md font-medium ${
                importMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setImportMode('import')}
              className={`px-4 py-2 rounded-md font-medium ${
                importMode === 'import'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Import Document
            </button>
          </div>

          {importMode === 'import' && (
            <div className="space-y-4 p-4 bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Upload Text/Markdown File
                </label>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  className="w-full p-2 border border-gray-600 rounded-md bg-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
              </div>
              
              <div className="text-center text-gray-400">OR</div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Paste Text Content
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your course content, learning objectives, or any relevant text here..."
                  className="w-full h-32 p-3 border border-gray-600 rounded-md bg-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={extractFieldsFromText}
                disabled={!importText.trim() || isExtracting}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? 'Extracting Fields...' : 'Extract Course Fields'}
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Course Topic *</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Introduction to React Hooks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Target Audience *</label>
            <input
              type="text"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Frontend developers with basic JavaScript knowledge"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Duration (hours)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Learning Objectives</label>
            {formData.learningObjectives.map((objective, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => handleObjectiveChange(index, e.target.value)}
                  className="flex-1 p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Understand React hooks fundamentals"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(index)}
                  className="px-3 py-2 text-red-400 hover:bg-red-900/20 rounded-md"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddObjective}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              + Add Learning Objective
            </button>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-600 dark:border-gray-600 rounded-md hover:bg-gray-700 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={generateOutline}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Course Outline'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'outline') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-800 dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-white dark:text-white">Generated Course Outline</h2>
        
        {generatedOutline && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-white dark:text-white">{generatedOutline.title}</h3>
              <p className="text-gray-300 dark:text-gray-300 mb-4">{generatedOutline.description}</p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-white dark:text-white">Learning Outcomes</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-300 dark:text-gray-300">
                {generatedOutline.learningOutcomes.map((outcome, index) => (
                  <li key={index}>{outcome}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-white dark:text-white">Prerequisites</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-300 dark:text-gray-300">
                {generatedOutline.prerequisites.map((prereq, index) => (
                  <li key={index}>{prereq}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-white dark:text-white">Course Modules</h4>
              <div className="space-y-4">
                {generatedOutline.modules.map((module, moduleIndex) => (
                  <div key={moduleIndex} className="border border-gray-600 dark:border-gray-600 rounded-lg p-4 bg-gray-700 dark:bg-gray-700">
                    <h5 className="font-semibold text-lg mb-2 text-white dark:text-white">
                      Module {moduleIndex + 1}: {module.title}
                    </h5>
                    <p className="text-gray-300 dark:text-gray-300 mb-3">{module.description}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-400 mb-3">Duration: {module.duration} minutes</p>
                    
                    <div className="space-y-2">
                      <h6 className="font-medium text-gray-300 dark:text-gray-300">Lessons:</h6>
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} className="ml-4 p-2 bg-gray-600 dark:bg-gray-600 rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white dark:text-white">{lesson.title}</p>
                              <p className="text-sm text-gray-300 dark:text-gray-300">{lesson.description}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-400">{lesson.duration} minutes</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setStep('form')}
            className="px-6 py-3 border border-gray-600 dark:border-gray-600 rounded-md hover:bg-gray-700 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-300"
          >
            Back to Form
          </button>
          <button
            onClick={customizeCourse}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Customize Course
          </button>
        </div>
      </div>
    );
  }

  if (step === 'customize') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-gray-800 dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-white dark:text-white">Customize Your Course</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Course Price ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={customizedCourse.price || 0}
              onChange={(e) => setCustomizedCourse(prev => ({
                ...prev,
                price: parseFloat(e.target.value) || 0,
                isFree: parseFloat(e.target.value) === 0
              }))}
              className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Category</label>
            <input
              type="text"
              value={customizedCourse.category || ''}
              onChange={(e) => setCustomizedCourse(prev => ({
                ...prev,
                category: e.target.value
              }))}
              className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300 dark:text-gray-300">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              onBlur={() => {
                const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                setCustomizedCourse(prev => ({
                  ...prev,
                  tags
                }));
              }}
              className="w-full p-3 border border-gray-600 dark:border-gray-600 rounded-md bg-gray-700 dark:bg-gray-700 text-white dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="react, hooks, frontend, javascript"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setStep('outline')}
            className="px-6 py-3 border border-gray-600 dark:border-gray-600 rounded-md hover:bg-gray-700 dark:hover:bg-gray-700 text-gray-300 dark:text-gray-300"
          >
            Back to Outline
          </button>
          <button
            onClick={finalizeCourse}
            className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Create Course
          </button>
        </div>
      </div>
    );
  }

  return null;
}
