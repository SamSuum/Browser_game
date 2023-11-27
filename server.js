import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

///EXPRESS///
import express from 'express';
const app = express();

///HTTP///
import { createServer } from 'node:http';

//Port and server setup
const port = process.env.PORT || 3000;

//Server
const server = createServer(app);
server.listen(port);

//Console the port
console.log('Server is running localhost http://localhost:' + port );

///SOCKET.IO///
import { Server } from 'socket.io';
const io = new Server(server);

app.get('/client.js', (req, res) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.sendFile(__dirname + '/client.js');
});

let clients = {}

//Socket setup
io.on('connection', client=>{

  console.log('User ' + client.id + ' connected, there are ' + io.engine.clientsCount + ' clients connected');

  //Add a new client indexed by his id
  clients[client.id] = { 
    position: [0, 0, 0],
    rotation: [0, 0, 0]
  }

  //Make sure to send the client it's ID
  client.emit('introduction', client.id, io.engine.clientsCount, Object.keys(clients));

  //Update everyone that the number of users has changed
  io.sockets.emit('newUserConnected', io.engine.clientsCount, client.id, Object.keys(clients));

  client.on('move', (pos)=>{

    clients[client.id].position = pos;
    io.sockets.emit('userPositions', clients);

  });

  //Handle the disconnection
  client.on('disconnect', ()=>{

    //Delete this client from the object
    delete clients[client.id];

    io.sockets.emit('userDisconnected', io.engine.clientsCount, client.id, Object.keys(clients));

    console.log('User ' + client.id + ' disconnected, there are ' + io.engine.clientsCount + ' clients connected');

  });

});

/////////////////////
//////ROUTER/////////
/////////////////////

//Client view
app.get('/', (req, res) => {

	res.sendFile(join(__dirname, 'index.html'));

});
//404 view
app.get('/*', (req, res) => {

	res.sendFile(join(__dirname, '404.html'));

});