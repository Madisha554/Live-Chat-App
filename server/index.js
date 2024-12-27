import express from 'express';

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { Server } from 'socket.io';
const PORT = process.env.PORT || 3500;
const ADMIN = 'Admin';

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// STATE
const UsersState = {
  users: [],
  setUsers: (newUserArray) => {
    this.users = newUserArray;
  }
}

const io = new Server(expressServer, { 
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false: ['http://localhost:5500', 'http://127.0.0.1:5500']
  }
});
io.on('connection', socket => {
  console.log(`User ${socket.id} connected`);

  //upon connection -on;y to user

  socket.emit('message', buildMsg(ADMIN, 'Welcome to Chat Room!'));
  socket.on('enterRoom', ({ name, room }) => {

    //Leave the previous room
    const preRoom = getUser(socket.id)?.room;
    if (preRoom) {
      socket.leave(preRoom);
      io.to(preRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
    }
    //Cannot update the user until the user has left the room
    const user = activateUsers(socket.id, name, room);
    if(preRoom) {
      io.to(preRoom).emit('userList', {
        users: getUsersInRoom(preRoom)
      })
    }
    //Join the room
    socket.join(user.room);

    //To user who just joined
    socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.name} chat room`));

    //To all users else who are in the room
    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

    //Update the user list for room
    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room)
    });

    //Update the room list for everyone

    io.emit('roomList', {
      rooms: getAllActiveRooms()
    }); 

      // when user disconnets - broadcast to all users

  socket.on('disconnect', () => {
    const user = getUser(socket.id);
    userLeaveApp(socket.id);
    if(user){
      io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
      io.to(user.room).emit('userList', {
        users: getUsersInRoom(user.room)
      });
      io.emit('roomList', {
        rooms: getAllActiveRooms()
      });
    }
    console.log(`User ${socket.id} disconnected`);

  });


  //broadcast to all users except the user

  socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} connected`);

  //listen for messages event

  socket.on('message', ({name, text}) => {
    // console.log(data);
    const room = getUser(socket.id).room;
    if(room){
      io.to(room).emit('message', buildMsg(name, text));
    }
  });



  // Listen for activity
  socket.on('activity', (name) => {
    const room = getUser(socket.id).room;
    if(room){
      socket.to(room).broadcast.emit('activity', name);
    }
  });
});

//
const buildMsg = (name, text) => {
  const date = new Date();
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(date)
  }
}
// Uer functions

const activateUsers = (id, name, room) => {
  const user = { id, name, room };
  UsersState.setUsers([
    ...UsersState.users.filter(user => user.id !== id), 
    user
  ]);
  return user;
}

// Users leaveApp 
const userLeaveApp = (id ) =>{
  UsersState.setUsers(UsersState.users.filter(user => user.id !== id));
}
// Get user
const getUser = (id) => {
  return UsersState.users.find(user => user.id === id);
}   

// Get users in a room
const getUsersInRoom = (room) => {
  return UsersState.users.filter(user => user.room === room);
}

 const getAllActiveRooms = () => {
   return Array.from (new Set(UsersState.users.map(user => user.room)));
 }
});	