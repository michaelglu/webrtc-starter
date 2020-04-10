console.log("hello there");
const socket=io();
var myId;
let buddy={};
let isConnected=false;
let button;
let localOut;
let remoteOut;
let pc;
let localStream;

const constraints = window.constraints = {
  audio: true,
  video: true
};
// const configuration = {iceServers: [{urls: 'stuns:stun1.l.google.com:19302'}]};
const name = "Player-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000));

socket.on('connect',function(){
  console.log('SOCKETIO connected');
  button= document.getElementById("call-button");
  localOut= document.getElementById('video1');
  remoteOut=document.getElementById('video2');
  button.onclick=callNeighbor;
  socket.emit('player connect',{name,translation:[0,0,0],rotation:[0,0,0]});
});

socket.on('NewPlayer',function(data){
  console.log('SOCKETIO NewPlayer');
  console.log(JSON.stringify(data));
  buddy=data;
  button.disabled=false;

})

socket.on('PlayerDisconnect',function(data){
  console.log(`SOCKETIO ${data.name} disconnected`);
  buddy={};
  button.disabled=true;
})

socket.on('rtcRequest',function(data){
  console.log(`RTC_REQUEST from ${data.from} to ${data.to}`);
  console.log(`RTC_REQUEST body: ${data.body}`);

  const offer=data.body;
  const servers = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]};;
  pc=new RTCPeerConnection(servers);
  pc.onicecandidate = e => onIceCandidate(pc, e);
  pc.ontrack=gotRemoteStream;
  pc.setRemoteDescription(data.body).then(success=>{
    console.log('SET DESCRIPTION');
    console.log(pc.remoteDescription);
    navigator.mediaDevices.getUserMedia(constraints).then(handleCall).catch(handleError);
    // pc.createAnswer().then(answer=>{
    //   pc.setLocalDescription(answer).then(success=>{
    //       socket.emit('rtcResponse',{from:name,to:buddy.name,body:pc.localDescription});
    //
    //   },error=>{console.log(error)})
    //
    // },error=>{console.log(error)})
    ;},
    error=>{console.log(error)})



})

socket.on('rtcResponse',function(data){
  console.log(`RTC_RESPONSE from ${data.from} to ${data.to}`);
  console.log(`RTC_RESPONSE body: ${data.body}`);
  pc.setRemoteDescription(data.body).then(success=>{
    console.log('success')
  },error=>console.log(error))


})

socket.on('rtcICE',function(data){
  console.log(`RTC_ICE from ${data.from} to ${data.to}`);
  console.log(`RTC_ICE body: ${data.candidate}`);
  pc.addIceCandidate(data.candidate).then(success=>console.log(success),error=>console.log(error));


})

function callNeighbor(){
  if(buddy=={}){console.log('CALL_NEIGHBOR Neighbor NULL')}
  else{

    const servers = {iceServers: [{urls: 'stun:stun1.l.google.com:19302'}]};
    pc=new RTCPeerConnection(servers);
    pc.onicecandidate = e => onIceCandidate(pc, e);
    pc.ontrack=gotRemoteStream;

    console.log('Created local peer connection object pc1');
    navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
    // socket.emit('rtcRequest',{from:name,to:buddy.name,body:"So Call me maybe"});
  }
}

function handleSuccess(stream) {
  console.log(stream);
  localOut.srcObject = stream;

  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');
  pc.createOffer().then(success=>{
    console.log('RTC SUCCESS')
    console.log(success)
    pc.setLocalDescription(success).then(success=>{
      socket.emit('rtcRequest',{from:name,to:buddy.name,body:pc.localDescription});

    },error=>{
      console.log('RTC FAILED to set description');
      console.log(failure);
    });

  },
    failure=>{
      console.log('RTC FAILED to create offer');
      console.log(failure);
    })
  // window.stream = stream; // make variable available to browser console
  // audio.srcObject = stream;
}
function handleCall(stream) {
  console.log(stream);
  localOut.srcObject = stream;

  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  console.log('Adding Local Stream to peer connection');
  pc.createAnswer().then(answer=>{
    pc.setLocalDescription(answer).then(success=>{
        socket.emit('rtcResponse',{from:name,to:buddy.name,body:pc.localDescription});

    },error=>{console.log(error)})

  },error=>{console.log(error)})
  // window.stream = stream; // make variable available to browser console
  // audio.srcObject = stream;
}

function handleError(error) {
  const errorMessage = 'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' + error.name;
  // errorMsgElement.innerHTML = errorMessage;
  console.log(errorMessage);
}


function onIceCandidate(pc, event) {
  console.log('**ICE** '+event.candidate)
  socket.emit("rtcICE",{from:name,to:buddy.name, candidate:event.candidate});
  // pc.addIceCandidate(event.candidate)
  //     .then(
  //         () => onAddIceCandidateSuccess(pc,event.candidate),
  //         err => onAddIceCandidateError(pc, err)
  //     );
  console.log(`PC ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(peerConnection,candidate) {
  console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  console.log(`Failed to add ICE Candidate: ${JSON.stringify(error)}`);
}

function onSetSessionDescriptionError(error) {
  console.log(`Failed to set session description: ${(error).toString()}`);
}

function gotRemoteStream(e) {
  console.log(e.streams);
  remoteOut.srcObject=e.streams[0];
}
