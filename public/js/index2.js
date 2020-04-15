console.log("hello there");
const socket=io();
let buddies=[];
let pcs={};
let button;
let localOut;
let videoContainer;
let localStream;

const constraints = window.constraints = {
  audio: true,
  video: true
};
const myName = "Player-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000))+"-"+Math.floor(Math.random() * Math.floor(1000));

socket.on('connect',function(){
  localOut= document.getElementById('video1');
  videoContainer=document.getElementById('videos');
  socket.emit('player connect',{name:myName,translation:[0,0,0],rotation:[0,0,0]});
});

socket.on('NewPlayer',function(data){
  console.log('SOCKETIO NewPlayer');
  console.log(JSON.stringify(data));
  let {name}=data;
  buddies.push(name);
  pcs[name]=null;
})

socket.on('PlayerDisconnect',function(data){
  let {name}=data;
  console.log(`SOCKETIO ${name} disconnected`);
  pcs[name]=null;

})
socket.on("End",function(){
  console.log(pcs)
  buddies.forEach((buddy, i) => {
    console.log('LOOP '+buddy)
    const servers = {};
    let pc =new RTCPeerConnection(servers);
    pcs[buddy]=pc;
    pc.onicecandidate = e => onIceCandidate(buddy,pcs[buddy], e);
    pc.ontrack=gotRemoteStream;
  });
  if(buddies.length>0){
    navigator.mediaDevices.getUserMedia(constraints).then(setUpCall).catch(handleError);
  }


})

socket.on('rtcRequest',function(data){
  console.log(`RTC_REQUEST from ${data.from} to ${data.to}`);
  // console.log(`RTC_REQUEST body: ${data.body}`);
  if(data.to!==myName){
    console.log('NOT ME');
    return;}
  const offer=data.body;
  const servers = {};
  let pc=new RTCPeerConnection(servers);
  pcs[data.from]=pc;
  pc.onicecandidate = e => onIceCandidate(data.from,pc, e);
  pc.ontrack=gotRemoteStream;
  pc.setRemoteDescription(data.body).then(success=>{
    // console.log('SET DESCRIPTION');
    // console.log(pc.remoteDescription);
    navigator.mediaDevices.getUserMedia(constraints).then(stream=>{handleCall(stream,pc,data.from)}).catch(handleError);
    },
    error=>{console.log(error)})
})


socket.on('rtcResponse',function(data){
  console.log(`RTC_RESPONSE from ${data.from} to ${data.to}`);
  if(myName!==data.to){
    console.log('NOT ME');
    return;}
  // console.log(`RTC_RESPONSE body: ${data.body}`);
  pcs[data.from].setRemoteDescription(data.body).then(success=>{
    // console.log('success')
  },error=>console.log(error))


})

socket.on('rtcICE',function(data){
  console.log(`RTC_ICE from ${data.from} to ${data.to}`);
  // console.log(`RTC_ICE body: ${data.candidate}`);
  if(myName!==data.to){return;}
  console.log(pcs)
  pcs[data.from].addIceCandidate(data.candidate).then(success=>console.log(success),error=>console.log(error));


})


/*______________________________HELPERS________________________________________*/

function setUpCall(stream) {
  console.log('setting up call')
  localOut.srcObject = stream;
  localStream = stream;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    // console.log(`Using Audio device: ${audioTracks[0].label}`);
  }
  for(let name in pcs){
    let pc=pcs[name];
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    // console.log('Adding Local Stream to peer connection');
    pc.createOffer().then(success=>{
      // console.log('RTC SUCCESS')
      console.log(success)
      pc.setLocalDescription(success).then(success=>{
        socket.emit('rtcRequest',{from:myName,to:name,body:pc.localDescription});

      },error=>{
        // console.log('RTC FAILED to set description');
        console.log(failure);
      });

    },
      failure=>{
        // console.log('RTC FAILED to create offer');
        console.log(failure);
      })
  }
}

function handleCall(stream,pc,name) {
  console.log(`Handle Call fired, target: ${name} PC not null: ${pc==null}`);
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
        socket.emit('rtcResponse',{from:myName,to:name,body:pc.localDescription});
    },error=>{console.log(error)})
  },error=>{console.log(error)})
}


function gotRemoteStream(e) {
  console.log("*************HERE**************")
  if(document.getElementById(`video_${e.streams[0].id}`)){return;}
  let remoteOut=document.createElement("video");

  console.log("ADDING AUDIO");
  videoContainer.appendChild(remoteOut);
  remoteOut.setAttribute("id",`video_${e.streams[0].id}`);
  remoteOut.muted=false;
  remoteOut.playsinline=true;
  remoteOut.autoplay=true;
    console.log("ADDED");
  if(remoteOut.srcObject){return;}
  console.log(e.streams);
  remoteOut.srcObject=e.streams[0];
}

function handleError(error) {
  // const errorMessage = 'navigator.MediaDevices.getUserMedia error: ' + error.message + ' ' + error.name;
  console.log(error);
}


function onIceCandidate(name,pc, event) {
  // console.log('**ICE** '+event.candidate)
  socket.emit("rtcICE",{from:myName,to:name, candidate:event.candidate});
  // console.log(`PC ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(peerConnection,candidate) {
  // console.log('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  // console.log(`Failed to add ICE Candidate: ${JSON.stringify(error)}`);
}

function onSetSessionDescriptionError(error) {
  // console.log(`Failed to set session description: ${(error).toString()}`);
}
