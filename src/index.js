const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

io.on('connection', (socket) => {
    
    socket.on('join', (options, callback) => {
        const { error, user } = addUser({id:socket.id, ...options})
        if(error){
             return callback(error)
        }
        socket.join(user.room);
        socket.emit('message', generateMessage('Admin', `Welcome ${user.username}`));
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has just joined.`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
    })
    socket.on('sendMessage', ( message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter()
        if (message === '') {
            return callback('Blank message is not allowed.')
        }
        if (filter.isProfane(message)) {
            return callback('Profane is not allowed.')
        }
        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    })
    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('sendLocationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.latitude},${location.longitude}`));
        callback();
    })
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left.`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})
app.use(express.static(publicDirectoryPath));
server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})
