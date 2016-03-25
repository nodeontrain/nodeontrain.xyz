---
layout: tuts
title: Successful signups
prev_section: unsuccessful_signups
next_section: sessions
permalink: /tuts/successful_signups/
---

Having handled invalid form submissions, now it’s time to complete the signup form by actually saving a new user (if valid) to the database. If it fails, we simply fall back on the behavior developed in ["Unsuccessful signups" Section](https://nodeontrain.xyz/tuts/unsuccessful_signups/).

### The finished signup form

To complete a working signup form, we need to fill in the commented-out section in `public/controllers/users_controller.js` with the appropriate behavior.

Rather than render a page on successful user creation, we’ll instead redirect to a different page.

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersNewCtrl',
	['$scope', 'User', '$q', '$state', function ($scope, User, $q, $state) {
		...
		$scope.saveUser = function() {
			User.create($scope.user, function(user){
				if ( user.errors ) {
					$scope.error_messages = user.errors;
				} else {
					$state.transitionTo('user_detail', {id: user.id}, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
...
{% endhighlight %}


### The flash

Our signup form is actually working, but before submitting a valid registration in a browser we’re going to add a bit of polish common in web applications: a message that appears on the subsequent page (in this case, welcoming our new user to the application) and then disappears upon visiting a second page or on page reload.

To display a temporary message we use a helper called the flash

`public/helpers/flash_helper.js`

{% highlight javascript %}
var flashHelper = angular.module('flashHelper', []);

flashHelper.factory('flashHelper', ['$rootScope', function($rootScope) {
	var queue = [];

	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
		if (queue.length > 0) {
			$rootScope.flash = queue;
			queue = [];
		} else {
			$rootScope.flash = [];
		}
	});

	return {
		set: function(message) {
			queue.push(message);
		}
	};
}]);
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var sampleApp = angular.module('sampleApp', [
	...
	'formFor',
	'formFor.bootstrapTemplates',
	'flashHelper'
]);
...
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersNewCtrl',
	['$scope', 'User', '$q', '$state', 'flashHelper', function ($scope, User, $q, $state, flashHelper) {
		...
		$scope.saveUser = function() {
			User.create($scope.user, function(user){
				if ( user.errors ) {
					$scope.error_messages = user.errors;
				} else {
					flashHelper.set({type: "success", content: "Welcome to the Sample App!"});
					$state.transitionTo('user_detail', {id: user.id}, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
...
{% endhighlight %}

`public/index.html`

{% highlight html %}
<!DOCTYPE html>
<html ng-app="sampleApp">
<head>
	...

	<script src="helpers/flash_helper.js"></script>

	<script src="controllers/static_pages_controller.js"></script>
	<script src="controllers/users_controller.js"></script>
	<script src="services/user.js"></script>
	<script src="app.js"></script>
</head>
<body>
	<header class="navbar navbar-fixed-top navbar-inverse" ng-include="'partials/layouts/_header.html'">
	</header>
	<div class="container">
		<div ng-repeat="message in flash" class="alert alert-{{ message.type }}">{{ message.content }}</div>
		<div ui-view></div>
		<footer class="footer" ng-include="'partials/layouts/_footer.html'">
		</footer>
	</div>
</body>

</html>
{% endhighlight %}

### The first signup

We can see the result of all this work by signing up our first user under the name "Rails Tutorial" and email address "example@railstutorial.org"

Filling in the information for the first signup.

<img src="/img/tuts/successful_signups1.png" alt="successful signups 1" width="100%" />

The results of a successful user signup, with flash message.

<img src="/img/tuts/successful_signups2.png" alt="successful signups 2" width="100%" />

The flash-less profile page after a browser reload.

<img src="/img/tuts/successful_signups3.png" alt="successful signups 3" width="100%" />

We can now check our database just to double-check that the new user was actually created

{% highlight javascript %}
> require('trainjs').initServer()
> User.findOne({where: {email: "example@railstutorial.org"}}).then(function(data){ console.log(data) })
{ dataValues:
   { id: 1,
	 name: 'Rails Tutorial',
	 email: 'example@railstutorial.org',
	 password_digest: '$2a$10$VgLZ04XOKg0TfWuJhJjWI.xXpyzEHp/uRjTKOMbSAAi3foQ04eBH6',
	 createdAt: Wed Feb 17 2016 23:14:35 GMT+0700 (ICT),
	 updatedAt: Wed Feb 17 2016 23:14:35 GMT+0700 (ICT) },
...
{% endhighlight %}


### A test for valid submission

Before moving on, we’ll write a test for valid submission to verify our application’s behavior and catch regressions. As with the test for invalid submission in ["Unsuccessful signups" Section](https://nodeontrain.xyz/tuts/unsuccessful_signups/#a-test-for-invalid-submission), our main purpose is to verify the contents of the database.

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

8 specs, 0 failures
{% endhighlight %}

Link demo `https://sample.nodeontrain.xyz/#/signup`
