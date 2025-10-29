import { GoogleGenAI } from "@google/genai";

type Data = (string | number | boolean | null)[][];
type FileData = { name: string; data: Data; };

// Helper to safely get the API key, guarding against 'process' being undefined in browser environments.
// This defers the error to when the API is actually called, instead of crashing the app at startup.
const getApiKey = (): string | null => {
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return null;
};

const buildPrompt = (filesData: FileData[], instructions: string[]): string => {
  const dataString = filesData.map(file => 
    `### Dataset: ${file.name}\n${JSON.stringify(file.data)}`
  ).join('\n\n');

  const instructionsString = instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');

  return `
You are an expert Excel automation assistant. Your task is to modify a dataset based on a series of instructions, potentially using data from other provided datasets.
The datasets are provided as a collection of named JSON strings. Each JSON string represents a 2D array (array of arrays), where the outer array holds rows and each inner array holds the cells for that row. The first row of each dataset is the header.

Your instructions may refer to these datasets by their filenames (e.g., "sales.xlsx", "customers.xlsx").
You must apply the instructions sequentially. The primary goal is to modify ONE of the files as instructed.
Your response MUST be ONLY a valid JSON string representing the MODIFIED 2D array for the single target file. Do not include any other text, explanations, comments, or markdown code fences like \`\`\`json. Just the raw JSON string.

Here are the datasets:
${dataString}

Here are the instructions to apply:
${instructionsString}

Identify the primary file to be modified from the instructions, perform the operations, and return only the resulting JSON string for that single, modified file.
  `;
};

export const automateExcelEdit = async (filesData: FileData[], instructions: string[]): Promise<Data> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set or not accessible. Please ensure your deployment environment configures 'process.env.API_KEY'.");
  }

  // Initialize GoogleGenAI client only when needed, after API key check
  const ai = new GoogleGenAI({ apiKey: apiKey });
  const prompt = buildPrompt(filesData, instructions);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text.trim();
    
    // Sometimes the model might still wrap the response in markdown
    const cleanedJsonText = responseText.replace(/^```json\n/, '').replace(/\n```$/, '');

    const result = JSON.parse(cleanedJsonText);

    if (!Array.isArray(result) || (result.length > 0 && !Array.isArray(result[0]))) {
      throw new Error('Invalid data structure returned from AI. Expected a 2D array.');
    }

    return result as Data;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes('JSON')) {
        throw new Error('The AI returned an invalid JSON format. Please try rephrasing your instructions.');
    }
    throw new Error('Failed to get a valid response from the AI model.');
  }
};