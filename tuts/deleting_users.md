---
layout: tuts
title: Deleting users
prev_section: showing_all_users
next_section: account_activation
permalink: /tuts/deleting_users/
---

Now that the users index is complete, there’s only one canonical REST action left: destroy.

<div class="note info">
  <h5><a href="https://nodeontrain.xyz">trainjs</a></h5>
  <p>
	You should always update <a href="https://nodeontrain.xyz">trainjs</a> for this tutorial.
  </p>
</div>

### Administrative users

We will identify privileged administrative users with a boolean admin attribute in the User model, which will lead automatically to an admin? boolean method to test for admin status.

`app/models/user.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;
var bcrypt = require('bcrypt');
var secureRandom = require('secure-random');
var URLSafeBase64 = require('urlsafe-base64');

var User = sequelize.define('user', {
	...
	admin: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	}
}, {
	...
});

...
{% endhighlight %}

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_admin_to_users
{% endhighlight %}

`db/migrate/[timestamp]-add_admin_to_users.js`

{% highlight javascript %}
'use strict';

module.exports = {
	up: function (queryInterface, Sequelize) {
		queryInterface.addColumn(
			'user',
			'admin',
			{
				type: Sequelize.BOOLEAN,
				defaultValue: false
			}
		)
	},

	down: function (queryInterface, Sequelize) {

	}
};
{% endhighlight %}

Next, we migrate as usual

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

As a final step, let’s update our seed data to make the first user an admin by default

`db/seeds.js`

{% highlight javascript %}
require('trainjs').initServer();
var faker = require('faker');

var time = 1;
function createUser() {
	var name = faker.name.findName();
	var email = 'example-'+time+'@railstutorial.org';
	var password = 'password';
	User.create({name: name, email: email, password: password, password_confirmation: password}).then(function() {
		if (time <= 98) {
			createUser();
		}
	});
	time++;
}

User.create({
	name:  "Example User",
	email: "example@railstutorial.org",
	password: "123456",
	password_confirmation: "123456",
	admin: true
}).then(function() {
	User.create({
		name:  "Example User",
		email: "user@example.com",
		password: "password",
		password_confirmation: "password"
	}).then(function() {
		createUser();
	});
});

{% endhighlight %}

Then reset the database

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

### The destroy action

The final step needed to complete the Users resource is to add delete links and a destroy action. We’ll start by adding a delete link for each user on the users index page, restricting access to administrative users.

`public/partials/users/index.html`

{% highlight html %}
<h1>All users</h1>

<uib-pagination total-items="totalItems" ng-model="currentPage" ng-change="pageChanged()" max-size="5" class="pagination-sm" boundary-link-numbers="true" rotate="false" items-per-page="itemsPerPage"></uib-pagination>

<ul class="users">
	<li ng-repeat="user in users">
		<img gravatar_for="user" options-size="50" />
		<a href ui-sref="user_detail({id: user.id})" ui-sref-opts="{reload: true}">{{ user.name }}</a>
		<span ng-if="current_user.id != user.id && current_user.admin"> | <a href ng-click="deleteUser(user.id)">delete</a></span>
	</li>
</ul>

<uib-pagination total-items="totalItems" ng-model="currentPage" ng-change="pageChanged()" max-size="5" class="pagination-sm" boundary-link-numbers="true" rotate="false" items-per-page="itemsPerPage"></uib-pagination>
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
'use strict';

var usersController = angular.module('usersController', []);
....

usersController.controller(
	'UsersIndexCtrl',
	['$scope', 'users', '$state', '$stateParams', 'user', 'User', 'flashHelper', function ($scope, users, $state, $stateParams, user, User, flashHelper) {
		$scope.users = users.rows;
		$scope.current_user = user;
		$scope.totalItems = users.count;
		$scope.currentPage = $stateParams.page ? $stateParams.page : 1;
		$scope.itemsPerPage = $stateParams.limit ? $stateParams.limit : 30;

		$scope.pageChanged = function() {
			$stateParams.page = $scope.currentPage;
			$state.transitionTo($state.current, $stateParams, {
				reload: true, inherit: false, notify: true
			});
		};

		$scope.deleteUser = function(id) {
			if (window.confirm("You sure?")) {
				User.delete({id: id}, function() {
					flashHelper.set({type: "success", content: "User deleted"});
					$state.transitionTo($state.current, $stateParams, {
						reload: true, inherit: false, notify: true
					});
				});
			}
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
		'query':  {method:'GET', isArray:false},
		'delete': {method:'DELETE'}
	});
}]);
{% endhighlight %}

To get the delete links to work, we need to add a destroy action

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update', 'destroy'] },
		{ action: 'correct_user', only: ['update'] }
	];

	this.destroy = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		user.destroy();
		res.end(JSON.stringify({}));
	};

	...
}

module.exports = UsersController;
{% endhighlight %}

As in ["Authorization" Section](https://nodeontrain.xyz/tuts/authorization/), we’ll enforce access control using a before filter, this time to restrict access to the destroy action to admins.

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update', 'destroy'] },
		{ action: 'correct_user', only: ['update'] },
		{ action: 'admin_user', only: ['destroy'] }
	];

	...

	this.admin_user = function(req, res, next) {
		if (!sessionHelper.current_user(req).admin) {
			res.statusCode = 401;
			return res.end();
		}
	};
}

module.exports = UsersController;
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
'use strict';

var usersController = angular.module('usersController', []);
....

usersController.controller(
	'UsersIndexCtrl',
	['$scope', 'users', '$state', '$stateParams', 'user', 'User', 'flashHelper', function ($scope, users, $state, $stateParams, user, User, flashHelper) {
		....
		$scope.deleteUser = function(id) {
			if (window.confirm("You sure?")) {
				User.delete({id: id}, function() {
					flashHelper.set({type: "success", content: "User deleted"});
					$state.transitionTo($state.current, $stateParams, {
						reload: true, inherit: false, notify: true
					});
				}, function(){
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
				});
			}
		};
	}]
);
{% endhighlight %}

### User destroy tests

With something as dangerous as destroying users, it’s important to have good tests for the expected behavior.

`public/test/e2e_test/controllers/users_controller_test.js`

{% highlight javascript %}
describe('usersControllerTest', function() {

	...

	it('unsuccessful delete user when not logged in', function(done) {
		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'userService' ]);
			var User = $injector.get( 'User' );
			User.delete({id: 10}, function(user){
				callback(user);
			}, function(error){
				callback(error);
			});
		}).then(function (output) {
			expect( output.status ).toEqual(401);
			done();
		});
	})

	it('should redirect edit when logged in as wrong user', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');

		browser.get('http://localhost:1337/#/users/1/edit');
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})

	...

	it('unsuccessful delete user when logged in as a non-admin', function(done) {
		element(by.css('.dropdown')).click();
		element.all(by.css('[ui-sref="logout"]')).click();

		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'userService' ]);
			var User = $injector.get( 'User' );
			User.delete({id: 10}, function(user){
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

`public/test/e2e_test/integration/users_index_test.js`

{% highlight javascript %}
describe('UsersIndexTest', function() {
	...

	it('index as admin including pagination and delete links', function() {
		expect( element.all(by.css('[href="#/users/1"] + [ng-click="deleteUser(user.id)"]')).count() ).toEqual(0);
		expect( element.all(by.css('[ng-click="deleteUser(user.id)"]')).count() ).toBeGreaterThan(0);
		element.all( by.css('ul.users > li a[ng-click="deleteUser(user.id)"]') ).last().click();
		browser.switchTo().alert().accept();
		expect( element.all(by.css('.alert-success')).count() ).toEqual(1);
	})

	it('index as non-admin', function() {
		element(by.css('.dropdown')).click();
		element.all(by.css('[ui-sref="logout"]')).click();

		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).toContain('#/users/');
		browser.get('http://localhost:1337/#/users');

		expect( element.all(by.css('[ng-click="deleteUser(user.id)"]')).count() ).toEqual(0);
	})
})
{% endhighlight %}

At this point, our deletion code is well-tested, and the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
27 specs, 0 failures
{% endhighlight %}
