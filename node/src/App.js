const express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const cors = require('cors');
const md5 = require('md5');
const port = 3001

const User = require('./user');
const app = express();

function checkUsername(u) {
  return fetch('https://api.github.com/users/' + u)
  .then(function(a) {
   return a.json();
  })
 .then(function(b) {
   if (b.message === 'Not Found') {
   return false;
 }
 else {
   return b;
 }
 });
}

function encrypt(key) {
    key = key.split('').reverse().join('');
    for(let i = 0; i < 5; i++)
    {
      key = md5(key);
    }
    return key;
}

const connectWithRetry = function() {
  return mongoose.connect("mongodb://outreach-db/outreach", function(err) {
    if (err) {
      console.error('Failed to connect to mongo on startup - retrying in 5 sec');
      console.log(err);
      setTimeout(connectWithRetry, 5000);
    }
  });
};

connectWithRetry();

let db = mongoose.connection

db.once('open', function() {
    console.log('Server connected')
}).catch((err) => {
	console.log("Server failed to connect")	
})

app.use(cors())

app.get('/api/user/:user', (req, res) => {
    const name = req.params.user
    User.findOne({ githubUsername: name }, function(err, data) {
      console.log(data)
      if(data != null) {
        console.log('User already exists');
        res.json({ secret: data.secretKey })
      }
      else {
        const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const encryptedKey = encrypt(key);

        checkUsername(name)
        .then(function(a) {
          console.log('ENTERED')
          if(a !== false){
           console.log('Adding new user');
           const newUser = new User();
           newUser.githubUsername = name;
           newUser.secretKey = key;
           newUser.encryptedKey = encryptedKey;
           newUser.save();
           res.json({ secret: key });
          }
          else{
           res.send('GITHUB USER DOES NOT EXIST');
          }
        })  
      }
    });
})

app.get('/api/secret/:user/:key', (req, res) => {
    console.log(req.params)
    User.findOne({ githubUsername: req.params.user }, function(err, data) {
      console.log(data);
      if(data!= null){
        if(data.encryptedKey === req.params.key){
          res.json({ correct: true})
        }
        else{
          res.send({ correct: false})
        }
       // res.json({ secret: data.secretKey });
      }
    })
})

app.get('/api/encrypt/:key', (req, res) => {
    const key = req.param.user

});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
