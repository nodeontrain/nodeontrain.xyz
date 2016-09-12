---
layout: tuts
title: Layout links
prev_section: some_structure
next_section: user_signup_first_step
permalink: /tuts/layout_links/
---

Now that we've finished a site layout with decent styling, it's time to start filling in the links we've stubbed out with '#'. Of course, we could hard-code links like

{% highlight html %}
<a href="/static_pages/about">About</a>
{% endhighlight %}

but that isn't the AngularUI. For one, it would be nice if the URL for the about page were `/about` rather than `/static_pages/about`. Moreover, AngularUI conventionally uses `ui-sref` and state name, which involves code like

{% highlight html %}
<a href ui-sref="about">About</a>
{% endhighlight %}

This way the code has a more transparent meaning, and it's also more flexible since we can change the definition of `about` and have the URL change everywhere `about` is used.

### Contact page

For completeness, we'll add the Contact page. The test appears as in `public/test/e2e_test/controllers/static_pages_controller_test.js`

{% highlight javascript %}
describe('staticPagesControllerTest', function() {

	it('should get home', function() {
		var current_url = 'http://localhost:1337/#/static_pages/home';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/home');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Home | Node On Train Tutorial Sample App');
	});
	it('should get help', function() {
		var current_url = 'http://localhost:1337/#/static_pages/help';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/help');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Help | Node On Train Tutorial Sample App');
	});

	it('should get about', function() {
		var current_url = 'http://localhost:1337/#/static_pages/about';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/about');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('About | Node On Train Tutorial Sample App');
	});

	it('should get contact', function() {
		var current_url = 'http://localhost:1337/#/static_pages/contact';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/static_pages/contact');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Contact | Node On Train Tutorial Sample App');
	});

});
{% endhighlight %}

At this point, the tests should be failing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
4 specs, 1 failure
{% endhighlight %}

First we update the routes in `public/app.js`

{% highlight javascript %}
$urlRouterProvider.otherwise('/static_pages/home');
$stateProvider
.state('static_pages_help', {
	url: '/static_pages/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl',
	data: {
		title: 'Help'
	}
})
.state('static_pages_home', {
	url: '/static_pages/home',
	templateUrl: 'partials/static_pages/home.html',
	controller: 'StaticPagesHomeCtrl',
	data: {
		title: 'Home'
	}
})
.state('static_pages_about', {
	url: '/static_pages/about',
	templateUrl: 'partials/static_pages/about.html',
	controller: 'StaticPagesAboutCtrl',
	data: {
		title: 'About'
	}
})
.state('static_pages_contact', {
	url: '/static_pages/contact',
	templateUrl: 'partials/static_pages/contact.html',
	controller: 'StaticPagesContactCtrl',
	data: {
		title: 'Contact'
	}
})
{% endhighlight %}

then we add a contact action to the Static Pages controller in `public/controllers/static_pages_controller.js`

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
staticPagesController.controller(
	'StaticPagesContactCtrl',
	['$scope', function ($scope) {
	}]
);
{% endhighlight %}

and finally we create a Contact view in `public/partials/static_pages/contact.html`

{% highlight html %}
<h1>Contact</h1>
<p>
  Contact the Node On Train Tutorial about the sample app at the
  <a href="http://www.nodeontrain.xyz">contact page</a>.
</p>
{% endhighlight %}

Now make sure that the tests are successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
4 specs, 0 failures
{% endhighlight %}



### AngularJS routes

To change the named state for the Help, About, and Contact pages, we need to make changes to the routes in `public/app.js` transforming lines like

{% highlight javascript %}
.state('static_pages_help', {
	url: '/static_pages/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl',
	data: {
		title: 'Help'
	}
})
{% endhighlight %}

to

{% highlight javascript %}
.state('help', {
	url: '/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl',
	data: {
		title: 'Help'
	}
})
{% endhighlight %}

Applying this rule change to the remaining static page routes

`public/app.js`

{% highlight javascript %}
$urlRouterProvider.otherwise('/home');
$stateProvider
.state('help', {
	url: '/help',
	templateUrl: 'partials/static_pages/help.html',
	controller: 'StaticPagesHelpCtrl',
	data: {
		title: 'Help'
	}
})
.state('home', {
	url: '/home',
	templateUrl: 'partials/static_pages/home.html',
	controller: 'StaticPagesHomeCtrl',
	data: {
		title: 'Home'
	}
})
.state('about', {
	url: '/about',
	templateUrl: 'partials/static_pages/about.html',
	controller: 'StaticPagesAboutCtrl',
	data: {
		title: 'About'
	}
})
.state('contact', {
	url: '/contact',
	templateUrl: 'partials/static_pages/contact.html',
	controller: 'StaticPagesContactCtrl',
	data: {
		title: 'Contact'
	}
})
{% endhighlight %}


### Using ui-sref

We'll start in the header partial, `public/partials/layouts/_header.html`, which has links to the Home and Help pages. While we're at it, we'll follow a common web convention and link the logo to the Home page as well.

{% highlight html %}
<div class="container">
	<a href ui-sref="home" id="logo">sample app</a>
	<nav>
		<ul class="nav navbar-nav navbar-right">
			<li><a href ui-sref="home">Home</a></li>
			<li><a href ui-sref="help">Help</a></li>
			<li><a href="">Log in</a></li>
		</ul>
	</nav>
</div>
{% endhighlight %}

The other place with links is the footer `public/partials/layouts/_footer.html.erb`, which has links for the About and Contact pages

{% highlight html %}
<small>
	The <a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a>
	by <a href="https://twitter.com/thanhdd_it">Dang Thanh</a>
</small>
<nav>
	<ul>
		<li><a href ui-sref="about" ui-sref-opts="{reload: true}">About</a></li>
		<li><a href ui-sref="contact" ui-sref-opts="{reload: true}">Contact</a></li>
		<li><a href="http://nodeontrain.xyz/news/">News</a></li>
	</ul>
</nav>
{% endhighlight %}


### Layout link tests

We can get started by generating a template test, which we'll call site_layout

`public/test/e2e_test/integration/site_layout_test.js`

{% highlight javascript %}
describe('SiteLayoutTest', function() {
	it('layout links', function() {
		var current_url = 'http://localhost:1337/#/home';
		browser.get(current_url);
		expect( element.all(by.css('[ui-sref="home"]')).count() ).toEqual(2);
		expect( element.all(by.css('[ui-sref="help"]')).count() ).toEqual(1);
		expect( element.all(by.css('[ui-sref="about"]')).count() ).toEqual(1);
		expect( element.all(by.css('[ui-sref="contact"]')).count() ).toEqual(1);
	});
});
{% endhighlight %}

We also change the `static_pages_controller_test` for the new routes

`public/test/e2e_test/controllers/static_pages_controller_test.js`

{% highlight javascript %}
describe('staticPagesControllerTest', function() {

	it('should get home', function() {
		var current_url = 'http://localhost:1337/#/home';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/home');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Home | Node On Train Tutorial Sample App');
	});
	it('should get help', function() {
		var current_url = 'http://localhost:1337/#/help';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/help');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Help | Node On Train Tutorial Sample App');
	});

	it('should get about', function() {
		var current_url = 'http://localhost:1337/#/about';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/about');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('About | Node On Train Tutorial Sample App');
	});

	it('should get contact', function() {
		var current_url = 'http://localhost:1337/#/contact';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/contact');
		expect( element(by.css('body')).getText() ).not.toEqual('');
		expect(browser.getTitle()).toEqual('Contact | Node On Train Tutorial Sample App');
	});

});
{% endhighlight %}


You should run the full test suite to verify that all the tests are successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
5 specs, 0 failures
{% endhighlight %}
