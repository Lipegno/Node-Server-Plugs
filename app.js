var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socket_io    = require( "socket.io" );
var scanner = require('./scanner');
var plugs = require('./plugs');

// Express
var app = express();

// Socket.io
var io = socket_io();
app.io = io;

// Starts the scanning of plus
scanner.networkScanner(io, plugs);

var index = require('./routes/index')(plugs);
var plug = require('./routes/plug')(io);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(function(req, res, next) {
    console.log("cross-site");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

var isMultipart = /^multipart\//i;
var urlencodedMiddleware = bodyParser.urlencoded({ extended: true });
app.use(function (req, res, next) {
    var type = req.get('Content-Type');
    if (isMultipart.test(type)) return res.status(500).send("Form-data is not supported.");
    return urlencodedMiddleware(req, res, next);
});
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/plug', plug);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
