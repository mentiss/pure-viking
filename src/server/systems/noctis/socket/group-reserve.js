module.exports = {
    register(io, socket) {

        socket.on('noctis:group-reserve-patch', ({ delta, current, cap } = {}) => {
            const db = socket.db;
            if (!db) return;

            const reserve = db.prepare('SELECT * FROM group_reserve WHERE id = 1').get()
                ?? { current: 0, cap: 12 };

            let newCurrent = reserve.current;
            let newCap     = reserve.cap;

            if (typeof delta   === 'number') newCurrent = Math.max(0, Math.min(newCap, reserve.current + delta));
            if (typeof current === 'number') newCurrent = Math.max(0, Math.min(newCap, current));

            if (typeof cap === 'number') {
                if (!socket.user?.isGM) {
                    socket.emit('noctis:error', { message: 'Cap réservé au GM.' });
                    return;
                }
                newCap     = Math.max(0, cap);
                newCurrent = Math.min(newCurrent, newCap);
            }

            db.prepare(`
                UPDATE group_reserve SET current = ?, cap = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1
            `).run(newCurrent, newCap);

            io.emit('noctis:group-reserve-update', {
                current:   newCurrent,
                cap:       newCap,
                updatedBy: socket.user?.id ?? null,
            });
        });

        socket.on('noctis:group-reserve-get', () => {
            const db = socket.db;
            if (!db) return;
            const reserve = db.prepare('SELECT * FROM group_reserve WHERE id = 1').get()
                ?? { current: 0, cap: 12 };
            socket.emit('noctis:group-reserve-update', { current: reserve.current, cap: reserve.cap, updatedBy: null });
        });
    },
};