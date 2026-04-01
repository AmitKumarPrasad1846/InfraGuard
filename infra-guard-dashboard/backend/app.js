const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ============== MIDDLEWARE ==============
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ============== MONGODB CONNECTION ==============
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/infraguard')
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// ============== SCHEMAS ==============
const sensorDataSchema = new mongoose.Schema({
    nodeId: { type: String, required: true },
    location: String,
    timestamp: { type: Date, default: Date.now },
    tilt_x: { type: Number, default: 0 },
    tilt_y: { type: Number, default: 0 },
    temperature: { type: Number, default: 25 },
    humidity: { type: Number, default: 60 },
    light: { type: Number, default: 0 },
    motion: { type: Boolean, default: false },
    distance: { type: Number, default: 100 },
    rain: { type: Number, default: 0 },
    risk_level: { type: Number, default: 0 },
    light_status: { type: Boolean, default: false },
    battery: { type: Number, default: 85 }
}, { timestamps: true });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

const alertSchema = new mongoose.Schema({
    nodeId: String,
    type: String,
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' },
    title: String,
    message: String,
    location: String,
    value: Number,
    threshold: Number,
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false }
}, { timestamps: true });

const Alert = mongoose.model('Alert', alertSchema);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const nodeSchema = new mongoose.Schema({
    nodeId: { type: String, unique: true, required: true },
    name: String,
    type: { type: String, enum: ['bridge', 'tunnel', 'dam', 'structure'], default: 'structure' },
    location: String,
    lat: Number,
    lng: Number,
    connected: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
    status: { type: String, enum: ['online', 'warning', 'critical'], default: 'online' }
}, { timestamps: true });

const Node = mongoose.model('Node', nodeSchema);

// ============== AUTH MIDDLEWARE ==============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'infraguard_secret_key_2024', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ============== CREATE DEFAULT ADMIN ==============
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                username: 'admin',
                password: hashedPassword,
                name: 'Administrator',
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Default admin created (admin/admin123)');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
};

// Create default nodes
const createDefaultNodes = async () => {
    try {
        const nodeCount = await Node.countDocuments();
        if (nodeCount === 0) {
            const defaultNodes = [
                {
                    nodeId: 'ESP32_001',
                    name: 'Bridge Monitor A1',
                    type: 'bridge',
                    location: 'Golden Bridge, Section 3',
                    lat: 40.7128,
                    lng: -74.0060,
                    connected: true,
                    status: 'online'
                },
                {
                    nodeId: 'ESP32_002',
                    name: 'Tunnel Monitor B2',
                    type: 'tunnel',
                    location: 'North Tunnel, Entry Point',
                    lat: 40.7580,
                    lng: -73.9855,
                    connected: true,
                    status: 'warning'
                },
                {
                    nodeId: 'ESP32_003',
                    name: 'Dam Monitor C3',
                    type: 'dam',
                    location: 'Main Dam, Control Room',
                    lat: 40.7489,
                    lng: -73.9680,
                    connected: true,
                    status: 'online'
                },
                {
                    nodeId: 'ESP32_004',
                    name: 'Power Substation D4',
                    type: 'structure',
                    location: 'Industrial Zone, Substation 7',
                    lat: 40.7306,
                    lng: -73.9352,
                    connected: true,
                    status: 'critical'
                },
                {
                    nodeId: 'ESP32_005',
                    name: 'Railway Monitor E5',
                    type: 'bridge',
                    location: 'Rail Crossing, Main Line',
                    lat: 40.6892,
                    lng: -74.0445,
                    connected: true,
                    status: 'online'
                }
            ];
            await Node.insertMany(defaultNodes);
            console.log('✅ Default nodes created');
        }
    } catch (error) {
        console.error('Error creating nodes:', error);
    }
};

createDefaultAdmin();
createDefaultNodes();

// ============== API ROUTES ==============

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Receive sensor data from ESP32
app.post('/api/data', async (req, res) => {
    try {
        const data = req.body;
        if (!data.timestamp) data.timestamp = new Date();

        const sensorData = new SensorData(data);
        await sensorData.save();

        // Update node last seen and status
        await Node.findOneAndUpdate(
            { nodeId: data.nodeId },
            { lastSeen: new Date(), connected: true },
            { upsert: true }
        );

        await checkThresholdsAndAlert(data);

        // Get latest node data for broadcast
        const node = await Node.findOne({ nodeId: data.nodeId });
        const latestData = await SensorData.findOne({ nodeId: data.nodeId }).sort({ timestamp: -1 });

        io.emit('sensor-data', { ...data, nodeInfo: node });
        io.emit('node_update', {
            nodeId: data.nodeId,
            data: latestData,
            connected: true,
            nodeInfo: node
        });

        res.status(200).json({ success: true, message: 'Data received' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get latest data for all nodes (for dashboard)
app.get('/api/latest/all', async (req, res) => {
    try {
        const latestData = await SensorData.aggregate([
            { $sort: { timestamp: -1 } },
            {
                $group: {
                    _id: "$nodeId",
                    latestData: { $first: "$$ROOT" }
                }
            }
        ]);

        const nodes = await Node.find();
        const result = latestData.map(item => ({
            ...item.latestData.toObject(),
            nodeInfo: nodes.find(n => n.nodeId === item._id)
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get latest data for a node
app.get('/api/latest/:nodeId', async (req, res) => {
    try {
        const data = await SensorData.findOne({ nodeId: req.params.nodeId })
            .sort({ timestamp: -1 });
        res.json(data || {});
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get historical data
app.get('/api/history/:nodeId', async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

        const data = await SensorData.find({
            nodeId: req.params.nodeId,
            timestamp: { $gte: cutoff }
        }).sort({ timestamp: 1 }).limit(500);

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all alerts
app.get('/api/alerts', async (req, res) => {
    try {
        const { severity, status, limit = 100 } = req.query;
        const query = {};

        if (severity && severity !== 'all') query.severity = severity;
        if (status && status !== 'all') {
            if (status === 'active') query.resolved = false;
            if (status === 'acknowledged') query.acknowledged = true;
            if (status === 'resolved') query.resolved = true;
        }

        const alerts = await Alert.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit));

        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Acknowledge alert
app.post('/api/alerts/:id/acknowledge', authenticateToken, async (req, res) => {
    try {
        await Alert.findByIdAndUpdate(req.params.id, { acknowledged: true });
        io.emit('alert_updated', { id: req.params.id, acknowledged: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Resolve alert
app.post('/api/alerts/:id/resolve', authenticateToken, async (req, res) => {
    try {
        await Alert.findByIdAndUpdate(req.params.id, { resolved: true, acknowledged: true });
        io.emit('alert_updated', { id: req.params.id, resolved: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete alert
app.delete('/api/alerts/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        await Alert.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Clear all alerts
app.delete('/api/alerts', authenticateToken, isAdmin, async (req, res) => {
    try {
        await Alert.deleteMany({});
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Send command to ESP32
app.post('/api/command', authenticateToken, async (req, res) => {
    try {
        const { nodeId, command, value } = req.body;
        io.emit(`command-${nodeId}`, { command, value, timestamp: new Date() });
        io.emit('command_response', { nodeId, command, value, status: 'sent' });
        res.json({ success: true, message: `Command sent to ${nodeId}` });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all nodes (for nodes.html)
app.get('/api/nodes', async (req, res) => {
    try {
        const nodes = await Node.find();
        const nodesWithData = await Promise.all(nodes.map(async (node) => {
            const latestData = await SensorData.findOne({ nodeId: node.nodeId })
                .sort({ timestamp: -1 });
            return {
                ...node.toObject(),
                sensors: latestData ? {
                    tilt: { value: latestData.tilt_x || 0, unit: '°', status: 'normal' },
                    temperature: { value: latestData.temperature || 25, unit: '°C', status: 'normal' },
                    humidity: { value: latestData.humidity || 60, unit: '%', status: 'normal' },
                    battery: { value: latestData.battery || 85, unit: '%', status: 'good' }
                } : null,
                lastUpdate: latestData ? latestData.timestamp : node.lastSeen
            };
        }));
        res.json({ nodes: nodesWithData });
    } catch (error) {
        console.error('Error fetching nodes:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single node details
app.get('/api/nodes/:nodeId', async (req, res) => {
    try {
        const node = await Node.findOne({ nodeId: req.params.nodeId });
        const history = await SensorData.find({ nodeId: req.params.nodeId })
            .sort({ timestamp: -1 })
            .limit(100);
        res.json({ node, history });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update node settings
app.put('/api/nodes/:nodeId', authenticateToken, isAdmin, async (req, res) => {
    try {
        const updatedNode = await Node.findOneAndUpdate(
            { nodeId: req.params.nodeId },
            req.body,
            { new: true }
        );
        res.json(updatedNode);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Test node connection
app.post('/api/nodes/test/:nodeId', authenticateToken, async (req, res) => {
    try {
        const node = await Node.findOne({ nodeId: req.params.nodeId });
        if (node) {
            io.emit(`ping-${node.nodeId}`, { timestamp: new Date() });
            res.json({ success: true, message: `${node.name} is ${node.connected ? 'online' : 'offline'}` });
        } else {
            res.json({ success: false, message: 'Node not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
    try {
        const totalNodes = await Node.countDocuments();
        const onlineNodes = await Node.countDocuments({ connected: true, status: 'online' });
        const warningNodes = await Node.countDocuments({ status: 'warning' });
        const criticalNodes = await Node.countDocuments({ status: 'critical' });
        const activeAlerts = await Alert.countDocuments({ resolved: false });

        res.json({
            totalNodes,
            onlineNodes,
            warningNodes,
            criticalNodes,
            activeAlerts
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// ============== AUTH ROUTES ==============

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, name, role } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            password: hashedPassword,
            name: name || username,
            role: role || 'viewer'
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, name: user.name, role: user.role },
            process.env.JWT_SECRET || 'infraguard_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, name: user.name, role: user.role },
            process.env.JWT_SECRET || 'infraguard_secret_key_2024',
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// ============== THRESHOLD CHECK FUNCTION ==============
async function checkThresholdsAndAlert(data) {
    const alerts = [];
    const nodeId = data.nodeId || 'ESP32_001';

    // Get node info
    const node = await Node.findOne({ nodeId });
    const nodeName = node ? node.name : nodeId;
    const nodeLocation = node ? node.location : 'Unknown';

    // Tilt threshold check
    const tilt = Math.abs(data.tilt_x || 0);
    if (tilt > 5.0) {
        alerts.push({
            nodeId,
            type: 'TILT',
            severity: 'CRITICAL',
            title: 'Critical Tilt Detected',
            message: `${nodeName} detected tilt angle of ${tilt.toFixed(1)}° exceeding safe threshold of 5.0°`,
            location: nodeLocation,
            value: tilt,
            threshold: 5.0
        });

        // Update node status
        await Node.findOneAndUpdate({ nodeId }, { status: 'critical' });
    } else if (tilt > 3.0) {
        alerts.push({
            nodeId,
            type: 'TILT',
            severity: 'WARNING',
            title: 'High Tilt Warning',
            message: `${nodeName} tilt angle ${tilt.toFixed(1)}° approaching threshold`,
            location: nodeLocation,
            value: tilt,
            threshold: 3.0
        });

        if (node && node.status !== 'critical') {
            await Node.findOneAndUpdate({ nodeId }, { status: 'warning' });
        }
    }

    // Rain threshold check
    const rain = data.rain || 0;
    if (rain > 3000) {
        alerts.push({
            nodeId,
            type: 'RAIN',
            severity: 'CRITICAL',
            title: 'Extreme Rainfall Alert',
            message: `Heavy rainfall of ${rain} mm detected at ${nodeLocation}`,
            location: nodeLocation,
            value: rain,
            threshold: 3000
        });
    } else if (rain > 2000) {
        alerts.push({
            nodeId,
            type: 'RAIN',
            severity: 'WARNING',
            title: 'Heavy Rainfall Warning',
            message: `Significant rainfall of ${rain} mm detected at ${nodeLocation}`,
            location: nodeLocation,
            value: rain,
            threshold: 2000
        });
    }

    // Temperature threshold check
    const temp = data.temperature || 25;
    if (temp > 45) {
        alerts.push({
            nodeId,
            type: 'TEMPERATURE',
            severity: 'CRITICAL',
            title: 'Critical Temperature Alert',
            message: `${nodeName} temperature at ${temp}°C exceeds critical threshold`,
            location: nodeLocation,
            value: temp,
            threshold: 45
        });
    } else if (temp > 40) {
        alerts.push({
            nodeId,
            type: 'TEMPERATURE',
            severity: 'WARNING',
            title: 'High Temperature Warning',
            message: `${nodeName} temperature at ${temp}°C above normal range`,
            location: nodeLocation,
            value: temp,
            threshold: 40
        });
    }

    // Water level check
    const distance = data.distance || 100;
    if (distance < 10 && distance > 0) {
        alerts.push({
            nodeId,
            type: 'WATER',
            severity: 'CRITICAL',
            title: 'Critical Water Level',
            message: `Water level critical at ${distance}cm from sensor at ${nodeLocation}`,
            location: nodeLocation,
            value: distance,
            threshold: 10
        });
    } else if (distance < 20 && distance > 0) {
        alerts.push({
            nodeId,
            type: 'WATER',
            severity: 'WARNING',
            title: 'Rising Water Level',
            message: `Water level rising: ${distance}cm from sensor at ${nodeLocation}`,
            location: nodeLocation,
            value: distance,
            threshold: 20
        });
    }

    // Save alerts to database and emit
    for (const alert of alerts) {
        const existingAlert = await Alert.findOne({
            nodeId: alert.nodeId,
            type: alert.type,
            resolved: false,
            severity: alert.severity
        }).sort({ timestamp: -1 });

        // Only create new alert if similar alert doesn't exist within last hour
        if (!existingAlert || (new Date() - existingAlert.timestamp) > 3600000) {
            const newAlert = new Alert(alert);
            await newAlert.save();
            io.emit('new-alert', newAlert);
        }
    }
}

// ============== WEBSOCKET ==============
io.on('connection', async (socket) => {
    console.log('🟢 Client connected:', socket.id);

    // Send initial data to new client
    const nodes = await Node.find();
    const latestData = await SensorData.aggregate([
        { $sort: { timestamp: -1 } },
        { $group: { _id: "$nodeId", latest: { $first: "$$ROOT" } } }
    ]);

    socket.emit('initial_data', { nodes, latestData });

    // Send nodes list for nodes.html
    const allNodes = await Node.find();
    const nodesWithData = await Promise.all(allNodes.map(async (node) => {
        const latest = await SensorData.findOne({ nodeId: node.nodeId }).sort({ timestamp: -1 });
        return {
            ...node.toObject(),
            sensors: latest ? {
                tilt: { value: latest.tilt_x || 0, unit: '°' },
                temperature: { value: latest.temperature || 25, unit: '°C' },
                humidity: { value: latest.humidity || 60, unit: '%' },
                battery: { value: latest.battery || 85, unit: '%' }
            } : null,
            lastUpdate: latest ? latest.timestamp : node.lastSeen
        };
    }));

    socket.emit('nodes_list', { nodes: nodesWithData.filter(n => n.connected) });

    socket.on('subscribe', (nodeId) => {
        socket.join(`node-${nodeId}`);
        console.log(`Client subscribed to node: ${nodeId}`);
    });

    socket.on('get_nodes', async () => {
        const updatedNodes = await Node.find();
        const updatedNodesWithData = await Promise.all(updatedNodes.map(async (node) => {
            const latest = await SensorData.findOne({ nodeId: node.nodeId }).sort({ timestamp: -1 });
            return {
                ...node.toObject(),
                sensors: latest ? {
                    tilt: { value: latest.tilt_x || 0, unit: '°' },
                    temperature: { value: latest.temperature || 25, unit: '°C' },
                    humidity: { value: latest.humidity || 60, unit: '%' },
                    battery: { value: latest.battery || 85, unit: '%' }
                } : null,
                lastUpdate: latest ? latest.timestamp : node.lastSeen
            };
        }));
        socket.emit('nodes_list', { nodes: updatedNodesWithData.filter(n => n.connected) });
    });

    socket.on('ping_node', async ({ nodeId }) => {
        const node = await Node.findOne({ nodeId });
        if (node) {
            socket.emit('node_pong', {
                nodeId,
                success: true,
                message: `${node.name} is ${node.connected ? 'online' : 'offline'}`,
                online: node.connected
            });
        } else {
            socket.emit('node_pong', { nodeId, success: false, message: 'Node not found' });
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Client disconnected:', socket.id);
    });
});

// ============== SIMULATE REAL-TIME DATA (for demo) ==============
setInterval(async () => {
    try {
        const nodes = await Node.find();
        for (const node of nodes) {
            const newData = {
                nodeId: node.nodeId,
                tilt_x: Number((Math.random() * 5).toFixed(1)),
                tilt_y: Number((Math.random() * 5).toFixed(1)),
                temperature: Number((22 + Math.random() * 15).toFixed(1)),
                humidity: Number((50 + Math.random() * 35).toFixed(0)),
                rain: Number((Math.random() * 3000).toFixed(0)),
                distance: Number((20 + Math.random() * 80).toFixed(0)),
                battery: Number((70 + Math.random() * 25).toFixed(0))
            };

            const sensorData = new SensorData(newData);
            await sensorData.save();
            await checkThresholdsAndAlert(newData);

            // Update node status based on tilt
            if (newData.tilt_x > 5) {
                await Node.findOneAndUpdate({ nodeId: node.nodeId }, { status: 'critical' });
            } else if (newData.tilt_x > 3) {
                await Node.findOneAndUpdate({ nodeId: node.nodeId }, { status: 'warning' });
            } else {
                await Node.findOneAndUpdate({ nodeId: node.nodeId }, { status: 'online' });
            }

            io.emit('sensor-data', { ...newData, nodeInfo: node });
        }
    } catch (error) {
        console.error('Simulation error:', error);
    }
}, 10000);

// Random node connection simulation
setInterval(async () => {
    try {
        const nodes = await Node.find();
        const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (randomNode) {
            const newStatus = !randomNode.connected;
            await Node.findOneAndUpdate(
                { nodeId: randomNode.nodeId },
                { connected: newStatus, lastSeen: new Date() }
            );

            io.emit('node_connection_change', {
                nodeId: randomNode.nodeId,
                connected: newStatus,
                nodeName: randomNode.name
            });

            if (newStatus) {
                io.emit('new_node', { node: { ...randomNode.toObject(), connected: true } });
            } else {
                io.emit('node_disconnected', { nodeId: randomNode.nodeId, nodeName: randomNode.name });
            }
        }
    } catch (error) {
        console.error('Connection simulation error:', error);
    }
}, 30000);

// ============== FRONTEND ROUTES ==============
const publicPath = path.join(__dirname, '../frontend/public');

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(publicPath, 'dashboard.html'));
});

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(publicPath, 'analytics.html'));
});

app.get('/alerts', (req, res) => {
    res.sendFile(path.join(publicPath, 'alerts.html'));
});

app.get('/map', (req, res) => {
    res.sendFile(path.join(publicPath, 'map.html'));
});

app.get('/nodes', (req, res) => {
    res.sendFile(path.join(publicPath, 'nodes.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(publicPath, 'settings.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(publicPath, 'profile.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(publicPath, 'login.html'));
});

// ============== 404 HANDLER ==============
app.use((req, res) => {
    res.status(404).sendFile(path.join(publicPath, '404.html'));
});

// ============== START SERVER ==============
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/health\n`);
});

// Helper to get local IP
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

console.log(`🌐 Network access: http://${getLocalIP()}:${PORT}`);