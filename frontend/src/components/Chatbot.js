import React, { useEffect } from "react";
import "../styles/Chatbot.css";

const Chatbot = () => {
    useEffect(() => {
        const chatbotToggle = document.getElementById('chatbot-toggle');
        const chatbotWindow = document.getElementById('chatbot-window');
        const chatbotClose = document.getElementById('chatbot-close');
        const chatbotText = document.getElementById('chatbot-text');
        const chatbotMessages = document.getElementById('chatbot-messages');
        const sendbutton = document.getElementById('chatbot-send-btn');

        // Toggle the chatbot window when the chat button is clicked
        chatbotToggle.addEventListener('click', () => {
            chatbotToggle.style.display = 'none'; // Hide the toggle button
            chatbotWindow.style.display = 'flex'; // Show the chatbot window
        });

        // Close the chatbot window when the close button is clicked
        chatbotClose.addEventListener('click', () => {
            chatbotWindow.style.display = 'none'; // Hide the chatbot window
            chatbotToggle.style.display = 'block'; // Show the toggle button
        });

        // Send a message when the user presses Enter or clicks the send button
        sendbutton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission
            sendMessage();
        });

        chatbotText.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                sendMessage();
            }
        });

        // Function to send a message
        const sendMessage = () => {
            const message = chatbotText.value.trim();
            const phen_stage = "Pathan Gora BKL"
            if (!message) return;

            // Add user message to chat
            addUserMessage(message);

            chatbotText.value = ''; // Clear input field

            // Dummy API response for now
            fetchChatbotResponse(message, phen_stage)
                .then(botReply => addBotMessage(botReply))
                .catch(err => {
                    console.error('Error:', err);
                    addBotMessage("Sorry, something went wrong. Please try again later.");
                });
        };

        // Function to add user message to the chat
        const addUserMessage = (message) => {
            const userMessageOuter = document.createElement('div');
            const pfp = document.createElement('div');
            const userMessage = document.createElement('div');
            const timeElement = document.createElement('div');

            userMessage.classList.add("chatbot-user-msg");
            userMessageOuter.classList.add("chatbot-user-msg-outer");
            timeElement.classList.add("chatbot-msg-time");
            pfp.classList.add("user-pfp");

            userMessage.textContent = message;
            userMessage.style.textAlign = 'left';

            const now = new Date();
            const formattedTime = formatTime(now);
            timeElement.textContent = formattedTime;

            userMessageOuter.appendChild(userMessage);
            userMessage.appendChild(timeElement);
            chatbotMessages.appendChild(userMessageOuter);
            userMessageOuter.appendChild(pfp);

            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        };

        const parseMarkdown = (markdown) => {
            // Dummy Markdown parsing logic (extend with a library like showdown if needed)
            return markdown.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        };

        // Function to add bot message to the chat
        const addBotMessage = (message) => {
            const botMessageOuter = document.createElement('div');
            const pfp = document.createElement('div');
            const botMessage = document.createElement('div');
            const timeElement = document.createElement('div');

            botMessage.classList.add("chatbot-bot-msg");
            botMessageOuter.classList.add("chatbot-bot-msg-outer");
            timeElement.classList.add("chatbot-bot-time");
            pfp.classList.add("bot-pfp");

            botMessage.innerHTML = parseMarkdown(message);
            botMessage.style.textAlign = 'left';

            const now = new Date();
            const formattedTime = formatTime(now);
            timeElement.textContent = formattedTime;

            botMessageOuter.appendChild(pfp);
            botMessageOuter.appendChild(botMessage);
            botMessage.appendChild(timeElement);
            chatbotMessages.appendChild(botMessageOuter);

            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        };

        const formatTime = (date) => {
            const hours = date.getHours();
            const minutes = date.getMinutes();
            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes.toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
            return `${formattedHours}:${formattedMinutes} ${ampm}`;
        };

        // Dummy API function
        const fetchChatbotResponse = async (message, phen_stage) => {
            const promptText = `You're name is ${phen_stage}, your answers should have your name in it`;
            try {
                const response = await fetch('http://localhost:5000/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ query: message, prompt: promptText}), // Send the user query as JSON
                });
        
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`);
                }
        
                const data = await response.json(); // Parse the JSON response from the backend
                console.log(data)
                return data.response;
            } catch (error) {
                console.error("Error fetching chatbot response:", error);
                return "Sorry, something went wrong. Please try again.";
            }
        };
        

    }, []); // Empty dependency array ensures this runs only once

    return (
        <>
            <div id="chatbot-container">
                <button id="chatbot-toggle">
                    <img src="media/chatbot.png" className="img-fluid" alt="Chatbot" />
                </button>
                <div id="chatbot-window" style={{ display: 'none' }}>
                    <div id="chatbot-header">
                        <span>Virtual Assistant</span>
                        <button id="chatbot-close">✖</button>
                    </div>
                    <div id="chatbot-messages"></div>
                    <div className="d-flex justify-content-center mb-3">
                        <input
                            type="text"
                            className="form-control mx-2"
                            id="chatbot-text"
                            placeholder="Type a Message..."
                            required
                        />
                        <button className="primary-btn mx-3" id="chatbot-send-btn">
                        ➤
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
