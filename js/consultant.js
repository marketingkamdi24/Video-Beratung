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
    }

    initPeer() {
        // Initialize PeerJS with a fixed consultant ID so customers can call without entering an ID
        const CONSULTANT_ID = 'consultant';
        this.peer = new Peer(CONSULTANT_ID);

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
            conn.on('data', (data) => {
                console.log('Received data:', data);
                if (data.type === 'caller-info') {
                    // Store caller info for the incoming call
                    this.updateCallerInfo(conn.peer, data);
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
        // Copy ID button
        this.copyIdBtn.addEventListener('click', () => this.copyPeerId());

        // Call controls
        this.toggleMicBtn.addEventListener('click', () => this.toggleMicrophone());
        this.toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        this.toggleScreenBtn.addEventListener('click', () => this.shareScreen());
        this.endCallBtn.addEventListener('click', () => this.endCall());

        // Modal buttons
        this.acceptCallBtn.addEventListener('click', () => this.acceptCall());
        this.rejectCallBtn.addEventListener('click', () => this.rejectCall());
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
        // Update the pending call with caller info
        const call = this.incomingCalls.find(c => c.call.peer === peerId);
        if (call) {
            call.name = info.name || 'Customer';
            call.type = info.callType || 'video';
            this.updateQueueDisplay();
        }

        // Update modal if showing
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

        // Show modal for first incoming call if not in a call
        if (!this.currentCall && this.incomingCalls.length === 1) {
            this.showIncomingCallModal(callInfo);
        }

        // Play notification sound (optional)
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
        // Simple beep notification using Web Audio API
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
            setTimeout(() => {
                oscillator.stop();
            }, 200);
        } catch (e) {
            console.log('Audio notification not available');
        }
    }

    async acceptCall() {
        if (!this.pendingCall) return;

        const callInfo = this.pendingCall;
        this.hideIncomingCallModal();

        try {
            // Get local media stream with fallback
            this.localStream = await this.getMediaStream(callInfo.type);
            
            // Answer the call with our stream
            callInfo.call.answer(this.localStream);

            // Show local video
            this.localVideo.srcObject = this.localStream;
            this.localVideo.style.display = 'block';

            // Handle remote stream
            callInfo.call.on('stream', (remoteStream) => {
                console.log('Received remote stream');
                this.remoteStream = remoteStream;
                this.remoteVideo.srcObject = remoteStream;
                this.remoteVideo.style.display = 'block';
                this.videoPlaceholder.style.display = 'none';
                this.callInfo.style.display = 'flex';
                this.callControls.style.display = 'flex';
                this.callerName.textContent = callInfo.name;

                // Start call timer
                this.startCallTimer();
                this.updateStatus('busy', 'In call');
            });

            callInfo.call.on('close', () => {
                this.handleCallEnded('Call ended by customer');
            });

            callInfo.call.on('error', (error) => {
                console.error('Call error:', error);
                this.handleCallEnded('Call error occurred');
            });

            this.currentCall = callInfo.call;

            // Remove from queue
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
        // First, check what devices are available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(d => d.kind === 'videoinput');
        const hasAudio = devices.some(d => d.kind === 'audioinput');

        console.log('Consultant devices - Video:', hasVideo, 'Audio:', hasAudio);

        // Build constraints based on available devices and call type
        let constraints = {};

        if (callType === 'video') {
            constraints.video = hasVideo ? true : false;
            constraints.audio = hasAudio ? true : false;
        } else {
            constraints.video = false;
            constraints.audio = hasAudio ? true : false;
        }

        // If no devices at all, create an empty stream
        if (!hasVideo && !hasAudio) {
            this.showNotification('No camera or microphone detected', 'info');
            return this.createEmptyStream();
        }

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            // If video fails, try audio only
            if (constraints.video && hasAudio) {
                console.log('Video failed, trying audio only...');
                this.showNotification('Camera not available, using audio only', 'info');
                return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            }
            throw error;
        }
    }

    createEmptyStream() {
        // Create a silent audio track and blank video track
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        oscillator.connect(ctx.createMediaStreamDestination());
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
                message = 'No camera or microphone found. Please connect a device.';
                break;
            case 'NotAllowedError':
                message = 'Camera/microphone access denied. Please allow access in browser settings.';
                break;
            case 'NotReadableError':
                message = 'Camera/microphone is being used by another application.';
                break;
            case 'OverconstrainedError':
                message = 'Camera/microphone settings not supported.';
                break;
            default:
                message = `Media error: ${error.message || error.name}`;
        }
        
        this.showNotification(message, 'error');
    }

    rejectCall() {
        if (this.pendingCall) {
            this.pendingCall.call.close();
            
            // Add to history as rejected
            this.addToHistory(this.pendingCall, 'rejected');
            
            // Remove from queue
            this.incomingCalls = this.incomingCalls.filter(c => c !== this.pendingCall);
            this.updateQueueDisplay();
            
            this.hideIncomingCallModal();
            this.updateStatus('online', 'Online - Ready for calls');

            // Show next incoming call if any
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

            // When screen sharing stops, revert to camera
            screenTrack.onended = async () => {
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
            };

            this.showNotification('Screen sharing started', 'info');
        } catch (error) {
            console.error('Screen sharing error:', error);
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
        // Stop call timer
        this.stopCallTimer();

        // Add to history
        if (this.currentCall) {
            this.addToHistory({
                name: this.callerName.textContent,
                type: 'video',
                timestamp: new Date(),
                duration: this.callDuration
            }, 'completed');
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        // Reset UI
        this.remoteVideo.style.display = 'none';
        this.localVideo.style.display = 'none';
        this.videoPlaceholder.style.display = 'flex';
        this.callInfo.style.display = 'none';
        this.callControls.style.display = 'none';

        this.currentCall = null;
        this.callDuration = 0;
        this.isMuted = false;
        this.isVideoOff = false;

        this.updateStatus('online', 'Online - Ready for calls');
        this.showNotification(reason, 'info');

        // Show next incoming call if any
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
        this.callTimerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateQueueDisplay() {
        this.queueCount.textContent = this.incomingCalls.length;

        if (this.incomingCalls.length === 0) {
            this.queueList.innerHTML = `
                <div class="empty-queue">
                    <i class="fas fa-inbox"></i>
                    <p>No incoming calls</p>
                </div>
            `;
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
                        <button class="queue-btn accept" onclick="dashboard.acceptQueueCall(${index})" title="Accept">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="queue-btn reject" onclick="dashboard.rejectQueueCall(${index})" title="Reject">
                            <i class="fas fa-phone-slash"></i>
                        </button>
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
        if (callInfo) {
            this.showIncomingCallModal(callInfo);
        }
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
        const historyItem = {
            name: callInfo.name,
            type: callInfo.type,
            timestamp: callInfo.timestamp,
            duration: callInfo.duration || 0,
            status: status
        };

        this.callHistory.unshift(historyItem);
        if (this.callHistory.length > 10) {
            this.callHistory.pop();
        }

        this.updateHistoryDisplay();
    }

    updateHistoryDisplay() {
        if (this.callHistory.length === 0) {
            this.callHistoryList.innerHTML = `
                <div class="empty-queue">
                    <i class="fas fa-clock"></i>
                    <p>No recent calls</p>
                </div>
            `;
        } else {
            this.callHistoryList.innerHTML = this.callHistory.map(item => {
                const time = item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const duration = item.duration > 0 
                    ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}`
                    : '-';
                const statusIcon = item.status === 'completed' 
                    ? '<i class="fas fa-check-circle" style="color: var(--secondary-color);"></i>'
                    : '<i class="fas fa-times-circle" style="color: var(--danger-color);"></i>';

                return `
                    <div class="queue-item">
                        <div class="queue-info">
                            <div class="queue-avatar">${item.name.charAt(0).toUpperCase()}</div>
                            <div class="queue-details">
                                <h4>${item.name} ${statusIcon}</h4>
                                <p>${time} • ${duration}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
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
}

// Initialize dashboard
const dashboard = new ConsultantDashboard();