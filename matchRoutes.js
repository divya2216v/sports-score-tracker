const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.post('/', matchController.createMatch);
router.get('/', matchController.getAllMatches);
router.get('/live', matchController.getLiveMatches);
router.get('/scheduled', matchController.getScheduledMatches);
router.put('/:id', matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);
router.post('/simulate', matchController.simulateMatch);

module.exports = router;
