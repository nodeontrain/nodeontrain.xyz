---
layout: tuts
title: Getting started with testing
prev_section: static_pages
next_section: dynamic_pages
permalink: /tuts/first_testing/
---

When making a change of this nature, it’s a good practice to write an automated test to verify that the feature is implemented correctly.

### Our first test

The `trainjs generate controller` command automatically generated an [end-to-end test](http://www.protractortest.org/) file to get us started

{% highlight bash %}
~/sample_app $ ls public/test/e2e_test/controllers/
static_pages_controller_test.js
{% endhighlight %}

The default tests for the staticPages controller

`public/test/e2e_test/controllers/static_pages_controller_test.js`

{% highlight javascript %}
describe('staticPagesControllerTest', function() {

	it('should get home', function() {
		var current_url = 'http://localhost:1337/#/static_pages/home';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/home');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});
	it('should get help', function() {
		var current_url = 'http://localhost:1337/#/static_pages/help';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/help');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});

});
{% endhighlight %}

To begin our testing cycle, we need to run our test suite to verify that the tests currently pass. We can do this with the [protractor](http://www.protractortest.org/), an end-to-end test framework for AngularJS

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
..

2 specs, 0 failures
{% endhighlight %}

As required, initially our test suite is passing.

### Failing test

Our first step is to write a failing test for the About page.

`public/test/e2e_test/controllers/static_pages_controller_test.js`

{% highlight javascript %}
describe('staticPagesControllerTest', function() {

	it('should get home', function() {
		var current_url = 'http://localhost:1337/#/static_pages/home';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/home');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});
	it('should get help', function() {
		var current_url = 'http://localhost:1337/#/static_pages/help';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/help');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});

	it('should get about', function() {
		var current_url = 'http://localhost:1337/#/static_pages/about';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/about');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});

});
{% endhighlight %}

As required, the test initially fails

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
..F

Failures:
1) staticPagesControllerTest should get about
  Message:
	Expected 'http://localhost:1337/#/' to contain '#/static_pages/about'.

3 specs, 1 failure
{% endhighlight %}

### Passing test

Now that we have a failing test, we’ll use the failing test’s error messages to guide us to a passing test, thereby implementing a working About page.

We can get started by examining the error message output by the failing test:

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
   Message:
	 Expected 'http://localhost:1337/#/' to contain '#/static_pages/about'.
{% endhighlight %}

The error message here says that no route matches the desired action/controller combination, which is a hint that we need to add the state to the `public/app.js` file.

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
.state('static_pages_about', {
	url: '/static_pages/about',
	templateUrl: 'partials/static_pages/about.html',
	controller: 'StaticPagesAboutCtrl'
})
{% endhighlight %}

Define `StaticPagesAboutCtrl` in the `public/controllers/static_pages_controller.js` file.
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
staticPagesController.controller(
	'StaticPagesAboutCtrl',
	['$scope', function ($scope) {
	}]
);
{% endhighlight %}

As before, our test suite is still failing, but the error message has changed again:

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
   Message:
	 Expected '' not to equal ''.
{% endhighlight %}

This indicates a missing template. We need to create a new file called about.html in the `partials/static_pages/` directory.

The generated view for the Home page.
{% highlight html %}
<h1>About</h1>
<p>
  The <a href="http://www.nodeontrain.xyz/"><em>Node On Train
  Tutorial</em></a> is a
  <a href="http://www.nodeontrain.xyz">book</a>
  to teach web development with
  <a href="http://nodeontrain.xyz/">Node On Train</a>.
  This is the sample application for the tutorial.
</p>
{% endhighlight %}


At this point, our test suite is passing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
...

3 specs, 0 failures
{% endhighlight %}

