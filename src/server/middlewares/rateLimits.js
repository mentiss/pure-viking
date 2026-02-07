const {getDb} = require('../utils/db');
const {authenticate} = require('./auth');

function loginRateLimiter(req, res, next) {
    const { code, characterUrl } = req.body;
    if(!code && !characterUrl) {
        return res.status(400).json({error: 'Missing required parameters'});
    }

    const db = getDb();
    const char = db.prepare(`SELECT * FROM characters WHERE access_url = ?`).get(characterUrl);

    if(!char) {
        return res.status(404).json({error: 'Character not found'});
    }

    const attempts = char.login_attempts || 0;
    const lastAttempt = char.last_attempt_at ? new Date(char.last_attempt_at) : null;

    if (lastAttempt) {
        const fifteenMinutes = new Date(Date.now() - 15 * 60 * 1000).toISOString();

        if (lastAttempt > fifteenMinutes && attempts >= 5) {
            return res.status(429).json({
                error: 'Too many login attempts. Please try again in 15 minutes.'
            });
        }

        // Reset si plus de 15 min
        if (lastAttempt <= fifteenMinutes) {
            db.prepare('UPDATE characters SET login_attempts = 0 WHERE id = ?').run(char.id);
            char.login_attempts = 0;
        }
    }

    req.targetCharacter = char;
    next();
}

module.exports = {loginRateLimiter};