const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

exports.sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = req.user.id;

    if (senderId === recipientId) {
      return res.status(400).json({ message: "You can't send a friend request to yourself" });
    }

    const existingRequest = await FriendRequest.findOne({
      sender: senderId,
      recipient: recipientId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    const newRequest = await FriendRequest.create({
      sender: senderId,
      recipient: recipientId
    });

    res.status(201).json({
      status: 'success',
      data: newRequest
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);

    if (!request || request.recipient.toString() !== userId) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: "Friend request already processed" });
    }

    request.status = 'accepted';
    await request.save();

    await User.findByIdAndUpdate(request.sender, { $addToSet: { friends: request.recipient } });
    await User.findByIdAndUpdate(request.recipient, { $addToSet: { friends: request.sender } });

    res.status(200).json({
      status: 'success',
      message: 'Friend request accepted'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    const request = await FriendRequest.findById(requestId);

    if (!request || request.recipient.toString() !== userId) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: "Friend request already processed" });
    }

    request.status = 'rejected';
    await request.save();

    res.status(200).json({
      status: 'success',
      message: 'Friend request rejected'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

exports.getFriendRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate('friends');
    
    const friendIds = user.friends.map(friend => friend._id);
    
    const recommendedFriends = await User.aggregate([
      { $match: { _id: { $nin: [...friendIds, userId] } } },
      { $lookup: {
          from: 'users',
          localField: 'friends',
          foreignField: '_id',
          as: 'mutualFriends'
        }
      },
      { $project: {
          username: 1,
          email: 1,
          mutualFriendsCount: {
            $size: {
              $filter: {
                input: '$mutualFriends',
                as: 'friend',
                cond: { $in: ['$$friend._id', friendIds] }
              }
            }
          }
        }
      },
      { $sort: { mutualFriendsCount: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      status: 'success',
      data: recommendedFriends
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};