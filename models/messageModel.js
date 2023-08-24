const mongoose = require('mongoose');


const messageSchema=new mongoose.Schema({
    text:{type:"string"},

    sender:{type:mongoose.Types.ObjectId,ref:'User'},
    recieptent:{type:mongoose.Types.ObjectId,ref:'User'},
    file:{type:'string'}

},{timestamps:true})

module.exports=mongoose.model('Message',messageSchema)
