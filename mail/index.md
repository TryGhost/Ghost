---
layout: mail
meta_title: Ghost Mail Configuration - Ghost Docs
meta_description: How to configure your email server and send emails with the Ghost blogging platform. Everything you need to know.
heading: Setting up Email
chapter: mail
canonical: http://support.ghost.org/mail/
redirectToCanonical: true
---


## Mail Configuration <a id="email-config"></a>

The following documentation details how to configure email in Ghost. Ghost uses [Nodemailer](https://github.com/andris9/Nodemailer), their documentation contains even more examples.

### Wait what?

Most other other blogging platforms are based on a scripting language called PHP. If you’ve used those platforms before, you’re probably used to having email just magically work. Ghost is based on Node.js. Node is shiny and new, and still a little rough around the edges. It requires some configuration to get email working.

But don't fear, setting up your email is a one-time thing and we're here to walk you through it.

### But why?

At the moment, the only thing Ghost uses email for is sending you an email with a new password if you forget yours. It's not much, but don't underestimate how useful that feature is if you ever happen to need it.

In the future, Ghost will also support setting up email-based subscriptions to your blogs. Emailing new users account details, and other little helpful features that depend on the ability to send mail.

## Ok, so how do I do it? <a id="how-to"></a>

The first thing you're going to need is an account with an email sending service. We highly recommend Mailgun. They have a nice free starter account which allows you to send more email than all but the most prolific email-subscription based blogs could manage. You could also use Gmail or Amazon SES.

Once you've decided on what email service to use, you need to add your settings to Ghost's config file. Wherever you have installed Ghost, you should find a <code class="path">config.js</code> file in the root directory along with <code class="path">index.js</code>. If you don't have a <code class="path">config.js</code> file yet, then copy <code class="path">config.example.js</code> and rename it.

### Mailgun <a id="mailgun"></a>

Head along to [mailgun.com](http://www.mailgun.com/) and sign up for an account. It's free to use up to 10.000 emails per month. After signing up with Mailgun, verify your email address and [log-in to your account](https://www.mailgun.com/cp). Mailgun allows you to use your own domain for sending transactional emails but if you do not own one it is possible to simply use the handy subdomain that they provide you with (also known as the sandbox domain), although sandbox domains are limited to 300 emails per day. You can change this later, so for now let's use the subdomain automatically generated for you.

Now you have two choices: 

1. Use the [official Mailgun `config.js` generator available here](https://ghost.mailgun.com)
2. Edit your files manually (Continue reading below)

You're going to need to find your new email service username and password that Mailgun have created for you (they're not the ones you sign up with), by clicking on your sandbox domain on the right hand side. Here is an updated screencast to understand exactly where to find these details:

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />

Right, now you've got everything you need, it's time to open up your config file. Open your <code class="path">config.js</code> file in the editor of your choice. Navigate to the environment you want to setup mail for, and change your mail settings to look like this:

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

Put your 'Login' from mailgun between the quote marks next to 'user' and your 'Password' from mailgun inside the quotes next to 'pass'. If I was configuring mailgun for the 'tryghosttest' account, it would look like this:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

Keep an eye out for all of the colons, quotes and curly brackets. Misplace one of those and you'll find you get weird errors.

You can reuse your settings for both your development and production environment if you have both.

### Amazon SES <a id="ses"></a>

You can sign up for an Amazon Simple Email Service account over at <http://aws.amazon.com/ses/>. Once you finish signing up, you'll be given an SMTP user name and password.

Open Ghost's <code class="path">config.js</code> file in the editor of your choice. Navigate to the environment you want to setup mail for, and add your Amazon SMTP credentials to your mail settings as shown below:

```
mail: {
    transport: 'SMTP',
    host: 'YOU-SES-SERVER-NAME',
        options: {
            port: 465,
            service: 'SES',
            auth: {
                user: 'YOUR-SES-ACCESS-KEY-ID',
                pass: 'YOUR-SES-SECRET-ACCESS-KEY'
            }
        }
}
```

Another way to configure mail is using your AWS access keys, like this:

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

The <a href="https://gist.github.com/neilstuartcraig/7025554">first option</a> is safer as stated on <a href="http://docs.aws.amazon.com/general/latest/gr/root-vs-iam.html">AWS Reference guide</a>

### Gmail <a id="gmail"></a>

It is possible to use Gmail to send email from Ghost. If you are going to do this, we recommend that you [create a new account](https://accounts.google.com/SignUp) for the purpose, rather than using any existing personal email account details.

Once you've created your new account, you can configure the settings in Ghost's <code class="path">config.js</code> file. Open the file in the editor of your choice. Navigate to the environment you want to setup mail for, and change your mail settings to look like this:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Gmail',
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### From Address <a id="from"></a>

By default the 'from' address for mail sent from Ghost will be set to the email address on the general settings page. If you want to override this to something different, you can also configure it in the <code class="path">config.js</code> file.

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
