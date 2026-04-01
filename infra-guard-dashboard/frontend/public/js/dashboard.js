// ============== DASHBOARD INITIALIZATION ==============

// Global variables
let socket;
let tiltChart, tempChart;
let refreshInterval = 2000; // 2 seconds
let currentData = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initCharts();
    connectWebSocket();
    loadUserData();
    loadInitialData();
    startRealTimeUpdates();
    initAOS();
});

// ============== SIDEBAR ==============

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const menuToggle = document.getElementById('menuToggle');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const icon = toggle.querySelector('i');
            if (sidebar.classList.contains('collapsed')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        });
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

// ============== CHARTS INITIALIZATION ==============

function initCharts() {
    // Tilt Chart
    const tiltCtx = document.getElementById('tiltChart').getContext('2d');
    tiltChart = new Chart(tiltCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Tilt Angle (°)',
                data: [],
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 3,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        callback: value => value + '°'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });

    // Temperature & Humidity Chart
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(tempCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                },
                {
                    label: 'Humidity (%)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: '#e2e8f0'
                    },
                    ticks: {
                        callback: value => value + '°C'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });
}

// ============== WEBSOCKET CONNECTION ==============

function connectWebSocket() {
    socket = io(window.location.origin);

    socket.on('connect', () => {
        console.log('WebSocket connected');
        updateESPStatus('online');
        showToast('Connected to server', 'success');
        socket.emit('subscribe', 'NODE_001');
    });

    socket.on('sensor-data', (data) => {
        console.log('Received sensor data:', data);
        updateDashboard(data);
    });

    socket.on('new-alert', (alert) => {
        handleNewAlert(alert);
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        updateESPStatus('offline');
        showToast('Disconnected from server', 'error');
    });

    socket.on('command-ack', (data) => {
        showToast(`Command sent: ${data.command}`, 'success');
    });
}

// ============== LOAD INITIAL DATA ==============

async function loadInitialData() {
    try {
        const response = await fetch('/api/latest/NODE_001');
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
            updateDashboard(data);
        }
    } catch (error) {
        console.error('Failed to load initial data:', error);
    }

    // Load historical data for charts
    loadHistoricalData('6h');
}

async function loadHistoricalData(range) {
    try {
        const hours = range === '1h' ? 1 : range === '6h' ? 6 : range === '24h' ? 24 : 168;
        const response = await fetch(`/api/history/NODE_001?hours=${hours}`);
        const data = await response.json();

        if (data && data.length > 0) {
            updateChartsWithHistory(data);
        }
    } catch (error) {
        console.error('Failed to load historical data:', error);
    }
}

// ============== UPDATE DASHBOARD ==============

function updateDashboard(data) {
    currentData = data;

    // Update stats
    updateStat('tilt', data.tilt_x || 0);
    updateStat('temp', data.temperature || 0);
    updateStat('humidity', data.humidity || 0);
    updateStat('light', data.light_status ? 'ON' : 'OFF');

    // Update sensors
    updateSensor('rain', data.rain || 0);
    updateSensor('distance', data.distance || 0);
    updateSensor('motion', data.motion || false);
    updateRiskLevel(data.risk_level || 0);

    // Update node info
    updateNodeInfo(data);

    // Update charts with new data point
    updateChartsWithNewData(data);
}

function updateStat(type, value) {
    switch (type) {
        case 'tilt':
            document.getElementById('tiltValue').textContent = value.toFixed(1) + '°';
            updateTrend('tilt', value);
            break;
        case 'temp':
            document.getElementById('tempValue').textContent = Math.round(value) + '°C';
            updateTrend('temp', value);
            break;
        case 'humidity':
            document.getElementById('humidityValue').textContent = Math.round(value) + '%';
            updateTrend('humidity', value);
            break;
        case 'light':
            document.getElementById('lightValue').textContent = value;
            document.getElementById('lightStatus').textContent = value === 'ON' ? 'Active' : 'Standby';
            break;
    }
}

function updateTrend(type, value) {
    const trendEl = document.getElementById(type + 'Trend');
    const icon = trendEl.querySelector('i');
    const text = trendEl.querySelector('span');

    // Compare with previous value (simplified)
    if (value > (currentData[type + '_prev'] || 0)) {
        icon.className = 'fas fa-arrow-up';
        text.textContent = 'Rising';
    } else if (value < (currentData[type + '_prev'] || 0)) {
        icon.className = 'fas fa-arrow-down';
        text.textContent = 'Falling';
    } else {
        icon.className = 'fas fa-minus';
        text.textContent = 'Stable';
    }

    currentData[type + '_prev'] = value;
}

function updateSensor(type, value) {
    switch (type) {
        case 'rain':
            const rainEl = document.getElementById('rainValue');
            const rainStatus = document.getElementById('rainStatus');
            const rainBar = document.getElementById('rainBar');

            rainEl.textContent = value;
            const rainPercent = (value / 4000) * 100;
            rainBar.style.width = Math.min(rainPercent, 100) + '%';

            if (value > 3000) {
                rainStatus.textContent = 'HEAVY RAIN';
                rainStatus.style.color = '#ef4444';
            } else if (value > 2000) {
                rainStatus.textContent = 'RAIN';
                rainStatus.style.color = '#f59e0b';
            } else if (value > 1000) {
                rainStatus.textContent = 'DRIZZLE';
                rainStatus.style.color = '#3b82f6';
            } else {
                rainStatus.textContent = 'DRY';
                rainStatus.style.color = '#22c55e';
            }
            break;

        case 'distance':
            const distEl = document.getElementById('distanceValue');
            const distStatus = document.getElementById('distanceStatus');
            const distBar = document.getElementById('distanceBar');

            distEl.textContent = value.toFixed(1) + ' cm';
            const distPercent = ((100 - value) / 100) * 100;
            distBar.style.width = Math.min(Math.max(distPercent, 0), 100) + '%';

            if (value < 10 && value > 0) {
                distStatus.textContent = 'CRITICAL';
                distStatus.style.color = '#ef4444';
            } else if (value < 20) {
                distStatus.textContent = 'WARNING';
                distStatus.style.color = '#f59e0b';
            } else {
                distStatus.textContent = 'NORMAL';
                distStatus.style.color = '#22c55e';
            }
            break;

        case 'motion':
            const motionEl = document.getElementById('motionValue');
            const motionStatus = document.getElementById('motionStatus');
            const motionWave = document.getElementById('motionWave');

            motionEl.textContent = value ? 'Motion Detected' : 'No Motion';
            motionStatus.textContent = value ? 'ACTIVE' : 'IDLE';

            if (value) {
                motionWave.classList.add('active');
            } else {
                motionWave.classList.remove('active');
            }
            break;
    }
}

function updateRiskLevel(level) {
    const riskValue = document.getElementById('riskValue');
    const riskSafe = document.getElementById('riskSafe');
    const riskWarning = document.getElementById('riskWarning');
    const riskCritical = document.getElementById('riskCritical');
    const riskIndicator = document.getElementById('riskIndicator');

    // Reset all
    riskSafe.classList.remove('active');
    riskWarning.classList.remove('active');
    riskCritical.classList.remove('active');

    if (level === 2) {
        riskValue.textContent = 'CRITICAL';
        riskValue.style.color = '#ef4444';
        riskCritical.classList.add('active');
        riskIndicator.style.background = 'linear-gradient(90deg, #ef4444, #ef4444)';
    } else if (level === 1) {
        riskValue.textContent = 'WARNING';
        riskValue.style.color = '#f59e0b';
        riskWarning.classList.add('active');
        riskIndicator.style.background = 'linear-gradient(90deg, #f59e0b, #f59e0b)';
    } else {
        riskValue.textContent = 'SAFE';
        riskValue.style.color = '#22c55e';
        riskSafe.classList.add('active');
        riskIndicator.style.background = 'linear-gradient(90deg, #22c55e, #22c55e)';
    }
}

function updateNodeInfo(data) {
    document.getElementById('nodeTilt').textContent = (data.tilt_x || 0).toFixed(1) + '°';
    document.getElementById('nodeTemp').textContent = Math.round(data.temperature || 0) + '°C';
    document.getElementById('nodeTime').textContent = formatTime(data.timestamp);
}

function updateChartsWithNewData(data) {
    const now = new Date().toLocaleTimeString();

    // Update tilt chart
    if (tiltChart.data.labels.length > 20) {
        tiltChart.data.labels.shift();
        tiltChart.data.datasets[0].data.shift();
    }
    tiltChart.data.labels.push(now);
    tiltChart.data.datasets[0].data.push(data.tilt_x || 0);
    tiltChart.update();

    // Update temp chart
    if (tempChart.data.labels.length > 20) {
        tempChart.data.labels.shift();
        tempChart.data.datasets[0].data.shift();
        tempChart.data.datasets[1].data.shift();
    }
    tempChart.data.labels.push(now);
    tempChart.data.datasets[0].data.push(data.temperature || 0);
    tempChart.data.datasets[1].data.push(data.humidity || 0);
    tempChart.update();
}

function updateChartsWithHistory(data) {
    const labels = [];
    const tiltData = [];
    const tempData = [];
    const humData = [];

    data.slice().reverse().forEach(item => {
        labels.push(formatTime(item.timestamp));
        tiltData.push(item.tilt_x || 0);
        tempData.push(item.temperature || 0);
        humData.push(item.humidity || 0);
    });

    tiltChart.data.labels = labels;
    tiltChart.data.datasets[0].data = tiltData;
    tiltChart.update();

    tempChart.data.labels = labels;
    tempChart.data.datasets[0].data = tempData;
    tempChart.data.datasets[1].data = humData;
    tempChart.update();
}

// ============== REAL-TIME UPDATES ==============

function startRealTimeUpdates() {
    setInterval(() => {
        // Ping server to keep connection alive
        if (socket && socket.connected) {
            socket.emit('ping');
        }
    }, 30000);
}

// ============== COMMAND FUNCTIONS ==============

function sendCommand(command, value) {
    if (!socket || !socket.connected) {
        showToast('Not connected to server', 'error');
        return;
    }

    const data = {
        nodeId: 'NODE_001',
        command: command,
        value: value,
        timestamp: new Date()
    };

    socket.emit('command', data);
    showToast(`Sending command: ${command} ${value}`, 'info');
}

function changeTiltRange(range) {
    // Update active button
    document.querySelectorAll('.chart-action').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Load data for selected range
    loadHistoricalData(range);
}

function setRefreshRate(rate) {
    refreshInterval = rate * 1000;
    showToast(`Refresh rate set to ${rate} seconds`, 'info');
}

async function exportData(format) {
    try {
        const response = await fetch('/api/history/NODE_001?hours=24');
        const data = await response.json();

        if (format === 'csv') {
            exportToCSV(data);
        } else {
            exportToJSON(data);
        }
    } catch (error) {
        showToast('Failed to export data', 'error');
    }
}

function exportToCSV(data) {
    let csv = 'Timestamp,Tilt X,Tilt Y,Temperature,Humidity,Light,Motion,Distance,Rain,Risk Level\n';

    data.forEach(item => {
        csv += `${item.timestamp},${item.tilt_x || 0},${item.tilt_y || 0},${item.temperature || 0},${item.humidity || 0},${item.light || 0},${item.motion || false},${item.distance || 0},${item.rain || 0},${item.risk_level || 0}\n`;
    });

    downloadFile(csv, 'infraguard-data.csv', 'text/csv');
}

function exportToJSON(data) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, 'infraguard-data.json', 'application/json');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function updateThreshold(type, value) {
    document.getElementById(type + 'ThreshVal').textContent =
        type === 'tilt' ? value + '°' :
            type === 'temp' ? value + '°C' : value;

    // Send threshold update to server
    if (socket && socket.connected) {
        socket.emit('threshold-update', { type, value });
    }
}

async function refreshNodes() {
    try {
        const response = await fetch('/api/nodes');
        const nodes = await response.json();
        // Update node list
        showToast('Nodes refreshed', 'success');
    } catch (error) {
        showToast('Failed to refresh nodes', 'error');
    }
}

// ============== ALERT HANDLING ==============

function handleNewAlert(alert) {
    // Update alert badges
    const badges = document.querySelectorAll('.alert-badge, #alertBadge, #headerAlertBadge');
    badges.forEach(badge => {
        const count = parseInt(badge.textContent) || 0;
        badge.textContent = count + 1;
    });

    // Show toast
    showToast(alert.message, alert.severity.toLowerCase());

    // Play sound for critical alerts
    if (alert.severity === 'CRITICAL') {
        playAlertSound();
    }
}

function playAlertSound() {
    const audio = new Audio('/assets/sounds/alert.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// ============== UTILITY FUNCTIONS ==============

function formatTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function updateESPStatus(status) {
    const espStatus = document.getElementById('espStatus');
    const controlStatus = document.getElementById('controlStatus');
    const controlStatusText = document.getElementById('controlStatusText');

    if (status === 'online') {
        espStatus.textContent = 'Online';
        espStatus.className = 'status-value online';
        controlStatus.className = 'status-dot online';
        controlStatusText.textContent = 'Connected';
    } else {
        espStatus.textContent = 'Offline';
        espStatus.className = 'status-value offline';
        controlStatus.className = 'status-dot offline';
        controlStatusText.textContent = 'Disconnected';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <div class="toast-title">${type.toUpperCase()}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function loadUserData() {
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    if (user.username) {
        document.getElementById('sidebarUserName').textContent = user.username;
        document.getElementById('headerUserName').textContent = user.username;
        document.getElementById('sidebarUserRole').textContent =
            user.role === 'admin' ? 'Administrator' : 'Viewer';
        document.getElementById('headerUserRole').textContent =
            user.role === 'admin' ? 'Admin' : 'Viewer';
    }
}

function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true
        });
    }
}

// ============== GLOBAL FUNCTIONS ==============
window.changeTiltRange = changeTiltRange;
window.sendCommand = sendCommand;
window.setRefreshRate = setRefreshRate;
window.exportData = exportData;
window.updateThreshold = updateThreshold;
window.refreshNodes = refreshNodes;
window.logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    window.location.href = '/login';
};