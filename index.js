const express=require('express');
const mongoose=require('mongoose');
const jwt = require('jsonwebtoken');
const app=express();
const cors=require('cors');
const User=require('./models/userModel');
const cookie_parser=require('cookie-parser');
const Message=require('./models/messageModel');
const ws=require('ws');
const path = require('path');
const ChatGroup = require('./models/chatModels');

const fs=require('fs');

app.use(express.json())

app.use(cookie_parser());



const dotenv = require('dotenv');
dotenv.config()


const baseUrl=process.env.BASE_URL;

console.log(baseUrl);

app.use(cors({
  origin:["https://chat-appfrontend-ji9b5agwh-ikshitmadan.vercel.app","https://chat-appfrontend-1fsz-jltjpepid-ikshitmadan.vercel.app","https://chat-appfrontend.vercel.app","http://localhost:5173","https://chat-appfrontend-1fsz.vercel.app"],
  credentials:true,
  methods:["GET", "POST","DELETE","PUT","PATCH"]
}));

app.use('/uploads', express.static(path.join('https://chatbackend-production-eef8.up.railway.app', 'uploads')));

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
app.get('/users',async(req,res)=>{


  const keyword = req.query.search
  ? 
    
    { username: { $regex: req.query.search, $options: "i" } }

      
  : {};

const users = await User.find(keyword).find({});
res.send(users);
})

app.post('/notification',async(req,res)=>{

  const {sender, text,GroupId}=req.body
                
  
  const {reciever,...others}=req.body;
            if(GroupId){
  
  
              const nofication =await  Notification.create({ ...others,isGroup:true,recieptent:reciever
              
              });
  
  
              res.json(nofication);
              return;
  
  
  
            }
  
  
  
  console.log(reciever +"is  reciever" );
    const nofication =await  Notification.create({
      sender,
      recieptent:reciever,
      text
    })
  
  
  
    res.status(200).json(nofication);
  
  
    })
  
    app.post('/notification/read',validate,async(req,res)=>{
  
      const id=req.userId;
      const {sender,reciever,isGroup,GroupId}=req.body;
  
  console.log("these are +",sender," ",reciever);
      try{
  
  
            if(isGroup ||GroupId){
  
              console.log("insode group");
  
              console.log(JSON.stringify(req.body))
                   
  
  
               console.log(reciever);
              const notifications=await Notification.updateMany({GroupId:GroupId,recieptent:id,isRead:false},{$set:{isRead:true}});
  
  
                  res.status(200).send(notifications);
  
              return;
            }
  
  
  
        const notifications=await Notification.updateMany({sender:sender,recieptent:reciever,isRead:false,isGroup:false},{$set:{isRead:true}});
  
  res.status(200).send(notifications)
            // console.log(notifications);
      }
      catch(err){
  
  
      }
  
  
  
  
    })
  
    app.get('/notification/:id',async(req,res)=>{
  
      const id=req.params.id;
  console.log(`inside notification id`+id);
      try {
        
        const Notifications=await Notification.find({recieptent:id});
  
        // console.log(Notifications);
        res.status(200).send(Notifications);
  
      } catch (error) {
  
        res.status(401).json({error: error})
        
      }
  
    })

    app.get('/group',async(req,res)=>{

      const group= await ChatGroup.find({});
  console.log(group);
      res.json(group);
  
    })
   
  
  app.get('/group/users/:id',async(req,res)=>{
  
    const Gid=req.params.id;
  // console.log(Gid);
    let  gro=  await ChatGroup.findOne({_id:Gid});
  let members=  await gro.populate('members');
  members=members.members;
  
  console.log(members);
    res.send(members);
  
  
  })
  
  
    app.post('/group/create',validate,async(req,res)=>{
      let  {name,members}=req.body;
      const owner=req.userId;
  members=JSON.parse(members);
  
  console.log(members);
  members.push(owner);
   const group=await ChatGroup.create({
        name,
        members,
        owner,
        messages:[]
      });
  
      console.log(group);
  
      res.json(group);
  
    });
  
  
  app.post('/group/add',validate,async(req,res)=>{
  
    const {chatId,userid}=req.body;
  const group= await ChatGroup.findOne({_id:chatId});
  console.log(group);
  if(!group){
  
  return res.status(401).json('no group exist');
  }
  else if(group['owner']!=req.userId){
  
    console.log(group.owner+" "+req.userId);
  return res.status(401).json('you are not admin');
  
  }
  else if (group.members.includes(userid)) {
    return res.status(400).json({ message: 'Member is already in the group' });
  }
  
  group.members.push(userid);
  
      // Save the updated chat group document
      await group.save();
  
    const grp= await group.populate('members');
      res.json(grp);
  });
  
  app.delete('/group/:groupId/:userId',async(req,res)=>{
  
    const groupId = req.params.groupId;
    const userId = req.params.userId;
  
  
    try{
      const group=await ChatGroup.findOne({_id:groupId});
  
  
      const idx=group.members.indexOf(userId);
     group.members.splice(idx, 1);
    
      await group.save();
    res.send(group);
    }
  
    catch(err){
  
      res.status(402).send(err);
      console.log(err);
    }
   
  })
  
  
  app.post('/group/message',validate,async(req,res)=>{
  
    const {message,chatId,name}=req.body;
  
    const groupChat=await ChatGroup.findOne({_id:chatId});
  
  
    if(!groupChat){
  
      return res.status(400).send('no chatId exist')
    }
  
  
    if(groupChat.members.includes(req.userId)==-1){
  console.log(req.userId);
  
      return res.status(401).send(' members does not exist in this group')
  
    }
    const newMessage = {
      text:message,
      sender:req.userId,
      name:name
    };
  
    // Push the new message to the group's messages array
    groupChat.messages.push(newMessage);
  
    // Save the updated chat group document
    await groupChat.save();
  
  
  res.json(groupChat);
  
  })
  
  app.get('/groups/:gid',async(req,res)=>{
  
    try{
  const id=req.params.gid;
  
  console.log(id);
  
       const group= await ChatGroup.findById(id);
      
       res.json(group);
  
    }
    catch(err){
  
      res.json({message:err.message});
  
    }
  
  
  
  })
  

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
        jwt.sign({userId:foundUser._id,username,img:foundUser.img}, process.env.JWT_SECRET, {}, (err, token) => {
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


    const {userId,username,img}=userData;

    connection.username=username;
    connection.userId=userId;
    connection.img=img;

         console.log(img+' '+userId);

    console.log(`connected user is ${connection.username}`);
    // console.log(userId,username);
      

 

    connection.on('message',async (msg)=>{

    console.log(`connection`);
console.log(JSON.parse(msg));

      const mes=JSON.parse(msg)?.message;

console.log(mes);
    

if(mes.type=='notifyGroup'){

  const {reciever}=mes;


  [...wss.clients].filter((client)=>client.userId==reciever).forEach((client)=>{
    client.send(JSON.stringify(mes));
  });

  return ;
}


if(mes.type=="notify"){

console.log(mes);
  const {sender,reciepient,text}=mes;

  [...wss.clients].filter((client)=>client.userId===reciepient).forEach(client=>client.send(JSON.stringify({
    text:text,
    sender:connection.userId,
    name:connection.username,
    type:'notify',
    reciepient:reciepient
  
  })))


return;


}


if(mes.type=='create'){

const {name}=mes;
 await  axios.post('/group/create',{name})

return;
}
      if(mes && mes.type=='group'){

        try{

          
        const {text,roomId,members}=mes;
        console.log(text);
        

    console.log(members);

    [...wss.clients].filter((client)=>members.includes(client.userId)!=-1).forEach(client=>client.send(JSON.stringify({
      text:text,
      sender:connection.userId,
      name:connection.username,
      type:'group',
      group:roomId
    })))
    

             
        
        return;

        }

        catch(err){


          console.log(err);
        }


      }



      if(mes.type=='join'){

        let {sender,room}=mes;
console.log(room);
console.log(room.members);

let members=room.members
        try{



for(let i=0;i<members.length;i++){
console.log(`hi`);
let member=members[i];

[...wss.clients].filter((client)=>client.userId===member).forEach(client=>client.send(JSON.stringify({
  type:'join',
  room:room

 })))


}



   


        }
        catch(err){

        }

          
//         if(rooms.hasOwnProperty(roomId)){

// rooms[roomId].push(connection)

//         console.log("this is "+JSON.stringify(rooms));
//         console.log(JSON.stringify(connection.username));

//         rooms[roomId].forEach((client)=>{

//           client.send(JSON.stringify({
//             joined:connection.username,
//             type:'join'

//           }))
//         })
//         return;
//       }



    }

    if(mes.type=='typing'){

const {reciever}=mes;

[...wss.clients].filter((client)=>client.userId===reciever).forEach(client=>client.send(JSON.stringify({
  sender:connection.username,
  type:"typing"
})))


return;
    }

    if(mes.type=='stop'){

      const {reciever}=mes;

      [...wss.clients].filter((client)=>client.userId===reciever).forEach(client=>client.send(JSON.stringify({
        sender:connection.username,
        type:"stop"
      })))
      


      return;
    }



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
      online: [...wss.clients].map(c => ({userId:c.userId,username:c.username,img:c.img})),
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
