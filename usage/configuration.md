---
layout: usage
meta_title: How to Use Ghost - Ghost Docs
meta_description: An in depth guide to using the Ghost blogging platform. Got Ghost but not sure how to get going? Start here!
heading: Using Ghost
subheading: Finding your way around, and getting set up the way you want
chapter: usage
section: configuration
permalink: /usage/configuration/
prev_section: usage
next_section: settings
canonical: http://support.ghost.org/config/
redirectToCanonical: true
---



## Configuring Ghost <a id="configuration"></a>

After you run Ghost for the first time, you'll find a file called `config.js` in the root directory of Ghost, along with the `index.js`. This file allows you to set environment level configuration for things like your URL, database, and mail settings.

If you haven't yet run Ghost for the first time, you won't have this file yet. You can create one by copying the `config.example.js` file - that's what Ghost does when it starts.

To configure your Ghost URL, mail or database settings, open `config.js` in your favourite editor, and start changing the settings for your desired environment. If environments aren't something you've come across yet, read the [documentation](#environments) below.

## Configuration options

Ghost has a number of configuration options which you can add to change things about how Ghost works.

### Email

Possibly the most important piece of configuration is setting up email so that Ghost can let you reset your password if you forget it. Read the [email documentation]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) for more information.

### Database

By default, Ghost comes configured to use an SQLite database, which requires no configuration on your part.

If however you would like to use a MySQL database, you can do so by changing the database configuration.  You must create a database and user first, you can then change the existing sqlite3 config to something like:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'your_database_user',
    password : 'your_database_password',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

You can also limit the number of simultaneous connections should you wish, by using the `pool` setting.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### Server

The server host and port are the IP address and port number that Ghost should listen on for requests.

It is also possible to configure Ghost to listen on a unix socket instead by changing the server config to something like:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### Update Check

Ghost 0.4 introduced an automatic update check service to let you know when a new version of Ghost is available (woo!). Ghost.org collects basic anonymous usage statistics from update check requests. For more more information, see the [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) file in Ghost core.

It is possible to disable the update checks and anonymous data collection by setting the following option:

`updateCheck: false`

Please be sure to subscribe to emails from Ghost, or the [Ghost blog](http://blog.ghost.org), so that you are still informed about new versions.

### File Storage

Some platforms such as Heroku do not have a persistent file system. As a result of this, any uploaded images are likely to go missing at some point.
It is possible to disable Ghost's file storage features:

`fileStorage: false`

When file storage is disabled, Ghost's image upload tools will prompt you to enter a URL by default, thereby preventing you from uploading files that will go missing.


## About Environments <a id="environments"></a>

Node.js, and therefore Ghost, has the concept of environments built in. Environments allow you to create different configurations for different modes in which you might want to run Ghost. By default Ghost has two built-in modes: **development** and **production**.

There are a few, very subtle differences between the two modes or environments. Essentially **development** is geared towards developing and particularly debugging Ghost. Meanwhile "production" is intended to be used when you're running Ghost publicly. The differences include things like what logging & error messaging is output, and also how much static assets are concatenated and minified. In **production**, you'll get just one JavaScript file containing all the code for the admin, in **development** you'll get several.

As Ghost progresses, these differences will grow and become more apparent, and therefore it will become more and more important that any public blog runs in the **production** environment. This perhaps begs the question, why **development** mode by default, if most people are going to want to run it in **production** mode? Ghost has **development** as the default because this is the environment that is best for debugging problems, which you're most likely to need when getting set up for the first time.

##  Using Environments <a id="using-env"></a>

In order to set Ghost to run under a different environment, you need to use an environment variable. For example if you normally start Ghost with `node index.js` you would use:

`NODE_ENV=production node index.js`

Or if you normally use forever:

`NODE_ENV=production forever start index.js`

Or if you're used to using `npm start` you could use the slightly easier to remember:

`npm start --production`

### Why use `npm install --production`?

We have been asked a few times why, if Ghost starts in development mode by default, does the installation documentation say to run `npm install --production`? This is a good question! If you don't include `--production` when installing Ghost, nothing bad will happen, but it will install a tonne of extra packages which are only useful for people who want to develop Ghost core itself. This also requires that you have one particular package, `grunt-cli` installed globally, which has to be done with `npm install -g grunt-cli`, it's an extra step and it's not needed if you just want to run Ghost as a blog.
