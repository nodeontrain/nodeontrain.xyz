---
layout: tuts
title: Showing all users
prev_section: authorization
next_section: deleting_users
permalink: /tuts/showing_all_users/
---

In this section, we’ll add the index action, which is designed to display all the users instead of just one. Along the way, we’ll learn how to seed the database with sample users and how to paginate the user output so that the index page can scale up to display a potentially large number of users. In ["Deleting users" Section](https://nodeontrain.xyz/tuts/deleting_users/), we’ll add an administrative interface to the users index so that users can also be destroyed.

### Users index

To get started with the users index, we’ll first implement a security model. Although we’ll keep individual user `show` pages visible to all site visitors, the user `index` will be restricted to logged-in users so that there’s a limit to how much unregistered users can see by default.

To protect the `index` page from unauthorized access, we’ll first add a short test to verify that the `index` action is redirected properly.

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

	it('should redirect index when not logged in', function() {
		var current_url = 'http://localhost:1337/#/users';
		browser.get(current_url);
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})
	...
});
{% endhighlight %}

Then we just need to add an `index` action and include it in the list of actions protected by the `logged_in_user` before filter.

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update'] },
		{ action: 'correct_user', only: ['update'] }
	];

	this.index = function(req, res, next) {

	};

	...
}

module.exports = UsersController;
{% endhighlight %}

To display the users themselves, we need to make a variable containing all the site’s users and then render each one by iterating through them in the index view. As you may recall from the corresponding action in the toy app, we can use `User.findAll` to pull all the users out of the database, assigning them to an `users` instance variable for use in the view.

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update'] },
		{ action: 'correct_user', only: ['update'] }
	];

	this.index = function(req, res, next) {
		var users = ModelSync( User.findAll() );
		res.end(JSON.stringify(users));
	};

	...
}

module.exports = UsersController;
{% endhighlight %}

`public/services/user.js`

{% highlight javascript %}
var userService = angular.module('userService', ['ngResource']);

userService.factory('User', ['$resource', function($resource){
	return $resource('users/:id', {id:'@id'}, {
		'get':    {method: 'GET'},
		'create': {method:'POST'},
		'update': {method:'PUT'},
		'query':  {method:'GET', isArray:true},
	});
}]);
{% endhighlight %}

To make the actual index page, we’ll make a view that iterates through the users and wraps each one in an `li` tag.

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('users_index', {
		url: '/users',
		templateUrl: 'partials/users/index.html',
		controller: 'UsersIndexCtrl',
		data: {
			title: 'All users'
		},
		resolve: {
			current_user: current_user,
			users: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
				var deferred = $q.defer();
				User.query({id: $stateParams.id}, function(user) {
					deferred.resolve(user);
				}, function(error) {
					deferred.reject();
				});
				return deferred.promise;
			}]
		}
	})
}]);
...
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
'use strict';

var usersController = angular.module('usersController', []);
....

usersController.controller(
	'UsersIndexCtrl',
	['$scope', 'users', function ($scope, users) {
		$scope.users = users;
	}]
);
{% endhighlight %}

`public/partials/users/index.html`

{% highlight html %}
<h1>All users</h1>

<ul class="users">
	<li ng-repeat="user in users">
		<img gravatar_for="user" options-size="50" />
		<a href ui-sref="user_detail({id: user.id})" ui-sref-opts="{reload: true}">{{ user.name }}</a>
	</li>
</ul>
{% endhighlight %}

`public/directives/gravatar_for.js`

{% highlight javascript %}
var gravatarForDirective = angular.module('gravatarForDirective', ['angular-md5']);

gravatarForDirective.directive('gravatarFor',['md5', function(md5) {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			var user = scope[attrs.gravatarFor];
			var gravatar_id = md5.createHash(user.email.toLowerCase());
			var size = 50;
			if (elem.attr('options-size'))
				size = elem.attr('options-size');
			var gravatar_url = "https://secure.gravatar.com/avatar/" + gravatar_id + "?s=" + size;
			elem.attr('src', gravatar_url);
			elem.attr('alt', user.name);
		}
	};
}]);
{% endhighlight %}

Let’s also add a little CSS for style

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* Users index */

.users {
  list-style: none;
  margin: 0;
}
.users li {
  overflow: auto;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
{% endhighlight %}


Finally, we’ll add the URL to the users link in the site’s navigation header using `users_index`

`public/partials/layouts/_header.html`

{% highlight html %}
<div class="container">
	<a href ui-sref="home" ui-sref-opts="{reload: true}" id="logo">sample app</a>
	<nav>
		<ul class="nav navbar-nav navbar-right">
			<li><a href ui-sref="home" ui-sref-opts="{reload: true}">Home</a></li>
			<li><a href ui-sref="help" ui-sref-opts="{reload: true}">Help</a></li>
			<li ng-if="logged_in"><a href ui-sref="users_index" ui-sref-opts="{reload: true}">Users</a></li>
			...
		</ul>
	</nav>
</div>
{% endhighlight %}

With that, the users index is fully functional, with all tests successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
22 specs, 0 failures
{% endhighlight %}

### Sample users

First, we’ll install the Faker, which will allow us to make sample users with semi-realistic names and email addresses

{% highlight bash %}
~/sample_app $ npm install --save faker
{% endhighlight %}

Next, we’ll add a seed with sample users

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
	password_confirmation: "123456"
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

We can reset the database and then run seeds.js

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

<img src="/img/tuts/showing_all_users1.png" alt="showing_all_users 1" width="100%" />

### Pagination

Our original user doesn’t suffer from loneliness any more, but now we have the opposite problem: our user has too many companions, and they all appear on the same page. Right now there are a hundred, which is already a reasonably large number, and on a real site it could be thousands. The solution is to paginate the users, so that (for example) only 30 show up on a page at any one time.

{% highlight bash %}
~/sample_app $ npm install angular-ui-bootstrap --save
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<link rel="stylesheet" href="assets/stylesheets/custom.css">

<link rel="stylesheet" href="../node_modules/angular-ui-bootstrap/dist/ui-bootstrap-csp.css">
...
<script src="../node_modules/angular-form-for/dist/form-for.bootstrap-templates.js"></script>

<script src="../node_modules/angular-ui-bootstrap/dist/ui-bootstrap.js"></script>
<script src="../node_modules/angular-ui-bootstrap/dist/ui-bootstrap-tpls.js"></script>
...
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var sampleApp = angular.module('sampleApp', [
	'ui.router',
	'ui.bootstrap',
	...
]);
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	...
	.state('users_index', {
		url: '/users?page&limit',
		templateUrl: 'partials/users/index.html',
		controller: 'UsersIndexCtrl',
		data: {
			title: 'All users'
		},
		resolve: {
			user: current_user,
			users: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
				var page = $stateParams.page ? $stateParams.page : 1;
				var limit = $stateParams.limit ? $stateParams.limit : 30;
				var deferred = $q.defer();
				User.query({page: page, limit: limit}, function(user) {
					deferred.resolve(user);
				}, function(error) {
					deferred.reject();
				});
				return deferred.promise;
			}]
		}
	})
}]);
...
{% endhighlight %}

`public/partials/users/index.html`

{% highlight html %}
<h1>All users</h1>

<uib-pagination total-items="totalItems" ng-model="currentPage" ng-change="pageChanged()" max-size="5" class="pagination-sm" boundary-link-numbers="true" rotate="false" items-per-page="itemsPerPage"></uib-pagination>

<ul class="users">
	<li ng-repeat="user in users">
		<img gravatar_for="user" options-size="50" />
		<a href ui-sref="user_detail({id: user.id})" ui-sref-opts="{reload: true}">{{ user.name }}</a>
	</li>
</ul>

<uib-pagination total-items="totalItems" ng-model="currentPage" ng-change="pageChanged()" max-size="5" class="pagination-sm" boundary-link-numbers="true" rotate="false" items-per-page="itemsPerPage"></uib-pagination>
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersIndexCtrl',
	['$scope', 'users', '$state', '$stateParams', function ($scope, users, $state, $stateParams) {
		$scope.users = users.rows;

		$scope.totalItems = users.count;
		$scope.currentPage = $stateParams.page ? $stateParams.page : 1;
		$scope.itemsPerPage = $stateParams.limit ? $stateParams.limit : 30;

		$scope.pageChanged = function() {
			$stateParams.page = $scope.currentPage;
			$state.transitionTo($state.current, $stateParams, {
				reload: true, inherit: false, notify: true
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
		'query':  {method:'GET', isArray:false},
	});
}]);
{% endhighlight %}

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update'] },
		{ action: 'correct_user', only: ['update'] }
	];

	this.index = function(req, res, next) {
		var offset = (req.query.page - 1) * req.query.limit;
		var users = ModelSync( User.findAndCountAll({ offset: offset, limit: req.query.limit }) );
		res.end(JSON.stringify(users));
	};

	...
}

module.exports = UsersController;
{% endhighlight %}

<img src="/img/tuts/showing_all_users2.png" alt="showing_all_users 2" width="100%" />

### Users index test

Now that our users index page is working, we’ll write a lightweight test for it

`public/test/e2e_test/integration/users_index_test.js`

{% highlight javascript %}
describe('UsersIndexTest', function() {
	it('index including pagination', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).sendKeys('123456');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).toContain('#/users/');
		browser.get('http://localhost:1337/#/users');
		expect( element.all(by.css('.pagination-page')).count() ).toBeGreaterThan(0);
	})
})
{% endhighlight %}

The result should be a successful test suite

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
23 specs, 0 failures
{% endhighlight %}
