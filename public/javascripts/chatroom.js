const socket = io();

const inboxPeople = document.getElementById("activeUsers");
let userName = "";

const newUserConnected = (user) => {
  userName = user || `User${Math.floor(Math.random() * 1000000)}`;
  
  socket.emit("new user", userName+","+(document.location.pathname));
  $('#ausers').append($('<li>').html(userName));
  addToUsersBox(userName);
};

const addToUsersBox = (userName) => {
  if (!!document.querySelector(`.${userName}-userlist`)) {
    return;
  }
  const userBox = `
    <div class="chat_ib ${userName}-userlist">
      <h5>${userName}</h5>
    </div>
  `;
  inboxPeople.innerHTML += userBox;
};

$('#chatForm').submit(function(e){
		e.preventDefault();
		var mess=$('#txt').val()
		mess.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
		socket.emit('chat_message',mess);
		$('#txt').val('');
		return false;
});

socket.on("new user", function (data) {
  data.map((user) => addToUsersBox(user));
});

socket.on("user disconnected", function (userName) {
  document.querySelector(`.${userName}-userlist`).remove();
});

socket.on('chat_message', function(msg){
	$('#messages').append($('<li>').html(msg));
	var mdiv=document.getElementById("chatmessages");
	mdiv.scrollTop=mdiv.scrollHeight;
});