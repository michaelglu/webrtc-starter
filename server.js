const express=require('express');
const path =require('path');
const app=express();
const server=require('http').Server(app);
const io=require('socket.io')(server);
const publicDirectoryPath = path.join(__dirname, '/public');


app.get("/ping",(req,res)=>{res.send("PING");})
app.use(express.static(publicDirectoryPath));
server.listen(process.env.PORT||3000);

let clients=[];
io.on('connection',function(socket){
  const currentPlayer={};
  currentPlayer.name='unknown';

  socket.on('player connect',function(player){
  for(let i=0;i<clients.length;i++){
        let client = JSON.parse(JSON.stringify(clients[i]));
        socket.emit("NewPlayer",(client));
  }
  socket.broadcast.emit("NewPlayer",player)
  clients.push(JSON.parse(JSON.stringify(player)));
  currentPlayer.name=JSON.parse(JSON.stringify((player))).name;

})
socket.on('disconnect',function(){
  for(let i=0;i<clients.length;i++){
    if(clients[i].name==currentPlayer.name){clients.splice(i,1);}
  }
  socket.broadcast.emit("PlayerDisconnect",{name:currentPlayer.name});
})

socket.on('rtcRequest',function(data){
  socket.broadcast.emit('rtcRequest',data);
})
socket.on('rtcResponse',function(data){
  socket.broadcast.emit('rtcResponse',data);
})
socket.on('rtcICE',function(data){
  socket.broadcast.emit('rtcICE',data);
})

})
