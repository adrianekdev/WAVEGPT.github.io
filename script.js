// WARNING: PLACING API KEYS DIRECTLY IN FRONTEND CODE IS NOT SECURE FOR PUBLIC PRODUCTION APPLICATIONS.
// THIS IS FOR EDUCATIONAL AND TESTING PURPOSES ONLY.

const GEMINI_API_KEY = "AIzaSyCqS3btZWOK26eeDMKD-eVUg9Sy5p4Ph8s"; // *** REPLACE THIS WITH YOUR API KEY ***
// Using gemini-1.5-pro-latest or gemini-1.5-flash-latest for conversational capabilities
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// Get DOM elements
const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const responseOutput = document.getElementById('responseOutput');

// --- CONVERSATION HISTORY ---
// This array will store the conversation in the format required by Gemini API
let conversationHistory = [];

// Function to add a message to history
function addMessageToHistory(role, text) {
    conversationHistory.push({
        role: role,
        parts: [{ text: text }]
    });
}

// Function to display messages in the UI
function displayMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role); // Add classes for styling (e.g., 'user', 'model')

    // Check for code blocks using regex
    const codeBlockRegex = /```(lua|luacode)\n([\s\S]*?)\n```/g;
    let match;
    let lastIndex = 0;
    let processedHtml = '';

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before the code block
        processedHtml += text.substring(lastIndex, match.index).replace(/\n/g, '<br>');

        const lang = match[1]; // 'lua' or 'luacode'
        const code = match[2];

        // Create pre and code elements for highlighting
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.classList.add(`language-${lang}`); // Highlight.js language class
        codeElement.textContent = code;

        // Append to a temporary div to get innerHTML after highlighting
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(pre);
        pre.appendChild(codeElement);

        // Highlight the code
        hljs.highlightElement(codeElement);

        processedHtml += tempDiv.innerHTML;
        lastIndex = codeBlockRegex.lastIndex;
    }

    // Add any remaining text after the last code block
    processedHtml += text.substring(lastIndex).replace(/\n/g, '<br>');

    messageDiv.innerHTML = `<strong>${role === 'user' ? 'You' : 'WaveGPT'}:</strong> ${processedHtml}`;
    responseOutput.appendChild(messageDiv);

    // Scroll to bottom
    responseOutput.scrollTop = responseOutput.scrollHeight;
}


// Add event listener for button click
submitBtn.addEventListener('click', async () => {
    const userPrompt = promptInput.value.trim();

    if (!userPrompt) {
        responseOutput.textContent = 'Please enter a question.';
        return;
    }

    // Display user message immediately
    displayMessage('user', userPrompt);
    addMessageToHistory('user', userPrompt);

    // Clear the textarea immediately after the button is clicked
    promptInput.value = '';

    // Show generating message
    const generatingMessageDiv = document.createElement('div');
    generatingMessageDiv.textContent = 'WaveGPT is generating a response... Please wait...';
    generatingMessageDiv.style.color = '#ffffff';
    generatingMessageDiv.classList.add('message', 'generating');
    responseOutput.appendChild(generatingMessageDiv);
    responseOutput.scrollTop = responseOutput.scrollHeight;


    // Define the system instructions for the AI
    // Adjusted prompt for code blocks and conversational memory
    const systemInstruction = `You are WaveGPT, an AI assistant for the Roblox executor Wave, created by the SPDM Team and revived by mi7.
Your sole purpose is to assist with creating Luau scripts.

Guidelines:
- Only respond to Luau scripting-related queries.
- Keep responses short and direct.
- Provide scripts ONLY in \`\`\`lua\`\`\` code blocks.
- Do not use phrases like ""here's your script"" or similar.
- Do not explain how to create scripts; directly provide them inside the \`\`\`lua\`\`\` code block.
- Always use the custom request function for HTTP requests unless explicitly instructed otherwise.
- Avoid comments in scripts.
- Humanize the code as much as possible to avoid detection by skidders.
- Use \`game:GetService(""ServiceName"")\` instead of dot notation for services (e.g., ""Players"", ""ReplicatedStorage"").
- Do NOT use any "AI: yourmessagehere" type of stuff, as it will break the smoothness of the conversation.
- If the user says Hi, hello, or something to start the conversation with, respond with:
  ""Hello! What Luau script do you need assistance with today, user?""`;



    try {
        const requestBody = {
            contents: conversationHistory, // Send the full conversation history
            system_instruction: { parts: [{ text: systemInstruction }] } // Add system instruction
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Remove generating message
        responseOutput.removeChild(generatingMessageDiv);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            displayMessage('model', `Error: ${errorData.error ? errorData.error.message : response.statusText || 'Unknown error.'}`);
            responseOutput.lastChild.style.color = 'red'; // Set error message color
            return;
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            const generatedText = data.candidates[0].content.parts[0].text;
            displayMessage('model', generatedText); // Display the model's response
            addMessageToHistory('model', generatedText); // Add model's response to history
        } else {
            displayMessage('model', 'Received an unexpected response from Gemini API. Please try again.');
            responseOutput.lastChild.style.color = 'orange'; // Set warning message color
            console.warn("Unexpected response structure:", data);
        }

    } catch (error) {
        // Remove generating message if still present due to network error
        if (responseOutput.contains(generatingMessageDiv)) {
             responseOutput.removeChild(generatingMessageDiv);
        }
        console.error('An error occurred during API communication:', error);
        displayMessage('model', `An error occurred: ${error.message}. Check your browser console.`);
        responseOutput.lastChild.style.color = 'red'; // Set error message color
    }
});

// Basic styling for messages (add to style.css if you want)
/*
.message {
    margin-bottom: 10px;
    padding: 10px;
    border-radius: 5px;
}

.message.user {
    background-color: rgba(0, 123, 255, 0.1);
    text-align: right;
    margin-left: auto;
    max-width: 80%;
}

.message.model {
    background-color: rgba(255, 255, 255, 0.1);
    text-align: left;
    margin-right: auto;
    max-width: 80%;
}

pre {
    background-color: #282c34; // Dark background for code
    padding: 10px;
    border-radius: 5px;
    overflow-x: auto; // Scroll for long lines
}

code {
    font-family: 'Fira Code', 'Cascadia Code', monospace; // Monospace font for code
    font-size: 0.9em;
    color: #abb2bf; // Light gray for code text
}
*/
