const socket = io()
const messages = document.getElementById('messages')
const messageForm = document.getElementById('formMessage')
console.log('this is the message form',messageForm);
const messageInput = document.getElementById('message')
// const roomName = prompt('chose a room')
// console.log(roomId);
// const name = document.getElementById('user').value
// const roomName = prompt('room id')
//this room name would be the id of the room from the chatRooms collection
//for now its an input
//2 users with this roomName will be able to chat withone another
socket.emit('new-user', roomName)
socket.emit('name', name)
socket.on('chat-message', data => {
    appendMessageLeft(`${data.message}`)
})
socket.on('user-connected', name => {
    appendMessage(`connected`)
})
socket.on('user-disconnected', name => {
    appendMessage(`disconnected`)
})
messageForm.addEventListener('submit', e => {
    console.log('form is being submitted');
    e.preventDefault()
    const message = messageInput.value
    appendMessage(message)
    socket.emit('send-chat-message', {
        room: roomName,
        message: message,
        name: name
    })
    fetch('saveMessage', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'message': message,
            'roomId': roomName
        })
    }).then(function (response) {

    })
    console.log('fetch complete');
    messageInput.value = ''
})
function appendMessage(message, timeStamp =null) {
    var d = new Date();
    var hour = d.getHours()
    var min = d.getMinutes()
    if (("" + min).length < 2) min = "0" + min
    var abbr = ""
    if (hour > 12) {
        hour = hour - 12;
        abbr = " PM"
    } else abbr = " AM"
    let currentTime = hour + ':' + min + abbr

    const check = document.createElement('i')
    const messageElement = document.createElement('div')
    const messageContent = document.createElement('div')
    const messageTime = document.createElement('div')

    check.classList.add('ti-double-check')
    messageTime.classList.add('message-action')
    messageContent.classList.add('message-content')
    messageElement.classList.add('message-item', 'outgoing-message')

    messageContent.innerText = message
    messageTime.innerText = currentTime

    messageTime.append(check)
    messageElement.append(messageContent)
    messageElement.append(messageTime)
    messages.append(messageElement)
}


function appendMessageLeft(message) {
    var d = new Date();
    var hour = d.getHours()
    var min = d.getMinutes()
    if (("" + min).length < 2) min = "0" + min
    var abbr = ""
    if (hour > 12) {
        hour = hour - 12;
        abbr = " PM"
    } else abbr = " AM"
    let currentTime = hour + ':' + min + abbr

    const check = document.createElement('i')
    const messageElement = document.createElement('div')
    const messageContent = document.createElement('div')
    const messageTime = document.createElement('div')

    check.classList.add('ti-double-check')
    messageTime.classList.add('message-action')
    messageContent.classList.add('message-content')
    messageElement.classList.add('message-item')

    messageContent.innerText = message
    messageTime.innerText = currentTime

    messageTime.append(check)
    messageElement.append(messageContent)
    messageElement.append(messageTime)
    messages.append(messageElement)
}
const chatMessages = JSON.parse(document.querySelector('#chatMessages').innerText)
		for (let i = 0; i < chatMessages.length; i++) {
			//getting saved messages from db
			appendMessage(chatMessages[i].message, chatMessages[i].timeStamp)
		}