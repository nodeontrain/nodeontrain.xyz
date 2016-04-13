---
layout: tuts
title: Updating users
prev_section: remember_me
next_section: authorization
permalink: /tuts/updating_users/
---

The pattern for editing user information closely parallels that for [creating new users](https://nodeontrain.xyz/tuts/successful_signups). Instead of a new action rendering a view for new users, we have an edit action rendering a view to edit users; instead of create responding to a `POST` request, we have an update action responding to a `PUT` request. The biggest difference is that, while anyone can sign up, only the current user should be able to update their information. The authentication machinery from ["Log in & Log out" Chapter](https://nodeontrain.xyz/tuts/sessions/) will allow us to use a before filter to ensure that this is the case.

### Edit form

We start with the `user_edit` state, which requires pulling the relevant user out of the database.

`public/app.js`

{% highlight javascript %}
...

.state('user_detail', {
	...
})
.state('user_edit', {
	url: '/users/:id/edit',
	templateUrl: 'partials/users/edit.html',
	resolve: {
		user: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
			var deferred = $q.defer();
			User.get({id: $stateParams.id}, function(user) {
				deferred.resolve(user);
			}, function(error) {
				deferred.reject();
			});
			return deferred.promise;
		}]
	},
	controller: 'UsersEditCtrl',
	data: {
		title: 'Edit user'
	}
})

...
{% endhighlight %}


`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersEditCtrl',
	['$scope', 'User', '$q', '$state', 'flashHelper', 'user', function ($scope, User, $q, $state, flashHelper, user) {
		$scope.user = user;
	}]
);
{% endhighlight %}


`public/partials/users/edit.html`

{% highlight html %}
<h1>Update your profile</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="saveUser()" validation-rules="validation_rules">
			<div error-messages ng-if="error_messages" id="error_explanation"></div>
			<text-field required attribute="name" label="Name" type="text"></text-field>
			<text-field attribute="email" label="Email" type="email"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<text-field attribute="password_confirmation" label="Password Confirmation" type="password"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Save changes" />
		</form>

		<div class="gravatar_edit">
			<img gravatar_for="user" />
			<a href="http://gravatar.com/emails" target="_blank">change</a>
		</div>
	</div>
</div>
{% endhighlight %}

<img src="/img/tuts/updating_users1.png" alt="updating users 1" width="100%" />

Adding a URL to the “Settings” link in the site layout.

`public/partials/layouts/_header.html`

{% highlight html %}
...
<ul class="dropdown-menu">
	<li><a href ui-sref="user_detail({id: current_user.id})" ui-sref-opts="{reload: true}">Profile</a></li>
	<li><a href ui-sref="user_edit({id: current_user.id})" ui-sref-opts="{reload: true}">Settings</a></li>
	<li class="divider"></li>
	<li><a href ui-sref="logout" ui-sref-opts="{reload: true}">Log out</a></li>
</ul>
...
{% endhighlight %}


### Unsuccessful edits

In this section we'll handle unsuccessful edits, following similar ideas to [unsuccessful signups](https://nodeontrain.xyz/tuts/unsuccessful_signups/)

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersEditCtrl',
	['$scope', 'User', '$q', '$state', 'flashHelper', 'user', function ($scope, User, $q, $state, flashHelper, user) {
		$scope.user = user;
		$scope.validation_rules = {
			name: {
				required: true,
				maxlength: 50
			},
			email: {
				required: true,
				maxlength: 255
			},
			password: {
				required: true,
				minlength: 6
			},
			password_confirmation: {
				custom: function(value, model) {
					var deferred = $q.defer();
					if (model.password != model.password_confirmation) {
						deferred.reject("Password confirmation doesn't match Password");
					} else {
						deferred.resolve();
					}
					return deferred.promise;
				}
			}
		};
		$scope.saveUser = function() {
			User.update($scope.user, function(user){
				if ( user.errors ) {
					$scope.error_messages = user.errors;
				} else {
					// Handle a successful update.
				}
			});
		};
	}]
);
{% endhighlight %}

`public/services/user.js`

{% highlight javascript %}
var userService = angular.module('userService', ['ngResource']);

userService.factory('User', ['$resource', function($resource){
	return $resource('users/:id', {id:'@id'}, {
		'get':    {method: 'GET'},
		'create': {method:'POST'},
		'update': {method:'PUT'},
	});
}]);
{% endhighlight %}

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	...

	this.update = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		if (user)
			ModelSync( user.update(req.body) );
		res.end(JSON.stringify(user));
	};
}

module.exports = UsersController;
{% endhighlight %}

Because of the existing User model validations, submission of invalid information results in helpful error messages

<img src="/img/tuts/updating_users2.png" alt="updating users 2" width="100%" />

### Testing unsuccessful edits

We'll write a simple test of an unsuccessful edit

`public/test/e2e_test/integration/users_edit_test.js`

{% highlight javascript %}
describe('UsersEditTest', function() {
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
})
{% endhighlight %}

At this point, the test suite should still be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
15 specs, 0 failures
{% endhighlight %}

### Successful edits (with TDD)

Now it's time to get the edit form to work.

`public/test/e2e_test/integration/users_edit_test.js`

{% highlight javascript %}
describe('UsersEditTest', function() {
	...
	it('successful edit', function() {
		var current_url = browser.getCurrentUrl();
		element(by.css('[name="name"]')).sendKeys('Foo Bar');
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('foo@bar.com');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="password_confirmation"]')).clear('');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).not.toEqual(current_url);
	})
})
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
			});
		};
	}]
);
{% endhighlight %}

The test suite is still failing, which is the result of the password length validation failing due to the empty password and confirmation. To get the tests to successful, we need to make an exception to the password validation if the password is empty.

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersEditCtrl',
	['$scope', 'User', '$q', '$state', 'flashHelper', 'user', function ($scope, User, $q, $state, flashHelper, user) {
		$scope.user = user;
		$scope.validation_rules = {
			...
			password: {
				minlength: 6
			},
			...
		};
		...
	}]
);
{% endhighlight %}

With the code in this section, the user edit page should be working, as you can double-check by re-running the test suite, which should now be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
16 specs, 0 failures
{% endhighlight %}
