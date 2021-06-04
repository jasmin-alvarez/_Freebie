module.exports = function (app, passport, db, multer, multerS3, s3, aws, ObjectId, uId, moment, chooseWinner) {
  var ObjectId = require('mongodb').ObjectId;


  // CODE FOR MULTER S3

  aws.config.region = 'us-east-1';
  var uploadS3 = multer({
    storage: multerS3({
      s3: s3,
      bucket: 'rc-2021a-freebie',
      acl: 'public-read',
      metadata: function (req, file, cb) {
        cb(null, {
          fieldName: file.fieldname
        });
      },
      key: function (req, file, cb) {
        cb(null, Date.now().toString() + ".png")
      }
    })
  })
  var cpUpload = uploadS3.fields([{ name: 'itemImage', maxCount: 1 }])
  var profileUpload = uploadS3.fields([{ name: 'profileImage', maxCount: 1 }])

  // normal routes ===============================================================

  // show the home page (will also have our login links)


  //================ LANDING PAGE BEGIN ======================

  app.get('/', async function (req, response) {
    chooseWinner();
    const posts = await db.collection('posts').find().toArray();
    response.render('landing.ejs', { posts });
  })

  //================ LANDING PAGE END ======================


  //================ HOME/DASHBOARD PAGE BEGIN ======================

  app.get('/home', async function (req, res) {
    chooseWinner();
    const posts = await db.collection('posts').find().toArray();
    const newest = sortedByNewest(posts);
    const hotListings = sortedByMostDesired(posts);
    let recommended = posts;
    if (req.user) {
      const userProfile = (await db.collection('profiles').findOne({userId: req.user._id})).interested
      if(userProfile.length > 1){
        const usersInterests = userProfile.sort((a, b) => a.category.localeCompare(b.category));
        recommended = await db.collection('posts').find({ category: { $in: interestedInPercentages(usersInterests.interested).slice(0, 3) } }).toArray();
      }
    }
    threeRecommended(recommended, interestedInPercentages(recommended));
    res.render('home.ejs', { recommended: threeRecommended(recommended, interestedInPercentages(recommended)), newest, hotListings });
    // const recommendedByInterests = await db.collection('profiles').findOne({userId: req.user._id})
    // req.user ? res.render('index.ejs', { recommended: threeRecommended()}) :
    // switch(Boolean(req.user)) {
    //   case true: res.render('index.ejs');break;
    //   case false: res.render('index.ejs', {recommended : threeRecommended(recommendedByDefault, interestedInPercentages(recommendedByDefault))});break;
    // }
    // if(req.user) {
    //   console.log('USER EXISTS');
    //   db.collection('profiles').findOne({userId: req.user._id}, (err, result) => {
    //     result.interested.sort((a, b) => a.category.localeCompare(b.category));
    //     db.collection('posts').find({ category: { $in: interestedInPercentages(result.interested).slice(0, 3) } }).toArray((error, posts) => {
    //         res.render('index.ejs', { recommended: threeRecommended(posts, interestedInPercentages(posts)) });
    //     })
    //   })
    // }
    // else {
    //   console.log('NO USER');
    //   console.log(recommendedByDefault);
    //   db.collection('posts').find().toArray((error, posts) => {
    //     res.render('index.ejs', { recommended: threeRecommended(posts, interestedInPercentages(posts)) })
    //   })
    // }
  });

  //================ HOME/DASHBOARD PAGE END ======================


  //================ PROFILE PAGE BEGIN ======================

  //FRONT-END: WHEN THE USER SIGNS UP --SEND USER ID TO THE 'PROFILE' COLLECTION
  //BACK-END: WE NEED TO EDIT THE KEY-VALUE PAIRS TO MAKE SURE THEY ARE ACCURATE.


  app.get('/my_account', isLoggedIn, async function (req, res) {
    chooseWinner();

    const posts = await db.collection('posts').find({posterId: req.user._id}).toArray(),
          profileResults = await db.collection('profiles').findOne({userId: req.user._id}),
          won = profileResults.won,
          bids = profileResults.interested

    res.render('my_account.ejs', {
      user: req.user,
      profileDetails: profileResults,
      won,
      bids,
      posts
    })
  })

  app.post('/createProfile', profileUpload, function (req, res) {
    const data = {
      userId: req.user._id,
      profileImage: req.files.profileImage[0].key,
      posts: [],
      interested: [],
      won: [],
      username: req.body.username,
      city: req.body.city,
      zipCode: req.body.zipCode,
      state: req.body.state,


    }
    db.collection('profiles').save(data, (err, result) => {
      if (err) return console.log(err)
      console.log('saved to database')
        res.redirect('/home')
        })
  });

  //================ PROFILE PAGE END ======================


  //================ POST REQUESTS BEGIN ======================


  app.get('/newPost', async function (req, res) {
    chooseWinner();

    res.render('newPost.ejs');
  })





  app.post('/newPost', cpUpload, async function (req, res) {
    // const now = new Date()
    // const numDate = Date.now()
    // console.log('this is now', now, 'this is now time', now.getTime(), 'this is numDate', numDate);
    const now = new Date()
    const numDate = Date.now()
    console.log('this is now', now, 'this is now time', now.getTime(), 'this is numDate', numDate);
    const posterName = await db.collection('profiles').findOne({userId: req.user._id});

    const data = {
      posterId: req.user._id,
      posterName,
      datePosted: moment(),
      endDate: moment().add(req.body.duration.slice(0,2), 'hours'),
      name: req.body.name,
      itemImage: req.files.itemImage[0].key,
      category: req.body.category,
      description: req.body.description,
      delivery: req.body.pickUpDropOff,
      duration: req.body.duration,
      RandomChoice: req.body.RandomChoice,
      available: true,
      wished: [],
      winner: ''
    }
    const product = await db.collection('posts').insertOne(data);
      console.log(product);
      res.redirect(`/product_details/${product.insertedId}`)
});

  app.put('/newPost', function (req, res) {
    db.collection('profiles').findOneAndUpdate({ userId: req.user._id }, {
      $push: { posts: req.body.postID }
    }, {}, (err, result) => { res.send('Post saved!'); })
  });


  //THE USER IS INTERESTED IN AN ITEM
  app.put('/wishPost', function (req, res) {
    db.collection('profiles').findOneAndUpdate({ userId: req.user._id }, {
      $push: { interested: req.body.postID }
    }, {}, (err, result) => { res.send('Item wished!'); })
  });

  //THE USER HAS WON AN ITEM
  app.put('/wonPost', function (req, res) {
console.log(req.body.name)
    db.collection('posts').findOneAndUpdate({ _id: ObjectId(req.body.postID) }, {
      $set: { available: false, winner: req.body.name }
    }, {upsert: true}, (err, result) => { console.log(err,  'item wishing turned off'); })

    db.collection('profiles').findOneAndUpdate({ _id: req.user._id }, {
      $push: { won: req.body.postID }
    }, {}, (err, result) => { res.send('Item won!'); })

  });


// PRODUCT PAGE

app.get('/product_details/:id', async function (req, response) {
  chooseWinner();

  db.collection('posts').find({_id: ObjectId(req.params.id)}).toArray((error, res) => {
    // let winnerExists = false;
    let alreadyBid = false;
    // console.log(res)
    // if(res[0].wished.includes(req.user))
      // winnerExists = true;
    res[0].wished.forEach(user => { 
      console.log(user._id, req.user._id); 
      if(user._id.toString() == req.user._id.toString()) { 
        alreadyBid = true; 
        console.log('inside function')
      } 
      // console.log(user._id.toString() == req.user._id.toString())
    })
    // console.log(alreadyBid)
    
      
    response.render('product_details.ejs', {

      posts: res, alreadyBid, chat: !res[0].available,
      open: moment().isBefore(res[0].endDate._d) && res[0].available
    });
    if (error) return console.log(error);
  })
})
// -----------------------------BID---------------------------------------

app.put('/bid', (req, res) => { // request to update inforamtion on the page
  console.log(req.body)
  db.collection('posts') // go into db collection
    .findOneAndUpdate({
      _id: ObjectId(req.body.id)
    }, { //find the properties and updating
      $push: { //changing whaterver property
        wished: req.user //from the request data go to thumbup value and adding 1
      }
    }, {
      sort: {
        _id: -1
      }, //ordering the response in descending order
      upsert: true //create the object if no object/document present
    }, (err, result) => { //respond with error
      if (err) return res.send(err)
      res.send(result)
    })
})

//LISTINGS PAGE (ALL POSTS)
app.get('/listing', function (req, response) {
  chooseWinner();

    db.collection('posts').find().sort({_id:-1}).toArray((error, res) => {
      console.log(res)
      response.render('listing.ejs', {
        posts: res
      });
      if (error) return console.log(error);
    })
  })


  //HOT PICKS (POSTS ORDERED BY MOST - LEAST DESIRED)
  app.get('/picks_today', function (req, response) {
    chooseWinner();
    db.collection('posts').find().toArray((error, res) => {
      console.log(res)
      response.render('picks_today.ejs', {
        posts: res
      });
      if (error) return console.log(error);
    })
  })


  // SEARCH ===============================
  app.get('/search', async function (req, res) {
    chooseWinner();
    let searchQuery = req.query.search.toLowerCase()
    const searchResults = (await db.collection('posts').find().toArray()).filter(post => {
      if(post.name.toLowerCase().includes(searchQuery) || post.description.toLowerCase().includes(searchQuery)){
        return post
      }
    })
    res.render('listing.ejs', {
      posts: searchResults
    });
  })


  // FILTER BY CATEGORY ===============================
  app.get('/filter/:category', async function (req, res) {
    chooseWinner();
    let filterParams = req.params.category
    let filterResults = await db.collection('posts').find({ category: filterParams }).toArray()
    res.render('listing.ejs', {
      posts: filterResults
  });
  })

  //================ POST REQUESTS END ======================

  //================ CHAT REQUESTS BEGIN ======================

  //socket.io
  app.post('/createRoom', (req, res) => {
    let userId = ObjectId(req.user._id)
    console.log('this is my id', userId);
    let roomId = uId.v4()
    let posterId = ObjectId(req.body.posterId)
    console.log('this is the posterId',req.body.data);
    db.collection('profiles').find({userId:userId}).toArray((err,userProfile) =>{
      db.collection('profiles').find({userId:posterId}).toArray((err, posterProfile) =>{
        let userName = userProfile[0].username
        let posterName = posterProfile[0].username 
        db.collection('chatRooms').save({
          roomId: roomId,
          userId: userId,
          posterId: posterId,
          message: [],
          userName:userName,
          posterName:posterName
        }, (err, result) => {
          db.collection('chatRooms').find({ userId: userId }).sort({_id:-1}).toArray((err, result) => {
            if (err) return console.log(err)
            db.collection('chatRooms').find({ posterId: userId }).sort({_id:-1}).toArray((err, result1) => {
              if (err) return console.log(err)
              let allUsersRooms = result.concat(result1)
              const currentRoom = allUsersRooms.find(room => roomId === room.roomId)
              const messages = currentRoom ? currentRoom.message : []
              res.render('chat.ejs', {
                userChats: allUsersRooms,
                userId: userId,
                posterId: posterId,
                roomId: roomId,
                messages:messages
              })
            })
          })
        })
      })
    })
  })
  app.get('/chat', isLoggedIn, function (req, res) {
    chooseWinner();
    let userId = ObjectId(req.user._id)
    let roomId = req.query.roomId
    db.collection('chatRooms').find({ userId: userId }).sort({_id:-1}).toArray((err, result) => {
      if (err) return console.log(err)
      db.collection('chatRooms').find({ posterId: userId }).sort({_id:-1}).toArray((err, result1) => {
        if (err) return console.log(err)
        let allUsersRooms = result.concat(result1)
        const currentRoom = allUsersRooms.find(room => roomId === room.roomId)
        const messages = currentRoom ? currentRoom.message : []
        res.render('chat.ejs', {
          userChats: allUsersRooms,
          roomId: roomId,
          messages: messages,
          userId:userId
        })
      })
    })
  })
  app.post('/saveMessage', isLoggedIn, function (req, res) {
    let userId = ObjectId(req.user._id)
    let roomId = req.body.roomId
    let message = req.body.message
    db.collection('chatRooms').findOneAndUpdate({ roomId: roomId }, {
      $push: {
        message: { message: message, userId: userId, timeStamp: new Date() }
      }
    }, {}, (err, result) => {
      if (err) return console.log(err)
      res.send({ status: 'ok' })
    })
  })

  //================ CHAT REQUESTS END ======================


  // =============================================================================
  // AUTHENTICATE (FIRST LOGIN) ==================================================
  // =============================================================================

  // locally --------------------------------
  // LOGIN ===============================
  // show the login form
  app.get('/login', function (req, res) {
    chooseWinner();
    res.render('login.ejs', { message: req.flash('loginMessage') });
  });

  // process the login form
  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/home', // redirect to the secure profile section
    failureRedirect: '/login', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }));

  // SIGNUP =================================
  // show the signup form
  app.get('/signup', function (req, res) {
    chooseWinner();
    res.render('signup.ejs', { message: req.flash('signupMessage') });
  });

  // app.post('/signup', passport.authenticate('local-signup', {
  //   // successRedirect: '/home', // redirect to the secure profile section
  //   failureRedirect: '/signup', // redirect back to the signup page if there is an error
  //   failureFlash: true // allow flash messages
  // }),
  // (req, res) => {
  //   res.redirect('/firstLogin')
  //
  // });


  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/createProfile', // redirect to the secure profile section
    failureRedirect: '/signup', // redirect back to the signup page if there is an error
    failureFlash: true // allow flash messages
  }),
  (req, res) => {
    res.redirect('/home')

  });
//GET for profile set up redirect
  app.get('/createProfile', (req, res) => {
  res.render('createProfile.ejs', { //first log in ejs page
    user: req.user,
  })
})


  // LOGOUT ==============================
  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/my_account');
  });
}

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/');
}

function interestedInPercentages(arr) {
  const catMap = new Map();
  const mapToArr = [];
  arr.forEach(el => catMap.has(el.category) ? catMap.set(el.category, catMap.get(el.category) + 1) : catMap.set(el.category, 1));
  catMap.forEach((cat, t) => {
    catMap.set(cat, catMap.get(cat) / arr.length);
    mapToArr.push([cat, t]);
  });
  return mapToArr;
}

function threeRecommended(arr, sortedPercentages) {
  const first = [], second = [], third = [];
  arr.forEach(post => {
    switch (post.category) {
      case sortedPercentages[0][1]: first.push(post); break;
      case sortedPercentages[1][1]: second.push(post); break;
      case sortedPercentages[2][1]: third.push(post); break;
    }
  });
  [first, second, third].forEach(arr => arr.sort((a, b) => b.wished.length - a.wished.length));
  return [first[0], second[0], third[0]];
}

function sortedByNewest(arr) {
  return arr.sort((a, b) => b.posted - a.posted);
}
function sortedByMostDesired(arr) {
  return arr.sort((a, b) => b.wished.length - a.wished.length);
}

function sortedByName(arr) {
  return arr.sort((a, b) => a.name.localeCompare(b.name.localeCompare))
}

function randomizeWinner() {
  return Math.floor(Math.random() * 10);
}
