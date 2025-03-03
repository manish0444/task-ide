import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI('AIzaSyC_7oTDDxJWKq-Eu6Cn857EJkgqfTeI6ZI')
function cleanCodeFences(text: string): string {
  // Remove code fence blocks with language specification
  text = text.replace(/```\w+\n/g, '')
  // Remove remaining code fence markers
  text = text.replace(/```/g, '')
  // Trim extra whitespace
  return text.trim()
}
const languageTemplates = {
  python: {
    example: `# Simple calculator in Python
def add(x, y):
    return x + y

def subtract(x, y):
    return x - y

def multiply(x, y):
    return x * y

def divide(x, y):
    if y == 0:
        return "Cannot divide by zero"
    return x / y

# Example usage
print("Calculator Results:")
print("Addition:", add(10, 5))
print("Subtraction:", subtract(10, 5))
print("Multiplication:", multiply(10, 5))
print("Division:", divide(10, 5))`,
    errorChecks: [
      'IndentationError: ',
      'SyntaxError: ',
      'NameError: ',
      'TypeError: ',
      'ZeroDivisionError: '
    ]
  },
  javascript: {
    example: `// Interactive counter with JavaScript
let count = 0;

function increment() {
    count++;
    console.log("Count increased to:", count);
}

function decrement() {
    count--;
    console.log("Count decreased to:", count);
}

// Example usage
console.log("Initial count:", count);
increment();
increment();
decrement();`,
    errorChecks: [
      'SyntaxError: ',
      'ReferenceError: ',
      'TypeError: ',
      'RangeError: '
    ]
  },
  java: {
    example: `public class Calculator {
    public static void main(String[] args) {
        int a = 10;
        int b = 5;
        
        System.out.println("Calculator Results:");
        System.out.println("Addition: " + (a + b));
        System.out.println("Subtraction: " + (a - b));
        System.out.println("Multiplication: " + (a * b));
        System.out.println("Division: " + (a / b));
    }
}`,
    errorChecks: [
      'error: ',
      'Exception in thread "main"',
      'cannot find symbol',
      'incompatible types'
    ]
  }
}
export async function getCodeSuggestion(code: string, error: string, language: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const template = languageTemplates[language as keyof typeof languageTemplates]
    const errorType = template?.errorChecks.find(check => error.includes(check)) || 'Error'

    const prompt = `
      As an expert ${language} developer, analyze this code and error:

      CODE:
      ${code}

      ERROR:
      ${error}

      Please provide:
      1. EXACT line number and what's causing the ${errorType}
      2. Clear explanation of why this error occurs
      3. Working solution with proper syntax
      4. Common mistakes to avoid

      Here's a working example for reference:
      ${template?.example || ''}

      Format your response in markdown with:
      - Error location and type at the top
      - Clear explanation in the middle
      - Working solution without code fence markers
      - Best practices and tips at the bottom
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return cleanCodeFences(response.text())
  } catch (error) {
    console.error('Gemini API error:', error)
    return 'Failed to analyze code. Please try again.'
  }
}

export async function generateCode(language: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    const template = languageTemplates[language as keyof typeof languageTemplates]
    const examples = {
      python: 'Write a number guessing game where the computer picks a random number between 1 and 100. The user guesses, and the program provides hints like "too high" or "too low." After the game ends, display a message like "Thanks for playing! The correct number was [X]."',

      javascript: 'Write a JavaScript program that prompts the user for their name, trims whitespace, and prints a personalized greeting like "Hello, [Name]! Welcome."',
      
      html: 'Create an HTML structure for a blog card that includes an image, a title, a short description, and a "Read More" button. Use semantic elements and classes for styling.',
      
      java: 'Write a Java program that prompts the user for their name, trims whitespace, and prints a personalized greeting like "Hello, [Name]! Nice to meet you."', 
      
      cpp: 'Write a student grade calculator in C++ that takes marks for five subjects, calculates the total, average, and grade, and prints a formatted result like "Your total is [X], average is [Y], and grade is [Z]. Great job!"', 
      
      rust: 'Write a Rust program that prompts the user for their name, trims whitespace, and prints a personalized greeting like "Hello, [Name]! It\'s great to meet you."',  
      
      php: 'Write a PHP program that prompts the user for their name, trims whitespace, and prints a personalized greeting like "Hi, [Name]! Welcome to our site."', 
      
    }

    const prompt = `
      As an expert ${language} developer, create a complete working example:
      
      Task: ${examples[language as keyof typeof examples]}

      Requirements:
      1. Must be fully functional and error-free
      2. Include proper error handling
      3. Follow ${language} best practices
      4. Include helpful comments
      5. Show example usage with output

      Reference Example:
      ${template?.example || ''}

      Provide ONLY the working code without any markdown or code fence markers.
      Ensure proper formatting and indentation.
      Code must be complete and runnable as-is.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return cleanCodeFences(response.text())
  } catch (error) {
    console.error('Gemini API error:', error)
    return '// Failed to generate code. Please try again.'
  }
}