console.log("hello there");
const socket=io();
let buddy={};
let isConnected=false;
let button;
let localOut;
let videoContainer;
let pc;
let localStream;

const constraints = window.constraints = {
  audio: true,
  video: true
};
const name = "Player-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000));

socket.on('connect',function(){
  // console.log('SOCKETIO connected');
  button= document.getElementById("call-button");
  localOut= document.getElementById('video1');
  videoContainer=document.getElementById('videos');
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
  const offer=data.body;
  const servers = {iceServers: [{urls: 'stun:stun1.l.google.com:19305'}]};;
  pc=new RTCPeerConnection(servers);
  pc.onicecandidate = e => onIceCandidate(pc, e);
  pc.ontrack=gotRemoteStream;
  pc.onnegotiationneeded=function(){
    console.log('NEGOTIATION NEEDED!!!')}
  pc.setRemoteDescription(data.body).then(success=>{
    navigator.mediaDevices.getUserMedia(constraints).then(handleCall).catch(handleError);
    },
    error=>{console.log(error)
    }
  );

})

socket.on('rtcResponse',function(data){
  // console.log(`RTC_RESPONSE from ${data.from} to ${data.to}`);
  // console.log(`RTC_RESPONSE body: ${data.body}`);
  pc.setRemoteDescription(data.body).then(success=>{
    // console.log('success')
  },error=>console.log(error))


})

socket.on('rtcICE',function(data){
  // console.log(`RTC_ICE from ${data.from} to ${data.to}`);
  console.log("_____GOT RTC ICE_______");
  console.log(data);
  console.log((data.body));

  pc.addIceCandidate((data.body)).then(success=>console.log(success),error=>console.log(error));


})

function callNeighbor(){
  if(buddy=={}){console.log('CALL_NEIGHBOR Neighbor NULL')}
  else{

    const servers = {iceServers: [{urls: 'stun:stun1.l.google.com:19305'}]};
    pc=new RTCPeerConnection(servers);
    pc.onicecandidate = e => onIceCandidate(pc, e);
    pc.ontrack=gotRemoteStream;
    pc.onnegotiationneeded=function(){
      pc.createOffer().then(success=>{
        console.log(success)
        pc.setLocalDescription(success).then(success=>{
          socket.emit('rtcRequest',{from:name,to:buddy.name,body:pc.localDescription});

        },error=>{
          console.log(failure);
        });

      },
        failure=>{
          console.log(failure);
        })
    }
    navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);
  }
}

function handleSuccess(stream) {
  localOut.srcObject = stream;

  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    // console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  // console.log('Adding Local Stream to peer connection');
  // pc.createOffer().then(success=>{
  //   // console.log('RTC SUCCESS')
  //   console.log(success)
  //   pc.setLocalDescription(success).then(success=>{
  //     socket.emit('rtcRequest',{from:name,to:buddy.name,body:pc.localDescription});
  //
  //   },error=>{
  //     // console.log('RTC FAILED to set description');
  //     console.log(failure);
  //   });
  //
  // },
  //   failure=>{
  //     // console.log('RTC FAILED to create offer');
  //     console.log(failure);
  //   })
}
function handleCall(stream) {
  console.log(stream);
  localOut.srcObject = stream;

  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    // console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  // console.log('Adding Local Stream to peer connection');
  pc.createAnswer().then(answer=>{
    pc.setLocalDescription(answer).then(success=>{
        socket.emit('rtcResponse',{from:name,to:buddy.name,body:pc.localDescription});

    },error=>{console.log(error)})

  },error=>{console.log(error)})
}

function handleError(error) {
  // const errorMessage = 'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' + error.name;
  console.log(errorMessage);
}


function onIceCandidate(pc, event) {
  const candidate=event.candidate
  if(candidate==null){return}
  console.log('**SENDING ICE** '+candidate)
  console.log(candidate)
  socket.emit("rtcICE",{from:name,to:buddy.name, body:candidate});
  console.log(`PC ICE candidate:\n${candidate ? candidate.candidate : '(null)'}`);
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
  console.log("*************HERE**************")
  let remoteOut=document.createElement("video");
  if(document.getElementById(`video_${e.streams[0].id}`)){return;}
  videoContainer.appendChild(remoteOut);
  remoteOut.setAttribute("id",`video_${e.streams[0].id}`);
  remoteOut.muted=false;
  remoteOut.autoplay=true;
  if(remoteOut.srcObject){return;}
  console.log(e.streams);
  remoteOut.srcObject=e.streams[0];
}
