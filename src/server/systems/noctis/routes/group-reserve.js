const express = require('express');
const router  = express.Router();
const { authenticate, requireGM } = require('../../../middlewares/auth');

// ─── GET /api/noctis/group-reserve ───────────────────────────────────────────
router.get('/', authenticate, (req, res) => {
    const reserve = req.db.prepare('SELECT * FROM group_reserve WHERE id = 1').get()
        ?? { id: 1, current: 0, cap: 12 };
    return res.json(reserve);
});

// ─── PATCH /api/noctis/group-reserve ─────────────────────────────────────────
router.patch('/', authenticate, (req, res) => {
    const { delta, current, cap } = req.body;

    const reserve = req.db.prepare('SELECT * FROM group_reserve WHERE id = 1').get()
        ?? { current: 0, cap: 12 };

    let newCurrent = reserve.current;
    let newCap     = reserve.cap;

    if (typeof delta   === 'number') newCurrent = Math.max(0, Math.min(newCap, reserve.current + delta));
    if (typeof current === 'number') newCurrent = Math.max(0, Math.min(newCap, current));

    if (typeof cap === 'number') {
        if (!req.user?.isGM) {
            return res.status(403).json({ error: 'Modification du cap réservée au GM.' });
        }
        newCap     = Math.max(0, cap);
        newCurrent = Math.min(newCurrent, newCap);
    }

    req.db.prepare(`
        UPDATE group_reserve SET current = ?, cap = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
    `).run(newCurrent, newCap);

    const payload = { current: newCurrent, cap: newCap, updatedBy: req.user?.id ?? null };

    const io = req.app.get('io');
    if (io) io.emit('noctis:group-reserve-update', payload);

    return res.json(payload);
});

module.exports = router;