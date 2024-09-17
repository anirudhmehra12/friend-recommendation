// routes/friendRoutes.js

const express = require('express');
const friendController = require('../controllers/friendController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Ensure authMiddleware.protect is a function
router.use(authMiddleware.protect);

router.post('/send-request', friendController.sendFriendRequest);
router.patch('/accept-request/:requestId', friendController.acceptFriendRequest);
router.patch('/reject-request/:requestId', friendController.rejectFriendRequest);
router.get('/recommendations', friendController.getFriendRecommendations);

module.exports = router;