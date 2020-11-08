var createError = require('http-errors');
const express = require('express');
const fs = require('fs');
var path = require('path');
var session = require('express-session');
var cooksess= require('client-sessions');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser= require("body-parser");
const uuid = require('uuid/v4');

var mainframe = require(__dirname + '/routes/mainframe.js');

var jwt=require('jsonwebtoken');
//https://jsao.io/2015/06/authentication-with-node-js-jwts-and-oracle-database/

const app = express();
const server=require('http').createServer(app);
const io = require('socket.io')(server);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());
app.use( express.static( "public" ) );

app.set('views', __dirname+'/views');

app.use(session({
  genid: (req) => {
    return uuid() // use UUIDs for session IDs
  },
  secret: 'Qu4^}-P]ffsS*UNq>gKyD~G}VHH7%',
  resave: false,
  saveUninitialized: true,
}))

app.use('/', mainframe);

const aUsers= new Set();

const User = class{
	constructor(username,socketID,chatroom){
		this.id=aUsers.size;
		this.username=username;
		this.socketID=socketID;
		this.chatroom=chatroom
	}
	
	welcome(){
		console.log('Hey, welcome '+this.username+' they are socket '+this.socketID);
	}
}


//User SET
//const activeUsers = new Set();
//realtime response
io.on('connection',function(socket){
	console.log('user connected');
	
	socket.on("new user", async(data)=> {
		let user= new User(data.split(",")[0],socket.id,data.split(",")[1]);
		socket.userId = data.split(",")[0];
		socket.room=data.split(",")[1];
		socket.join(data.split(",")[1]);
		aUsers.add(user);
		user.welcome();
		
		let activeUsers = new Set();
		
		aUsers.forEach(x=>x.chatroom===data.split(",")[1] ? activeUsers.add(x.username):x);
		
		io.to(socket.room).emit("chat_message", "<strong>"+socket.userId+" joined the room </strong>");
		io.to(data.split(",")[1]).emit("new user", [...activeUsers]);
	});
	
	socket.on('chat_message',async(data)=>{
		io.to(socket.room).emit("chat_message", "<strong>"+socket.userId+"</strong> "+data);
	});

  socket.on("disconnect", () => {
	aUsers.forEach(x=>x.username===socket.userId ? aUsers.delete(x):x);
    io.to(socket.room).emit("user disconnected", socket.userId);
  });
  
  socket.on('join', (roomId) => {
    const roomClients = io.sockets.adapter.rooms[roomId] || { length: 0 }
    const numberOfClients = roomClients.length

    // These events are emitted only to the sender socket.
    if (numberOfClients == 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', roomId)
    } else if (numberOfClients <= 5) {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', roomId)
    } else {
      console.log(`Can't join room ${roomId}, emitting full_room socket event`)
      socket.emit('full_room', roomId)
    }
  })

  // These events are emitted to all the sockets connected to the same room except the sender.
  socket.on('start_call', (roomId) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`)
    socket.broadcast.to(roomId).emit('start_call')
  })
  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_offer', {sdp:event.sdp,from:event.from,to:event.to})
  })
  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_answer', {sdp:event.sdp, from:event.from,to:event.to})
  })
  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
    socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate', event)
  })
  
  //Current
  //Sends list of users in room when user joins
  socket.on('get_Users',async(data)=>{
		let users=[]
		console.log("Getting users");
		aUsers.forEach(x=>x.chatroom===data.split(",")[1] && x.username!=socket.userId ? users.push(x.username):x);
		io.to(socket.id).emit("users",users );
	});
  
});
const port=process.env.PORT || 3000;
server.listen(port,'192.168.1.222',function(){
console.log(`listening on port ${port}...`);
});
module.exports = app;
