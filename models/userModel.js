const mongoose = require('mongoose');

const UserSchema=new mongoose.Schema({

    username:{required:true,type:"string",unique:true},
    password:{required:true,type:"string"},
    img:{default:"https://static.vecteezy.com/system/resources/previews/005/544/718/original/profile-icon-design-free-vector.jpg",type:"string"},


},{timestamp:true});



module.exports= mongoose.model('User', UserSchema);
