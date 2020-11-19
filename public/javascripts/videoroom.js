const socket = io();

const inboxPeople = document.getElementById("activeUsers");
let userName = "";
let peerConnections=[];

const localVideoComponent = document.getElementById('local-video')

let localStream;
let remoteStreams=[];
let roomId;

var mediaConstraints={
	video: { width: 400, height: 300 }, 
	audio: false 
}

// Free public STUN servers provided by Google.
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

const newUserConnected = (user) => {
  userName = user || `User${Math.floor(Math.random() * 1000000)}`;
  
  socket.emit("new user", userName+","+(document.location.pathname));
  addToUsersBox(userName);
  //Pulls current user list, then inside this call initiates peerconnections
	roomId='v'+(document.location.pathname).split("/")[2];
	socket.emit('get_Users',userName+","+roomId);
};

const addToUsersBox = (userNamet) => {
  if (!!document.querySelector(`.${userNamet}-userlist`)) {
    return;
  }
  const userBox = `
    <div class="chat_ib ${userNamet}-userlist">
      <h5>${userNamet}</h5>
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

//WEBRTC STUFF

//Gets list of users in room and then calls helper functions
socket.on('users', async (data)=>{
	await setLocalStream(mediaConstraints);
	data.forEach( id=> callUser(id));
});

async function setLocalStream(mediaConstraints) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
  } catch (error) {
    console.error('Could not get user media', error)
  }

  localStream = stream
  localVideoComponent.srcObject = stream
}

function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
}

function setRemoteStream(event) {
	let target=searchPeers(event);
	var container=document.getElementById('remote-videos');
	var exists=document.getElementById(target);
	if(exists==null){
		var remoteVideoComponent=document.createElement("video");
	
		remoteVideoComponent.setAttribute("autoplay","autoplay");
		remoteVideoComponent.setAttribute("muted","muted");
		remoteVideoComponent.setAttribute("id",target);
		remoteStreams[target]=event;
		remoteVideoComponent.srcObject = remoteStreams[target].streams[0];
		container.appendChild(remoteVideoComponent);
	}else{
		remoteStreams[target]=event;
		exists.srcObject=remoteStreams[target].streams[0];
	}
	
	
	
}

function checkingStatus(event) {
	let target=searchPeers(event);
	
	if(event.currentTarget.connectionState=="failed"){
		var vid=document.getElementById(target);
		if(vid!=null){
			vid.remove();
		}
		
	}
	
}
async function callUser(id) {
	console.log("Calling "+id);
	
	peerConnections[id]= new RTCPeerConnection(iceServers);
	addLocalTracks(peerConnections[id]);
	peerConnections[id].ontrack = setRemoteStream;
	peerConnections[id].onconnectionstatechange=checkingStatus
    peerConnections[id].onicecandidate = sendIceCandidate;
    await createOffer(peerConnections[id],id);
}

async function createOffer(rtcPeerConnection,id) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomId,
	from: userName,
	to: id
  })
}

socket.on('webrtc_offer', async (event) => {
  console.log("Call from "+event.from);

  if (userName==event.to) {
    peerConnections[event.from] = new RTCPeerConnection(iceServers)
    addLocalTracks(peerConnections[event.from])
    peerConnections[event.from].ontrack = setRemoteStream
    peerConnections[event.from].onicecandidate = sendIceCandidate
	peerConnections[event.from].onconnectionstatechange=checkingStatus
    peerConnections[event.from].setRemoteDescription(new RTCSessionDescription(event.sdp))
    await createAnswer(peerConnections[event.from],event.from)
  }
})

async function createAnswer(rtcPeerConnection,id) {
  let sessionDescription
  try {
    sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }

  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomId,
	from: userName,
	to: id
  })
}

socket.on('webrtc_answer', (event) => {
  console.log("Answer from "+event.from);
	if(peerConnections[event.from] && userName==event.to){
		peerConnections[event.from].setRemoteDescription(new RTCSessionDescription(event.sdp))
	}
  
})

function searchPeers(event){
	const keys=Object.keys(peerConnections);
	let target;
	
	keys.forEach((key,index)=>{
		if(event.currentTarget===peerConnections[key]){
			target=key;
		}
	});
	return target;
}


function sendIceCandidate(event) {
	let target=searchPeers(event);
	
  if (event.candidate) {
    socket.emit('webrtc_ice_candidate', {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
	  from:userName,
	  to:target
    })
  }
}

socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate')

  // ICE candidate configuration.
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  if(userName==event.to){
	  peerConnections[event.from].addIceCandidate(candidate)
  }
})


function getConns(){
	console.log(peerConnections);
}

function getWeb(){
	console.log(localstream);
	for(const track of localstream.getTracks()){
		console.log(track);
	}
}




