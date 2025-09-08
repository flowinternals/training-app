const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testExtraction() {
  const text = `# Course Overview

**Topic:** Introduction to n8n Workflow Automation Tool

**Target Audience:**  
Non-technical professionals, business analysts, and junior developers who want to automate tasks and integrate apps without advanced coding knowledge.

**Duration:** 4 hours

**Difficulty:** Beginner

**Learning Objectives:**  
1. Understand the fundamentals of workflow automation and n8n's role in the automation ecosystem.  
2. Navigate the n8n interface, including the workflow editor, node library, and execution logs.  
3. Build and run simple workflows using common nodes (e.g., email, webhook, Google Sheets).  
4. Configure triggers and actions to automate processes based on real-time events or schedules.  
5. Monitor, debug, and refine workflows using n8n's execution logs and error handling features.`;

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

  try {
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
    console.log('Raw response:', response);
    
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    console.log('Cleaned response:', cleanedResponse);
    
    const extracted = JSON.parse(cleanedResponse);
    console.log('Parsed result:', JSON.stringify(extracted, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testExtraction();
