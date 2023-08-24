const express=require('express');
const mongoose=require('mongoose');
const jwt = require('jsonwebtoken');
const app=express();
const cors=require('cors');
const User=require('./models/userModel');
const cookie_parser=require('cookie-parser');
const Message=require('./models/messageModel');
const ws=require('ws');

const fs=require('fs');

app.use(express.json())

app.use(cookie_parser());



const dotenv = require('dotenv');
dotenv.config()


const baseUrl=process.env.BASE_URL;

app.use(cors({

  origin:["https://chat-app-zeta-lovat.vercel.app"],
  credentials:true,
  methods:["GET", "POST"]
}));

app.use('/uploads', express.static('uploads'));

const url=process.env.MONGO_URL;
console.log(url);

mongoose.connect(url).then(()=>{
    console.log(`connected`);
}).catch(err=>{console.log(err);})

const port = process.env.PORT||5000;

const server=app.listen(port);



app.get('/', (req,res) => {
    res.json('test ok');
  });



  const validate=(req,res,next)=>{

    const token = req.cookies?.token;
            // console.log(`token: ${token}`);
            if (token) {
              jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
                if (err) throw err;


                req.userId=userData.userId;
                next();
                
              });
            } else {


              res.status(401).json(`you are not authenticated`);
            }


  }


  app.get('/message/:userId',validate,async(req,res)=>{

    try {

      const {userId}=req.params;

      const myid=req.userId;
  //  console.log(userId+" "+myid);
  
   const MessageDoc=await Message.find({
  
        $or: [
       { sender:userId,
        recieptent:myid},{
          recieptent:userId,
          sender:myid
  
        }
  
        ]
      }).sort({createdAt:1});


      // console.log(MessageDoc);
  

      res.send(MessageDoc);
  
      
    } catch (error) {

      res.status(401).send('some error occured while sending');
      
    }

  })

app.post('/register',async(req,res)=>{

    try {
        console.log(`registering`);

        const {username,password,img}=req.body;


        console.log(username,password,img);

        const createUser=await User.create(req.body);

        console.log(createUser);

    

        jwt.sign({userId:createUser._id,username},process.env.JWT_SECRET,{},(err,token)=>{
            if(err){
               throw err;
            }

            console.log(token,"jwt token");

            res.cookie('token', token, {sameSite:'none', secure:true,credentials: 'include'}).json({
                id: createUser._id,
              });
        }
        )
    }
        
     catch (error) {

        res.status(401).json(error);
        
        
    }


});


app.get('/people',validate,async(req,res)=>{

  try {

    const people=await User.find();

    res.status(200).json(people);
    
  } catch (error) {

    res.status(401).send(error.message);


    
  }


})

app.post('/login', async (req,res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if (foundUser) {
      if (foundUser.password === password) {
        jwt.sign({userId:foundUser._id,username,}, process.env.JWT_SECRET, {}, (err, token) => {
          res.cookie('token', token, {sameSite:'none', secure:true,credentials: 'include'}).json({
            id: foundUser._id,
          });
        });
      
    }
    else{
        return res.status(401).json('wrong password');
    }
  }
  else{

    return res.status(401).json('no user found');
  }
  
});
  
  app.post('/logout', (req,res) => {

    res.clearCookie('token',{sameSite:'none', secure:true}).json('loggout successfully');
    // res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
  });


 app.get('/profile',async (req,res) => {

    try {

        const token = req.cookies?.token;
        // console.log(`inside profile`);
            console.log(`token: ${token}`);
            if (token) {
              jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
                if (err) throw err;
                res.json(userData);
              });
            } else {
              res.status(401).json(`token: ${token}`);
            }
        
    } catch (error) {
        
    }

  });


 const wss= new ws.WebSocketServer({server});



 wss.on('connection',(connection,req)=>{


  connection.on('close',()=>{

    console.log(`disconnected user is ${connection.username}.`);
    const y=[...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
      }))});

  })
  


  // console.log("hi");

  const cookies =req.headers.cookie;


  if(cookies){


  // console.log(cookies);

  const tokenCookie=cookies.split("; ").find(str=>str.startsWith('token='));


  // console.log(tokenCookie);
if(tokenCookie){

const token=tokenCookie.split('=')[1];


if(token){


  jwt.verify(token,process.env.JWT_SECRET,{},(err,userData)=>{

    if(err){
      throw err;
    }


    const {userId,username}=userData;

    connection.username=username;
    connection.userId=userId;



    console.log(`connected user is ${connection.username}`);
    // console.log(userId,username);
      

 

    connection.on('message',async (msg)=>{

    

      const mes=JSON.parse(msg).message;

      // console.log(mes)

      const {reciepient,text,file}=mes;

      let filename = null;
    if (file) {
      console.log('size', file.data.length);
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = Date.now() + '.'+ext;
      const path = __dirname + '/uploads/' + filename;
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
      fs.writeFile(path, bufferData, () => {
        console.log('file saved:'+path);
      });
    }

      // console.log( typeof reciepient);

      // console.log( typeof userId);

      // console.log(userId+" "+reciepient);

    const MessageDoc=await Message.create({
          sender:userId,
          text:text,
          recieptent:reciepient,
          file: file ? filename : null,
         });

      [...wss.clients].filter((client)=>client.userId===reciepient).forEach(client=>client.send(JSON.stringify({
        text:text,
        sender:userId,
        reciepient:reciepient,
        id:MessageDoc._id
      })))

    })


  })



  const y=[...wss.clients].forEach(client => {
    client.send(JSON.stringify({
      online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
    }))});



}

}
}


// console.log(token,"sssss");



 
 })


 wss.on("close", function(data) {
  console.log("closed + " + data);

  
  const y=[...wss.clients].forEach(client => {
    client.send(JSON.stringify({
      online: [...wss.clients].map(c => ({userId:c.userId,username:c.username})),
    }))});

});