class CatFartGPT {
    constructor() {
        this.apiKey = localStorage.getItem('openai-api-key') || '';
        this.messages = [];
        this.totalTokens = parseInt(localStorage.getItem('total-tokens')) || 0;
        this.animationInterval = null;
        this.currentFrame = 0;
        this.customSounds = {
            low: null,
            medium: null,
            high: null
        };
        this.customAnimations = {
            low: { frame1: null, frame2: null, frame3: null },
            medium: { frame1: null, frame2: null, frame3: null },
            high: { frame1: null, frame2: null, frame3: null }
        };
        this.isSettingsPage = false;
        this.init();
    }

    init() {
        this.loadSettings();
        this.bindEvents();
        this.updateUI();

        // Handle API key initialization on both pages
        const apiKeyInput = document.getElementById('api-key');
        if (apiKeyInput && this.apiKey) {
            apiKeyInput.value = this.apiKey;
        }

        // Enable chat functionality on main page if API key exists
        if (!this.isSettingsPage && this.apiKey) {
            this.enableChat();
        }
    }

    bindEvents() {
        // Main page events
        const saveKeyBtn = document.getElementById('save-key');
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');
        const apiKey = document.getElementById('api-key');

        if (saveKeyBtn) saveKeyBtn.addEventListener('click', () => this.saveApiKey());
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            userInput.addEventListener('input', () => this.adjustTextareaHeight());
        }
        if (apiKey) {
            apiKey.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.saveApiKey();
                }
            });
        }

        // Settings page events
        const lowFart = document.getElementById('low-fart');
        const mediumFart = document.getElementById('medium-fart');
        const highFart = document.getElementById('high-fart');
        const clearSounds = document.getElementById('clear-sounds');
        const clearAnimations = document.getElementById('clear-animations');

        if (lowFart) lowFart.addEventListener('change', (e) => this.handleSoundUpload(e, 'low'));
        if (mediumFart) mediumFart.addEventListener('change', (e) => this.handleSoundUpload(e, 'medium'));
        if (highFart) highFart.addEventListener('change', (e) => this.handleSoundUpload(e, 'high'));
        if (clearSounds) clearSounds.addEventListener('click', () => this.clearAllSounds());
        if (clearAnimations) clearAnimations.addEventListener('click', () => this.clearAllAnimations());

        // Animation upload events
        this.bindAnimationUploadEvents();
    }

    saveApiKey() {
        const apiKeyInput = document.getElementById('api-key');
        if (!apiKeyInput) return;

        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }

        // Basic validation for OpenAI API key format
        if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
            alert('Please enter a valid OpenAI API key. It should start with "sk-" and be at least 20 characters long.');
            return;
        }

        this.apiKey = apiKey;
        localStorage.setItem('openai-api-key', apiKey);

        // Enable chat on main page if we're not on settings page
        if (!this.isSettingsPage) {
            this.enableChat();
            this.addMessage('system', 'API key saved! You can now start chatting.');
        } else {
            // Show success message on settings page
            alert('API key saved successfully! You can now return to the chat.');
        }
    }

    enableChat() {
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');

        if (sendBtn) sendBtn.disabled = false;
        if (userInput) userInput.placeholder = 'Type your message here...';
    }

    adjustTextareaHeight() {
        const textarea = document.getElementById('user-input');
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    async sendMessage() {
        const userInput = document.getElementById('user-input');
        if (!userInput) return;

        const message = userInput.value.trim();

        if (!message) return;

        if (!this.apiKey) {
            this.addMessage('system', 'Please configure your OpenAI API key in Settings before sending messages.');
            return;
        }

        userInput.value = '';
        userInput.style.height = 'auto';
        this.addMessage('user', message);
        this.showLoading(true);

        try {
            const response = await this.callOpenAI(message);
            this.addMessage('assistant', response.content);
            this.updateTokenCount(response.usage);
        } catch (error) {
            this.addMessage('system', `Error: ${error.message}`);
            console.error('OpenAI API Error:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async callOpenAI(message) {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        this.messages.push({ role: 'user', content: message });

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: this.messages,
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const errorMessage = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                throw new Error(errorMessage);
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from OpenAI API');
            }

            const assistantMessage = data.choices[0].message;
            this.messages.push(assistantMessage);

            return {
                content: assistantMessage.content,
                usage: data.usage || { total_tokens: 0 }
            };
        } catch (error) {
            // Remove the user message we added if the API call failed
            this.messages.pop();
            throw error;
        }
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return; // Return early if not on main page

        const messageDiv = document.createElement('div');

        messageDiv.className = `message ${role}-message`;
        messageDiv.innerHTML = `
            <div class="message-content">${this.formatMessage(content)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatMessage(content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
    }

    updateTokenCount(usage) {
        if (!usage) return;

        this.totalTokens += usage.total_tokens;
        localStorage.setItem('total-tokens', this.totalTokens.toString());

        const tokenCountElement = document.getElementById('token-count');
        const costEstimateElement = document.getElementById('cost-estimate');

        if (tokenCountElement) tokenCountElement.textContent = `Tokens: ${this.totalTokens}`;

        const estimatedCost = (this.totalTokens / 1000) * 0.002;
        if (costEstimateElement) costEstimateElement.textContent = `Cost: $${estimatedCost.toFixed(4)}`;

        this.updateUsageImage();
    }

    updateUsageImage() {
        const usageImage = document.getElementById('usage-image');

        if (this.totalTokens === 0) {
            this.setUsageImage('none');
        } else if (this.totalTokens <= 100) {
            this.setUsageImage('low');
        } else if (this.totalTokens <= 500) {
            this.setUsageImage('medium');
        } else {
            this.setUsageImage('high');
        }
    }

    setUsageImage(level) {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }

        this.startMeowAnimation(level);
    }

    startMeowAnimation(level) {
        const usageImage = document.getElementById('usage-image');

        // Check if we have custom animation frames for this level
        if (this.hasCustomAnimation(level)) {
            this.startCustomAnimation(level);
        } else {
            this.startGeneratedAnimation(level);
        }
    }

    hasCustomAnimation(level) {
        const animation = this.customAnimations[level];
        return animation && animation.frame1 && animation.frame2 && animation.frame3;
    }

    startCustomAnimation(level) {
        const usageImage = document.getElementById('usage-image');
        const animation = this.customAnimations[level];

        const frames = [animation.frame1, animation.frame2, animation.frame3];

        this.currentFrame = 0;
        usageImage.src = frames[0];
        usageImage.alt = `Custom farting animation - ${level} token usage`;

        this.playFartSound(level);

        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % frames.length;
            usageImage.src = frames[this.currentFrame];

            if (this.currentFrame === 1) {
                this.playFartSound(level);
            }
        }, 800);
    }

    startGeneratedAnimation(level) {
        const usageImage = document.getElementById('usage-image');

        const colorSchemes = {
            none: { primary: '#374151', secondary: '#6b7280', text: '#9ca3af' },
            low: { primary: '#10a37f', secondary: '#0d8f6e', text: '#10a37f' },
            medium: { primary: '#ff9500', secondary: '#cc7700', text: '#ff9500' },
            high: { primary: '#ff4444', secondary: '#cc3333', text: '#ff4444' }
        };

        const colors = colorSchemes[level];

        const frames = this.createFartFrames(colors, level);

        this.currentFrame = 0;
        usageImage.src = frames[0];
        usageImage.alt = `Generated farting cat - ${level} token usage`;

        this.playFartSound(level);

        this.animationInterval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % frames.length;
            usageImage.src = frames[this.currentFrame];

            if (this.currentFrame === 1) {
                this.playFartSound(level);
            }
        }, 800);
    }

    createFartFrames(colors, level) {
        const baseFrame = `
            <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
                <defs>
                    <linearGradient id='catGrad${level}' x1='0%' y1='0%' x2='100%' y2='100%'>
                        <stop offset='0%' style='stop-color:${colors.primary};stop-opacity:1' />
                        <stop offset='100%' style='stop-color:${colors.secondary};stop-opacity:1' />
                    </linearGradient>
                </defs>
                <!-- Body -->
                <ellipse cx='100' cy='140' rx='60' ry='35' fill='url(#catGrad${level})'/>
                <!-- Head -->
                <ellipse cx='100' cy='90' rx='45' ry='40' fill='url(#catGrad${level})'/>
                <!-- Left ear -->
                <ellipse cx='80' cy='70' rx='15' ry='20' fill='url(#catGrad${level})'/>
                <!-- Right ear -->
                <ellipse cx='120' cy='70' rx='15' ry='20' fill='url(#catGrad${level})'/>
                <!-- Tail -->
                <ellipse cx='160' cy='130' rx='20' ry='8' fill='url(#catGrad${level})' transform='rotate(45 160 130)'/>
                <!-- Left eye -->
                <circle cx='85' cy='85' r='3' fill='#000'/>
                <!-- Right eye -->
                <circle cx='115' cy='85' r='3' fill='#000'/>
                <!-- Nose -->
                <path d='M100 95 Q95 100 100 105 Q105 100 100 95' fill='#000'/>
                <!-- Mouth -->
                <path d='M95 100 Q100 110 105 100' stroke='#000' stroke-width='1.5' fill='none'/>`;

        const frame1 = baseFrame + `
                <!-- Normal position -->
            </svg>`;

        const frame2 = baseFrame + `
                <!-- Lifted tail position -->
                <ellipse cx='165' cy='120' rx='20' ry='8' fill='url(#catGrad${level})' transform='rotate(30 165 120)'/>
                <!-- Small fart cloud -->
                <circle cx='170' cy='135' r='5' fill='#90EE90' opacity='0.6'/>
                <circle cx='175' cy='130' r='3' fill='#98FB98' opacity='0.7'/>
            </svg>`;

        const frame3 = baseFrame + `
                <!-- Tail fully lifted -->
                <ellipse cx='170' cy='110' rx='20' ry='8' fill='url(#catGrad${level})' transform='rotate(15 170 110)'/>
                <!-- Large fart clouds based on usage level -->
                ${this.getFartClouds(level)}
            </svg>`;

        return [
            `data:image/svg+xml,${encodeURIComponent(frame1)}`,
            `data:image/svg+xml,${encodeURIComponent(frame2)}`,
            `data:image/svg+xml,${encodeURIComponent(frame3)}`
        ];
    }

    getFartClouds(level) {
        const baseClouds = `
            <circle cx='175' cy='135' r='8' fill='#90EE90' opacity='0.6'/>
            <circle cx='180' cy='130' r='6' fill='#98FB98' opacity='0.7'/>
            <circle cx='185' cy='140' r='4' fill='#ADFF2F' opacity='0.5'/>`;

        const mediumClouds = baseClouds + `
            <circle cx='190' cy='125' r='7' fill='#FFE4B5' opacity='0.6'/>
            <circle cx='185' cy='120' r='5' fill='#F0E68C' opacity='0.7'/>
            <circle cx='195' cy='135' r='6' fill='#DDA0DD' opacity='0.5'/>`;

        const largeClouds = mediumClouds + `
            <circle cx='200' cy='130' r='9' fill='#FFA07A' opacity='0.6'/>
            <circle cx='205' cy='140' r='7' fill='#FF6347' opacity='0.7'/>
            <circle cx='195' cy='150' r='8' fill='#FF4500' opacity='0.5'/>
            <circle cx='210' cy='125' r='6' fill='#DC143C' opacity='0.6'/>`;

        switch(level) {
            case 'none': return '';
            case 'low': return baseClouds;
            case 'medium': return mediumClouds;
            case 'high': return largeClouds;
            default: return baseClouds;
        }
    }

    playFartSound(level) {
        if (level === 'none') return;

        // Check if we have a custom sound for this level
        if (this.customSounds[level]) {
            this.playCustomSound(level);
        } else {
            this.playGeneratedSound(level);
        }
    }

    playCustomSound(level) {
        const audio = new Audio();
        audio.src = this.customSounds[level];
        audio.volume = 0.7;
        audio.play().catch(e => console.log('Sound play failed:', e));
    }

    playGeneratedSound(level) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const soundParams = {
            low: { frequency: 80, duration: 0.3 },
            medium: { frequency: 60, duration: 0.6 },
            high: { frequency: 40, duration: 1.2 }
        };

        const params = soundParams[level];
        if (!params) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(params.frequency, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(params.frequency * 0.5, audioContext.currentTime + params.duration);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + params.duration);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + params.duration);
    }

    handleSoundUpload(event, level) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.includes('audio/') && !file.name.toLowerCase().endsWith('.wav')) {
            alert('Please upload a valid audio file (.wav)');
            event.target.value = '';
            return;
        }

        // Create a URL for the file
        const fileURL = URL.createObjectURL(file);
        this.customSounds[level] = fileURL;

        // Update status
        this.updateSoundStatus(level, file.name);

        // Save settings
        this.saveSettings();

        // Test play the sound
        this.playCustomSound(level);
    }

    clearAllSounds() {
        // Revoke object URLs to free memory
        Object.values(this.customSounds).forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });

        // Reset sounds
        this.customSounds = {
            low: null,
            medium: null,
            high: null
        };

        // Clear file inputs
        const lowFart = document.getElementById('low-fart');
        const mediumFart = document.getElementById('medium-fart');
        const highFart = document.getElementById('high-fart');

        if (lowFart) lowFart.value = '';
        if (mediumFart) mediumFart.value = '';
        if (highFart) highFart.value = '';

        // Update status displays
        this.updateSoundStatus('low', 'No file');
        this.updateSoundStatus('medium', 'No file');
        this.updateSoundStatus('high', 'No file');

        const lowStatus = document.getElementById('low-fart-status');
        const mediumStatus = document.getElementById('medium-fart-status');
        const highStatus = document.getElementById('high-fart-status');

        if (lowStatus) lowStatus.style.color = '#8e8ea0';
        if (mediumStatus) mediumStatus.style.color = '#8e8ea0';
        if (highStatus) highStatus.style.color = '#8e8ea0';

        // Save cleared settings
        this.saveSettings();
    }

    bindAnimationUploadEvents() {
        const levels = ['low', 'medium', 'high'];
        const frames = ['frame1', 'frame2', 'frame3'];

        levels.forEach(level => {
            frames.forEach(frame => {
                const elementId = `${level}-${frame}`;
                document.getElementById(elementId).addEventListener('change', (e) =>
                    this.handleAnimationUpload(e, level, frame)
                );
            });
        });
    }

    handleAnimationUpload(event, level, frame) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload a valid image file');
            event.target.value = '';
            return;
        }

        // Create a URL for the image
        const fileURL = URL.createObjectURL(file);

        // Store the frame
        if (!this.customAnimations[level]) {
            this.customAnimations[level] = {};
        }
        this.customAnimations[level][frame] = fileURL;

        // Update status
        this.updateAnimationStatus(level, frame, file.name.substring(0, 8) + '...');

        // Save settings
        this.saveSettings();

        // If this completes a full animation set, preview it
        if (this.hasCustomAnimation(level)) {
            this.previewCustomAnimation(level);
        }
    }

    previewCustomAnimation(level) {
        // Briefly show the custom animation as a preview
        const currentLevel = this.getCurrentUsageLevel();
        if (currentLevel === level) {
            this.setUsageImage(level);
        }
    }

    getCurrentUsageLevel() {
        if (this.totalTokens === 0) return 'none';
        else if (this.totalTokens <= 100) return 'low';
        else if (this.totalTokens <= 500) return 'medium';
        else return 'high';
    }

    clearAllAnimations() {
        // Revoke object URLs to free memory
        Object.values(this.customAnimations).forEach(animation => {
            if (animation) {
                Object.values(animation).forEach(frameUrl => {
                    if (frameUrl) URL.revokeObjectURL(frameUrl);
                });
            }
        });

        // Reset animations
        this.customAnimations = {
            low: { frame1: null, frame2: null, frame3: null },
            medium: { frame1: null, frame2: null, frame3: null },
            high: { frame1: null, frame2: null, frame3: null }
        };

        // Clear file inputs and status displays
        const levels = ['low', 'medium', 'high'];
        const frames = ['frame1', 'frame2', 'frame3'];

        levels.forEach(level => {
            frames.forEach(frame => {
                const inputElement = document.getElementById(`${level}-${frame}`);
                const statusElement = document.getElementById(`${level}-${frame}-status`);

                if (inputElement) inputElement.value = '';
                this.updateAnimationStatus(level, frame, 'No file');
                if (statusElement) statusElement.style.color = '#8e8ea0';
            });
        });

        // Save cleared settings
        this.saveSettings();

        // Restart current animation with generated frames
        const currentLevel = this.getCurrentUsageLevel();
        if (currentLevel !== 'none') {
            this.setUsageImage(currentLevel);
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (show) {
            loading.classList.remove('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    updateUI() {
        this.updateTokenCount();
    }

    loadSettings() {
        // Load custom sounds from localStorage
        const savedSounds = localStorage.getItem('custom-sounds');
        if (savedSounds) {
            try {
                const sounds = JSON.parse(savedSounds);
                Object.keys(sounds).forEach(level => {
                    if (sounds[level]) {
                        this.customSounds[level] = sounds[level];
                        this.updateSoundStatus(level, 'Loaded from storage');
                    }
                });
            } catch (e) {
                console.log('Failed to load custom sounds from storage');
            }
        }

        // Load custom animations from localStorage
        const savedAnimations = localStorage.getItem('custom-animations');
        if (savedAnimations) {
            try {
                const animations = JSON.parse(savedAnimations);
                Object.keys(animations).forEach(level => {
                    if (animations[level]) {
                        Object.keys(animations[level]).forEach(frame => {
                            if (animations[level][frame]) {
                                this.customAnimations[level][frame] = animations[level][frame];
                                this.updateAnimationStatus(level, frame, 'Loaded');
                            }
                        });
                    }
                });
            } catch (e) {
                console.log('Failed to load custom animations from storage');
            }
        }
    }

    saveSettings() {
        // Save custom sounds to localStorage (as data URLs)
        const soundsToSave = {};
        Object.keys(this.customSounds).forEach(level => {
            if (this.customSounds[level]) {
                soundsToSave[level] = this.customSounds[level];
            }
        });
        localStorage.setItem('custom-sounds', JSON.stringify(soundsToSave));

        // Save custom animations to localStorage (as data URLs)
        const animationsToSave = {};
        Object.keys(this.customAnimations).forEach(level => {
            animationsToSave[level] = {};
            Object.keys(this.customAnimations[level]).forEach(frame => {
                if (this.customAnimations[level][frame]) {
                    animationsToSave[level][frame] = this.customAnimations[level][frame];
                }
            });
        });
        localStorage.setItem('custom-animations', JSON.stringify(animationsToSave));
    }

    updateSoundStatus(level, filename) {
        const statusElement = document.getElementById(`${level}-fart-status`);
        if (statusElement) {
            statusElement.textContent = filename;
            statusElement.style.color = '#10a37f';
        }
    }

    updateAnimationStatus(level, frame, filename) {
        const statusElement = document.getElementById(`${level}-${frame}-status`);
        if (statusElement) {
            statusElement.textContent = filename;
            statusElement.style.color = '#10a37f';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CatFartGPT();
});