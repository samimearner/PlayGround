// App State
let conversations = [];
let activeConversationId = null;
let isGenerating = false;
let activeAbortController = null;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const newChatBtn = document.getElementById('newChatBtn');
const sidebarHistory = document.getElementById('sidebarHistory');
const clearBtn = document.getElementById('clearBtn');
const messagesContainer = document.getElementById('messagesContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const headerModelBadge = document.getElementById('headerModelBadge');
const statusProvider = document.getElementById('statusProvider');
const statusModel = document.getElementById('statusModel');
const statusTelegram = document.getElementById('statusTelegram');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const voiceBtn = document.getElementById('voiceBtn');

// MCP DOM Elements
const mcpModal = document.getElementById('mcpModal');
const addMcpBtn = document.getElementById('addMcpBtn');
const mcpCancelBtn = document.getElementById('mcpCancelBtn');
const mcpSubmitBtn = document.getElementById('mcpSubmitBtn');
const mcpName = document.getElementById('mcpName');
const mcpUrl = document.getElementById('mcpUrl');
const sidebarMcpList = document.getElementById('sidebarMcpList');
const mcpTransport = document.getElementById('mcpTransport');
const mcpUrlGroup = document.getElementById('mcpUrlGroup');
const mcpCommandGroup = document.getElementById('mcpCommandGroup');
const mcpCommand = document.getElementById('mcpCommand');
const mcpHeaders = document.getElementById('mcpHeaders');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadConversations();
    initEventListeners();
    fetchBackendStatus();
    loadMcpConnections();
    initVoiceAssistant();
    renderAll();
});

// Event Listeners
function initEventListeners() {
    // Mobile Sidebar Toggle
    menuBtn.addEventListener('click', toggleSidebar);
    closeSidebarBtn.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // Theme Toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // New Chat Action
    newChatBtn.addEventListener('click', () => {
        createNewChat();
        if (window.innerWidth <= 768) toggleSidebar();
    });

    // Clear Chats
    clearBtn.addEventListener('click', clearAllConversations);

    // Textarea Auto-grow and Enter-to-Submit
    chatInput.addEventListener('input', () => {
        autoGrowInput();
        toggleSendButton();
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
                e.preventDefault();
                handleSend(false);
            }
        }
        setTimeout(autoGrowInput, 0);
    });

    // Send Button Click
    sendBtn.addEventListener('click', () => handleSend(false));

    // File Upload Handler
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            
            if (file.size > 10 * 1024 * 1024) {
                alert("File size exceeds 10MB limit.");
                fileInput.value = "";
                return;
            }
            
            const originalPlaceholder = chatInput.placeholder;
            chatInput.placeholder = `Uploading ${file.name}...`;
            chatInput.disabled = true;
            attachBtn.disabled = true;
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const uploadNotice = `[Uploaded File: ${data.filename} (${data.size_kb} KB)]\nCan you explain this file?`;
                    chatInput.value = (chatInput.value ? chatInput.value + "\n" : "") + uploadNotice;
                    chatInput.focus();
                    chatInput.style.height = 'auto';
                    chatInput.style.height = chatInput.scrollHeight + 'px';
                } else {
                    const err = await res.json();
                    alert(`Upload failed: ${err.error || 'Unknown error'}`);
                }
            } catch (e) {
                console.error("Upload error:", e);
                alert(`Network error uploading file: ${e.message}`);
            } finally {
                chatInput.placeholder = originalPlaceholder;
                chatInput.disabled = false;
                attachBtn.disabled = false;
                fileInput.value = "";
            }
        });
    }

    // MCP Modal Toggles
    if (addMcpBtn) addMcpBtn.addEventListener('click', openMcpModal);
    if (mcpCancelBtn) mcpCancelBtn.addEventListener('click', closeMcpModal);
    if (mcpSubmitBtn) mcpSubmitBtn.addEventListener('click', handleAddMcp);
    if (mcpTransport) {
        mcpTransport.addEventListener('change', (e) => {
            if (e.target.value === 'sse') {
                mcpUrlGroup.style.display = 'flex';
                mcpCommandGroup.style.display = 'none';
            } else {
                mcpUrlGroup.style.display = 'none';
                mcpCommandGroup.style.display = 'flex';
            }
        });
    }
    
    // Close modal on background click
    window.addEventListener('click', (e) => {
        if (e.target === mcpModal) closeMcpModal();
    });
}

// Initialize Theme from LocalStorage or default to dark
function initTheme() {
    const savedTheme = localStorage.getItem('pocketstrike_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        setLightModeIcon();
    } else {
        document.body.classList.remove('light-mode');
        setDarkModeIcon();
    }
}

// Toggle between light and dark modes
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    if (isLight) {
        localStorage.setItem('pocketstrike_theme', 'light');
        setLightModeIcon();
    } else {
        localStorage.setItem('pocketstrike_theme', 'dark');
        setDarkModeIcon();
    }
}

// Show moon icon (click to switch to dark mode)
function setLightModeIcon() {
    themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
}

// Show sun icon (click to switch to light mode)
function setDarkModeIcon() {
    themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
}

// Toggle Sidebar for Mobile
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('show');
}

// Auto-grow textarea height
function autoGrowInput() {
    chatInput.style.height = 'auto';
    chatInput.style.height = (chatInput.scrollHeight - 12) + 'px';
}

// Fetch configured AI & Telegram status from the server
async function fetchBackendStatus() {
    try {
        const response = await fetch('/api/status');
        if (response.ok) {
            const data = await response.json();
            // Update Footer info
            statusProvider.textContent = data.provider;
            statusModel.textContent = data.model;
            headerModelBadge.textContent = `${data.provider} • ${data.model}`;
            
            // Telegram Bot Badge
            const tgBadge = statusTelegram;
            const tgText = tgBadge.querySelector('.status-tg-text');
            tgText.textContent = data.telegram_status;
            if (data.telegram_enabled) {
                tgBadge.className = 'status-value-tg active';
            } else {
                tgBadge.className = 'status-value-tg disabled';
            }

            // If running on macOS, render macOS Apple Cyber logo and system badges
            if (data.os_type === "mac") {
                document.body.classList.add("os-mac");
                const subNote = document.getElementById("welcomeSubnote");
                if (subNote) subNote.textContent = `PocketstrikeAI is online and running natively on ${data.os_name || 'macOS'}.`;
                const footerNote = document.querySelector(".footer-note");
                if (footerNote) footerNote.textContent = `PocketstrikeAI v1.0 • Running natively on ${data.os_name || 'macOS'}`;
                
                const macSvg = `<svg class="logo-icon mac-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="url(#macStroke)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.97C7.79 22 6.85 20.68 6.01 19.47C4.29 16.98 2.98 12.44 4.75 9.37C5.63 7.84 7.2 6.87 8.91 6.85C10.2 6.83 11.43 7.71 12.22 7.71C13.01 7.71 14.5 6.63 16.06 6.8C16.71 6.83 18.53 7.07 19.68 8.75C19.59 8.81 17.58 9.98 17.6 12.38C17.63 15.26 20.13 16.22 20.16 16.23C20.13 16.32 19.74 17.66 18.71 19.5Z" fill="url(#macGrad)"/>
                        <path d="M15.97 3.5C15.22 4.41 14.07 5.16 12.92 5.07C12.8 3.96 13.34 2.82 14.03 2C14.77 1.13 15.99 0.42 17.06 0.33C17.2 1.48 16.66 2.62 15.97 3.5Z" fill="url(#macStroke)"/>
                    </g>
                    <defs>
                        <linearGradient id="macGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#3B82F6" />
                            <stop offset="0.5" stop-color="#8B5CF6" />
                            <stop offset="1" stop-color="#EC4899" />
                        </linearGradient>
                        <linearGradient id="macStroke" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#00FFCC" />
                            <stop offset="1" stop-color="#3B82F6" />
                        </linearGradient>
                    </defs>
                </svg>`;

                const welcomeMacSvg = macSvg.replace('class="logo-icon mac-icon"', 'class="welcome-logo-icon mac-icon"');
                const sidebarLogo = document.querySelector(".logo-container .logo-icon");
                if (sidebarLogo) sidebarLogo.outerHTML = macSvg;
                const welcomeLogo = document.querySelector(".glowing-logo .welcome-logo-icon");
                if (welcomeLogo) welcomeLogo.outerHTML = welcomeMacSvg;
            }

            // If running on Linux, render Cyber Dragon logo and Linux system badges
            if (data.os_type === "linux") {
                document.body.classList.add("os-linux");
                const subNote = document.getElementById("welcomeSubnote");
                if (subNote) subNote.textContent = `PocketstrikeAI is online and running natively on ${data.os_name || 'Linux'}.`;
                const footerNote = document.querySelector(".footer-note");
                if (footerNote) footerNote.textContent = `PocketstrikeAI v1.0 • Running natively on ${data.os_name || 'Linux'}`;
                
                const sidebarDragonSvg = `<svg class="logo-icon linux-dragon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="url(#dragonStroke)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
                        <path d="M12 2L14.5 7L20 8.5L16 12.5L17.5 18L12 15L6.5 18L8 12.5L4 8.5L9.5 7L12 2Z" fill="url(#dragonGrad)"/>
                        <path d="M12 6C10 9 7 11 4 12C7 13 10 15 12 19C14 15 17 13 20 12C17 11 14 9 12 6Z" fill="url(#dragonInner)"/>
                        <circle cx="12" cy="11" r="1.5" fill="#00FFCC"/>
                        <path d="M9 14L12 16L15 14"/>
                    </g>
                    <defs>
                        <linearGradient id="dragonGrad" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#3B82F6" />
                            <stop offset="0.5" stop-color="#8B5CF6" />
                            <stop offset="1" stop-color="#EC4899" />
                        </linearGradient>
                        <linearGradient id="dragonStroke" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#00FFCC" />
                            <stop offset="1" stop-color="#3B82F6" />
                        </linearGradient>
                        <linearGradient id="dragonInner" x1="4" y1="2" x2="20" y2="18" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#10B981" />
                            <stop offset="1" stop-color="#8B5CF6" />
                        </linearGradient>
                    </defs>
                </svg>`;

                const welcomeDragonSvg = sidebarDragonSvg.replace('class="logo-icon linux-dragon"', 'class="welcome-logo-icon linux-dragon"');

                const sidebarLogo = document.querySelector(".logo-container .logo-icon");
                if (sidebarLogo) sidebarLogo.outerHTML = sidebarDragonSvg;

                const welcomeLogo = document.querySelector(".glowing-logo .welcome-logo-icon");
                if (welcomeLogo) welcomeLogo.outerHTML = welcomeDragonSvg;
            }

            // If running on Windows, render Cyber Windows grid logo and Windows system badges
            if (data.os_type === "windows") {
                document.body.classList.add("os-windows");
                const subNote = document.getElementById("welcomeSubnote");
                if (subNote) subNote.textContent = `PocketstrikeAI is online and running natively on ${data.os_name || 'Windows'}.`;
                const footerNote = document.querySelector(".footer-note");
                if (footerNote) footerNote.textContent = `PocketstrikeAI v1.0 • Running natively on ${data.os_name || 'Windows'}`;
                
                const winSvg = `<svg class="logo-icon windows-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke="url(#winStroke)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
                        <path d="M3 5.5L10.5 4.5V11.5H3V5.5Z" fill="url(#winGrad)"/>
                        <path d="M12 4.3L21 3V11.5H12V4.3Z" fill="url(#winGrad)"/>
                        <path d="M3 12.5H10.5V19.5L3 18.5V12.5Z" fill="url(#winGrad)"/>
                        <path d="M12 12.5H21V21L12 19.7V12.5Z" fill="url(#winGrad)"/>
                    </g>
                    <defs>
                        <linearGradient id="winGrad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#00ADEF" />
                            <stop offset="0.5" stop-color="#0078D7" />
                            <stop offset="1" stop-color="#8B5CF6" />
                        </linearGradient>
                        <linearGradient id="winStroke" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#00FFCC" />
                            <stop offset="1" stop-color="#0078D7" />
                        </linearGradient>
                    </defs>
                </svg>`;

                const welcomeWinSvg = winSvg.replace('class="logo-icon windows-icon"', 'class="welcome-logo-icon windows-icon"');
                const sidebarLogo = document.querySelector(".logo-container .logo-icon");
                if (sidebarLogo) sidebarLogo.outerHTML = winSvg;
                const welcomeLogo = document.querySelector(".glowing-logo .welcome-logo-icon");
                if (welcomeLogo) welcomeLogo.outerHTML = welcomeWinSvg;
            }
        }
    } catch (error) {
        console.error('Error fetching backend status:', error);
        statusProvider.textContent = 'Offline';
        statusModel.textContent = 'None';
        headerModelBadge.textContent = 'Offline Server';
    }
}

// Helper to strip any legacy voice context leak from text
function cleanVoiceContext(content) {
    if (typeof content !== 'string') return content;
    let res = content.replace(/\s*\(Context:\s*User is speaking to you in Voice Mode[\s\S]*/gi, '');
    res = res.replace(/\s*\.?\s*Do not use markdown syntax, asterisks, bullet points, or code blocks unless explicitly requested\.\)?/gi, '');
    return res.trim();
}

function sanitizeAllConversations(convList) {
    if (!Array.isArray(convList)) return;
    convList.forEach(chat => {
        if (chat && Array.isArray(chat.messages)) {
            chat.messages.forEach(m => {
                if (m && m.role === 'user' && typeof m.content === 'string') {
                    m.content = cleanVoiceContext(m.content);
                }
            });
        }
    });
}

// Load conversations from LocalStorage and sync with server
async function loadConversations() {
    // 1. Initial load from LocalStorage for instant UI render
    const saved = localStorage.getItem('pocketstrike_conversations');
    if (saved) {
        try {
            conversations = JSON.parse(saved);
            sanitizeAllConversations(conversations);
            const savedActiveId = localStorage.getItem('pocketstrike_active_id');
            if (savedActiveId && conversations.some(c => c.id === savedActiveId)) {
                activeConversationId = savedActiveId;
            } else if (conversations.length > 0) {
                activeConversationId = conversations[0].id;
            }
        } catch (e) {
            console.error('Error parsing conversations:', e);
            conversations = [];
        }
    }
    
    // 2. Fetch latest history from the server (local disk) to sync
    try {
        const response = await fetch('/api/history/load');
        if (response.ok) {
            const serverConversations = await response.json();
            if (serverConversations && serverConversations.length > 0) {
                conversations = serverConversations;
                sanitizeAllConversations(conversations);
                
                // Set active conversation if not set or invalid
                const savedActiveId = localStorage.getItem('pocketstrike_active_id');
                if (savedActiveId && conversations.some(c => c.id === savedActiveId)) {
                    activeConversationId = savedActiveId;
                } else {
                    activeConversationId = conversations[0].id;
                }
                
                // Save back to LocalStorage to sync
                localStorage.setItem('pocketstrike_conversations', JSON.stringify(conversations));
                localStorage.setItem('pocketstrike_active_id', activeConversationId);
                renderAll();
            }
        }
    } catch (error) {
        console.error('Error loading history from server:', error);
    }
}

// Save conversations to LocalStorage and sync to server
async function saveConversations() {
    localStorage.setItem('pocketstrike_conversations', JSON.stringify(conversations));
    localStorage.setItem('pocketstrike_active_id', activeConversationId);
    
    // Sync to server background file storage
    try {
        await fetch('/api/history/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(conversations)
        });
    } catch (e) {
        console.error('Failed to sync history to server:', e);
    }
}

// Create a new empty chat conversation
function createNewChat(initialTitle = 'New Chat') {
    const newChat = {
        id: 'chat_' + Date.now(),
        title: initialTitle,
        messages: []
    };
    conversations.unshift(newChat);
    activeConversationId = newChat.id;
    saveConversations();
    renderAll();
    chatInput.focus();
    return newChat;
}

// Select a chat conversation
function selectConversation(id) {
    activeConversationId = id;
    saveConversations();
    renderAll();
    if (window.innerWidth <= 768) toggleSidebar();
}

// Delete a conversation
function deleteConversation(id, event) {
    if (event) event.stopPropagation();
    
    conversations = conversations.filter(c => c.id !== id);
    if (activeConversationId === id) {
        activeConversationId = conversations.length > 0 ? conversations[0].id : null;
    }
    saveConversations();
    renderAll();
}

// Rename conversation title
function renameConversation(id, event) {
    if (event) event.stopPropagation();
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;

    const newTitle = prompt('Rename this chat:', chat.title);
    if (newTitle && newTitle.trim()) {
        chat.title = newTitle.trim();
        saveConversations();
        renderAll();
    }
}

// Clear all chats
function clearAllConversations() {
    if (confirm('Are you sure you want to clear all conversations?')) {
        conversations = [];
        activeConversationId = null;
        saveConversations();
        renderAll();
    }
}

// Fill textarea from suggested template card
function fillPrompt(promptText) {
    chatInput.value = promptText;
    autoGrowInput();
    chatInput.focus();
}

// Handle sending message
async function handleSend(isVoice = false) {
    const isVoiceMode = (isVoice === true);
    if (isGenerating) {
        handleStop();
        return;
    }
    const text = chatInput.value.trim();
    if (!text) return;

    // Clear input box
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Get or create active chat
    let activeChat = conversations.find(c => c.id === activeConversationId);
    if (!activeChat) {
        // Auto generate clean title based on first query
        const autoTitle = text.length > 25 ? text.substring(0, 25) + '...' : text;
        activeChat = createNewChat(autoTitle);
    }

    // Auto rename default chat title if first message
    if (activeChat.messages.length === 0 && activeChat.title === 'New Chat') {
        activeChat.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
    }

    // Append User Message (strictly clean user prompt)
    activeChat.messages.push({ role: 'user', content: cleanVoiceContext(text) });
    saveConversations();
    renderAll();
    scrollToBottom();

    // Show Typing Indicator
    isGenerating = true;
    toggleSendButton();
    renderTypingIndicator();

    let streamedText = "";

    try {
        activeAbortController = new AbortController();
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: activeChat.messages, is_voice: isVoiceMode }),
            signal: activeAbortController.signal
        });

        removeTypingIndicator();

        if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;
            
            // Add placeholder for assistant message
            const assistantMessageIndex = activeChat.messages.length;
            activeChat.messages.push({ role: 'assistant', content: "" });
            renderAll();
            
            // Access the target bubble element directly for speed
            const messageDivs = messagesContainer.querySelectorAll('.message.assistant');
            const lastMessageDiv = messageDivs[messageDivs.length - 1];
            const lastBubble = lastMessageDiv.querySelector('.message-bubble');
            
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                    const chunk = decoder.decode(value, { stream: !done });
                    streamedText += chunk;
                    
                    // Inspect for final history sync message
                    const syncIndex = streamedText.indexOf('\n[HISTORY_SYNC]:');
                    if (syncIndex !== -1) {
                        const syncData = streamedText.substring(syncIndex + 16);
                        streamedText = streamedText.substring(0, syncIndex);
                        try {
                            const updatedMessages = JSON.parse(syncData);
                            if (Array.isArray(updatedMessages)) {
                                updatedMessages.forEach(m => {
                                    if (m && m.role === 'user' && typeof m.content === 'string') {
                                        m.content = cleanVoiceContext(m.content);
                                    }
                                });
                                activeChat.messages = updatedMessages;
                            }
                        } catch (err) {
                            console.error("Failed to parse history sync:", err);
                        }
                        break;
                    }
                    
                    // Update active conversation text state
                    activeChat.messages[assistantMessageIndex].content = streamedText;
                    
                    // Render markdown structure directly and scroll down
                    lastBubble.innerHTML = parseMarkdown(streamedText);
                    scrollToBottom();
                }
            }
        } else {
            const errText = await response.text();
            activeChat.messages.push({ role: 'assistant', content: `⚠️ Error from server (Status ${response.status}): ${errText}` });
        }
    } catch (e) {
        removeTypingIndicator();
        if (e.name !== 'AbortError') {
            activeChat.messages.push({ role: 'assistant', content: `⚠️ Network error: Could not reach Flask server. Check if Termux server is running. (${e.message})` });
        }
    } finally {
        activeAbortController = null;
        isGenerating = false;
        toggleSendButton();
        saveConversations();
        renderAll();
        scrollToBottom();
        if (isVoiceMode && typeof voiceState !== 'undefined' && voiceState !== 'off') {
            const lastAssistantMsg = (activeChat && activeChat.messages) ? activeChat.messages.filter(m => m.role === 'assistant').pop() : null;
            let textToSpeak = "";
            if (lastAssistantMsg && lastAssistantMsg.content && typeof lastAssistantMsg.content === 'string' && lastAssistantMsg.content.trim()) {
                textToSpeak = lastAssistantMsg.content.trim();
            } else if (streamedText && streamedText.trim()) {
                textToSpeak = streamedText.trim();
            }
            if (textToSpeak) {
                speakTextResponse(textToSpeak);
            } else {
                voiceState = 'activated';
                setVoiceHudState('listening', 'I am listening...');
                if (speechRecognitionObj) {
                    try { speechRecognitionObj.start(); } catch (e) {}
                }
            }
        }
    }
}

// Stop active AI generation
function handleStop() {
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    isGenerating = false;
    toggleSendButton();
    removeTypingIndicator();
}

// Toggle Send button state (shows Stop button when generating)
function toggleSendButton() {
    if (isGenerating) {
        sendBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
            </svg>
        `;
        sendBtn.title = "Stop generating";
        sendBtn.classList.add('generating');
        sendBtn.disabled = false;
    } else {
        sendBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        `;
        sendBtn.title = "Send message";
        sendBtn.classList.remove('generating');
        const text = chatInput.value.trim();
        sendBtn.disabled = !text;
    }
}

// Render typing indicator block
function renderTypingIndicator() {
    const indicatorHtml = `
        <div class="message assistant" id="typingIndicator">
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z"></path><path d="M12 8v4"></path><path d="M12 16h.01"></path></svg>
            </div>
            <div class="message-content-wrapper">
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', indicatorHtml);
    scrollToBottom();
}

// Remove typing indicator from layout
function removeTypingIndicator() {
    const element = document.getElementById('typingIndicator');
    if (element) element.remove();
}

// Scroll chat window to bottom
function scrollToBottom() {
    const chatWindow = document.querySelector('.chat-window');
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Master Render Function
function renderAll() {
    renderSidebarHistory();
    renderMessages();
}

// Render sidebar conversation items
function renderSidebarHistory() {
    sidebarHistory.innerHTML = '';
    
    if (conversations.length === 0) {
        sidebarHistory.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0.25rem; text-align: center;">No history yet</div>';
        return;
    }

    conversations.forEach(chat => {
        const isActive = chat.id === activeConversationId;
        const item = document.createElement('div');
        item.className = `history-item ${isActive ? 'active' : ''}`;
        item.onclick = () => selectConversation(chat.id);
        
        item.innerHTML = `
            <div class="history-item-content">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span class="history-item-title">${escapeHtml(chat.title)}</span>
            </div>
            <div class="history-actions">
                <button class="history-action-btn" onclick="renameConversation('${chat.id}', event)" title="Rename">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="history-action-btn" onclick="deleteConversation('${chat.id}', event)" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        sidebarHistory.appendChild(item);
    });
}

// Render active messages
function renderMessages() {
    const activeChat = conversations.find(c => c.id === activeConversationId);
    
    if (!activeChat || activeChat.messages.length === 0) {
        welcomeScreen.style.display = 'flex';
        messagesContainer.innerHTML = '';
        return;
    }

    welcomeScreen.style.display = 'none';
    messagesContainer.innerHTML = '';

    const msgs = activeChat.messages;
    let i = 0;
    while (i < msgs.length) {
        const msg = msgs[i];
        if (msg.role === 'system') {
            i++;
            continue;
        }

        const isToolCall = msg.content.trim().startsWith('[TOOL_CALL:');
        const isToolResult = msg.content.trim().startsWith('[TOOL_RESULT:');

        // Handle assistant messages that contain both step-by-step reasoning/plan text AND a tool call
        if (!isToolCall && !isToolResult && msg.content.includes('[TOOL_CALL:') && msg.role === 'assistant') {
            let nextMsg = (i + 1 < msgs.length) ? msgs[i + 1] : null;
            let fullContent = msg.content;
            if (nextMsg && nextMsg.content.trim().startsWith('[TOOL_RESULT:')) {
                fullContent = msg.content + "\n" + nextMsg.content;
                i++; // Consume the following tool result message so it renders together
            }
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message assistant';
            const avatarIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;
            msgDiv.innerHTML = `
                <div class="message-avatar">${avatarIcon}</div>
                <div class="message-content-wrapper">
                    <div class="message-bubble">${parseMarkdown(fullContent)}</div>
                </div>
            `;
            messagesContainer.appendChild(msgDiv);
            i++;
            continue;
        }

        if (isToolCall) {
            const match = msg.content.match(/\[TOOL_CALL:\s*(\w+)\(([\s\S]*?)\)\s*\]/);
            const toolName = match ? match[1] : 'Tool';
            
            // Check if next message is the tool result
            let nextMsg = (i + 1 < msgs.length) ? msgs[i + 1] : null;
            let toolResultText = null;
            
            if (nextMsg && nextMsg.content.trim().startsWith('[TOOL_RESULT:')) {
                toolResultText = nextMsg.content;
                i++; // Consume the result message
            }
            
            const toolMessageDiv = document.createElement('div');
            toolMessageDiv.className = 'message system-tool';
            
            const avatarHtml = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="termux-logo-svg"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                </div>
            `;
            
            let blockHtml = '';
            if (toolResultText) {
                const resultMatch = toolResultText.match(/\[TOOL_RESULT:\s*\w+\s*output\]\n([\s\S]*)/);
                const rawOutput = resultMatch ? resultMatch[1].trim() : toolResultText;
                
                blockHtml = `
                    <div class="tool-execution-block collapsed">
                        <div class="tool-execution-header" onclick="toggleToolBlock(this)">
                            <div class="tool-status-left">
                                <span class="tool-status-text">Used tool <code class="tool-code">${escapeHtml(toolName)}</code></span>
                            </div>
                            <span class="tool-toggle-arrow">▶</span>
                        </div>
                        <div class="tool-execution-result">
                            <pre><code>${escapeHtml(rawOutput)}</code></pre>
                        </div>
                    </div>
                `;
            } else {
                const isRunning = (i === msgs.length - 1) && isGenerating;
                blockHtml = `
                    <div class="tool-execution-block collapsed${isRunning ? ' running' : ''}">
                        <div class="tool-execution-header" ${isRunning ? '' : 'onclick="toggleToolBlock(this)"'}>
                            <div class="tool-status-left">
                                <span class="tool-status-text">${isRunning ? 'Running' : 'Used'} tool <code class="tool-code">${escapeHtml(toolName)}</code>${isRunning ? '...' : ''}</span>
                            </div>
                            ${isRunning ? '<span class="tool-status-spinner"></span>' : '<span class="tool-toggle-arrow">▶</span>'}
                        </div>
                        ${isRunning ? '' : `
                        <div class="tool-execution-result">
                            <pre style="color: var(--text-muted); font-style: italic;">No output recorded</pre>
                        </div>`}
                    </div>
                `;
            }
            
            toolMessageDiv.innerHTML = `
                ${avatarHtml}
                <div class="message-content-wrapper" style="width: 100%;">
                    ${blockHtml}
                </div>
            `;
            messagesContainer.appendChild(toolMessageDiv);
            i++;
            continue;
        }

        if (isToolResult) {
            const resultMatch = msg.content.match(/\[TOOL_RESULT:\s*(\w+)\s*output\]\n([\s\S]*)/);
            const toolName = resultMatch ? resultMatch[1] : 'Tool';
            const rawOutput = resultMatch ? resultMatch[2].trim() : msg.content;
            
            const toolMessageDiv = document.createElement('div');
            toolMessageDiv.className = 'message system-tool';
            
            const avatarHtml = `
                <div class="message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="termux-logo-svg"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                </div>
            `;
            
            toolMessageDiv.innerHTML = `
                ${avatarHtml}
                <div class="message-content-wrapper" style="width: 100%;">
                    <div class="tool-execution-block collapsed">
                        <div class="tool-execution-header" onclick="toggleToolBlock(this)">
                            <div class="tool-status-left">
                                <span class="tool-status-text">Result from <code class="tool-code">${escapeHtml(toolName)}</code></span>
                            </div>
                            <span class="tool-toggle-arrow">▶</span>
                        </div>
                        <div class="tool-execution-result">
                            <pre><code>${escapeHtml(rawOutput)}</code></pre>
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(toolMessageDiv);
            i++;
            continue;
        }

        // Render normal user/assistant message
        const isUser = msg.role === 'user';
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user' : 'assistant'}`;

        const avatarIcon = isUser 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>`;

        const displayContent = isUser ? cleanVoiceContext(msg.content) : msg.content;
        const renderedContent = isUser ? escapeHtml(displayContent) : parseMarkdown(displayContent);

        msgDiv.innerHTML = `
            <div class="message-avatar">
                ${avatarIcon}
            </div>
            <div class="message-content-wrapper">
                <div class="message-bubble">
                    ${renderedContent}
                </div>
                <div class="message-actions">
                    <button class="msg-action-btn" onclick="copyMessageText(this)" title="Copy Message">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                </div>
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        i++;
    }
}

// Toggle collapsible tool block output
function toggleToolBlock(header) {
    const block = header.closest('.tool-execution-block');
    if (block) {
        block.classList.toggle('collapsed');
    }
}

// Copy raw message text
function copyMessageText(btn) {
    const wrapper = btn.closest('.message-content-wrapper');
    const bubble = wrapper.querySelector('.message-bubble');
    // Get innerText so we copy the rendered plain text, not HTML
    const text = bubble.innerText;

    navigator.clipboard.writeText(text).then(() => {
        const origSvg = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
            btn.innerHTML = origSvg;
        }, 1500);
    });
}

// Copy Code Block Helper
function copyCodeBlock(btn) {
    const pre = btn.closest('.code-header').nextElementSibling;
    const code = pre.querySelector('code').innerText;
    
    navigator.clipboard.writeText(code).then(() => {
        const origText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.style.color = 'var(--accent-green)';
        btn.style.borderColor = 'var(--accent-green)';
        setTimeout(() => {
            btn.innerText = origText;
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 2000);
    });
}

// Simple HTML escaping to prevent XSS
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Regex-based Markdown Parser
function parseMarkdown(text) {
    if (!text) return "";

    let html = text;

    // 0. Parse Tool Blocks [TOOL_CALL:...] and [TOOL_RESULT:...]
    const toolBlocks = [];
    
    // 0a. Match combined TOOL_CALL and TOOL_RESULT
    html = html.replace(/\[TOOL_CALL:\s*(\w+)\(([\s\S]*?)\)\s*\][\s\r\n]*\[TOOL_RESULT:\s*\1\s*output\]\n?([\s\S]*?)(?=(?:\[TOOL_CALL:|\[TOOL_RESULT:|\Z))/g, (match, tool, args, output) => {
        const placeholder = `__TOOL_COMBINED_PLACEHOLDER_${toolBlocks.length}__`;
        const blockHtml = `
            <div class="tool-execution-block collapsed">
                <div class="tool-execution-header" onclick="toggleToolBlock(this)">
                    <div class="tool-status-left">
                        <span class="tool-status-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="termux-logo-svg"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        </span>
                        <span class="tool-status-text">Used tool <code class="tool-code">${escapeHtml(tool)}</code></span>
                    </div>
                    <span class="tool-toggle-arrow">▶</span>
                </div>
                <div class="tool-execution-result">
                    <pre><code>${escapeHtml(output.trim())}</code></pre>
                </div>
            </div>
        `;
        toolBlocks.push(blockHtml);
        return placeholder;
    });

    // 0b. Match individual TOOL_CALL (if result hasn't arrived yet)
    html = html.replace(/\[TOOL_CALL:\s*(\w+)\(([\s\S]*?)\)\s*\]/g, (match, tool, args) => {
        const placeholder = `__TOOL_CALL_PLACEHOLDER_${toolBlocks.length}__`;
        const blockHtml = `
            <div class="tool-execution-block collapsed">
                <div class="tool-execution-header" onclick="toggleToolBlock(this)">
                    <div class="tool-status-left">
                        <span class="tool-status-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="termux-logo-svg"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        </span>
                        <span class="tool-status-text">Used tool <code class="tool-code">${escapeHtml(tool)}</code></span>
                    </div>
                    <span class="tool-toggle-arrow">▶</span>
                </div>
                <div class="tool-execution-result">
                    <pre style="color: var(--text-muted); font-style: italic;">No output recorded</pre>
                </div>
            </div>
        `;
        toolBlocks.push(blockHtml);
        return placeholder;
    });

    // 0c. Match individual TOOL_RESULT (if orphaned or streaming separately)
    html = html.replace(/\[TOOL_RESULT:\s*(\w+)\s*output\]\n?([\s\S]*?)(?=(?:\[TOOL_CALL:|\[TOOL_RESULT:|\Z))/g, (match, tool, output) => {
        const placeholder = `__TOOL_RESULT_PLACEHOLDER_${toolBlocks.length}__`;
        const blockHtml = `
            <div class="tool-execution-block collapsed">
                <div class="tool-execution-header" onclick="toggleToolBlock(this)">
                    <div class="tool-status-left">
                        <span class="tool-status-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="termux-logo-svg"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                        </span>
                        <span class="tool-status-text">Result from <code class="tool-code">${escapeHtml(tool)}</code></span>
                    </div>
                    <span class="tool-toggle-arrow">▶</span>
                </div>
                <div class="tool-execution-result">
                    <pre><code>${escapeHtml(output.trim())}</code></pre>
                </div>
            </div>
        `;
        toolBlocks.push(blockHtml);
        return placeholder;
    });

    // 1. Parse Code Blocks ```code``` (supports closed and unclosed/streaming code blocks)
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)(?:```|$)/g, (match, lang, code) => {
        const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`;
        const escapedCode = escapeHtml(code.trimEnd());
        const langDisplay = (lang || 'CODE').toUpperCase();
        const header = `
            <div class="code-header">
                <span>${langDisplay}</span>
                <button class="copy-code-btn" onclick="copyCodeBlock(this)">Copy</button>
            </div>
        `;
        codeBlocks.push(`${header}<pre><code>${escapedCode}</code></pre>`);
        return placeholder;
    });

    // 2. Escape HTML outside of placeholders to prevent rendering arbitrary tags
    // First let's identify the placeholders so we don't escape them
    const placeholderRegex = /__(CODE_BLOCK|TOOL_COMBINED|TOOL_CALL|TOOL_RESULT)_PLACEHOLDER_\d+__/g;
    const segments = html.split(placeholderRegex);
    const matches = html.match(placeholderRegex) || [];
    
    let escapedHtml = "";
    for (let i = 0; i < segments.length; i++) {
        escapedHtml += escapeHtml(segments[i]);
        if (i < matches.length) {
            escapedHtml += matches[i];
        }
    }
    html = escapedHtml;

    // 3. Parse bold **text**
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

    // 4. Parse inline code `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 5. Parse unordered lists (lines starting with - or * )
    // We split by newline, parse lists, and join back
    const lines = html.split('\n');
    let inList = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        // Check if line starts with placeholder - don't process as list
        if (line.startsWith('__CODE_BLOCK_PLACEHOLDER_') || line.startsWith('__TOOL_')) continue;

        if (line.startsWith('- ') || line.startsWith('* ')) {
            const listContent = line.substring(2);
            let listLine = `<li>${listContent}</li>`;
            if (!inList) {
                listLine = '<ul>' + listLine;
                inList = true;
            }
            lines[i] = listLine;
        } else {
            if (inList) {
                lines[i] = '</ul>' + lines[i];
                inList = false;
            }
        }
    }
    if (inList) {
        lines[lines.length - 1] += '</ul>';
    }
    html = lines.join('\n');

    // 6. Convert newlines to <br> except inside tags that don't need it
    // Splitting by lines is cleaner
    html = html.split('\n').map(line => {
        // If it starts with list tags or header or placeholder, keep as is
        if (line.match(/^<\/?(ul|li|pre|code|div)/) || line.includes('_PLACEHOLDER_')) {
            return line;
        }
        return line + '<br>';
    }).join('\n');

    // Clean up empty double <br> or trailing <br>
    html = html.replace(/(<br>){2,}/g, '<br><br>');

    // 7. Re-inject Code Blocks
    for (let i = 0; i < codeBlocks.length; i++) {
        html = html.replace(`__CODE_BLOCK_PLACEHOLDER_${i}__`, codeBlocks[i]);
    }

    // 8. Re-inject Tool Blocks
    for (let i = 0; i < toolBlocks.length; i++) {
        html = html.replace(`__TOOL_COMBINED_PLACEHOLDER_${i}__`, toolBlocks[i]);
        html = html.replace(`__TOOL_CALL_PLACEHOLDER_${i}__`, toolBlocks[i]);
        html = html.replace(`__TOOL_RESULT_PLACEHOLDER_${i}__`, toolBlocks[i]);
    }

    // 9. Append media previews if files are mentioned in response
    let mediaAppend = "";
    if (html.toLowerCase().includes("captured_screenshot.png")) {
        mediaAppend += `
            <div class="chat-media-card">
                <div class="chat-media-title">📱 Screenshot Preview</div>
                <img src="/workspace/captured_screenshot.png?t=${Date.now()}" class="chat-media-img" onclick="window.open(this.src, '_blank')" />
            </div>
        `;
    }
    if (html.toLowerCase().includes("captured_photo.jpg")) {
        mediaAppend += `
            <div class="chat-media-card">
                <div class="chat-media-title">📸 Camera Capture</div>
                <img src="/workspace/captured_photo.jpg?t=${Date.now()}" class="chat-media-img" onclick="window.open(this.src, '_blank')" />
            </div>
        `;
    }
    if (html.toLowerCase().includes("captured_screen_record.mp4")) {
        mediaAppend += `
            <div class="chat-media-card">
                <div class="chat-media-title">🎥 Screen Recording</div>
                <video src="/workspace/captured_screen_record.mp4?t=${Date.now()}" class="chat-media-video" controls></video>
            </div>
        `;
    }
    
    if (mediaAppend) {
        html += `<div class="chat-media-grid">${mediaAppend}</div>`;
    }

    return html;
}

// Background Polling for Chat History changes (e.g. background alerts)
let lastHistoryLength = 0;
async function pollHistoryChanges() {
    if (isGenerating) return; // Skip polling if streaming
    
    try {
        const response = await fetch('/api/history/load');
        if (response.ok) {
            const serverConversations = await response.json();
            if (serverConversations && serverConversations.length > 0) {
                const serverMessages = serverConversations[0].messages;
                
                // Set initial length on first poll
                if (lastHistoryLength === 0) {
                    lastHistoryLength = serverMessages.length;
                    return;
                }
                
                // If history grew, update local memory and re-render
                if (serverMessages.length !== lastHistoryLength) {
                    lastHistoryLength = serverMessages.length;
                    conversations = serverConversations;
                    
                    // Update active conversation reference
                    const activeChat = conversations.find(c => c.id === activeConversationId);
                    if (activeChat) {
                        localStorage.setItem('pocketstrike_conversations', JSON.stringify(conversations));
                        renderAll();
                        scrollToBottom();
                    }
                }
            }
        }
    } catch (err) {
        console.error("Error polling history changes:", err);
    }
}
// Run poll every 8 seconds
setInterval(pollHistoryChanges, 8000);

// Open/Close MCP Modal
function openMcpModal() {
    mcpName.value = "";
    mcpUrl.value = "";
    mcpModal.classList.add('show');
}

function closeMcpModal() {
    mcpModal.classList.remove('show');
}

// Load and render MCP connections
async function loadMcpConnections() {
    try {
        const response = await fetch('/api/mcp/list');
        if (response.ok) {
            const servers = await response.json();
            renderMcpList(servers);
        }
    } catch (err) {
        console.error("Error loading MCP connections:", err);
    }
}

// Render the MCP connections list in the sidebar
function renderMcpList(servers) {
    if (!sidebarMcpList) return;
    
    if (servers.length === 0) {
        sidebarMcpList.innerHTML = `
            <div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem 0.25rem;">
                No remote servers connected.
            </div>
        `;
        return;
    }
    
    sidebarMcpList.innerHTML = servers.map(srv => {
        const isStdio = srv.transport === 'stdio';
        const detailInfo = isStdio ? srv.command : srv.url;
        const typeBadge = isStdio ? '[stdio]' : '[sse]';
        return `
            <div class="mcp-item" title="${escapeHtml(detailInfo)}">
                <div class="mcp-item-info">
                    <span class="mcp-status-dot ${srv.status === 'connected' ? 'connected' : 'offline'}" title="Status: ${srv.status}"></span>
                    <span style="font-weight: 500;">${escapeHtml(srv.name)}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted); margin-left: 0.25rem;">${typeBadge}</span>
                </div>
                <button class="mcp-delete-btn" onclick="handleRemoveMcp('${srv.name}')" title="Disconnect server">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

// Add new MCP connection
async function handleAddMcp() {
    const name = mcpName.value.trim();
    const url = mcpUrl.value.trim();
    
    if (!name || !url) {
        alert("Please enter both a name and server URL.");
        return;
    }
    
    let payload = { name, transport: 'sse', url };
    
    mcpSubmitBtn.disabled = true;
    mcpSubmitBtn.innerText = "Connecting...";
    
    try {
        const response = await fetch('/api/mcp/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        if (response.ok) {
            closeMcpModal();
            loadMcpConnections();
            alert(`Successfully connected to '${name}'! Loaded ${result.tools_count} tools.`);
            fetchBackendStatus();
        } else {
            alert("Connection error: " + (result.error || "Unknown error"));
        }
    } catch (err) {
        alert("Network error: Failed to reach backend.");
        console.error(err);
    } finally {
        mcpSubmitBtn.disabled = false;
        mcpSubmitBtn.innerText = "Connect";
    }
}

// Remove MCP connection
async function handleRemoveMcp(name) {
    if (!confirm(`Are you sure you want to disconnect remote server '${name}'?`)) return;
    
    try {
        const response = await fetch('/api/mcp/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            loadMcpConnections();
            fetchBackendStatus();
        } else {
            const err = await response.json();
            alert("Error removing server: " + (err.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Error removing MCP:", err);
    }
}

// Run MCP connection health check every 15 seconds to update the status dot
setInterval(loadMcpConnections, 15000);

// ==========================================
// 🎙️ Strike Voice Assistant Engine (Two-Stage Wake Word)
// ==========================================
let voiceState = 'off'; // 'off', 'background', 'greeting', 'activated', 'thinking', 'speaking'
let speechRecognitionObj = null;
let speechSilenceTimer = null;
let audioCtx = null;
let isVoiceSending = false;

// Audio Earcons (Web Audio API Synthesizer - Zero Downloads)
function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
    return audioCtx;
}

function playWakeChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        // Ascending pleasant two-tone chime
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
    } catch (e) {}
}

function playDoneChime() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        // Descending gentle completion pop
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(440, now + 0.07);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
    } catch (e) {}
}

// Clean speech text so TTS speaks only natural human conversational responses (Google Assistant style)
function cleanTextForSpeech(text) {
    if (!text) return "";
    let clean = String(text)
        .replace(/\[TOOL_CALL:\s*\w+\([\s\S]*?\)\s*\]/g, '')
        .replace(/\[TOOL_RESULT:[\s\S]*?output\][\s\S]*?(?=(?:\[TOOL_CALL:|\[TOOL_RESULT:|\Z))/g, '')
        .replace(/\[HISTORY_SYNC\]:[\s\S]*/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/[#*_~>|]/g, '')
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!clean || clean.length < 2) {
        return "I'm on it.";
    }

    // Google Assistant Style: Keep voice speech concise (first 2-3 sentences or ~50 words)
    // Avoids endless TTS monologues while the full text remains in the chat bubble
    const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (sentences && sentences.length > 3) {
        clean = sentences.slice(0, 3).join('').trim();
    } else if (clean.length > 280) {
        const cut = clean.substring(0, 280);
        const lastPeriod = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
        if (lastPeriod > 80) {
            clean = clean.substring(0, lastPeriod + 1).trim();
        } else {
            clean = cut.trim() + '...';
        }
    }
    return clean;
}

// Visual HUD Manager
function setVoiceHudState(state, text = '') {
    const voiceHud = document.getElementById('voiceAssistantOverlay');
    const voiceHudBackdrop = document.getElementById('voiceBackdropBlur');
    const voiceHudStatus = document.getElementById('voiceHudStatus');
    const voiceHudTranscript = document.getElementById('voiceHudTranscript');
    const voiceHudTip = document.getElementById('voiceHudTip');
    const voiceHudPromptIcon = document.getElementById('voiceHudPromptIcon');
    const pauseBtn = document.getElementById('voiceHudPauseBtn');
    const stopBtn = document.getElementById('voiceHudStopBtn');
    if (!voiceHud) return;

    voiceHud.classList.remove('listening', 'thinking', 'speaking', 'background');

    if (state === 'hidden') {
        voiceHud.classList.remove('active');
        if (voiceHudBackdrop) voiceHudBackdrop.classList.remove('active');
        document.body.classList.remove('voice-hud-active');
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        return;
    }

    voiceHud.classList.add('active', state);
    if (voiceHudBackdrop) voiceHudBackdrop.classList.add('active');
    document.body.classList.add('voice-hud-active');

    if (state === 'background') {
        if (voiceHudStatus) voiceHudStatus.textContent = "Standby";
        if (voiceHudTranscript) voiceHudTranscript.textContent = text || 'Waiting for "Hey Strike"...';
        if (voiceHudTip) voiceHudTip.textContent = 'Say "Hey Strike" to speak • Tap screen to cancel';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        if (voiceHudPromptIcon) {
            voiceHudPromptIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"></circle><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"></path></svg>`;
        }
    } else if (state === 'listening') {
        if (voiceHudStatus) voiceHudStatus.textContent = "Listening";
        if (voiceHudTranscript) voiceHudTranscript.textContent = text || 'Speak your command...';
        if (voiceHudTip) voiceHudTip.textContent = 'Listening • Speak or tap anywhere to cancel';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        if (voiceHudPromptIcon) {
            voiceHudPromptIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="10" y1="23" x2="14" y2="23"></line></svg>`;
        }
    } else if (state === 'thinking') {
        if (voiceHudStatus) voiceHudStatus.textContent = "Thinking";
        if (voiceHudTranscript) voiceHudTranscript.textContent = text || 'Processing command...';
        if (voiceHudTip) voiceHudTip.textContent = 'Thinking...';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        if (voiceHudPromptIcon) {
            voiceHudPromptIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></svg>`;
        }
    } else if (state === 'speaking') {
        if (voiceHudStatus) voiceHudStatus.textContent = "Speaking";
        if (voiceHudTranscript) voiceHudTranscript.textContent = text || 'Responding...';
        if (voiceHudTip) voiceHudTip.textContent = 'Speaking • Tap Stop or anywhere to interrupt';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        if (voiceHudPromptIcon) {
            voiceHudPromptIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        }
    }
}

let currentSpeechUtterance = null;
let isExplicitlyStopped = false;

// Immediately Stop / Interrupt Active Voice Speech
function stopVoiceSpeaking() {
    isExplicitlyStopped = true;
    currentSpeechUtterance = null;

    // Immediately stop HTML5 audio playback (phones / browsers)
    const player = document.getElementById('voiceAudioPlayer');
    if (player) {
        try {
            player.pause();
            player.currentTime = 0;
            player.removeAttribute('src');
            player.load();
        } catch (e) {}
    }

    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            window.speechSynthesis.pause();
            window.speechSynthesis.cancel();
        } catch (e) {}
    }
    // Inform backend to immediately abort and flush any host TTS processes (Termux / Mac / Linux / Windows)
    fetch('/api/voice/stop', { method: 'POST' }).catch(() => {});

    const floatingBtn = document.getElementById('voiceFloatingStopBtn');
    if (floatingBtn) floatingBtn.style.display = 'none';

    const headerVoiceBtn = document.getElementById('voiceBtn');
    if (headerVoiceBtn) headerVoiceBtn.classList.remove('voice-speaking');

    const pauseBtn = document.getElementById('voiceHudPauseBtn');
    if (pauseBtn) pauseBtn.style.display = 'none';

    const stopBtn = document.getElementById('voiceHudStopBtn');
    if (stopBtn) stopBtn.style.display = 'none';

    // Transition back to active listening state if HUD is on
    if (voiceState === 'speaking' || voiceState === 'greeting') {
        voiceState = 'activated';
        setVoiceHudState('listening', 'Stopped. What can I help with?');
        setTimeout(() => {
            isExplicitlyStopped = false;
            if (voiceState === 'activated' && !isGenerating && !isVoiceSending && speechRecognitionObj) {
                try { speechRecognitionObj.start(); } catch (e) {}
            }
        }, 250);
    }
}

// Prime speech synthesis & HTML5 audio on user interaction to unlock mobile autoplay restrictions
function primeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.resume();
            const prime = new SpeechSynthesisUtterance(' ');
            prime.volume = 0.01;
            window.speechSynthesis.speak(prime);
        } catch (e) {}
    }
    // Unlock HTML5 audio playback on mobile browsers via user gesture
    const player = document.getElementById('voiceAudioPlayer');
    if (player) {
        try {
            player.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
            player.play().catch(() => {});
        } catch (e) {}
    }
    getAudioContext();
}

// Preload browser voices asynchronously
if ('speechSynthesis' in window) {
    try {
        window.speechSynthesis.onvoiceschanged = () => {
            try { window.speechSynthesis.getVoices(); } catch (e) {}
        };
        window.speechSynthesis.getVoices();
    } catch (e) {}
}

// Global user interaction listener to unlock audio & speech synthesis on mobile
const unlockAudioOnGesture = () => {
    primeSpeechSynthesis();
};
document.addEventListener('click', unlockAudioOnGesture, { once: true });
document.addEventListener('touchstart', unlockAudioOnGesture, { once: true });
document.addEventListener('keydown', unlockAudioOnGesture, { once: true });

// Speak AI Response with High-Fidelity Audio Streaming & Multi-Device Fallback (Android, Termux, Mac, Win, Linux)
function speakTextResponse(text, isGreeting = false) {
    isExplicitlyStopped = false;
    const spokenText = cleanTextForSpeech(text);
    if (!spokenText) {
        voiceState = 'activated';
        setVoiceHudState('listening', 'I am listening...');
        if (speechRecognitionObj) {
            try { speechRecognitionObj.start(); } catch (e) {}
        }
        return;
    }

    voiceState = isGreeting ? 'greeting' : 'speaking';

    if (speechRecognitionObj) {
        try { speechRecognitionObj.abort(); } catch (e) {}
    }

    setVoiceHudState('speaking', spokenText);

    const floatingBtn = document.getElementById('voiceFloatingStopBtn');
    if (floatingBtn) floatingBtn.style.display = 'inline-flex';

    const headerVoiceBtn = document.getElementById('voiceBtn');
    if (headerVoiceBtn) headerVoiceBtn.classList.add('voice-speaking');

    const stopBtn = document.getElementById('voiceHudStopBtn');
    if (stopBtn) stopBtn.style.display = 'inline-flex';

    let speechFinished = false;
    let fallbackTimer = null;

    const onSpeechFinish = () => {
        if (speechFinished) return;
        speechFinished = true;
        currentSpeechUtterance = null;
        if (fallbackTimer) clearTimeout(fallbackTimer);

        const player = document.getElementById('voiceAudioPlayer');
        if (player) {
            try {
                player.pause();
                player.currentTime = 0;
            } catch (e) {}
        }

        if (floatingBtn) floatingBtn.style.display = 'none';
        if (headerVoiceBtn) headerVoiceBtn.classList.remove('voice-speaking');

        if (stopBtn) stopBtn.style.display = 'none';
        const pauseBtn = document.getElementById('voiceHudPauseBtn');
        if (pauseBtn) pauseBtn.style.display = 'none';

        if (isGreeting) {
            // After greeting, transition straight to listening
            voiceState = 'activated';
            setVoiceHudState('listening', 'I am listening...');
            setTimeout(() => {
                if (voiceState === 'activated' && speechRecognitionObj) {
                    try { speechRecognitionObj.start(); } catch (e) {}
                }
            }, 150);
        } else {
            // Return to active conversational listening
            voiceState = 'activated';
            setVoiceHudState('listening', 'I am listening...');
            setTimeout(() => {
                if (voiceState === 'activated' && !isGenerating && !isVoiceSending && speechRecognitionObj) {
                    try { speechRecognitionObj.start(); } catch (e) {}
                }
            }, 350);
        }
    };

    // Staggered duration safety timer: guarantees HUD never gets stuck in speaking
    const wordCount = spokenText.split(/\s+/).length;
    const estimatedDuration = Math.max(3500, (wordCount / 2.0) * 1000 + 4000);
    fallbackTimer = setTimeout(onSpeechFinish, estimatedDuration);

    const player = document.getElementById('voiceAudioPlayer');
    let audioStarted = false;

    // Strategy 1: HTML5 Audio Stream from /api/voice/audio (Ultra-reliable on Android Chrome, iOS Safari & Mobile)
    if (player) {
        try {
            player.pause();
            player.currentTime = 0;
            player.onended = onSpeechFinish;
            player.onerror = () => {
                if (!audioStarted && !isExplicitlyStopped) {
                    fallbackToSynthesis();
                }
            };
            player.onplaying = () => {
                audioStarted = true;
            };
            player.src = '/api/voice/audio?text=' + encodeURIComponent(spokenText);
            const playPromise = player.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    audioStarted = true;
                }).catch((err) => {
                    console.warn("Mobile HTML5 audio play rejected, attempting speech synthesis fallback:", err);
                    if (!isExplicitlyStopped) {
                        fallbackToSynthesis();
                    }
                });
            }
        } catch (e) {
            fallbackToSynthesis();
        }
    } else {
        fallbackToSynthesis();
    }

    function fallbackToSynthesis() {
        if (audioStarted || isExplicitlyStopped) return;

        // Strategy 2: Browser Speech Synthesis (Chrome / Edge / Safari Desktop & Mobile)
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();

                const utterance = new SpeechSynthesisUtterance(spokenText);
                window._activeSpeechUtterance = utterance; // Prevent garbage collection from cutting speech
                currentSpeechUtterance = utterance;
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.lang = 'en-US';

                const voices = window.speechSynthesis.getVoices();
                if (voices && voices.length > 0) {
                    const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Samantha')));
                    if (preferredVoice) utterance.voice = preferredVoice;
                }

                utterance.onstart = () => {
                    audioStarted = true;
                };

                utterance.onend = () => {
                    window._activeSpeechUtterance = null;
                    onSpeechFinish();
                };

                utterance.onerror = (e) => {
                    window._activeSpeechUtterance = null;
                    if (isExplicitlyStopped || e.error === 'canceled' || e.error === 'interrupted') {
                        onSpeechFinish();
                        return;
                    }
                    triggerServerHostTts();
                };

                window.speechSynthesis.speak(utterance);

                // Watchdog: If Web Speech fails to start in 800ms, fallback to host TTS
                setTimeout(() => {
                    if (!audioStarted && !isExplicitlyStopped) {
                        triggerServerHostTts();
                    }
                }, 800);

                return;
            } catch (e) {
                console.error("Speech Synthesis error:", e);
            }
        }

        // Strategy 3: Server Host TTS (Termux on Android, macOS say, Windows SAPI)
        triggerServerHostTts();
    }

    function triggerServerHostTts() {
        if (!isExplicitlyStopped) {
            fetch('/api/voice/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: spokenText })
            }).catch(() => {});
        }
    }
}

function initVoiceAssistant() {
    const headerVoiceBtn = document.getElementById('voiceBtn');
    const inputVoiceBtn = document.getElementById('voiceInputBtn');
    const voiceHudClose = document.getElementById('voiceHudClose');
    const voiceHudPauseBtn = document.getElementById('voiceHudPauseBtn');
    const voiceHudStopBtn = document.getElementById('voiceHudStopBtn');
    const voiceFloatingStopBtn = document.getElementById('voiceFloatingStopBtn');
    const voiceHudVisualizer = document.getElementById('voiceHudVisualizer');

    // Dismiss or interrupt voice assistant when clicking background blur overlay
    const voiceBackdropBlur = document.getElementById('voiceBackdropBlur');
    if (voiceBackdropBlur) {
        voiceBackdropBlur.addEventListener('click', () => {
            if (voiceState === 'speaking' || voiceState === 'greeting') {
                stopVoiceSpeaking();
            } else {
                stopVoiceListening();
            }
        });
    }

    // Tapping anywhere on the HUD card during speech immediately stops/interrupts speech
    const voiceHudContainer = document.querySelector('.voice-hud-container');
    if (voiceHudContainer) {
        voiceHudContainer.addEventListener('click', (e) => {
            if (e.target.closest('#voiceHudClose')) return;
            if (voiceState === 'speaking' || voiceState === 'greeting') {
                stopVoiceSpeaking();
            }
        });
    }

    // Attach stop buttons
    if (voiceHudPauseBtn) voiceHudPauseBtn.addEventListener('click', stopVoiceSpeaking);
    if (voiceHudStopBtn) voiceHudStopBtn.addEventListener('click', stopVoiceSpeaking);
    if (voiceFloatingStopBtn) voiceFloatingStopBtn.addEventListener('click', stopVoiceSpeaking);
    if (voiceHudVisualizer) {
        voiceHudVisualizer.addEventListener('click', () => {
            if (voiceState === 'speaking' || voiceState === 'greeting') {
                stopVoiceSpeaking();
            }
        });
    }

    // Keyboard shortcut: Escape key stops voice speech
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && (voiceState === 'speaking' || voiceState === 'greeting')) {
            stopVoiceSpeaking();
        }
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        if (headerVoiceBtn) {
            headerVoiceBtn.title = "Voice Assistant not supported in this browser";
            headerVoiceBtn.style.opacity = "0.4";
        }
        if (inputVoiceBtn) inputVoiceBtn.style.opacity = "0.4";
        return;
    }

    const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    speechRecognitionObj = new SpeechRecognition();
    speechRecognitionObj.continuous = !isMobileDevice; // On mobile, single-utterance mode prevents Android Chrome from mangling interim audio buffers
    speechRecognitionObj.interimResults = true;
    speechRecognitionObj.lang = 'en-US';

    const toggleVoice = () => {
        primeSpeechSynthesis();
        if (voiceState === 'speaking' || voiceState === 'greeting') {
            stopVoiceSpeaking();
            return;
        }
        if (voiceState === 'off') {
            startVoiceListening();
        } else {
            stopVoiceListening();
        }
    };

    if (headerVoiceBtn) headerVoiceBtn.addEventListener('click', toggleVoice);
    if (inputVoiceBtn) inputVoiceBtn.addEventListener('click', toggleVoice);
    if (voiceHudClose) voiceHudClose.addEventListener('click', () => stopVoiceListening());

    // Helper to parse, clean, and deduplicate speech recognition results across Desktop and Mobile
    function parseSpeechResults(results) {
        let finalPhrases = [];
        let currentInterim = '';
        let hasFinalResult = false;

        for (let i = 0; i < results.length; ++i) {
            const result = results[i];
            if (!result || !result[0] || !result[0].transcript) continue;
            const text = result[0].transcript.trim();
            if (!text) continue;

            if (result.isFinal) {
                hasFinalResult = true;
                currentInterim = ''; // Clear interim once finalized
                if (finalPhrases.length > 0) {
                    const lastPhrase = finalPhrases[finalPhrases.length - 1];
                    // If current final phrase already extends or repeats last phrase (Android cumulative bug), replace it
                    if (text.toLowerCase().startsWith(lastPhrase.toLowerCase())) {
                        finalPhrases[finalPhrases.length - 1] = text;
                        continue;
                    }
                    // Check word overlap at boundary (e.g. "what are" + "are today's" -> "what are today's")
                    const wordsLast = lastPhrase.split(/\s+/);
                    const wordsCur = text.split(/\s+/);
                    let merged = false;
                    const maxOverlap = Math.min(wordsLast.length, wordsCur.length);
                    for (let len = maxOverlap; len > 0; len--) {
                        const tail = wordsLast.slice(wordsLast.length - len).map(w => w.toLowerCase()).join(' ');
                        const head = wordsCur.slice(0, len).map(w => w.toLowerCase()).join(' ');
                        if (tail === head) {
                            finalPhrases[finalPhrases.length - 1] = wordsLast.concat(wordsCur.slice(len)).join(' ');
                            merged = true;
                            break;
                        }
                    }
                    if (!merged) {
                        finalPhrases.push(text);
                    }
                } else {
                    finalPhrases.push(text);
                }
            } else {
                // Interim result: always take latest active interim hypothesis (never concatenate multiple interim drafts!)
                currentInterim = text;
            }
        }

        let fullFinal = finalPhrases.join(' ').replace(/\s+/g, ' ').trim();
        let rawText = fullFinal;

        if (currentInterim) {
            if (currentInterim.toLowerCase().startsWith(fullFinal.toLowerCase())) {
                rawText = currentInterim;
            } else {
                const wordsFinal = fullFinal ? fullFinal.split(/\s+/) : [];
                const wordsInterim = currentInterim.split(/\s+/);
                let merged = false;
                const maxOverlap = Math.min(wordsFinal.length, wordsInterim.length);
                for (let len = maxOverlap; len > 0; len--) {
                    const tail = wordsFinal.slice(wordsFinal.length - len).map(w => w.toLowerCase()).join(' ');
                    const head = wordsInterim.slice(0, len).map(w => w.toLowerCase()).join(' ');
                    if (tail === head) {
                        rawText = wordsFinal.concat(wordsInterim.slice(len)).join(' ');
                        merged = true;
                        break;
                    }
                }
                if (!merged) {
                    rawText = fullFinal ? `${fullFinal} ${currentInterim}` : currentInterim;
                }
            }
        }

        return {
            rawText: rawText.replace(/\s+/g, ' ').trim(),
            hasFinalResult: hasFinalResult
        };
    }

    speechRecognitionObj.onresult = (event) => {
        if (isVoiceSending || voiceState === 'speaking' || voiceState === 'greeting' || voiceState === 'off' || voiceState === 'thinking') return;

        const parsed = parseSpeechResults(event.results);
        const rawText = parsed.rawText;
        const hasFinalResult = parsed.hasFinalResult;
        if (!rawText) return;

        // Punctuation-resilient wake word regex (supports "Hey, Strike.", "Hello, Strike!", "Hi strike", "Okay Strike", "Hey Pocket Strike", "Strike,")
        const WAKE_WORD_REGEX = /(?:(?:hello|hey|hi|ok|okay)\s*[,.-]?\s*(?:pocket\s*[,.-]?\s*)?strike|(?:^|[.?!;])\s*(?:pocket\s*[,.-]?\s*)?strike)\b[\s,.-]*/i;
        const hasWakeWord = WAKE_WORD_REGEX.test(rawText);

        if (hasWakeWord) {
            const cleanCommand = rawText.replace(WAKE_WORD_REGEX, '').replace(/^[,\s\.\?!]+|[,\s\.\?!]+$/g, '').trim();

            if (cleanCommand.length === 0) {
                // Standalone Wake Word: "Hey Strike" / "Hello Strike"
                if (speechSilenceTimer) {
                    clearTimeout(speechSilenceTimer);
                    speechSilenceTimer = null;
                }
                try { speechRecognitionObj.abort(); } catch (e) {}
                playWakeChime();
                speakTextResponse("Hello, how can I assist you?", true); // isGreeting = true
                return;
            } else {
                // Wake word with inline command: e.g. "Hey Strike, scan network"
                voiceState = 'activated';
                setVoiceHudState('listening', `"${cleanCommand}"`);
                chatInput.value = cleanCommand;
                autoGrowInput();

                if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
                // Conversational silence delay: 1.8s on final phrase, 2.6s on interim phrase
                const silenceDelay = hasFinalResult ? 1800 : 2600;
                speechSilenceTimer = setTimeout(() => {
                    submitVoicePrompt();
                }, silenceDelay);
                return;
            }
        }

        // If in activated mode (user opened from mic button or assistant is listening)
        if (voiceState === 'activated') {
            const cleanPrompt = rawText.replace(/^[,\s\.\?!]+|[,\s\.\?!]+$/g, '').trim();
            if (cleanPrompt.length > 0) {
                setVoiceHudState('listening', `"${cleanPrompt}"`);
                chatInput.value = cleanPrompt;
                autoGrowInput();

                if (speechSilenceTimer) clearTimeout(speechSilenceTimer);

                // Conversational silence delay: 1.8s on final phrase, 2.6s on interim phrase
                const silenceDelay = hasFinalResult ? 1800 : 2600;
                speechSilenceTimer = setTimeout(() => {
                    submitVoicePrompt();
                }, silenceDelay);
            }
        }
    };

    speechRecognitionObj.onerror = (event) => {
        if (event.error === 'not-allowed') {
            stopVoiceListening();
            alert("Microphone permission denied.");
        }
    };

    speechRecognitionObj.onend = () => {
        // Auto restart recognition loop if voice assistant is active and not busy
        if (voiceState === 'background' || voiceState === 'activated') {
            if (!isGenerating && !isVoiceSending && !speechSilenceTimer) {
                setTimeout(() => {
                    if (voiceState === 'background' || voiceState === 'activated') {
                        try { speechRecognitionObj.start(); } catch (e) {}
                    }
                }, 250);
            }
        }
    };
}

function submitVoicePrompt() {
    const promptToSend = chatInput.value.trim();
    if (promptToSend.length > 0 && !isGenerating && !isVoiceSending && voiceState === 'activated') {
        isVoiceSending = true;
        console.log("🎙️ Strike Voice Engine - Submitting:", promptToSend);

        if (speechSilenceTimer) clearTimeout(speechSilenceTimer);

        try { speechRecognitionObj.abort(); } catch (e) {}

        playDoneChime();
        voiceState = 'thinking';
        setVoiceHudState('thinking', `"${promptToSend}"`);

        handleSend(true);

        setTimeout(() => {
            isVoiceSending = false;
        }, 1000);
    }
}

function startVoiceListening() {
    primeSpeechSynthesis();
    if (!speechRecognitionObj) return;
    try {
        voiceState = 'activated';
        if (speechSilenceTimer) {
            clearTimeout(speechSilenceTimer);
            speechSilenceTimer = null;
        }
        chatInput.value = '';
        autoGrowInput();
        playWakeChime();
        speechRecognitionObj.start();
        
        const headerVoiceBtn = document.getElementById('voiceBtn');
        const inputVoiceBtn = document.getElementById('voiceInputBtn');
        if (headerVoiceBtn) headerVoiceBtn.classList.add('active');
        if (inputVoiceBtn) inputVoiceBtn.classList.add('active');
        
        setVoiceHudState('listening', 'I am listening... Speak or say "Hey Strike"');
    } catch (e) {
        console.error("Failed to start voice assistant:", e);
    }
}

function stopVoiceListening() {
    voiceState = 'off';
    currentSpeechUtterance = null;
    if (speechSilenceTimer) clearTimeout(speechSilenceTimer);
    try { speechRecognitionObj.abort(); } catch (e) {}
    
    const headerVoiceBtn = document.getElementById('voiceBtn');
    const inputVoiceBtn = document.getElementById('voiceInputBtn');
    if (headerVoiceBtn) {
        headerVoiceBtn.classList.remove('active');
        headerVoiceBtn.classList.remove('voice-speaking');
    }
    if (inputVoiceBtn) inputVoiceBtn.classList.remove('active');

    const floatingBtn = document.getElementById('voiceFloatingStopBtn');
    if (floatingBtn) floatingBtn.style.display = 'none';

    const stopBtn = document.getElementById('voiceHudStopBtn');
    if (stopBtn) stopBtn.style.display = 'none';
    
    setVoiceHudState('hidden');
    if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    fetch('/api/voice/stop', { method: 'POST' }).catch(() => {});
}

