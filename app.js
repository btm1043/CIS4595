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

app.set('views', 'home/Project/cis4595/views');

app.use(session({
  genid: (req) => {
    return uuid() // use UUIDs for session IDs
  },
  secret: 'Qu4^}-P]ffsS*UNq>gKyD~G}VHH7%',
  resave: false,
  saveUninitialized: true,
}))

app.use('/', mainframe);

//User SET
const activeUsers = new Set();

//realtime response
io.on('connection',function(socket){
	console.log('user connected');
	console.log(socket.id);
	
	socket.on("new user", async(data)=> {
		console.log(data);
		socket.userId = data;
		activeUsers.add(data);
		io.emit("new user", [...activeUsers]);
	});

  socket.on("disconnect", () => {
    activeUsers.delete(socket.userId);
    io.emit("user disconnected", socket.userId);
  });
  
});


const port=process.env.PORT || 80;
server.listen(port,'localhost',function(){
console.log(`listening on port ${port}...`);
});
module.exports = app;
