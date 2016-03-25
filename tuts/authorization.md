---
layout: tuts
title: Authorization
prev_section: updating_users
next_section: showing_all_users
permalink: /tuts/authorization/
---

In the context of web applications, authentication allows us to identify users of our site, and authorization lets us control what they can do. One nice effect of building the authentication machinery in ["Log in & Log out" Chapter](https://nodeontrain.xyz/tuts/sessions/) is that we are now in a position to implement authorization as well.

### Requiring logged-in users

To implement the forwarding behavior, we’ll use a before filter in the Users controller.

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [{ action: 'logged_in_user', only: ['update'] }];
	...
	this.logged_in_user = function(req, res, next) {
		if (!sessionHelper.current_user(req)) {
			res.statusCode = 401;
			return res.end();
		}
	};
}

module.exports = UsersController;
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var current_user = ['$q', '$rootScope', 'Sessions', '$state', 'flashHelper', function($q, $rootScope, Sessions, $state, flashHelper){
	var deferred = $q.defer();
	Sessions.get({}).$promise.then(function(session) {
		if (session.id) {
			$rootScope.logged_in = true;
			$rootScope.current_user = session;
			deferred.resolve(session);
		} else {
			$rootScope.logged_in = false;
			$rootScope.current_user = null;
			flashHelper.set({type: "danger", content: "Please log in."});
			$state.transitionTo('login', {}, {
				reload: true, inherit: false, notify: true
			});
		}
	});
	return deferred.promise;
}];

sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('user_edit', {
		url: '/users/:id/edit',
		templateUrl: 'partials/users/edit.html',
		controller: 'UsersEditCtrl',
		resolve: {
			user: current_user
		},
		data: {
			title: 'Edit user'
		}
	})
}]);
...
{% endhighlight %}

<img src="/img/tuts/authorization1.png" alt="authorization 1" width="100%" />

Our test suite is currently failing. The reason is that the edit and update actions now require a logged-in user, but no user is logged in inside the corresponding tests. We’ll fix our test suite by logging the user in before hitting the edit or update actions.

`public/test/e2e_test/integration/users_edit_test.js`

{% highlight javascript %}
describe('UsersEditTest', function() {
	it('unsuccessful edit', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).sendKeys('123456');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');

		current_url = 'http://localhost:1337/#/users/1/edit';
		browser.get(current_url);
		element(by.css('[name="name"]')).clear('');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@invalid');
		element(by.css('[name="password"]')).sendKeys('foo');
		element(by.css('[name="password_confirmation"]')).sendKeys('bar');
		element(by.css('[name="commit"]')).click();
		expect( element.all(by.css('.has-error')).count() ).toEqual(3);
	})

	it('successful edit', function() {
		var current_url = browser.getCurrentUrl();
		element(by.css('[name="name"]')).clear('');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="name"]')).sendKeys('Foo Bar');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="password_confirmation"]')).clear('');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).not.toEqual(current_url);
	})
})
{% endhighlight %}

At this point, our test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
16 specs, 0 failures
{% endhighlight %}

Even though our test suite is now passing, we’re not finished with the before filter, because the suite is still successful even if we remove our security model, as you can verify by commenting it out

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
//	this.before_action = [{ action: 'logged_in_user', only: ['update'] }];
	...
}

module.exports = UsersController;
{% endhighlight %}

So the test should definitely be failing. Because the before filter operates on a per-action basis, we’ll put the corresponding tests in the Users controller test. The plan is to hit the edit action with the right kinds of requests and verify that the flash is set and that the user is redirected to the login path.

`public/test/e2e_test/controllers/users_controller_test.js`

{% highlight javascript %}
describe('usersControllerTest', function() {
	...

	it('should redirect edit when not logged in', function() {
		var current_url = 'http://localhost:1337/#/users/1/edit';
		browser.get(current_url);
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})

	it('unsuccessful update when not logged in', function(done){
		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'userService' ]);
			var User = $injector.get( 'User' );
			User.update({id: 1, email: 'user@info.xyz'}, function(user){
				callback(user);
			}, function(error){
				callback(error);
			});
		}).then(function (output) {
			expect( output.status ).toEqual(401);
			done();
		});
	})

});
{% endhighlight %}

The test suite should now be failing, as successful. To get it to green, just uncomment the before filter

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [{ action: 'logged_in_user', only: ['update'] }];
	...
}

module.exports = UsersController;
{% endhighlight %}

With that, our test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
17 specs, 0 failures
{% endhighlight %}

### Requiring the right user

Of course, requiring users to log in isn’t quite enough; users should only be allowed to edit their own information.

In order to make sure users can’t edit other users’ information, we need to be able to log in as a second user.

`public/test/e2e_test/controllers/users_controller_test.js`

{% highlight javascript %}
describe('usersControllerTest', function() {
	...
	it('should redirect edit when logged in as wrong user', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		browser.get('http://localhost:1337/#/users/1/edit');
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})

	it('unsuccessful update when logged in as wrong user', function() {
		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'userService' ]);
			var User = $injector.get( 'User' );
			User.update({id: 1, name: 'Foo'}, function(user){
				callback(user);
			}, function(error){
				callback(error);
			});
		}).then(function (output) {
			expect( output.status ).toEqual(401);
			done();
		});
	})
})
{% endhighlight %}

To redirect users trying to edit another user’s profile, we’ll add a second method called correct_user, together with a before filter to call it

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['update'] },
		{ action: 'correct_user', only: ['update'] }
	];

	...

	this.correct_user = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		var current_user = sessionHelper.current_user(req);
		if (!user || !current_user || current_user && user && user.id != current_user.id ) {
			res.statusCode = 401;
			return res.end();
		}
	};
}

module.exports = UsersController;
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var current_user = ['$q', '$rootScope', 'Sessions', '$state', 'flashHelper', 'sessionHelper', '$stateParams', function($q, $rootScope, Sessions, $state, flashHelper, sessionHelper, $stateParams){
	var deferred = $q.defer();
	Sessions.get({}).$promise.then(function(session) {
		if (session.id) {
			$rootScope.logged_in = true;
			$rootScope.current_user = session;
			if ( $state.next.name == 'user_edit' && $stateParams.id.toString() != session.id ) {
				flashHelper.set({type: "danger", content: "Please log in."});
				$state.transitionTo('login', {}, {
					reload: true, inherit: false, notify: true
				});
			} else {
				deferred.resolve(session);
			}
		} else {
			$rootScope.logged_in = false;
			$rootScope.current_user = null;
			flashHelper.set({type: "danger", content: "Please log in."});
			$state.transitionTo('login', {}, {
				reload: true, inherit: false, notify: true
			});
		}
	});
	return deferred.promise;
}];
...
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersEditCtrl',
	['$scope', 'User', '$q', '$state', 'flashHelper', 'user', function ($scope, User, $q, $state, flashHelper, user) {
		...
		$scope.saveUser = function() {
			User.update($scope.user, function(user){
				if ( user.errors ) {
					$scope.error_messages = user.errors;
				} else {
					flashHelper.set({type: "success", content: "Profile updated"});
					$state.transitionTo('user_detail', {id: user.id}, {
						reload: true, inherit: false, notify: true
					});
				}
			}, function(error){
				if (error.status == 401) {
					flashHelper.set({type: "danger", content: "Please log in."});
					$state.transitionTo('login', {}, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
...
{% endhighlight %}

At this point, our test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
20 specs, 0 failures
{% endhighlight %}

### Friendly forwarding

Our site authorization is complete as written, but there is one minor blemish: when users try to access a protected page, they are currently redirected to their profile pages regardless of where they were trying to go. In other words, if a non-logged-in user tries to visit the edit page, after logging in the user will be redirected to /users/1 instead of /users/1/edit. It would be much friendlier to redirect them to their intended destination instead.

`public/test/e2e_test/integration/users_edit_test.js`

{% highlight javascript %}
describe('UsersEditTest', function() {
	it('successful edit with friendly forwarding', function() {
		var current_url = 'http://localhost:1337/#/users/1/edit';
		browser.get(current_url);

		expect( browser.getCurrentUrl() ).toContain('#/login');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).sendKeys('123456');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users');
		element(by.css('[name="name"]')).clear('');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="name"]')).sendKeys('Rails Tutorial ' + new Date().getTime());
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="password_confirmation"]')).clear('');
		element(by.css('[name="commit"]')).click();
		expect( element.all(by.css('.alert-success')).count() ).toEqual(1);
	})

	it('unsuccessful edit', function() {
		var current_url = 'http://localhost:1337/#/users/1/edit';
		browser.get(current_url);
		element(by.css('[name="name"]')).clear('');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@invalid');
		element(by.css('[name="password"]')).sendKeys('foo');
		element(by.css('[name="password_confirmation"]')).sendKeys('bar');
		element(by.css('[name="commit"]')).click();
		expect( element.all(by.css('.has-error')).count() ).toEqual(3);
	})

	it('successful edit', function() {
		var current_url = browser.getCurrentUrl();
		element(by.css('[name="name"]')).clear('');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="name"]')).sendKeys('Foo Bar');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="password_confirmation"]')).clear('');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).not.toEqual(current_url);
	})
})
{% endhighlight %}

Now that we have a failing test, we’re ready to implement friendly forwarding. In order to forward users to their intended destination, we need to store the state of the requested page somewhere, and then redirect to that state instead of to the default. We accomplish this with a pair of methods, `store_location` and `redirect_back_or`, both defined in the `sessionHelper`

`public/app.js`

{% highlight javascript %}
var sampleApp = angular.module('sampleApp', [
	...
	'flashHelper',
	'sessionHelper'
]);
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="helpers/flash_helper.js"></script>
<script src="helpers/session_helper.js"></script>
...
{% endhighlight %}

`public/helpers/session_helper.js`

{% highlight javascript %}
var sessionHelper = angular.module('sessionHelper', []);

sessionHelper.factory('sessionHelper', ['$rootScope', '$state', function($rootScope, $state) {
	return {
		redirect_back_or: function(state, params) {
			if ($rootScope.forwarding) {
				$state.transitionTo($rootScope.forwarding.state, $rootScope.forwarding.params, {
					reload: true, inherit: false, notify: true
				});
				$rootScope.forwarding = null;
			} else {
				$state.transitionTo(state, params, {
					reload: true, inherit: false, notify: true
				});
			}
		},
		store_location: function() {
			$rootScope.forwarding = {state: $state.next.name, params: $state.toParams};
		}
	};
}]);
{% endhighlight %}

To make use of `store_location`, we need to add it to the `logged_in` state

`public/app.js`

{% highlight javascript %}
...
var current_user = ['$q', '$rootScope', 'Sessions', '$state', 'flashHelper', 'sessionHelper', '$stateParams', function($q, $rootScope, Sessions, $state, flashHelper, sessionHelper, $stateParams){
	var deferred = $q.defer();
	Sessions.get({}).$promise.then(function(session) {
		if (session.id) {
			$rootScope.logged_in = true;
			$rootScope.current_user = session;
			if ( $state.next.name == 'user_edit' && $stateParams.id.toString() != session.id ) {
				sessionHelper.store_location();
				flashHelper.set({type: "danger", content: "Please log in."});
				$state.transitionTo('login', {}, {
					reload: true, inherit: false, notify: true
				});
			} else {
				deferred.resolve(session);
			}
		} else {
			$rootScope.logged_in = false;
			$rootScope.current_user = null;
			sessionHelper.store_location();
			flashHelper.set({type: "danger", content: "Please log in."});
			$state.transitionTo('login', {}, {
				reload: true, inherit: false, notify: true
			});
		}
	});
	return deferred.promise;
}];
...
{% endhighlight %}

To implement the forwarding itself, we use the redirect_back_or method to redirect to the requested URL if it exists, or some default URL otherwise.


`public/controllers/sessions_controller.js`

{% highlight javascript %}
'use strict';

var sessionsController = angular.module('sessionsController', []);

sessionsController.controller(
	'SessionsNewCtrl',
	['$scope', '$state', 'Sessions', 'flashHelper', '$rootScope', 'sessionHelper', function ($scope, $state, Sessions, flashHelper, $rootScope, sessionHelper) {
		...
		$scope.login = function() {
			Sessions.create($scope.user, function(user){
				if ( user.error ) {
					flashHelper.set({type: "danger", content: user.error}, true);
				} else {
					$rootScope.logged_in = true;
					$rootScope.current_user = user;
					sessionHelper.redirect_back_or('user_detail', {id: user.id});
				}
			});
		};
	}]
);
{% endhighlight %}

As usual, it’s a good idea to verify that the test suite is successful before proceeding

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
21 specs, 0 failures
{% endhighlight %}
