const {checkAccessToken} = require('../utils/jwt');


function authenticate(req, res, next) {
    const headers = req.headers.authorization;

    if(!headers || !headers.startsWith('Bearer ')) {
        return res.status(401).json({error: 'No token provided'});
    }

    const token = headers.split(' ')[1];
    const decoded = checkAccessToken(token);
    if (!decoded) {
        return res.status(401).json({error: 'Invalid or expired token'});
    }

    req.user = {
        characterId: decoded.characterId,
        isGM: decoded.isGM || false
    };

    next();
}

function requireGM(req, res, next) {
    if(!req.user || !req.user.isGM) {
        return res.status(403).json({error: 'Unauthorized'});
    }
    next();
}

function requireOwnerOrGM(req, res, next) {
    const requestedCharacterId = parseInt(req.params.id || req.params.characterId);
    const characterId = req.user.characterId;
    const isGM = req.user.isGM;

    if(!isGM && requestedCharacterId !== characterId) {
        return res.status(403).json({error: 'Access denied'});
    }
    next();
}

module.exports = {authenticate, requireGM, requireOwnerOrGM};