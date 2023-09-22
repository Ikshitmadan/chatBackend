const mongoose = require('mongoose');

const NotificationSchema=new mongoose.Schema({
    text:{type:"string"},
    sender:{type:mongoose.Types.ObjectId,ref:'User'},
    recieptent:{type:mongoose.Types.ObjectId,ref:'User',required:true},
    isRead: { type: Boolean,default:false},
    isGroup:{type:Boolean,default:false},
    GroupId:{type:mongoose.Types.ObjectId,ref:'ChatGroup'},

    
},{timestamps:true})

module.exports=mongoose.model('Notification',NotificationSchema)