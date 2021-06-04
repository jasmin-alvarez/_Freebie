var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
const MongoClient = require('mongodb').MongoClient
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');

var aws = require('aws-sdk');
var moment = require('moment');
var multer = require('multer')
var multerS3 = require('multer-s3');
var configAWS = require('./config/aws.js');
var s3 = new aws.S3(configAWS);
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var configDB = require('./config/database.js');// access config folder which is storing database.js file

var multer = require('multer');
//S3 packages
var aws = require('aws-sdk');
var multerS3 = require('multer-s3');
var configAWS = require('./config/aws.js');
var s3 = new aws.S3(configAWS);
//socket
var uId = require('uuid');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const ObjectId = require('mongodb').ObjectID

var db

// configuration ===============================================================
mongoose.connect(configDB.url, (err, database) => {
  if (err) return console.log(err)
  db = database
  const chooseWinner = function() {
    db.collection('posts').find().toArray().then(posts => posts.forEach(p => { 
    if(p.endTime < moment() && typeof p.winner == 'string'){
      const winner = p.wished[Math.floor(Math.random() * p.wished.length-1)]
      db.collection('posts').findOneAndUpdate({_id: p._id}, {$set : { winner } }, {})
      db.collection('profiles').findOneAndUpdate({_id: winner._id}, {$push : { won : p }});
    }
    })); 
  }
  require('./app/routes.js')(app, passport, db, multer, multerS3, s3, aws, ObjectId, uId, moment, chooseWinner);
}); // connect to our database
//socket.io
const users = {}
io.on('connection', socket => {
  socket.on('new-user', (room) => {
    socket.join(room)
    console.log(room);
  })
  socket.on('name', (userName) =>{
    console.log(userName);
    users[socket.id] = userName
  })
  socket.on('send-chat-message', data => {
    console.log(data.message);
    socket.broadcast.to(data.room).emit('chat-message', { message: data.message, name: data.name })
  })
})
//socket.io
require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'))

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(session({
    secret: 'rcbootcamp2019a', // session secret
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session


// launch ======================================================================
http.listen(port);
console.log('The magic happens on port ' + port);
