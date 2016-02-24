---
layout: tuts
title: Sessions
prev_section: successful_signups
next_section: logging_in
permalink: /tuts/sessions/
---

The most common techniques for implementing sessions in [trainjs](https://nodeontrain.xyz) involve using cookies, which are small pieces of text placed on the user’s browser.

<div class="note info">
  <h5>trainjs</h5>
  <p>
	You should always update trainjs for this tutorial.
  </p>
</div>

### Sessions controller

The elements of logging in and out correspond to particular REST actions of the Sessions controller: the login form is handled by the new action, actually logging in is handled by sending a POST request to the create action, and logging out is handled by sending a DELETE request to the destroy action.

{% highlight bash %}
~/sample_app $ trainjs generate controller Sessions new
~/sample_app $ trainjs generate service Sessions create destroy
{% endhighlight %}

`public/app.js`

Change

{% highlight javascript %}
...
$stateProvider
.state('sessions_new', {
	url: '/sessions/new',
	templateUrl: 'partials/sessions/new.html',
	controller: 'SessionsNewCtrl'
})
...
{% endhighlight %}

to

{% highlight javascript %}
$stateProvider
.state('login', {
	url: '/login',
	templateUrl: 'partials/sessions/new.html',
	controller: 'SessionsNewCtrl',
	data: {
		title: 'Login'
	}
})
{% endhighlight %}


`public/test/e2e_test/controllers/sessions_controller_test.js`

Change

{% highlight javascript %}
describe('sessionsControllerTest', function() {
	it('should get new', function() {
		var current_url = 'http://localhost:1337/#/sessions/new';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/sessions/new');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});
});
{% endhighlight %}

to

{% highlight javascript %}
describe('sessionsControllerTest', function() {
	it('should get new', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		expect(browser.getCurrentUrl()).toContain('#/login');
		expect( element(by.css('body')).getText() ).not.toEqual('');
	});
});
{% endhighlight %}


Unlike the Users resource, which used the special `resources` method to obtain a full suite of RESTful routes automatically, the Sessions resource will use only named routes, handling POST request with the login route and DELETE request with the logout route.

`config/routes.js`

Change

{% highlight javascript %}
module.exports = [
	{ resources: 'sessions' },
	{ resources: 'users' }
];
{% endhighlight %}

to

{% highlight javascript %}
module.exports = [
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ resources: 'users' }
];
{% endhighlight %}

### Login form

With the proper form_for in hand, it’s easy to make a login form.

`public/partials/sessions/new.html`

{% highlight html %}
<h1>Log in</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="login()" validation-rules="validation_rules">
			<text-field attribute="email" label="Email" type="email"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Log in" />
		</form>
		<p>New user? <a href ui-sref="signup">Sign up now!</a></p>
	</div>
</div>
{% endhighlight %}

`public/controllers/sessions_controller.js`

{% highlight javascript %}
'use strict';

var sessionsController = angular.module('sessionsController', []);

sessionsController.controller(
	'SessionsNewCtrl',
	['$scope', '$state', 'Sessions', 'flashHelper', function ($scope, $state, Sessions, flashHelper) {
		$scope.user = {email: '', password: ''};
		$scope.validation_rules = {
			email: {
				required: true,
				maxlength: 255
			},
			password: {
				required: true,
				minlength: 6
			}
		};
		$scope.login = function() {
			Sessions.create($scope.user, function(user){
				if ( user.error ) {
					// Create an error message.
				} else {
					// Log the user in and redirect to the user's show page.
				}
			});
		};
	}]
);
{% endhighlight %}


### Finding and authenticating a user

Inside the `create` action the `req.body` has all the information needed to authenticate users by email and password. Not coincidentally, we already have exactly the methods we need: the `User.find` method and the `authenticate` method.

`app/controllers/sessions_controller.js`

{% highlight javascript %}
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.find({ where: {email: req.body.email.toLowerCase()} }) );
		if (!user.errors && user.authenticate(req.body.password)) {
			res.end(JSON.stringify(user));
		} else {
			// Create an error message.
		}
	};
	this.destroy = function(req, res, next) {
	};
}

module.exports = SessionsController;
{% endhighlight %}

### Rendering with a flash message

We’ll put a message in the flash to be displayed upon failed login.

`app/controllers/sessions_controller.js`

{% highlight javascript %}
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.find({ where: {email: req.body.email.toLowerCase()} }) );
		if (!user.errors && user.authenticate(req.body.password)) {
			res.end(JSON.stringify(user));
		} else {
			res.end(JSON.stringify({
				error: 'Invalid email/password combination'
			}));
		}
	};
	this.destroy = function(req, res, next) {
	};
}

module.exports = SessionsController;
{% endhighlight %}

`public/controllers/sessions_controller.js`

{% highlight javascript %}
'use strict';

var sessionsController = angular.module('sessionsController', []);

sessionsController.controller(
	'SessionsNewCtrl',
	['$scope', '$state', 'Sessions', 'flashHelper', function ($scope, $state, Sessions, flashHelper) {
		...
		$scope.login = function() {
			Sessions.create($scope.user, function(user){
				if ( user.error ) {
					flashHelper.set({type: "danger", content: user.error}, true);
				} else {
					// Log the user in and redirect to the user's show page.
				}
			});
		};
	}]
);
{% endhighlight %}

`public/helpers/flash_helper.js`

{% highlight javascript %}
var flashHelper = angular.module('flashHelper', []);

flashHelper.factory('flashHelper', ['$rootScope', function($rootScope) {
	....

	return {
		set: function(message, queue_pop) {
			queue.push(message);
			if (queue_pop) {
				$rootScope.flash = queue;
				queue = [];
			}
		}
	};
}]);
{% endhighlight %}


### A failed login test

We start by generating an integration test for our application’s login behavior

`public/test/e2e_test/integration/users_login_test.js`

{% highlight javascript %}
describe('UsersLoginTest', function() {
	it('login with invalid information', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('123456789');
		element(by.css('[name="commit"]')).click();
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
	});
});
{% endhighlight %}

The test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
.......

10 specs, 0 failures
{% endhighlight %}

Link demo `https://sample.nodeontrain.xyz/#/login`
