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


//Users class for use in tracking online users.
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
	console.log(socket.id);
	
	//When users joins a chatroom
	socket.on("new user", async(data)=> {
		console.log(data);
		let user= new User(data.split(",")[0],socket.id,data.split(",")[1]);
		socket.userId = data.split(",")[0];
		socket.room=data.split(",")[1];
		socket.join(data.split(",")[1]);
		//activeUsers.add(data.split(",")[0]);
		aUsers.add(user);
		user.welcome();
		console.log(aUsers);
		
		
		let activeUsers = new Set();
		
		aUsers.forEach(x=>x.chatroom===data.split(",")[1] ? activeUsers.add(x.username):x);
		
		console.log(activeUsers);
		io.to(data.split(",")[1]).emit("new user", [...activeUsers]);
	});
	
	//When user sends message
	socket.on('chat_message',async(data)=>{
		io.to(socket.room).emit("chat_message", "<strong>"+socket.userId+"</strong> "+data);
	});

	//When user disconnects
  socket.on("disconnect", () => {
    //activeUsers.delete(socket.userId);
	aUsers.forEach(x=>x.username===socket.userId ? aUsers.delete(x):x);
    io.to(socket.room).emit("user disconnected", socket.userId);
  });
  
});


const port=process.env.PORT || 3000;
server.listen(port,'25.78.34.98',function(){
console.log(`listening on port ${port}...`);
});
module.exports = app;
