'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
const session = require("express-session");
const passport = require("passport");
const app = express();
const ObjectID = require("mongodb").ObjectId;
const mongo = require('mongodb').MongoClient;

const LocalStrategy = require("passport-local");

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine",'pug');

app.route('/')
  .get((req, res) => {
    res.render("./pug/index",
               {title:"Home Page",
                message:"Please login",
                showLogin: true,
                showRegistration: true
               });
  });
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

const DATABASE = "mongodb+srv://name1000:76880A@cluster0-tzycp.mongodb.net/test?retryWrites=true&w=majority";
mongo.connect(process.env.DATABASE, (err, db) => {
    if(err) {
        console.log('Database error: ' + err);
    } else {
        console.log('Successful database connection');
        app.listen(process.env.PORT || 3000, () => {
            console.log("Listening on port " + process.env.PORT);
          });
      passport.use(new LocalStrategy(
          function(username, password, done) {
            db.collection('users').findOne({ username: username }, function (err, user) {
              console.log('User '+ username +' attempted to log in.');
              if (err) { return done(err); }
              if (!user) { return done(null, false); }
              if (password !== user.password) { return done(null, false); }
              return done(null, user);
            });
          }
        ));     
      passport.serializeUser((user, done) => {
         done(null, user._id);
       });

      passport.deserializeUser((id, done) => {
              db.collection('users').findOne(
                  {_id: new ObjectID(id)},
                  (err, doc) => {
                      done(null, doc);
                  }
              );
          });
      app.route("/login").post( passport.authenticate('local',{
        failureRedirect: '/' 
      }),(req,res) => {
          res.redirect("/profile");
      });
      
      app.route("/profile").get(ensureAuthenticated,(req,res) => {
        res.render(process.cwd() + '/views/pug/profile',
        {username: req.user.username});
      });
      app.route('/logout')
      .get((req, res) => {
      req.logout();
      res.redirect('/');
  });
        app.route('/register')
          .post((req, res, next) => {
              db.collection('users').findOne({ username: req.body.username }, function (err, user) {
                  if(err) {
                      next(err);
                  } else if (user) {
                      res.redirect('/');
                  } else {
                      db.collection('users').insertOne(
                        {username: req.body.username,
                         password: req.body.password},
                        (err, doc) => {
                            if(err) {
                                res.redirect('/');
                            } else {
                                next(null, doc);
                            }
                        }
                      )
                  }
              })},
            passport.authenticate('local', { failureRedirect: '/' }),
            (req, res, next) => {
                res.redirect('/profile');
            }
        );
  app.use((req, res, next) => {
      res.status(404)
      .type('text')
      .send('Not Found');
    });
    }
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }
  res.redirect('/');
};