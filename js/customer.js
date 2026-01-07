// Customer Support Interface JavaScript
// PeerJS integration for making video/voice calls to consultants

class CustomerInterface {
    constructor() {
        // Default consultant peer id when none is provided
        this.DEFAULT_CONSULTANT_ID = 'consultant';
        this.peer = null;
        this.currentCall = null;
        this.dataConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callTimer = null;
        this.callDuration = 0;
        this.callType = 'video';
        this.isMuted = false;
        this.isVideoOff = false;

        this.initElements();
        this.initPeer();
        this.initEventListeners();
    }

    initElements() {
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');

        // Form elements
        this.customerNameInput = document.getElementById('customerName');
        this.consultantIdInput = document.getElementById('consultantId');
        this.videoCallTypeBtn = document.getElementById('videoCallType');
        this.audioCallTypeBtn = document.getElementById('audioCallType');
        this.startCallBtn = document.getElementById('startCall');
        this.connectForm = document.getElementById('connectForm');

        // Screen elements
        this.preCallScreen = document.getElementById('preCallScreen');
        this.connectingScreen = document.getElementById('connectingScreen');
        this.waitingScreen = document.getElementById('waitingScreen');
        this.callEndedScreen = document.getElementById('callEndedScreen');
        this.callEndedMessage = document.getElementById('callEndedMessage');
        this.newCallBtn = document.getElementById('newCallBtn');

        // Video elements
        this.videoContainer = document.getElementById('videoContainer');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.localVideo = document.getElementById('localVideo');
        this.callInfo = document.getElementById('callInfo');
        this.consultantName = document.getElementById('consultantName');
        this.callTimerElement = document.getElementById('callTimer');

        // Controls
        this.preCallControls = document.getElementById('preCallControls');
        this.callControls = document.getElementById('callControls');
        this.toggleMicBtn = document.getElementById('toggleMic');
        this.toggleVideoBtn = document.getElementById('toggleVideo');
        this.toggleScreenBtn = document.getElementById('toggleScreen');
        this.endCallBtn = document.getElementById('endCall');
        this.cancelCallBtn = document.getElementById('cancelCall');

        // Notification
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notificationText');

        // Chat elements
        this.chatPanel = document.getElementById('chatPanel');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendMessageBtn = document.getElementById('sendMessageBtn');
        this.fileInput = document.getElementById('fileInput');
        this.attachFileBtn = document.getElementById('attachFileBtn');
    }

    initPeer() {
        // Determine if running on production or localhost
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Configure PeerJS - use local server path for both dev and prod
        const peerConfig = {
            debug: 2,
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            secure: window.location.protocol === 'https:',
            path: '/peerjs'
        };
        
        // Initialize PeerJS
        this.peer = new Peer(peerConfig);

        this.peer.on('open', (id) => {
            console.log('Customer Peer ID:', id);
            this.updateStatus('online', 'Ready to connect');
        });

        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
            this.updateStatus('offline', 'Connection error');
            
            if (error.type === 'peer-unavailable') {
                this.showNotification('Consultant not found. Please check the ID.', 'error');
                this.resetToPreCall();
            } else {
                this.showNotification('Connection error: ' + error.type, 'error');
            }
        });

        this.peer.on('disconnected', () => {
            this.updateStatus('connecting', 'Reconnecting...');
            this.peer.reconnect();
        });
    }

    initEventListeners() {
        // Call type selection
        this.videoCallTypeBtn.addEventListener('click', () => this.selectCallType('video'));
        this.audioCallTypeBtn.addEventListener('click', () => this.selectCallType('audio'));

        // Start call button
        this.startCallBtn.addEventListener('click', () => this.startCall());

        // Cancel call button
        this.cancelCallBtn.addEventListener('click', () => this.cancelCall());

        // Call controls
        this.toggleMicBtn.addEventListener('click', () => this.toggleMicrophone());
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        this.toggleScreenBtn.addEventListener('click', () => this.shareScreen());
        this.endCallBtn.addEventListener('click', () => this.endCall());

        // New call button
        this.newCallBtn.addEventListener('click', () => this.resetToPreCall());

        // Enter key to start call (only if consultantId input exists)
        if (this.consultantIdInput) {
            this.consultantIdInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.startCall();
                }
            });
        }

        // Chat event listeners
        if (this.sendMessageBtn) {
            this.sendMessageBtn.addEventListener('click', () => this.sendChatMessage());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }

        // File upload event listeners
        if (this.attachFileBtn) {
            this.attachFileBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    updateStatus(status, text) {
        this.statusDot.className = 'status-dot ' + status;
        this.statusText.textContent = text;
    }

    selectCallType(type) {
        this.callType = type;
        
        if (type === 'video') {
            this.videoCallTypeBtn.classList.add('selected');
            this.audioCallTypeBtn.classList.remove('selected');
        } else {
            this.audioCallTypeBtn.classList.add('selected');
            this.videoCallTypeBtn.classList.remove('selected');
        }
    }

    async startCall() {
        const customerName = this.customerNameInput.value.trim() || 'Customer';
        // If no consultant ID was entered (or input removed), use default consultant id
        const consultantId = (this.consultantIdInput ? this.consultantIdInput.value.trim() : '') || this.DEFAULT_CONSULTANT_ID;

        // Show connecting screen
        this.showScreen('connecting');
        this.updateStatus('connecting', 'Connecting...');

        try {
            // Get local media stream with fallback options
            this.localStream = await this.getMediaStream();

            // First establish a data connection to send caller info
            this.dataConnection = this.peer.connect(consultantId);

            this.dataConnection.on('open', () => {
                // Send caller info
                this.dataConnection.send({
                    type: 'caller-info',
                    name: customerName,
                    callType: this.callType
                });

                // Now make the call
                this.makeCall(consultantId, customerName);
            });

            this.dataConnection.on('error', (error) => {
                console.error('Data connection error:', error);
            });

        } catch (error) {
            console.error('Failed to get media:', error);
            this.handleMediaError(error);
        }
    }

    async getMediaStream() {
        // First, check what devices are available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');

        console.log('Available devices - Video:', hasVideo, 'Audio:', hasAudio);

        // Build constraints based on available devices and call type
        let constraints = {};

        if (this.callType === 'video') {
            constraints.video = hasVideo ? true : false;
            constraints.audio = hasAudio ? true : false;
        } else {
            constraints.video = false;
            constraints.audio = hasAudio ? true : false;
        }

        // If no devices at all, show a warning but try to proceed
        if (!hasVideo && !hasAudio) {
            this.showNotification('No camera or microphone detected. Attempting to connect anyway...', 'info');
            // Try to get any available stream
            try {
                return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            } catch (e) {
                // Create a silent/blank stream as fallback
                return this.createEmptyStream();
            }
        }

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            // If video fails, try audio only
            if (constraints.video && hasAudio) {
                console.log('Video failed, trying audio only...');
                this.showNotification('Camera not available, using audio only', 'info');
                this.callType = 'audio';
                return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            throw error;
        }
    }

    createEmptyStream() {
        // Create a silent audio track and blank video track for testing
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        const silentStream = ctx.createMediaStreamDestination().stream;
        
        // Create a canvas for blank video
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const canvasCtx = canvas.getContext('2d');
        canvasCtx.fillStyle = '#1a1a2e';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.fillStyle = '#fff';
        canvasCtx.font = '24px Arial';
        canvasCtx.textAlign = 'center';
        canvasCtx.fillText('No Camera Available', canvas.width/2, canvas.height/2);
        
        const videoStream = canvas.captureStream(25);
        const combinedStream = new MediaStream([
            ...videoStream.getVideoTracks(),
            ...silentStream.getAudioTracks()
        ]);
        
        return combinedStream;
    }

    handleMediaError(error) {
        let message = 'Failed to access camera/microphone.';
        
        switch(error.name) {
            case 'NotFoundError':
                message = 'No camera or microphone found. Please connect a device and try again.';
                break;
            case 'NotAllowedError':
                message = 'Camera/microphone access denied. Please allow access in your browser settings.';
                break;
            case 'NotReadableError':
                message = 'Camera/microphone is being used by another application.';
                break;
            case 'OverconstrainedError':
                message = 'Camera/microphone settings not supported.';
                break;
            case 'SecurityError':
                message = 'Media access is not allowed on this page (HTTPS required).';
                break;
            default:
                message = `Media error: ${error.message || error.name}`;
        }
        
        this.showNotification(message, 'error');
        this.resetToPreCall();
    }

    makeCall(consultantId, customerName) {
        // Show waiting screen
        this.showScreen('waiting');
        this.preCallControls.style.display = 'flex';

        // Make the call
        this.currentCall = this.peer.call(consultantId, this.localStream);

        // Show local video if video call
        if (this.callType === 'video') {
            this.localVideo.srcObject = this.localStream;
            this.localVideo.style.display = 'block';
        }

        this.currentCall.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            this.remoteStream = remoteStream;
            
            // Show active call screen
            this.showScreen('active');
            this.preCallControls.style.display = 'none';
            this.callControls.style.display = 'flex';

            // Display remote video
            this.remoteVideo.srcObject = remoteStream;
            this.remoteVideo.style.display = 'block';
            this.callInfo.style.display = 'flex';
            this.consultantName.textContent = 'Consultant';

            // Start call timer
            this.startCallTimer();
            this.updateStatus('busy', 'In call');

            // Show chat panel automatically when call is active
            if (this.chatPanel) {
                this.chatPanel.style.display = 'flex';
                this.setupChatDataConnection();
            }

            this.showNotification('Connected to consultant', 'success');
        });

        this.currentCall.on('close', () => {
            this.handleCallEnded('Call ended');
        });

        this.currentCall.on('error', (error) => {
            console.error('Call error:', error);
            this.handleCallEnded('Call failed');
        });

        // Set a timeout for no answer
        this.callTimeout = setTimeout(() => {
            if (!this.remoteStream) {
                this.handleCallEnded('No answer from consultant');
            }
        }, 60000); // 60 second timeout
    }

    cancelCall() {
        if (this.currentCall) {
            this.currentCall.close();
        }
        this.handleCallEnded('Call cancelled');
    }

    toggleMicrophone() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                this.toggleMicBtn.classList.toggle('active', this.isMuted);
                this.toggleMicBtn.innerHTML = this.isMuted 
                    ? '<i class="fas fa-microphone-slash"></i>'
                    : '<i class="fas fa-microphone"></i>';
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoOff = !videoTrack.enabled;
                this.toggleVideoBtn.classList.toggle('active', this.isVideoOff);
                this.toggleVideoBtn.innerHTML = this.isVideoOff 
                    ? '<i class="fas fa-video-slash"></i>'
                    : '<i class="fas fa-video"></i>';
            }
        }
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            
            // Replace video track in the peer connection
            if (this.currentCall) {
                const sender = this.currentCall.peerConnection
                    .getSenders()
                    .find(s => s.track && s.track.kind === 'video');
                
                if (sender) {
                    await sender.replaceTrack(screenTrack);
                }
            }

            // Update local video
            this.localVideo.srcObject = screenStream;
            this.toggleScreenBtn.classList.add('active');

            // When screen sharing stops, revert to camera
            screenTrack.onended = async () => {
                try {
                    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const cameraTrack = cameraStream.getVideoTracks()[0];
                    
                    if (this.currentCall) {
                        const sender = this.currentCall.peerConnection
                            .getSenders()
                            .find(s => s.track && s.track.kind === 'video');
                        
                        if (sender) {
                            await sender.replaceTrack(cameraTrack);
                        }
                    }
                    
                    this.localVideo.srcObject = this.localStream;
                    this.toggleScreenBtn.classList.remove('active');
                } catch (e) {
                    console.log('Could not restore camera:', e);
                    this.toggleScreenBtn.classList.remove('active');
                }
            };

            this.showNotification('Bildschirmfreigabe gestartet', 'success');
        } catch (error) {
            console.error('Screen sharing error:', error);
            if (error.name !== 'NotAllowedError') {
                this.showNotification('Bildschirmfreigabe fehlgeschlagen', 'error');
            }
        }
    }

    endCall() {
        if (this.currentCall) {
            this.currentCall.close();
        }
        this.handleCallEnded('Call ended');
    }

    handleCallEnded(reason) {
        // Clear timeout
        if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
        }

        // Stop call timer
        this.stopCallTimer();

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Close data connection
        if (this.dataConnection) {
            this.dataConnection.close();
            this.dataConnection = null;
        }

        // Reset video elements
        this.remoteVideo.srcObject = null;
        this.remoteVideo.style.display = 'none';
        this.localVideo.srcObject = null;
        this.localVideo.style.display = 'none';
        this.callInfo.style.display = 'none';
        this.callControls.style.display = 'none';
        this.preCallControls.style.display = 'none';

        // Hide chat panel and reset chat
        if (this.chatPanel) {
            this.chatPanel.style.display = 'none';
            this.clearChat();
        }

        // Show call ended screen
        this.callEndedMessage.textContent = reason;
        this.showScreen('ended');

        this.currentCall = null;
        this.remoteStream = null;
        this.callDuration = 0;
        this.isMuted = false;
        this.isVideoOff = false;

        this.updateStatus('online', 'Ready to connect');
    }

    resetToPreCall() {
        // Reset UI to pre-call state
        this.showScreen('precall');
        this.preCallControls.style.display = 'none';
        this.callControls.style.display = 'none';
        
        // Reset form
        if (this.consultantIdInput) {
            this.consultantIdInput.value = '';
        }
        
        // Reset toggle buttons
        this.toggleMicBtn.classList.remove('active');
        this.toggleMicBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        this.toggleVideoBtn.classList.remove('active');
        this.toggleVideoBtn.innerHTML = '<i class="fas fa-video"></i>';

        this.updateStatus('online', 'Ready to connect');
    }

    showScreen(screen) {
        // Hide all screens
        this.preCallScreen.style.display = 'none';
        this.connectingScreen.style.display = 'none';
        this.waitingScreen.style.display = 'none';
        this.callEndedScreen.style.display = 'none';
        this.remoteVideo.style.display = 'none';

        // Show requested screen
        switch (screen) {
            case 'precall':
                this.preCallScreen.style.display = 'flex';
                break;
            case 'connecting':
                this.connectingScreen.style.display = 'flex';
                break;
            case 'waiting':
                this.waitingScreen.style.display = 'flex';
                break;
            case 'ended':
                this.callEndedScreen.style.display = 'flex';
                break;
            case 'active':
                // Video displays are handled separately
                break;
        }
    }

    startCallTimer() {
        this.callDuration = 0;
        this.updateTimerDisplay();
        this.callTimer = setInterval(() => {
            this.callDuration++;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.callDuration / 60);
        const seconds = this.callDuration % 60;
        this.callTimerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    showNotification(message, type = 'info') {
        this.notificationText.textContent = message;
        this.notification.className = `notification ${type}`;
        
        const icon = this.notification.querySelector('i');
        switch (type) {
            case 'success':
                icon.className = 'fas fa-check-circle';
                break;
            case 'error':
                icon.className = 'fas fa-exclamation-circle';
                break;
            default:
                icon.className = 'fas fa-info-circle';
        }

        setTimeout(() => {
            this.notification.classList.add('hidden');
        }, 4000);
    }

    // Chat functions
    setupChatDataConnection() {
        if (this.dataConnection) {
            this.dataConnection.on('data', (data) => {
                if (data.type === 'chat-message') {
                    this.addChatMessage(data.message, 'received');
                } else if (data.type === 'file') {
                    this.addFileMessage(data, 'received');
                }
            });
        }
    }

    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (message && this.dataConnection && this.dataConnection.open) {
            this.dataConnection.send({
                type: 'chat-message',
                message: message
            });
            this.addChatMessage(message, 'sent');
            this.chatInput.value = '';
        }
    }

    addChatMessage(message, type) {
        // Remove empty state if present
        const emptyState = this.chatMessages.querySelector('.chat-empty');
        if (emptyState) {
            emptyState.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            ${message}
            <span class="message-time">${timeStr}</span>
        `;
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        this.chatMessages.innerHTML = `
            <div class="chat-empty">
                <i class="fas fa-comment-dots"></i>
                <p>Nachrichten erscheinen hier</p>
            </div>
        `;
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification(`Datei "${file.name}" ist zu groß (max. 10MB)`, 'error');
                continue;
            }
            this.sendFile(file);
        }
        this.fileInput.value = '';
    }

    sendFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = {
                type: 'file',
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                data: e.target.result
            };

            if (this.dataConnection && this.dataConnection.open) {
                this.dataConnection.send(fileData);
                this.addFileMessage(fileData, 'sent');
            }
        };
        reader.readAsDataURL(file);
    }

    addFileMessage(fileData, type) {
        const emptyState = this.chatMessages.querySelector('.chat-empty');
        if (emptyState) {
            emptyState.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-file ${type}`;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const fileSize = this.formatFileSize(fileData.fileSize);

        if (fileData.fileType && fileData.fileType.startsWith('image/')) {
            messageDiv.innerHTML = `
                <div class="chat-file-preview">
                    <img src="${fileData.data}" alt="${fileData.fileName}" onclick="window.open('${fileData.data}', '_blank')">
                </div>
                <span class="message-time">${timeStr}</span>
            `;
        } else {
            const icon = this.getFileIcon(fileData.fileName);
            messageDiv.innerHTML = `
                <a href="${fileData.data}" download="${fileData.fileName}" class="chat-file-doc">
                    <i class="fas ${icon}"></i>
                    <div class="chat-file-doc-info">
                        <span class="chat-file-doc-name">${fileData.fileName}</span>
                        <span class="chat-file-doc-size">${fileSize}</span>
                    </div>
                </a>
                <span class="message-time">${timeStr}</span>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = {
            'pdf': 'fa-file-pdf',
            'doc': 'fa-file-word',
            'docx': 'fa-file-word',
            'xls': 'fa-file-excel',
            'xlsx': 'fa-file-excel',
            'txt': 'fa-file-alt',
            'zip': 'fa-file-archive',
            'rar': 'fa-file-archive'
        };
        return icons[ext] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// Initialize customer interface
const customerInterface = new CustomerInterface();