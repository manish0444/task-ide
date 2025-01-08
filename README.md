# Modern Web-based IDE with Real-time Code Execution

A powerful, modern IDE built with Next.js, featuring real-time code execution, syntax highlighting, and AI-powered code assistance.

## Features

### 1. Code Editor
- **Syntax Highlighting**: Powered by `react-syntax-highlighter` with support for multiple languages
- **Line Numbers**: Dynamic line numbering with proper synchronization
- **Custom Scrollbars**: Theme-aware, smooth scrolling experience
- **Real-time Error Detection**: Instant syntax error feedback
- **Multi-language Support**: Python, JavaScript, Java, C++, Rust, PHP, and HTML

### 2. WebSocket Integration
- **Real-time Code Execution**: Connected to `wss://compiler.skillshikshya.com/ws/compiler/`
- **Auto-reconnection**: Automatic WebSocket reconnection on disconnection
- **Live Output**: Real-time code execution output
- **Error Handling**: Detailed error messages with line numbers

### 3. AI Integration
- **Code Generation**: AI-powered code examples using Gemini API
- **Error Analysis**: Smart error detection and solutions
- **Code Suggestions**: Context-aware code improvements
- **Language-specific Examples**: Curated examples for each language

### 4. User Interface
- **Modern Design**: Clean, minimal interface with smooth transitions
- **Theme Support**: Light and dark mode with consistent styling
- **Responsive Layout**: Adapts to different screen sizes
- **Interactive Elements**: Smooth animations and hover effects

### 5. Developer Experience
- **TypeScript Support**: Full type safety and code completion
- **Error Prevention**: Real-time syntax checking
- **Code Organization**: Clean component structure
- **Best Practices**: Modern React patterns and hooks

## Technical Details

### Core Technologies
- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Code Highlighting**: react-syntax-highlighter
- **WebSocket**: Native WebSocket API
- **AI**: Google Gemini API

### Code Structure
- `/components`: React components including Editor
- `/lib`: Utility functions and services
- `/hooks`: Custom React hooks
- `/contexts`: React context providers
- `/styles`: Global styles and Tailwind config

### Key Components
1. **Editor.tsx**
   - Main code editor component
   - Syntax highlighting
   - Error handling
   - AI integration

2. **WebSocket Service**
   - Real-time code execution
   - Error handling
   - Auto-reconnection logic

3. **Gemini Service**
   - AI code generation
   - Error analysis
   - Code suggestions

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/manish0444/task-ide.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   GEMINI_API_KEY=your_api_key
   ```
   --need to remove the manual API integration from the gemini service

4. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Writing Code**
   - Choose a programming language
   - Write or paste your code
   - Real-time syntax highlighting and error checking

2. **Running Code**
   - Click "Run" to execute
   - See real-time output
   - Error messages with suggestions

3. **AI Assistance**
   - Click "AI Assist" for examples
   - Get error explanations
   - Receive code suggestions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
