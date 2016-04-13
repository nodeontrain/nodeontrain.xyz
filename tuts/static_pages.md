---
layout: tuts
title: Static pages
prev_section: microposts_resource
next_section: first_testing
permalink: /tuts/static_pages/
---

As in ["Planning the application" Section](https://nodeontrain.xyz/tuts/planning_app/), before getting started we need to create a new project, this time called `sample_app`

{% highlight bash %}
~ $ trainjs new sample_app
~ $ cd sample_app
{% endhighlight %}

With all the preparation from ["Static pages" Section](https://nodeontrain.xyz/tuts/static_pages/) finished, we're ready to get started developing the sample application. In this section, we'll take a first step toward making dynamic pages by creating a set of actions and views containing only static HTML. We'll be working mainly in the `public/controllers` and `public/partials` directories.

### Generated static pages
To get started with static pages, we'll first generate a controller using the same `trainjs generate` script we used in ["The Users resource" Section](https://nodeontrain.xyz/tuts/users_resource/) to generate scaffolding.

{% highlight bash %}
~/sample_app $ trainjs generate controller StaticPages home help
	  create  protractor.conf.js
	  create  public/controllers
	  create  public/controllers/static_pages_controller.js
	  create  public/partials/controller_name
	  create  public/partials/static_pages/home.html
	  create  public/partials/static_pages/help.html
	  create  public/test
	  create  public/test/e2e_test
	  create  public/test/e2e_test/controllers/static_pages_controller_test.js
{% endhighlight %}

Since we included the `home` and `help` actions, the `public/app.js` file already has a rule for each one.

{% highlight javascript %}
.state('static_pages_help', {
	url: '/static_pages/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl'
})
.state('static_pages_home', {
	url: '/static_pages/home',
	templateUrl: 'partials/static_pages/home.html',
	controller: 'StaticPagesHomeCtrl'
})
{% endhighlight %}

In our case, this means that when we generate a `home` action inside the Static Pages controller we automatically get a page at the address <a href="http://sample.nodeontrain.xyz/#/static_pages/home" target="_blank">/static_pages/home</a>.

{% highlight javascript %}
'use strict';

var staticPagesController = angular.module('staticPagesController', []);

staticPagesController.controller(
	'StaticPagesHomeCtrl',
	['$scope', function ($scope) {
	}]
);
staticPagesController.controller(
	'StaticPagesHelpCtrl',
	['$scope', function ($scope) {
	}]
);
{% endhighlight %}

The generated view for the Home page.
{% highlight html %}
<h1>StaticPages#home</h1>
<p>Find me in public/partials/static_pages/home.html</p>
{% endhighlight %}

The generated view for the Help page.
{% highlight html %}
<h1>StaticPages#help</h1>
<p>Find me in public/partials/static_pages/help.html</p>
{% endhighlight %}


### Custom static pages
Custom HTML for the Home page.

`public/partials/static_pages/home.html`

{% highlight html %}
<h1>Sample App</h1>
<p>
  This is the home page for the
  <a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a>
  sample application.
</p>
{% endhighlight %}

Custom HTML for the Help page.

`public/partials/static_pages/help.html`
{% highlight html %}
<h1>Help</h1>
<p>
  Get help on the Node On Train Tutorial at the
  <a href="http://www.nodeontrain.xyz/help/">Node On Train Tutorial help section</a>.
  To get help on this sample app, see the
  <a href="http://www.nodeontrain.xyz/tuts/home/"><em>Node On Train Tutorial</em>
  book</a>.
</p>
{% endhighlight %}


