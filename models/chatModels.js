const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
 
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to a User schema (assuming you have one)
    },
  ],

  owner:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  messages: [
    {
      text: {
        type: String,
        required: true,
      },
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to a User schema
        required: true,
      },
      name:{
        type:String,

      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);

module.exports = ChatGroup;
