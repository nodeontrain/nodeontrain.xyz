---
layout: tuts
title: Basic Usage
prev_section: installation
next_section: structure
permalink: /tuts/usage/
---

To get started, make a directory for your Trainjs projects and then
run the following command to make the first application:

{% highlight bash %}
~ $ trainjs new hello_app
	  create
	  create  .npmignore
	  create  README.md
	  create  app
	  create  app/controllers
	  create  app/controllers/application_controller.js
	  create  app.js
	  create  config
	  create  config/application.js
	  create  config/routes.js
	  create  package.json
	  create  public
	  create  public/app.js
	  create  public/assets
	  create  public/assets/images
	  create  public/assets/images/favicon.ico
	  create  public/assets/images/trainjs.png
	  create  public/assets/stylesheets
	  create  public/assets/stylesheets/application.css
	  create  public/directives
	  create  public/directives/body.js
	  create  public/directives/head.js
	  create  public/index.html
	  create  public/partials
	  create  public/partials/index.html
		 run  npm install
{% endhighlight %}

Trainjs also comes with a built-in development server that will allow you to
preview what the generated <a href="http://demo.nodeontrain.xyz" target="_blank">site</a> will look like in your browser locally.

{% highlight bash %}
~ $ cd hello_app
~/hello_app $ trainjs server
# => Server running at http://0.0.0.0:1337
# => Ctrl-C to shutdown server

{% endhighlight %}
