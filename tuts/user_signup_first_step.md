---
layout: tuts
title: User signup - A first step
prev_section: layout_links
next_section: user_model
permalink: /tuts/user_signup_first_step/
---

As a capstone to our work on [the layout and routing](https://nodeontrain.xyz/tuts/layout_links/), in this section we'll make a route for the signup page, which will mean creating a second controller along the way. This is a first important step toward allowing users to register for our site; we'll take the next step, modeling users, in ["Modeling users" Chapter](https://nodeontrain.xyz/tuts/user_model/), and we'll finish the job in ["Sign up" Chapter](https://nodeontrain.xyz/tuts/showing_users/).

### Users controller

We created our first controller, the Static Pages controller, in ["Static pages" Section](https://nodeontrain.xyz/tuts/static_pages/). It's time to create a second one, the Users controller.

{% highlight bash %}
~/sample_app $ trainjs generate controller Users new
	identical  protractor.conf.js
	   create  public/controllers/users_controller.js
	   create  public/partials/controller_name
	   create  public/partials/users/new.html
	   create  public/test/e2e_test/controllers/users_controller_test.js
{% endhighlight %}

It also creates a minimal test for the new user page

`public/test/e2e_test/controllers/users_controller_test.js`

{% highlight javascript %}
describe('usersControllerTest', function() {

	it('should get new', function() {
		var current_url = 'http://localhost:1337/#/users/new';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/users/new');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});

});
{% endhighlight %}

which should currently pass

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
6 specs, 0 failures
{% endhighlight %}

### Signup URL

We already have a working page for new users at `/users/new`, but we want the URL to be `/signup` instead.

{% highlight javascript %}
$urlRouterProvider.otherwise('/home');
$stateProvider
.state('signup', {
	url: '/signup',
	templateUrl: 'partials/users/new.html',
	controller: 'UsersNewCtrl',
	data: {
		title: 'Sign up'
	}
})
{% endhighlight %}

Next, we'll use the newly defined named state to add the proper link to the button on the Home page.

`public/partials/static_pages/home.html`

{% highlight html %}
<div class="center jumbotron">
  <h1>Welcome to the Sample App</h1>

  <h2>
	This is the home page for the
	<a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a>
	sample application.
  </h2>

	<a class="btn btn-lg btn-primary" href ui-sref="signup">Sign up now!</a>
</div>

<a href="http://www.nodeontrain.xyz/"><img alt="Trainjs logo" src="assets/images/trainjs.png"></a>
{% endhighlight %}

Finally, we'll add a custom stub view for the signup page

`public/partials/users/new.html`

{% highlight html %}
<h1>Sign up</h1>
<p>This will be a signup page for new users.</p>
{% endhighlight %}

We change the new user page for the new routes

{% highlight javascript %}
describe('usersControllerTest', function() {

	it('should get new', function() {
		var current_url = 'http://localhost:1337/#/signup';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/signup');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});

});
{% endhighlight %}

The tests is passing

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
6 specs, 0 failures
{% endhighlight %}

