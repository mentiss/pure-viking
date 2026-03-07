// src/server/server.js
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const bodyParser  = require('body-parser');
const path        = require('path');
const https       = require('https');
const http        = require('http');
const fs          = require('node:fs');
const { Server }  = require('socket.io');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { loadAllSystems, getAllSystems, getSystemRoute, getSharedRoute, getSystemExtraRoutes, getSystemSocketHandlers } = require('./systems/loader');
const systemResolver       = require('./middlewares/systemResolver');
const { closeAllDatabases } = require('./db/index');
const authRouter           = require('./routes/auth');
const {getDbForSystem} = require("./db");

// ─── App & Server ────────────────────────────────────────────────────────────

const app = express();
app.disable('x-powered-by');
app.use(compression());

let server;
if (process.env.NODE_ENV !== 'production') {
    server = http.createServer(app);
} else {
    server = https.createServer({
        key:  fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    }, app);
}

const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
const PORT = process.env.PORT || 3001;

// ─── Middlewares globaux ─────────────────────────────────────────────────────

app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ─── Chargement des systèmes ─────────────────────────────────────────────────

console.log('🎲 Loading game systems...');
loadAllSystems();

// ─── Socket.io ───────────────────────────────────────────────────────────────

let onlineCharacters = new Map();
let activeSessionId  = null;

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('gm-set-active-session', ({ sessionId, system = 'vikings' } = {}) => {
        activeSessionId = sessionId;
        if (activeSessionId) io.emit('gm-session-active', activeSessionId);

    });

    socket.on('join-session', ({ sessionId, system = 'vikings' } = {}) => {
        const room = `${system}_session_${sessionId}`;
        socket.join(room);
        console.log(`[Socket ${socket.id}] Joined room: ${room}`);
    });

    socket.on('leave-session', ({ sessionId, system = 'vikings' } = {}) => {
        socket.leave(`${system}_session_${sessionId}`);
    });

    socket.on('character-loaded', (data) => {
        if (data?.characterId) {
            onlineCharacters.set(data.characterId, { ...data, socketId: socket.id });
        }
        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
        if (activeSessionId) io.emit('gm-session-active', activeSessionId);
    });

    socket.on('character-left', (charId) => {
        if (charId) onlineCharacters.delete(charId);
        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
    });

    socket.on('disconnect', () => {
        for (const [charId, char] of onlineCharacters.entries()) {
            if (char.socketId === socket.id) onlineCharacters.delete(charId);
        }
        io.emit('online-characters-update', Array.from(onlineCharacters.values()));
        console.log('🔌 Client disconnected:', socket.id);
    });

    // ── Handlers slug-spécifiques (auto-découverte) ──────────────────────────
    // Pour chaque système chargé, on enregistre les handlers définis dans socket/*.js.
    // La db est ouverte en lazy — pas d'impact sur les connexions sans activité.
    for (const [slug, config] of getAllSystems()) {
        const handlers = getSystemSocketHandlers(slug);
        if (handlers.length === 0) continue;

        for (const register of handlers) {
            register(io, socket);
        }
    }
});

app.get('/api/online-characters', (req, res) => {
    res.json(Array.from(onlineCharacters.values()));
});

app.set('io', io);

// ─── Routes dynamiques par système ───────────────────────────────────────────
// Convention : systems/ = spécifique, routes/ = générique.
// auth est générique dans son mécanisme mais lit la BDD du système
// → montée par système comme toutes les autres routes.

for (const [slug] of getAllSystems()) {
    const prefix = `/api/${slug}`;
    const resolver = (req, res, next) => {
        req.params.system = slug;
        systemResolver(req, res, next);
    };

    // ── Routes partagées (toujours montées) ──────────────────────────────────
    app.use(`${prefix}/auth`,       resolver, authRouter);
    app.use(`${prefix}/characters`, resolver, getSystemRoute(slug, 'characters'));
    app.use(`${prefix}/combat`,     resolver, getSharedRoute('combat'));
    app.use(`${prefix}/npc`,        resolver, getSharedRoute('npc'));
    app.use(`${prefix}/sessions`,   resolver, getSharedRoute('sessions'));
    app.use(`${prefix}/journal`,    resolver, getSharedRoute('journal'));
    app.use(`${prefix}/dice`,       resolver, getSharedRoute('dice'));

    // ── Routes extra slug-spécifiques (auto-scan de systems/:slug/routes/) ───
    // Tout fichier .js autre que characters.js / combat.js est monté ici.
    // Ex : dune/routes/session-resources.js → /api/dune/session-resources
    const extraRoutes = getSystemExtraRoutes(slug);
    for (const { name, router } of extraRoutes) {
        app.use(`${prefix}/${name}`, resolver, router);
    }

    const extraNames = extraRoutes.length
        ? `,${extraRoutes.map(r => r.name).join(',')}`
        : '';
    console.log(`🗺️  Routes mounted for [${slug}]: ${prefix}/{auth,characters,combat,sessions,journal,dice${extraNames}}`);
}

app.get('/api/systems', (req, res) => {
    const systems = [...getAllSystems().values()].map(({ slug, label }) => ({ slug, label }));
    res.json(systems);
});

// ─── Health ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', systems: [...getAllSystems().keys()], timestamp: new Date().toISOString() });
});

// ─── Static / SPA ────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
    app.use('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
        res.status(404).send('Use Vite dev server on port 5173');
    });
} else {
    app.use(express.static(path.join(__dirname, '../client/dist/')));
    app.get('*', (req, res) => {
        if (req.path.includes('.'))      return res.status(404).send('File not found');
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API endpoint not found' });
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
}

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// ─── Démarrage ────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎲 VTT MULTI-JDR SERVER');
    console.log('═══════════════════════════════════════');
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: Enabled`);
    console.log('═══════════════════════════════════════');
});

const shutdown = () => {
    console.log('\n🛑 Shutting down...');
    server.close(() => {
        closeAllDatabases();
        process.exit(0);
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;