// server.js - Serveur Express principal
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const https = require('https');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase, closeDb } = require('./utils/db');

const cookieParser = require('cookie-parser');

const charactersRouter = require('./routes/characters');
const diceRouter = require('./routes/dice');
const sessionsRouter = require('./routes/sessions');
const journalRouter = require('./routes/journal');
const combatRouter = require('./routes/combat');
const authRouter = require('./routes/auth');
const compression = require('compression');
const fs = require("node:fs");


const app = express();
app.disable('x-powered-by');
app.use(compression());
let server;
if(process.env.NODE_ENV !== 'production') {
    server = http.createServer(app);
} else {
    const https_options = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };
    server = https.createServer(https_options, app);
}

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Initialiser la base de données
console.log('🎲 Initializing Pure Vikings server...');
initDatabase();

// Tracking personnages connectés
let onlineCharacters = new Map(); // characterId -> { characterId, name, playerName, socketId }

// Socket.IO handlers
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Event: GM définit la session active
    socket.on('gm-set-active-session', (sessionId) => {
        console.log(`[GM] Active session set to: ${sessionId}`);
        // Broadcast à TOUS les clients pour qu'ils rejoignent la bonne room
        io.emit('gm-session-active', sessionId);
    });

    // Event: Rejoindre une session (room)
    socket.on('join-session', (sessionId) => {
        if (sessionId) {
            socket.join(`session-${sessionId}`);
            console.log(`[Socket ${socket.id}] Joined session-${sessionId}`);
        }
    });

    // Event: Quitter une session (room)
    socket.on('leave-session', (sessionId) => {
        if (sessionId) {
            socket.leave(`session-${sessionId}`);
            console.log(`[Socket ${socket.id}] Left session-${sessionId}`);
        }
    });

    // Événement : Un joueur charge une fiche
    socket.on('character-loaded', (data) => {
        onlineCharacters.set(data.characterId, {
            characterId: data.characterId,
            name: data.name,
            playerName: data.playerName,
            socketId: socket.id,
            agilite: data.agilite,
            actionsMax: data.actionsMax
        });
        
        // Broadcast liste mise à jour aux MJs
        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
        console.log(`📝 Character loaded: ${data.name} (${data.characterId})`);
    });

    socket.on('character-left', (charId) => {
        if(charId) {
            onlineCharacters.delete(charId);
        }

        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
        console.log('🔌 Character left :', socket.id);
    });
    
    socket.on('disconnect', () => {
        // Retirer les persos de ce socket
        for (const [charId, char] of onlineCharacters.entries()) {
            if (char.socketId === socket.id) {
                onlineCharacters.delete(charId);
            }
        }
        
        // Broadcast liste mise à jour
        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// Route pour récupérer persos en ligne
app.get('/api/online-characters', (req, res) => {
    res.json(Array.from(onlineCharacters.values()));
});

// Rendre io accessible aux routes
app.set('io', io);

// Routes API
app.use('/api/auth', authRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/journal', journalRouter);
app.use('/api/dice', diceRouter);
app.use('/api/combat', combatRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if(process.env.NODE_ENV !== 'production') {
    app.use('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        return res.status(404).send('Use Vite dev server on port 5173');
    });
} else {
    // Static files - servir le frontend
    app.use(express.static(path.join(__dirname, '../client/dist/')));
//

    // Fallback pour SPA
    app.get('*', (req, res) => {
        if (req.path.includes('.')) {
            return res.status(404).send('File not found');
        }
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}


// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Démarrer le serveur
server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎲 PURE VIKINGS SERVER');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 Server: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: Enabled`);
    console.log(`📊 Database: database/pure-vikings.db`);
    console.log(`📁 Static: public/ & src/`);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
        console.log('👋 Server closed');
        closeDb();
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down...');
    server.close(() => {
        console.log('👋 Server closed');
        closeDb();
        process.exit(0);
    });
});

module.exports = app;
