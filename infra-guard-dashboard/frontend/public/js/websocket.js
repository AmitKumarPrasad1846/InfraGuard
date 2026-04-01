// WebSocket connection
let socket;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function connectWebSocket() {
    socket = io(window.location.origin);

    socket.on('connect', () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        showToast('Connected to server', 'success');
    });

    socket.on('sensor-data', (data) => {
        console.log('Received sensor data:', data);
        updateDashboard(data);
    });

    socket.on('new-alert', (alert) => {
        console.log('New alert:', alert);
        addAlert(alert);
        showToast(alert.message, alert.severity.toLowerCase());
        updateAlertBadge();
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        reconnectAttempts++;
        if (reconnectAttempts <= maxReconnectAttempts) {
            setTimeout(connectWebSocket, 3000);
        }
    });
}

// Initialize connection
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html')) {
        connectWebSocket();
    }
});

// Send command to ESP32
function sendCommand(command, value) {
    if (!socket) return;

    const nodeId = document.getElementById('nodeName')?.textContent || 'NODE_001';
    socket.emit('command', { nodeId, command, value });
    showToast(`Command sent: ${command} ${value}`, 'info');
}

// Update dashboard with new data
function updateDashboard(data) {
    // Update stats
    if (document.getElementById('tiltX')) {
        document.getElementById('tiltX').textContent = data.tilt_x?.toFixed(1) + '°';
        document.getElementById('temperature').textContent = data.temperature?.toFixed(1) + '°C';
        document.getElementById('humidity').textContent = data.humidity?.toFixed(1) + '%';
        document.getElementById('light').textContent = data.light || 0;

        // Update status colors
        updateTiltStatus(data.tilt_x);
        updateTempStatus(data.temperature);
        updateLightStatus(data.light_status);

        // Update sensors
        document.getElementById('rainValue').textContent = data.rain || 0;
        document.getElementById('rainBar').style.width = ((data.rain || 0) / 40.95) + '%';
        document.getElementById('rainStatus').textContent = (data.rain || 0) > 2000 ? 'WET' : 'DRY';

        document.getElementById('distance').textContent = (data.distance || 0).toFixed(1) + ' cm';
        document.getElementById('distanceBar').style.width = Math.min((data.distance || 0) / 4, 100) + '%';

        document.getElementById('motion').textContent = data.motion ? 'YES' : 'NO';
        document.getElementById('motionStatus').textContent = data.motion ? 'Active' : 'Idle';
        const motionIndicator = document.getElementById('motionIndicator');
        if (motionIndicator) {
            motionIndicator.style.background = data.motion ? '#22c55e' : '#e2e8f0';
        }

        // Update risk level
        updateRiskLevel(data.risk_level || 0);
    }
}

function updateTiltStatus(tilt) {
    const status = document.getElementById('tiltStatus');
    if (!status) return;

    const absTilt = Math.abs(tilt || 0);
    if (absTilt > 5) {
        status.textContent = 'CRITICAL';
        status.className = 'stat-status critical';
    } else if (absTilt > 3) {
        status.textContent = 'WARNING';
        status.className = 'stat-status warning';
    } else {
        status.textContent = 'Safe';
        status.className = 'stat-status safe';
    }
}

function updateTempStatus(temp) {
    const status = document.getElementById('tempStatus');
    if (!status) return;

    if (temp > 45) {
        status.textContent = 'CRITICAL';
        status.className = 'stat-status critical';
    } else if (temp > 40) {
        status.textContent = 'WARNING';
        status.className = 'stat-status warning';
    } else {
        status.textContent = 'Normal';
        status.className = 'stat-status normal';
    }
}

function updateLightStatus(status) {
    const lightStatus = document.getElementById('lightStatus');
    if (!lightStatus) return;

    lightStatus.textContent = status ? 'ON' : 'OFF';
    lightStatus.className = 'stat-status ' + (status ? 'normal' : '');
}

function updateRiskLevel(risk) {
    const riskEl = document.getElementById('riskLevel');
    if (!riskEl) return;

    const riskG = document.getElementById('riskG');
    const riskY = document.getElementById('riskY');
    const riskR = document.getElementById('riskR');

    if (risk === 2) {
        riskEl.textContent = 'CRITICAL';
        riskEl.style.color = '#ef4444';
        if (riskG) riskG.classList.remove('active');
        if (riskY) riskY.classList.remove('active');
        if (riskR) riskR.classList.add('active');
    } else if (risk === 1) {
        riskEl.textContent = 'WARNING';
        riskEl.style.color = '#f59e0b';
        if (riskG) riskG.classList.remove('active');
        if (riskY) riskY.classList.add('active');
        if (riskR) riskR.classList.remove('active');
    } else {
        riskEl.textContent = 'SAFE';
        riskEl.style.color = '#22c55e';
        if (riskG) riskG.classList.add('active');
        if (riskY) riskY.classList.remove('active');
        if (riskR) riskR.classList.remove('active');
    }
}