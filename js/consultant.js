// Consultant Dashboard JavaScript
// PeerJS integration for receiving video/voice calls

class ConsultantDashboard {
    constructor() {
        this.peer = null;
        this.currentCall = null;
        this.localStream = null;
        this.remoteStream = null;
        this.callTimer = null;
        this.callDuration = 0;
        this.incomingCalls = [];
        this.callHistory = [];
        this.isMuted = false;
        this.isVideoOff = false;
        this.pendingCall = null;
        this.dataConnection = null;
        this.isPointerActive = false;

        this.initElements();
        this.initPeer();
        this.initEventListeners();
    }

    initElements() {
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.peerIdElement = document.getElementById('peerId');
        this.copyIdBtn = document.getElementById('copyId');

        // Video elements
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlaceholder = document.getElementById('videoPlaceholder');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.localVideo = document.getElementById('localVideo');
        this.callInfo = document.getElementById('callInfo');
        this.callerName = document.getElementById('callerName');
        this.callTimerElement = document.getElementById('callTimer');

        // Controls
        this.callControls = document.getElementById('callControls');
        this.toggleMicBtn = document.getElementById('toggleMic');
        this.toggleVideoBtn = document.getElementById('toggleVideo');
        this.toggleScreenBtn = document.getElementById('toggleScreen');
        this.togglePointerBtn = document.getElementById('togglePointer');
        this.endCallBtn = document.getElementById('endCall');

        // Queue elements
        this.queueList = document.getElementById('queueList');
        this.queueCount = document.getElementById('queueCount');
        this.callHistoryList = document.getElementById('callHistory');

        // Modal elements
        this.incomingCallModal = document.getElementById('incomingCallModal');
        this.incomingCallerName = document.getElementById('incomingCallerName');
        this.incomingCallType = document.getElementById('incomingCallType');
        this.acceptCallBtn = document.getElementById('acceptCall');
        this.rejectCallBtn = document.getElementById('rejectCall');

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

        // Product elements
        this.productPanel = document.getElementById('productPanel');
        this.productList = document.getElementById('productList');
        this.addProductBtn = document.getElementById('addProductBtn');
        this.addProductModal = document.getElementById('addProductModal');
        this.addProductForm = document.getElementById('addProductForm');
        this.cancelAddProductBtn = document.getElementById('cancelAddProduct');

        // Products array with demo data
        this.products = [
            {
                id: 1,
                name: 'Kaminofen Milano',
                price: '1.299,00 €',
                image: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=400',
                description: 'Moderner Kaminofen mit hoher Effizienz und elegantem Design.',
                features: ['8 kW', 'Stahl', 'A+']
            },
            {
                id: 2,
                name: 'Pelletofen Comfort',
                price: '2.499,00 €',
                image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
                description: 'Vollautomatischer Pelletofen mit Fernbedienung.',
                features: ['9 kW', 'WiFi', 'Timer']
            }
        ];
    }

    initPeer() {
        const CONSULTANT_ID = 'consultant';
        
        const peerConfig = {
            debug: 2,
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            secure: window.location.protocol === 'https:',
            path: '/peerjs'
        };
        
        this.peer = new Peer(CONSULTANT_ID, peerConfig);

        this.peer.on('open', (id) => {
            console.log('Consultant Peer ID:', id);
            this.peerIdElement.textContent = id;
            this.updateStatus('online', 'Online - Ready for calls');
            this.showNotification('Connected successfully! Share your ID with customers.', 'success');
        });

        this.peer.on('call', (call) => {
            console.log('Incoming call from:', call.peer);
            this.handleIncomingCall(call);
        });

        this.peer.on('connection', (conn) => {
            this.dataConnection = conn;
            
            conn.on('data', (data) => {
                console.log('Received data:', data);
                if (data.type === 'caller-info') {
                    this.updateCallerInfo(conn.peer, data);
                } else if (data.type === 'chat-message') {
                    this.addChatMessage(data.message, 'received');
                } else if (data.type === 'file') {
                    this.addFileMessage(data, 'received');
                }
            });
        });

        this.peer.on('error', (error) => {
            console.error('Peer error:', error);
            this.updateStatus('offline', 'Connection error');
            this.showNotification('Connection error: ' + error.type, 'error');
        });

        this.peer.on('disconnected', () => {
            this.updateStatus('connecting', 'Reconnecting...');
            this.peer.reconnect();
        });
    }

    initEventListeners() {
        this.copyIdBtn.addEventListener('click', () => this.copyPeerId());
        this.toggleMicBtn.addEventListener('click', () => this.toggleMicrophone());
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        this.toggleScreenBtn.addEventListener('click', () => this.shareScreen());
        this.endCallBtn.addEventListener('click', () => this.endCall());
        this.acceptCallBtn.addEventListener('click', () => this.acceptCall());
        this.rejectCallBtn.addEventListener('click', () => this.rejectCall());

        if (this.sendMessageBtn) {
            this.sendMessageBtn.addEventListener('click', () => this.sendChatMessage());
        }
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }
        if (this.attachFileBtn) {
            this.attachFileBtn.addEventListener('click', () => this.fileInput.click());
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        if (this.togglePointerBtn) {
            this.togglePointerBtn.addEventListener('click', () => this.togglePointer());
            this.videoContainer.addEventListener('mousemove', (e) => this.handlePointerMove(e));
            this.videoContainer.addEventListener('mouseleave', () => this.handlePointerLeave());
        }
        if (this.addProductBtn) {
            this.addProductBtn.addEventListener('click', () => this.showAddProductModal());
        }
        if (this.cancelAddProductBtn) {
            this.cancelAddProductBtn.addEventListener('click', () => this.hideAddProductModal());
        }
        if (this.addProductForm) {
            this.addProductForm.addEventListener('submit', (e) => this.handleAddProduct(e));
        }
    }

    updateStatus(status, text) {
        this.statusDot.className = 'status-dot ' + status;
        this.statusText.textContent = text;
    }

    copyPeerId() {
        const peerId = this.peerIdElement.textContent;
        navigator.clipboard.writeText(peerId).then(() => {
            this.showNotification('Consultant ID copied to clipboard!', 'success');
            this.copyIdBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                this.copyIdBtn.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            this.showNotification('Failed to copy ID', 'error');
        });
    }

    updateCallerInfo(peerId, info) {
        const call = this.incomingCalls.find(c => c.call.peer === peerId);
        if (call) {
            call.name = info.name || 'Customer';
            call.type = info.callType || 'video';
            this.updateQueueDisplay();
        }
        if (this.pendingCall && this.pendingCall.call.peer === peerId) {
            this.incomingCallerName.textContent = info.name || 'Customer';
            this.incomingCallType.textContent = `Incoming ${info.callType || 'video'} call...`;
        }
    }

    handleIncomingCall(call) {
        const callInfo = {
            call: call,
            name: 'Customer',
            type: 'video',
            timestamp: new Date()
        };
        this.incomingCalls.push(callInfo);
        this.updateQueueDisplay();
        if (!this.currentCall && this.incomingCalls.length === 1) {
            this.showIncomingCallModal(callInfo);
        }
        this.playRingtone();
    }

    showIncomingCallModal(callInfo) {
        this.pendingCall = callInfo;
        this.incomingCallerName.textContent = callInfo.name;
        this.incomingCallType.textContent = `Incoming ${callInfo.type} call...`;
        this.incomingCallModal.classList.remove('hidden');
        this.updateStatus('busy', 'Incoming call...');
    }

    hideIncomingCallModal() {
        this.incomingCallModal.classList.add('hidden');
        this.pendingCall = null;
    }

    playRingtone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 440;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch (e) {
            console.log('Audio notification not available');
        }
    }

    async acceptCall() {
        if (!this.pendingCall) return;
        const callInfo = this.pendingCall;
        this.hideIncomingCallModal();

        try {
            this.localStream = await this.getMediaStream(callInfo.type);
            callInfo.call.answer(this.localStream);
            this.localVideo.srcObject = this.localStream;
            this.localVideo.style.display = 'block';

            callInfo.call.on('stream', (remoteStream) => {
                console.log('Received remote stream');
                this.remoteStream = remoteStream;
                this.remoteVideo.srcObject = remoteStream;
                this.remoteVideo.style.display = 'block';
                this.videoPlaceholder.style.display = 'none';
                this.callInfo.style.display = 'flex';
                this.callControls.style.display = 'flex';
                this.callerName.textContent = callInfo.name;
                this.startCallTimer();
                this.updateStatus('busy', 'In call');
                if (this.chatPanel) this.chatPanel.style.display = 'flex';
                this.showProductPanel();
            });

            callInfo.call.on('close', () => this.handleCallEnded('Call ended by customer'));
            callInfo.call.on('error', (error) => {
                console.error('Call error:', error);
                this.handleCallEnded('Call error occurred');
            });

            this.currentCall = callInfo.call;
            this.incomingCalls = this.incomingCalls.filter(c => c !== callInfo);
            this.updateQueueDisplay();
            this.showNotification('Call connected with ' + callInfo.name, 'success');
        } catch (error) {
            console.error('Failed to get media:', error);
            this.handleMediaError(error);
            this.rejectCall();
        }
    }

    async getMediaStream(callType) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');
        let constraints = {};

        if (callType === 'video') {
            constraints.video = hasVideo;
            constraints.audio = hasAudio;
        } else {
            constraints.video = false;
            constraints.audio = hasAudio;
        }

        if (!hasVideo && !hasAudio) {
            this.showNotification('No camera or microphone detected', 'info');
            return this.createEmptyStream();
        }

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            if (constraints.video && hasAudio) {
                this.showNotification('Camera not available, using audio only', 'info');
                return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            throw error;
        }
    }

    createEmptyStream() {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        const silentStream = ctx.createMediaStreamDestination().stream;
        
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
        return new MediaStream([...videoStream.getVideoTracks(), ...silentStream.getAudioTracks()]);
    }

    handleMediaError(error) {
        const messages = {
            'NotFoundError': 'No camera or microphone found.',
            'NotAllowedError': 'Camera/microphone access denied.',
            'NotReadableError': 'Camera/microphone is being used by another application.',
            'OverconstrainedError': 'Camera/microphone settings not supported.'
        };
        this.showNotification(messages[error.name] || `Media error: ${error.message || error.name}`, 'error');
    }

    rejectCall() {
        if (this.pendingCall) {
            this.pendingCall.call.close();
            this.addToHistory(this.pendingCall, 'rejected');
            this.incomingCalls = this.incomingCalls.filter(c => c !== this.pendingCall);
            this.updateQueueDisplay();
            this.hideIncomingCallModal();
            this.updateStatus('online', 'Online - Ready for calls');
            if (this.incomingCalls.length > 0) {
                this.showIncomingCallModal(this.incomingCalls[0]);
            }
        }
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
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            
            if (this.currentCall) {
                const sender = this.currentCall.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) await sender.replaceTrack(screenTrack);
            }
            this.localVideo.srcObject = screenStream;

            screenTrack.onended = async () => {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const cameraTrack = cameraStream.getVideoTracks()[0];
                if (this.currentCall) {
                    const sender = this.currentCall.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) await sender.replaceTrack(cameraTrack);
                }
                this.localVideo.srcObject = this.localStream;
            };
            this.showNotification('Screen sharing started', 'info');
        } catch (error) {
            if (error.name !== 'NotAllowedError') {
                this.showNotification('Failed to share screen', 'error');
            }
        }
    }

    endCall() {
        if (this.currentCall) {
            this.currentCall.close();
            this.handleCallEnded('Call ended');
        }
    }

    handleCallEnded(reason) {
        this.stopCallTimer();
        if (this.currentCall) {
            this.addToHistory({
                name: this.callerName.textContent,
                type: 'video',
                timestamp: new Date(),
                duration: this.callDuration
            }, 'completed');
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.remoteVideo.style.display = 'none';
        this.localVideo.style.display = 'none';
        this.videoPlaceholder.style.display = 'flex';
        this.callInfo.style.display = 'none';
        this.callControls.style.display = 'none';

        if (this.chatPanel) {
            this.chatPanel.style.display = 'none';
            this.clearChat();
        }
        this.hideProductPanel();

        if (this.dataConnection) {
            this.dataConnection.close();
            this.dataConnection = null;
        }

        this.currentCall = null;
        this.callDuration = 0;
        this.isMuted = false;
        this.isVideoOff = false;
        this.isPointerActive = false;
        if (this.togglePointerBtn) this.togglePointerBtn.classList.remove('active');

        this.updateStatus('online', 'Online - Ready for calls');
        this.showNotification(reason, 'info');

        if (this.incomingCalls.length > 0) {
            this.showIncomingCallModal(this.incomingCalls[0]);
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
        this.callTimerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateQueueDisplay() {
        this.queueCount.textContent = this.incomingCalls.length;
        if (this.incomingCalls.length === 0) {
            this.queueList.innerHTML = '<div class="empty-queue"><i class="fas fa-inbox"></i><p>No incoming calls</p></div>';
        } else {
            this.queueList.innerHTML = this.incomingCalls.map((callInfo, index) => `
                <div class="queue-item" data-index="${index}">
                    <div class="queue-info">
                        <div class="queue-avatar">${callInfo.name.charAt(0).toUpperCase()}</div>
                        <div class="queue-details">
                            <h4>${callInfo.name}</h4>
                            <p>${callInfo.type === 'video' ? 'Video call' : 'Voice call'}</p>
                        </div>
                    </div>
                    <div class="queue-actions">
                        <button class="queue-btn accept" onclick="dashboard.acceptQueueCall(${index})"><i class="fas fa-phone"></i></button>
                        <button class="queue-btn reject" onclick="dashboard.rejectQueueCall(${index})"><i class="fas fa-phone-slash"></i></button>
                    </div>
                </div>
            `).join('');
        }
    }

    acceptQueueCall(index) {
        if (this.currentCall) {
            this.showNotification('Please end current call first', 'error');
            return;
        }
        const callInfo = this.incomingCalls[index];
        if (callInfo) this.showIncomingCallModal(callInfo);
    }

    rejectQueueCall(index) {
        const callInfo = this.incomingCalls[index];
        if (callInfo) {
            callInfo.call.close();
            this.addToHistory(callInfo, 'rejected');
            this.incomingCalls.splice(index, 1);
            this.updateQueueDisplay();
        }
    }

    addToHistory(callInfo, status) {
        this.callHistory.unshift({
            name: callInfo.name,
            type: callInfo.type,
            timestamp: callInfo.timestamp,
            duration: callInfo.duration || 0,
            status: status
        });
        if (this.callHistory.length > 10) this.callHistory.pop();
        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        if (this.callHistory.length === 0) {
            this.callHistoryList.innerHTML = '<div class="empty-queue"><i class="fas fa-clock"></i><p>No recent calls</p></div>';
        } else {
            this.callHistoryList.innerHTML = this.callHistory.map(item => {
                const time = item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const duration = item.duration > 0 ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : '-';
                const statusIcon = item.status === 'completed' 
                    ? '<i class="fas fa-check-circle" style="color: var(--secondary-color);"></i>'
                    : '<i class="fas fa-times-circle" style="color: var(--danger-color);"></i>';
                return `<div class="queue-item"><div class="queue-info"><div class="queue-avatar">${item.name.charAt(0).toUpperCase()}</div><div class="queue-details"><h4>${item.name} ${statusIcon}</h4><p>${time} • ${duration}</p></div></div></div>`;
            }).join('');
        }
    }

    showNotification(message, type = 'info') {
        this.notificationText.textContent = message;
        this.notification.className = `notification ${type}`;
        const icon = this.notification.querySelector('i');
        icon.className = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
        setTimeout(() => this.notification.classList.add('hidden'), 4000);
    }

    // Chat functions
    sendChatMessage() {
        const message = this.chatInput.value.trim();
        if (message && this.dataConnection && this.dataConnection.open) {
            this.dataConnection.send({ type: 'chat-message', message: message });
            this.addChatMessage(message, 'sent');
            this.chatInput.value = '';
        }
    }

    addChatMessage(message, type) {
        const emptyState = this.chatMessages.querySelector('.chat-empty');
        if (emptyState) emptyState.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        messageDiv.innerHTML = `${message}<span class="message-time">${timeStr}</span>`;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    clearChat() {
        this.chatMessages.innerHTML = '<div class="chat-empty"><i class="fas fa-comment-dots"></i><p>Nachrichten erscheinen hier</p></div>';
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
            const fileData = { type: 'file', fileName: file.name, fileType: file.type, fileSize: file.size, data: e.target.result };
            if (this.dataConnection && this.dataConnection.open) {
                this.dataConnection.send(fileData);
                this.addFileMessage(fileData, 'sent');
            }
        };
        reader.readAsDataURL(file);
    }

    addFileMessage(fileData, type) {
        const emptyState = this.chatMessages.querySelector('.chat-empty');
        if (emptyState) emptyState.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-file ${type}`;
        const timeStr = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        const fileSize = this.formatFileSize(fileData.fileSize);

        if (fileData.fileType && fileData.fileType.startsWith('image/')) {
            messageDiv.innerHTML = `<div class="chat-file-preview"><img src="${fileData.data}" alt="${fileData.fileName}" onclick="window.open('${fileData.data}', '_blank')"></div><span class="message-time">${timeStr}</span>`;
        } else {
            const icon = this.getFileIcon(fileData.fileName);
            messageDiv.innerHTML = `<a href="${fileData.data}" download="${fileData.fileName}" class="chat-file-doc"><i class="fas ${icon}"></i><div class="chat-file-doc-info"><span class="chat-file-doc-name">${fileData.fileName}</span><span class="chat-file-doc-size">${fileSize}</span></div></a><span class="message-time">${timeStr}</span>`;
        }
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = { 'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'txt': 'fa-file-alt', 'zip': 'fa-file-archive', 'rar': 'fa-file-archive' };
        return icons[ext] || 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Pointer functions
    togglePointer() {
        this.isPointerActive = !this.isPointerActive;
        this.togglePointerBtn.classList.toggle('active', this.isPointerActive);
        if (this.isPointerActive) {
            this.showNotification('Zeiger aktiviert - Bewegen Sie die Maus über das Video', 'info');
        }
    }

    handlePointerMove(e) {
        if (!this.isPointerActive || !this.dataConnection || !this.dataConnection.open) return;
        const rect = this.videoContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        this.dataConnection.send({ type: 'pointer-move', x: x, y: y, name: 'Berater' });
    }

    handlePointerLeave() {
        if (!this.isPointerActive || !this.dataConnection || !this.dataConnection.open) return;
        this.dataConnection.send({ type: 'pointer-hide' });
    }

    // Product functions
    showAddProductModal() {
        this.addProductModal.classList.remove('hidden');
    }

    hideAddProductModal() {
        this.addProductModal.classList.add('hidden');
        this.addProductForm.reset();
    }

    handleAddProduct(e) {
        e.preventDefault();
        const product = {
            id: Date.now(),
            name: document.getElementById('productName').value,
            price: document.getElementById('productPrice').value,
            image: document.getElementById('productImage').value || 'https://via.placeholder.com/400x300?text=Produkt',
            description: document.getElementById('productDescription').value,
            features: document.getElementById('productFeatures').value.split(',').map(f => f.trim()).filter(f => f)
        };
        this.products.push(product);
        this.updateProductList();
        this.hideAddProductModal();
        this.showNotification('Produkt hinzugefügt', 'success');
    }

    updateProductList() {
        if (!this.productList) return;
        this.productList.innerHTML = this.products.map(product => `
            <div class="product-list-item" data-id="${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-list-item-image" onerror="this.src='https://via.placeholder.com/50x50?text=?'">
                <div class="product-list-item-info">
                    <div class="product-list-item-name">${product.name}</div>
                    <div class="product-list-item-price">${product.price}</div>
                </div>
                <button class="product-list-item-btn" onclick="dashboard.showProductToCustomer(${product.id})" title="Dem Kunden zeigen">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `).join('');
    }

    showProductToCustomer(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !this.dataConnection || !this.dataConnection.open) {
            this.showNotification('Keine aktive Verbindung zum Kunden', 'error');
            return;
        }
        this.dataConnection.send({ type: 'show-product', product: product });
        this.showNotification(`"${product.name}" wird dem Kunden angezeigt`, 'success');
    }

    showProductPanel() {
        if (this.productPanel) {
            this.productPanel.style.display = 'flex';
            this.updateProductList();
        }
    }

    hideProductPanel() {
        if (this.productPanel) {
            this.productPanel.style.display = 'none';
        }
    }
}

// Initialize dashboard
const dashboard = new ConsultantDashboard();
