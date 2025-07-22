// WARNING: PLACING API KEYS DIRECTLY IN FRONTEND CODE IS NOT SECURE FOR PUBLIC PRODUCTION APPLICATIONS.
// THIS IS FOR EDUCATIONAL AND TESTING PURPOSES ONLY.

const GEMINI_API_KEY = "AIzaSyCqS3btZWOK26eeDMKD-eVUg9Sy5p4Ph8s"; // *** REPLACE THIS WITH YOUR API KEY ***
// Using gemini-1.5-flash-latest for conversational capabilities
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-03-25:generateContent?key=${GEMINI_API_KEY}`;

// Get DOM elements
const promptInput = document.getElementById('promptInput');
const submitBtn = document.getElementById('submitBtn');
const chatHistory = document.getElementById('responseOutput');

// --- CONVERSATION HISTORY ---
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
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', role);

    const roleName = document.createElement('strong');
    roleName.textContent = role === 'user' ? 'You:' : 'WaveGPT:';
    messageContainer.appendChild(roleName);

    const messageContent = document.createElement('span'); // Bąbelek wiadomości
    
    // Check for code blocks using regex
    const codeBlockRegex = /```(lua|luacode)\n([\s\S]*?)\n```/g;
    let match;
    let lastIndex = 0;
    let tempProcessedContent = document.createDocumentFragment(); // Użyj fragmentu dokumentu dla efektywności

    while ((match = codeBlockRegex.exec(text)) !== null) {
        // Add text before the code block
        const preCodeText = text.substring(lastIndex, match.index);
        if (preCodeText) {
            tempProcessedContent.appendChild(document.createTextNode(preCodeText));
            // Dodajemy <br> tylko jeśli nie jest to bezpośrednio przed blokiem kodu
            if (!preCodeText.endsWith('\n')) {
                tempProcessedContent.appendChild(document.createElement('br'));
            }
        }

        const lang = match[1];
        const code = match[2];

        // Create pre and code elements for highlighting
        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        codeElement.classList.add(`language-${lang}`);
        codeElement.textContent = code;

        pre.appendChild(codeElement);

        // Highlight the code
        if (typeof hljs !== 'undefined' && hljs.highlightElement) {
            hljs.highlightElement(codeElement);
        } else {
            console.warn("Highlight.js (hljs) not found or not fully loaded. Code highlighting skipped.");
        }

        // --- DODANIE PRZYCISKU KOPIOWANIA ---
        const copyButton = document.createElement('button');
        copyButton.classList.add('copy-button');
        copyButton.textContent = 'Copy';
        copyButton.onclick = () => {
            navigator.clipboard.writeText(code)
                .then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        };
        pre.appendChild(copyButton);
        // --- KONIEC DODAWANIA PRZYCISKU KOPIOWANIA ---

        tempProcessedContent.appendChild(pre);
        lastIndex = codeBlockRegex.lastIndex;
    }

    // Add any remaining text after the last code block
    const postCodeText = text.substring(lastIndex);
    if (postCodeText) {
        tempProcessedContent.appendChild(document.createTextNode(postCodeText));
    }

    messageContent.appendChild(tempProcessedContent); // Dodaj fragment dokumentu do span
    
    messageContainer.appendChild(messageContent);
    chatHistory.appendChild(messageContainer);

    // Scroll to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


// Add event listener for button click
submitBtn.addEventListener('click', async () => {
    const userPrompt = promptInput.value.trim();

    if (!userPrompt) {
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
    chatHistory.appendChild(generatingMessageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;


    // Define the system instructions for the AI
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
  ""Hello! What Luau script do you need assistance with today, user?""

If this is the very first message in the conversation or the conversation has been reset, greet the user briefly and address them by "User".`;


    try {
        const requestBody = {
            contents: conversationHistory,
            system_instruction: { parts: [{ text: systemInstruction }] }
        };

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        // Remove generating message
        if (chatHistory.contains(generatingMessageDiv)) {
             chatHistory.removeChild(generatingMessageDiv);
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            displayMessage('model', `Error: ${errorData.error ? errorData.error.message : response.statusText || 'Unknown error.'}`);
            return;
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
            const generatedText = data.candidates[0].content.parts[0].text;
            displayMessage('model', generatedText);
            addMessageToHistory('model', generatedText);
        } else {
            displayMessage('model', 'Received an unexpected response from Gemini API. Please try again.');
            console.warn("Unexpected response structure:", data);
        }

    } catch (error) {
        // Remove generating message if still present due to network error
        if (chatHistory.contains(generatingMessageDiv)) {
             chatHistory.removeChild(generatingMessageDiv);
        }
        console.error('An error occurred during API communication:', error);
        displayMessage('model', `An error occurred: ${error.message}. Check your browser console.`);
    }
});
