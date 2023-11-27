///socket///
const socket = io();


let id;
let clients = new Object();


//On connection server sends the client his ID
socket.on('introduction', (_id, _clientNum, _ids)=>{

  for(let i = 0; i < _ids.length; i++){
    if(_ids[i] != _id){
      clients[_ids[i]] = {
        }
      
    }
  }

  console.log(clients);

  id = _id;
  console.log('My ID is: ' + id);

});

socket.on('newUserConnected', (clientCount, _id, _ids)=>{
  console.log(clientCount + ' clients connected');
  let alreadyHasUser = false;
  for(let i = 0; i < Object.keys(clients).length; i++){
    if(Object.keys(clients)[i] == _id){
      alreadyHasUser = true;
      break;
    }
  }
  if(_id != id && !alreadyHasUser){
    console.log('A new user connected with the id: ' + _id);  
    clients[_id] = {
     
    }

    
  }

});



socket.on('userDisconnected', (clientCount, _id, _ids)=>{
  //Update the data from the server
  //document.getElementById('numUsers').textContent = clientCount;

  if(_id != id){
    console.log('A user disconnected with the id: ' + _id);   
   
    delete clients[_id];
  }
});

socket.on('connect', ()=>{});