---
layout: tuts
title: Logging in
prev_section: sessions
next_section: logging_out
permalink: /tuts/logging_in/
---

Now that our login form can handle invalid submissions, the next step is to handle valid submissions correctly by actually logging a user in.

### The log_in method

Logging a user in is simple with the help of the `req.session` object defined by `cookie-session` module.

{% highlight bash %}
~/sample_app $ npm install cookie-session --save
{% endhighlight %}

`app.js`

{% highlight javascript %}
var connect = require('connect');
var bodyParser = require('body-parser');

var cookieSession = require('cookie-session');

var app = connect();
app.use(bodyParser.json());

app.use(cookieSession({
	keys: ['1234567890QWERTY']
}));

module.exports = app;
{% endhighlight %}

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	log_in: function(req, user) {
		req.session.user_id = user.id;
	}
};
{% endhighlight %}

With the log_in method defined, we’re now ready to complete the session create action by logging the user in and redirecting to the user’s profile page.

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && user.authenticate(req.body.password)) {
			sessionHelper.log_in(req, user);
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
	['$scope', '$state', 'Sessions', 'flashHelper', '$rootScope', function ($scope, $state, Sessions, flashHelper, $rootScope) {
		...
		$scope.login = function() {
			Sessions.create($scope.user, function(user){
				if ( user.error ) {
					flashHelper.set({type: "danger", content: user.error}, true);
				} else {
					$rootScope.logged_in = true;
					$rootScope.current_user = user;
					$state.transitionTo('user_detail', {id: user.id}, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
{% endhighlight %}

### Current user

Having placed the user’s id securely in the temporary session, we are now in a position to retrieve it on subsequent pages, which we’ll do by defining a current_user method to find the user in the database corresponding to the session id.

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	log_in: function(req, user) {
		req.session.user_id = user.id;
	},
	current_user: function(req) {
		return ModelSync( User.findById(req.session.user_id) );
	}
};
{% endhighlight %}

### Changing the layout links

The first practical application of logging in involves changing the layout links based on login status. The way to change the links in the site layout involves using an if-else statement inside embedded Angular to show one set of links if the user is logged in and another set of links otherwise.

This kind of code requires the existence of a logged_in state, which we’ll now define.

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	.state('logged_in', {
		template: '<ui-view/>',
		resolve: {
			current_user: ['$q', '$rootScope', 'Sessions', function($q, $rootScope, Sessions){
				var deferred = $q.defer();
				Sessions.get({}, function(session) {
					if (session.id) {
						$rootScope.logged_in = true;
					} else {
						$rootScope.logged_in = false;
					}
					$rootScope.current_user = session;
					deferred.resolve(session);
				}, function(error) {
					deferred.resolve(null);
				});
				return deferred.promise;
			}]
		}
	})
	...
}]);
...
sampleApp.run(['$rootScope', 'Sessions', function($rootScope, Sessions) {
	Sessions.get({}).$promise.then(function(session) {
		if (session.id) {
			$rootScope.logged_in = true;
		} else {
			$rootScope.logged_in = false;
		}
		$rootScope.current_user = session;
	});
}]);
{% endhighlight %}

`public/services/user.js`

{% highlight javascript %}
var sessionsService = angular.module('sessionsService', ['ngResource']);

sessionsService.factory('Sessions', ['$resource', function($resource){
	return $resource('sessions/:id', {id:'@id'}, {
		'create': {method: 'POST'},
		'delete': {method: 'DELETE'},
		'get': {method: 'GET'}
	});
}]);
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'users' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
];
{% endhighlight %}

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	this.create = function(req, res, next) {
		...
	};
	this.destroy = function(req, res, next) {
	};
	this.current_user = function(req, res, next) {
		res.end(JSON.stringify( sessionHelper.current_user(req) ));
	};
}

module.exports = SessionsController;
{% endhighlight %}

`public/partials/layouts/_header.html`
{% highlight html %}
<div class="container">
	<a href ui-sref="home" ui-sref-opts="{reload: true}" id="logo">sample app</a>
	<nav>
		<ul class="nav navbar-nav navbar-right">
			<li><a href ui-sref="home" ui-sref-opts="{reload: true}">Home</a></li>
			<li><a href ui-sref="help" ui-sref-opts="{reload: true}">Help</a></li>
			<li ng-if="logged_in"><a href="#">Users</a></li>
			<li ng-if="logged_in" class="dropdown">
				<a href class="dropdown-toggle" data-toggle="dropdown">
					Account <b class="caret"></b>
				</a>
				<ul class="dropdown-menu">
					<li><a href ui-sref="user_detail({id: current_user.id})" ui-sref-opts="{reload: true}">Profile</a></li>
					<li><a href="#">Settings</a></li>
					<li class="divider"></li>
					<li><a href="#">Log out</a></li>
				</ul>
			</li>
			<li ng-if="!logged_in"><a href ui-sref="login" ui-sref-opts="{reload: true}">Log in</a></li>
		</ul>
	</nav>
</div>
{% endhighlight %}

To activate the dropdown menu, we need to include Bootstrap’s custom JavaScript library.

{% highlight bash %}
~/sample_app $ npm install jquery --save
{% endhighlight %}

`public/index.html`
{% highlight html %}
...
<script src="../node_modules/jquery/dist/jquery.min.js"></script>
<script src="../node_modules/bootstrap/dist/js/bootstrap.min.js"></script>

<script src="../node_modules/angular-form-for/dist/form-for.min.js"></script>
<script src="../node_modules/angular-form-for/dist/form-for.bootstrap-templates.js"></script>
...
{% endhighlight %}


### Testing layout changes

Having verified by hand that the application is behaving properly upon successful login, before moving on we’ll write an integration test to capture that behavior and catch regressions.

1. Visit the login path.
2. Post valid information to the sessions path.
3. Verify that the login link disappears.
4. Verify that a profile link appears.

`public/test/e2e_test/integration/users_login_test.js`

{% highlight javascript %}
describe('UsersLoginTest', function() {
	...

	it('login with valid information', function() {
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();
		expect( browser.getCurrentUrl() ).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
		expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(1);
	});
});
{% endhighlight %}

This test should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
...........

11 specs, 0 failures
{% endhighlight %}

### Login upon signup

Although our authentication system is now working, newly registered users might be confused, as they are not logged in by default. Because it would be strange to force users to log in immediately after signing up, we’ll log in new users automatically as part of the signup process. To arrange this behavior, all we need to do is add a call to `log_in` in the Users controller `create` action

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.show = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		res.end(JSON.stringify(user));
	};

	this.create = function(req, res, next) {
		var user = ModelSync( User.create(req.body) );
		if (user && !user.errors)
			sessionHelper.log_in(req, user);
		res.end(JSON.stringify(user));
	};
}

module.exports = UsersController;
{% endhighlight %}

`public/test/e2e_test/integration/users_signup_test.js`

{% highlight javascript %}
describe('UsersSignupTest', function() {
	...

	it('valid signup information', function() {
		var current_url = 'http://localhost:1337/#/signup';
		var string = new Date().getTime();
		browser.get(current_url);
		element(by.css('[name="name"]')).sendKeys('Example User');
		element(by.css('[name="email"]')).sendKeys('user-'+string+'@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="password_confirmation"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
		expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(1);
	});
});
{% endhighlight %}

At this point, the test suite should still be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
...........

11 specs, 0 failures
{% endhighlight %}
