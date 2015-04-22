var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var config = require('config');
var multer = require('multer'); // for multipart form
var passport = require('passport');
var expressSession = require('express-session');
var expressValidator = require('express-validator');
var mongoose = require('mongoose');

var User = require('./models/models').User;

var app = express();

//
// PASSPORT
//

app.use(expressSession({
    secret: 'I <3 Kadie'
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//
// MONGOOSE
//

var connect = function () {

    var uri;
    if ((app.get('env') === 'production') || process.env.OPENSHIFT_MONGODB_DB_URL) {
        uri = process.env.OPENSHIFT_MONGODB_DB_URL;
    }
    else {
        uri = "localhost:27017/kspms";
    }

    mongoose.connect(uri, {
        server: {
            socketOptions: {
                keepAlive: 1
            }
        }
    });
};
connect();
mongoose.connection.on('error', console.error);
mongoose.connection.on('disconnected', connect);



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(multer({ dest: './uploads' }));
app.use(expressValidator());

app.use(function (req, res, next) {
    req.mongoose = mongoose;
    res.locals.user = req.user;
    next();
});

// app.use(
//     sassMiddleware({
//         src: __dirname + '/sass',
//         dest: __dirname + '/public/stylesheets',
//         debug: true,
//         prefix: '/stylesheets',
//         outputStyle: app.get('env') === 'development' ? 'nested': 'compressed'
//     }),
//     express.static(path.join(__dirname, 'public'))
// );

var routeModuleNames = [
        'pools', 'add-pool', 'pool', 'add-subject',
        'import-subjects', 'login', 'new-user', 'logout', 
        'home'];
var routeModules = routeModuleNames.map(function (name) {
    return require('./routes/' + name);
});
app.use('/', routeModules);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
