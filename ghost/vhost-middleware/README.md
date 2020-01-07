# Vhost Middleware

Forked from https://github.com/expressjs/vhost/ which appears abandoned.

## Install

`npm install @tryghost/vhost-middleware --save`

or

`yarn add @tryghost/vhost-middleware`


## API

<!-- eslint-disable no-unused-vars -->

```js
var vhost = require('vhost')
```

### vhost(hostname, handle)

Create a new middleware function to hand off request to `handle` when the incoming
host for the request matches `hostname`. The function is called as
`handle(req, res, next)`, like a standard middleware.

`hostname` can be a string or a RegExp object. When `hostname` is a string it can
contain `*` to match 1 or more characters in that section of the hostname. When
`hostname` is a RegExp, it will be forced to case-insensitive (since hostnames are)
and will be forced to match based on the start and end of the hostname.

When host is matched and the request is sent down to a vhost handler, the `req.vhost`
property will be populated with an object. This object will have numeric properties
corresponding to each wildcard (or capture group if RegExp object provided) and the
`hostname` that was matched.

Where the `hostname` of the request comes from depends on the type of server you're running.
If you're running a raw Node.js/connect server, this comes from [`req.headers.host`](https://nodejs.org/dist/latest/docs/api/http.html#http_message_headers).
If you're running an express v4 server, this comes from [`req.hostname`](http://expressjs.com/en/4x/api.html#req.hostname).

```js
var connect = require('connect')
var vhost = require('vhost')
var app = connect()

app.use(vhost('*.*.example.com', function handle (req, res, next) {
  // for match of "foo.bar.example.com:8080" against "*.*.example.com":
  console.dir(req.vhost.host) // => 'foo.bar.example.com:8080'
  console.dir(req.vhost.hostname) // => 'foo.bar.example.com'
  console.dir(req.vhost.length) // => 2
  console.dir(req.vhost[0]) // => 'foo'
  console.dir(req.vhost[1]) // => 'bar'
}))
```

## Examples

### using with connect for static serving

```js
var connect = require('connect')
var serveStatic = require('serve-static')
var vhost = require('vhost')

var mailapp = connect()

// add middlewares to mailapp for mail.example.com

// create app to serve static files on subdomain
var staticapp = connect()
staticapp.use(serveStatic('public'))

// create main app
var app = connect()

// add vhost routing to main app for mail
app.use(vhost('mail.example.com', mailapp))

// route static assets for "assets-*" subdomain to get
// around max host connections limit on browsers
app.use(vhost('assets-*.example.com', staticapp))

// add middlewares and main usage to app

app.listen(3000)
```

### using with connect for user subdomains

```js
var connect = require('connect')
var serveStatic = require('serve-static')
var vhost = require('vhost')

var mainapp = connect()

// add middlewares to mainapp for the main web site

// create app that will server user content from public/{username}/
var userapp = connect()

userapp.use(function (req, res, next) {
  var username = req.vhost[0] // username is the "*"

  // pretend request was for /{username}/* for file serving
  req.originalUrl = req.url
  req.url = '/' + username + req.url

  next()
})
userapp.use(serveStatic('public'))

// create main app
var app = connect()

// add vhost routing for main app
app.use(vhost('userpages.local', mainapp))
app.use(vhost('www.userpages.local', mainapp))

// listen on all subdomains for user pages
app.use(vhost('*.userpages.local', userapp))

app.listen(3000)
```

### using with any generic request handler

```js
var connect = require('connect')
var http = require('http')
var vhost = require('vhost')

// create main app
var app = connect()

app.use(vhost('mail.example.com', function (req, res) {
  // handle req + res belonging to mail.example.com
  res.setHeader('Content-Type', 'text/plain')
  res.end('hello from mail!')
}))

// an external api server in any framework
var httpServer = http.createServer(function (req, res) {
  res.setHeader('Content-Type', 'text/plain')
  res.end('hello from the api!')
})

app.use(vhost('api.example.com', function (req, res) {
  // handle req + res belonging to api.example.com
  // pass the request to a standard Node.js HTTP server
  httpServer.emit('request', req, res)
}))

app.listen(3000)
```


## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.


## Run

- `yarn dev`


## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests




# Copyright & License

Copyright (c) 2013-2020 Ghost Foundation - Released under the [MIT license](LICENSE).
