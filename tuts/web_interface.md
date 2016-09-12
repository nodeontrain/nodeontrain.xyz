---
layout: tuts
title: A web interface for following users
prev_section: relationship_model
next_section: status_feed
permalink: /tuts/web_interface/
---

["The Relationship model Section"](https://nodeontrain.xyz/tuts/relationship_model) placed rather heavy demands on our data modeling skills, and it's fine if it takes a while to soak in. In fact, one of the best ways to understand the associations is to use them in the web interface.

<div class="note info">
  <h5><a href="https://nodeontrain.xyz">trainjs</a></h5>
  <p>
	You should always update <a href="https://nodeontrain.xyz">trainjs</a> for this tutorial.
  </p>
</div>

In the introduction to this chapter, we saw a preview of the page flow for user following. In this section, we will implement the basic interface and following/unfollowing functionality shown in those mockups. We will also make separate pages to show the user following and followers arrays.

### Sample following data

As in previous chapters, we will find it convenient to use the seed data to fill the database with sample relationships. This will allow us to design the look and feel of the web pages first, deferring the back-end functionality until later in this section.

`db/seeds.js`

{% highlight javascript %}
require('trainjs').initServer();
var faker = require('faker');

var time = 1;
function createUser() {
	var name = faker.name.findName();
	var email = 'example-'+time+'@railstutorial.org';
	var password = 'password';
	User.create({
		name: name,
		email: email,
		password: password,
		password_confirmation: password,
		activated: true,
		activated_at: new Date().getTime()
	}).then(function(user_example) {
		if (time < 98) {
			if (time <= 4) {
				createMicroposts(user_example.id);
			}
			time++;
			createUser();
		} else {
			followingRelationships();
		}
	});
}

function createMicroposts(user_id) {
	for (var i = 0; i < 50; i++) {
		var content = faker.lorem.sentence();
		Micropost.create({
			content: content,
			user_id: user_id
		}).then(function() {
		});
	}	
}

function followingRelationships() {
	User.findAll().then(function(users){
		var user1 = users[0];
		for (var i = 1; i <= 50; i++) {
			user1.setFollowing(users[i]);
		}
		for (var j = 2; j <= 40; j++) {
			users[j].setFollowing(user1);
		}
	});
}

User.create({
	name:  "Example User",
	email: "example@railstutorial.org",
	password: "123456",
	password_confirmation: "123456",
	admin: true,
	activated: true,
	activated_at: new Date().getTime()
}).then(function(user1) {
	createMicroposts(user1.id);
	User.create({
		name:  "Example User",
		email: "user@example.com",
		password: "password",
		password_confirmation: "password",
		activated: true,
		activated_at: new Date().getTime()
	}).then(function(user2) {
		createMicroposts(user2.id);
		createUser();
	});
});
{% endhighlight %}

To execute the code, we reset and reseed the database as usual

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

### Stats and a follow form

Now that our sample users have both followed users and followers, we need to update the profile page and Home page to reflect this. We'll start by making a partial to display the following and follower statistics on the profile and home pages. We'll next add a follow/unfollow form, and then make dedicated pages for showing "following" (followed users) and "followers".

Adding following and followers actions to the Users controller.

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ get: '/static_pages/home', action: 'home' },
	{ resources: 'microposts', only: ['create', 'destroy'] },
	{ put: '/password_resets/:id/valid', action: 'valid' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{
		resources: 'users',
		member: [
			{ get: 'following' },
			{ get: 'followers' }
		]
	},
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ resources: 'account_activations', only: ['update'] },
];
{% endhighlight %}

With the routes defined, we are now in a position to define the stats partial, which involves a couple of links inside a div

`public/partials/shared/_stats.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"stats"</span><span class="nt">&gt;</span>
    <span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_following({id: user.id})"</span><span class="nt">&gt;</span>
        <span class="nt">&lt;strong</span> <span class="na">id=</span><span class="s">"following"</span> <span class="na">class=</span><span class="s">"stat"</span><span class="nt">&gt;</span>&#123;&#123; user.following.count &#125;&#125;<span class="nt">&lt;/strong&gt;</span>
        following
    <span class="nt">&lt;/a&gt;</span>
    <span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_followers({id: user.id})"</span><span class="nt">&gt;</span>
        <span class="nt">&lt;strong</span> <span class="na">id=</span><span class="s">"followers"</span> <span class="na">class=</span><span class="s">"stat"</span><span class="nt">&gt;</span>&#123;&#123; user.followers.count &#125;&#125;<span class="nt">&lt;/strong&gt;</span>
        followers
    <span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/div&gt;</span></code></pre></figure>

With the partial in hand, including the stats on the Home page is easy

`public/partials/static_pages/home.html`

{% highlight html %}
<div ng-if="logged_in" class="row">
	<aside class="col-md-4">
		<section class="user_info" ng-include="'partials/shared/_user_info.html'"></section>
		<section class="stats" ng-include="'partials/shared/_stats.html'"></section>
		<section class="micropost_form" ng-include="'partials/shared/_micropost_form.html'"></section>
    </aside>
    <div class="col-md-8">
		<h3>Micropost Feed</h3>
		<div ng-include="'partials/shared/_feed.html'"></div>
	</div>
</div>
...
{% endhighlight %}

`app/controllers/static_pages_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var sequelize = CONFIG.database;
function StaticPagesController() {
	this.home = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		if (current_user) {
			var following = ModelSync( current_user.getFollowing({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];
			var followers = ModelSync( current_user.getFollowers({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];
			var offset = (req.query.page - 1) * req.query.limit;
			var feed_items = ModelSync( current_user.feed({offset: offset, limit: req.query.limit}) );
			var microposts_count = ModelSync( Micropost.count({ where: { user_id: current_user.id } }) );
			res.end(JSON.stringify({
				id: current_user.id,
				following: following,
				followers: followers,
				microposts_count: microposts_count,
				feed_items: feed_items
			}));
		} else {
			res.end();
		}
		
	};
}

module.exports = StaticPagesController;
{% endhighlight %}

`public/controllers/static_pages_controller.js`

{% highlight javascript %}
'use strict';

var staticPagesController = angular.module('staticPagesController', []);

staticPagesController.controller(
	'StaticPagesHomeCtrl',
	['$scope', '$rootScope', '$state', 'Micropost', 'flashHelper', 'home_data', '$stateParams', function ($scope, $rootScope, $state, Micropost, flashHelper, home_data, $stateParams) {
		$scope.user = home_data;
		...
	}]
);
...
{% endhighlight %}

To style the stats, we'll add some CSS

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* sidebar */
...

.gravatar {
  float: left;
  margin-right: 10px;
}

.gravatar_edit {
  margin-top: 15px;
}

.stats {
  overflow: auto;
  margin-top: 0;
  padding: 0;
}
.stats a {
  float: left;
  padding: 0 10px;
  border-left: 1px solid #eee;
  color: gray;
}
.stats a:first-child {
  padding-left: 0;
  border: 0;
}
.stats a:hover {
  text-decoration: none;
  color: blue;
}
.stats strong {
  display: block;
}

.user_avatars {
  overflow: auto;
  margin-top: 10px;
}
.user_avatars .gravatar {
  margin: 1px 1px;
}
.user_avatars a {
  padding: 0;
}

.users.follow {
  padding: 0;
}

/* forms */
...
{% endhighlight %}

We'll render the stats partial on the profile page in a moment, but first let's make a partial for the follow/unfollow button

`public/partials/users/_follow_form.html`

{% highlight html %}
<input ng-if="!user.followed" ng-click="follow(user.id)" name="commit" value="Follow" class="btn btn-primary">
<input ng-if="user.followed" ng-click="unfollow(user.id)" name="commit" value="Unfollow" class="btn">
{% endhighlight %}

This does nothing but defer the real work to follow and unfollow partials, which need new routes for the Relationships resource

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ get: '/static_pages/home', action: 'home' },
	{ resources: 'microposts', only: ['create', 'destroy'] },
	{ put: '/password_resets/:id/valid', action: 'valid' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{
		resources: 'users',
		member: [
			{ get: 'following' },
			{ get: 'followers' }
		]
	},
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ resources: 'account_activations', only: ['update'] },
	{ resources: 'relationships', only: ['create', 'destroy'] }
];
{% endhighlight %}

We can now include the follow form and the following statistics on the user profile page simply by rendering the partials

`public/partials/users/show.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"row"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;aside</span> <span class="na">class=</span><span class="s">"col-md-4"</span><span class="nt">&gt;</span>
		<span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"user_info"</span><span class="nt">&gt;</span>
			<span class="nt">&lt;h1&gt;</span>
				<span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; user.name &#125;&#125;"</span> <span class="nt">/&gt;</span>
				&#123;&#123; user.name &#125;&#125;
			<span class="nt">&lt;/h1&gt;</span>
		<span class="nt">&lt;/section&gt;</span>
		<span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"stats"</span> <span class="na">ng-include=</span><span class="s">"'partials/shared/_stats.html'"</span><span class="nt">&gt;&lt;/section&gt;</span>
	<span class="nt">&lt;/aside&gt;</span>
	<span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"col-md-8"</span><span class="nt">&gt;</span>
		<span class="nt">&lt;div</span> <span class="na">ng-if=</span><span class="s">"current_user.id != user.id &amp;&amp; logged_in"</span> <span class="na">id=</span><span class="s">"follow_form"</span> <span class="na">ng-include=</span><span class="s">"'partials/users/_follow_form.html'"</span><span class="nt">&gt;&lt;/div&gt;</span>
		<span class="nt">&lt;div</span> <span class="na">ng-if=</span><span class="s">"user.microposts.count"</span><span class="nt">&gt;</span>
			<span class="nt">&lt;h3&gt;</span>Microposts (&#123;&#123; user.microposts.count &#125;&#125;)<span class="nt">&lt;/h3&gt;</span>
			<span class="nt">&lt;ol</span> <span class="na">class=</span><span class="s">"microposts"</span><span class="nt">&gt;</span>
				<span class="nt">&lt;li</span> <span class="na">ng-repeat=</span><span class="s">"micropost in user.microposts.rows"</span> <span class="na">id=</span><span class="s">"micropost-&#123;&#123; micropost.id &#125;&#125;"</span> <span class="na">ng-include=</span><span class="s">"'partials/microposts/_micropost.html'"</span><span class="nt">&gt;&lt;/li&gt;</span>
			<span class="nt">&lt;/ol&gt;</span>
			<span class="nt">&lt;uib-pagination</span> <span class="na">total-items=</span><span class="s">"totalItems"</span> <span class="na">ng-model=</span><span class="s">"currentPage"</span> <span class="na">ng-change=</span><span class="s">"pageChanged()"</span> <span class="na">max-size=</span><span class="s">"5"</span> <span class="na">class=</span><span class="s">"pagination-sm"</span> <span class="na">boundary-link-numbers=</span><span class="s">"true"</span> <span class="na">rotate=</span><span class="s">"false"</span> <span class="na">items-per-page=</span><span class="s">"itemsPerPage"</span><span class="nt">&gt;&lt;/uib-pagination&gt;</span>
		<span class="nt">&lt;/div&gt;</span>
	<span class="nt">&lt;/div&gt;</span>
<span class="nt">&lt;/div&gt;</span></code></pre></figure>


`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	...

	this.show = function(req, res, next) {
		var offset = (req.query.page - 1) * req.query.limit;
		var user = ModelSync( User.findById(req.params.id) );

		var followed = false;
		var current_user = sessionHelper.current_user(req);
		if (current_user) {
			followed = current_user.following(user);
		}

		var following = ModelSync( user.getFollowing({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];
		var followers = ModelSync( user.getFollowers({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];

		var microposts = ModelSync( Micropost.findAndCountAll({
			where: { user_id: user.id },
			include: [ { model: User } ],
			order: 'micropost.createdAt DESC',
			offset: offset,
			limit: req.query.limit
		}) );
		res.end(JSON.stringify({
			id: user.id,
			email: user.email,
			name: user.name,
			following: following,
			followers: followers,
			microposts: microposts,
			followed: followed
		}));
	};

	...
}

module.exports = UsersController;
{% endhighlight %}


### Following and followers pages

Our first step is to get the following and followers links to work. We'll follow Twitter's lead and have both pages require user login. As with most previous examples of access control, we'll write the tests first

`public/test/e2e_test/controllers/users_controller_test.js`

{% highlight javascript %}
describe('usersControllerTest', function() {
	...
	it('should redirect index when not logged in', function() {
		var current_url = 'http://localhost:1337/#/users';
		browser.get(current_url);
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})

	it('should redirect following when not logged in', function() {
		var current_url = 'http://localhost:1337/#/users/1/following';
		browser.get(current_url);
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})

	it('should redirect followers when not logged in', function() {
		var current_url = 'http://localhost:1337/#/users/1/followers';
		browser.get(current_url);
		expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
		expect( browser.getCurrentUrl() ).toContain('#/login');
	})
	...
});
{% endhighlight %}

The only tricky part of the implementation is realizing that we need to add two new actions to the Users controller.

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var sequelize = CONFIG.database;
function UsersController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['index', 'update', 'destroy', 'following', 'followers'] },
		{ action: 'correct_user', only: ['update'] },
		{ action: 'admin_user', only: ['destroy'] }
	];

	this.getInfo = function(user) {
		var following = ModelSync( user.getFollowing({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];
		var followers = ModelSync( user.getFollowers({attributes: [[sequelize.fn('COUNT', sequelize.col('*')), 'count']]}) )[0];
		var microposts_count = ModelSync( Micropost.count({
			where: { user_id: user.id }
		}) );
		return {
			id: user.id,
			email: user.email,
			name: user.name,
			following: following,
			followers: followers,
			microposts_count: microposts_count
		};
	};

	this.following = function(req, res, next) {
		var offset = (req.query.page - 1) * req.query.limit;
		var user = ModelSync( User.findById(req.params.id) );
		var users = ModelSync( user.getFollowing({
			offset: offset,
			limit: req.query.limit,
			attributes: ['id', 'email', 'name']
		}) );
		var info = this.getInfo(user);
		info.users = users;
		res.end(JSON.stringify(info));
	};

	this.followers = function(req, res, next) {
		var offset = (req.query.page - 1) * req.query.limit;
		var user = ModelSync( User.findById(req.params.id) );
		var users = ModelSync( user.getFollowers({
			offset: offset,
			limit: req.query.limit,
			attributes: ['id', 'email', 'name']
		}) );
		var info = this.getInfo(user);
		info.users = users;
		res.end(JSON.stringify(info));
	};
	...
}

module.exports = UsersController;
{% endhighlight %}

`public/services/user.js`

{% highlight javascript %}
var userService = angular.module('userService', ['ngResource']);

userService.factory('User', ['$resource', function($resource){
	return $resource('users/:id/:member', {id: '@id', member: '@member'}, {
		'get':    {method: 'GET'},
		'create': {method: 'POST'},
		'update': {method: 'PUT'},
		'query':  {method: 'GET', isArray:false},
		'delete': {method: 'DELETE'}
	});
}]);
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	...
	.state('user_following', {
		url: '/users/:id/following?page&limit',
		templateUrl: 'partials/users/show_follow.html',
		resolve: {
			current_user: current_user,
			user: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
				$stateParams.page = $stateParams.page ? $stateParams.page : 1;
				$stateParams.limit = $stateParams.limit ? $stateParams.limit : 30;
				var deferred = $q.defer();
				User.get({id: $stateParams.id, member: 'following', page: $stateParams.page, limit: $stateParams.limit}, function(following) {
					deferred.resolve(following);
				}, function(){
					deferred.reject();
				});
				return deferred.promise;
			}]
		},
		controller: 'UsersMemberCtrl',
		data: {
			title: 'Following'
		}
	})
	.state('user_followers', {
		url: '/users/:id/followers?page&limit',
		templateUrl: 'partials/users/show_follow.html',
		resolve: {
			current_user: current_user,
			user: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
				$stateParams.page = $stateParams.page ? $stateParams.page : 1;
				$stateParams.limit = $stateParams.limit ? $stateParams.limit : 30;
				var deferred = $q.defer();
				User.get({id: $stateParams.id, member: 'followers', page: $stateParams.page, limit: $stateParams.limit}, function(followers) {
					deferred.resolve(followers);
				}, function(){
					deferred.reject();
				});
				return deferred.promise;
			}]
		},
		controller: 'UsersMemberCtrl',
		data: {
			title: 'Followers'
		}
	})
}]);
...
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersMemberCtrl',
	['$scope', '$state', '$stateParams', 'user', function ($scope, $state, $stateParams, user) {
		$scope.user = user;
		$scope.users = user.users;
		$scope.title = $state.current.data.title;
		$scope.totalItems = $state.current.name == 'user_following' ? $scope.user.following.count : $scope.user.followers.count;
	}]
);
...
{% endhighlight %}

The `show_follow` view used to render following and followers.

`public/partials/users/show_follow.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"row"</span><span class="nt">&gt;</span>
    <span class="nt">&lt;aside</span> <span class="na">class=</span><span class="s">"col-md-4"</span><span class="nt">&gt;</span>
        <span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"user_info"</span><span class="nt">&gt;</span>
            <span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; user.name &#125;&#125;"</span> <span class="nt">/&gt;</span>
            <span class="nt">&lt;h1&gt;</span>&#123;&#123; user.name &#125;&#125;<span class="nt">&lt;/h1&gt;</span>
            <span class="nt">&lt;span&gt;</span>
                <span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
                    view my profile
                <span class="nt">&lt;/a&gt;</span>
            <span class="nt">&lt;/span&gt;</span>
            <span class="nt">&lt;span&gt;&lt;b&gt;</span>Microposts:<span class="nt">&lt;/b&gt;</span> &#123;&#123; user.microposts_count &#125;&#125;<span class="nt">&lt;/span&gt;</span>
        <span class="nt">&lt;/section&gt;</span>
        <span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"stats"</span><span class="nt">&gt;</span>
            <span class="nt">&lt;div</span> <span class="na">ng-include=</span><span class="s">"'partials/shared/_stats.html'"</span><span class="nt">&gt;&lt;/div&gt;</span>
            <span class="nt">&lt;div</span> <span class="na">ng-if=</span><span class="s">"users &amp;&amp; users.length"</span> <span class="na">class=</span><span class="s">"user_avatars"</span><span class="nt">&gt;</span>
                <span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ng-repeat=</span><span class="s">"_user in user.users"</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: _user.id})"</span><span class="nt">&gt;</span>
                    <span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; _user.email &#125;&#125;"</span> <span class="na">options-size=</span><span class="s">"30"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; _user.name &#125;&#125;"</span> <span class="na">class=</span><span class="s">"gravatar"</span> <span class="nt">/&gt;</span>
                <span class="nt">&lt;/a&gt;</span>
            <span class="nt">&lt;/div&gt;</span>
        <span class="nt">&lt;/section&gt;</span>
    <span class="nt">&lt;/aside&gt;</span>
    <span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"col-md-8"</span><span class="nt">&gt;</span>
        <span class="nt">&lt;h3&gt;</span>&#123;&#123; title &#125;&#125;<span class="nt">&lt;/h3&gt;</span>
        <span class="nt">&lt;ul</span> <span class="na">ng-if=</span><span class="s">"users &amp;&amp; users.length"</span> <span class="na">class=</span><span class="s">"users follow"</span> <span class="na">ng-include=</span><span class="s">"'partials/users/_user.html'"</span><span class="nt">&gt;</span>
        <span class="nt">&lt;/ul&gt;</span>
        <span class="nt">&lt;uib-pagination</span> <span class="na">ng-if=</span><span class="s">"users &amp;&amp; users.length"</span> <span class="na">total-items=</span><span class="s">"totalItems"</span> <span class="na">ng-model=</span><span class="s">"currentPage"</span> <span class="na">ng-change=</span><span class="s">"pageChanged()"</span> <span class="na">max-size=</span><span class="s">"5"</span> <span class="na">class=</span><span class="s">"pagination-sm"</span> <span class="na">boundary-link-numbers=</span><span class="s">"true"</span> <span class="na">rotate=</span><span class="s">"false"</span> <span class="na">items-per-page=</span><span class="s">"itemsPerPage"</span><span class="nt">&gt;&lt;/uib-pagination&gt;</span>
    <span class="nt">&lt;/div&gt;</span>
<span class="nt">&lt;/div&gt;</span></code></pre></figure>

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
{% endhighlight %}

Now that we have working following and followers pages, we'll write a couple of short integration tests to verify their behavior.

`public/test/e2e_test/integration/following_test.js`

{% highlight javascript %}
describe('FollowingTest', function() {
	it('following page', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('example@railstutorial.org');
		element(by.css('[name="password"]')).sendKeys('123456');
		element(by.css('[name="commit"]')).click();
		expect(browser.getCurrentUrl()).toContain('#/users/');
		browser.get('http://localhost:1337/#/users/1/following');
		expect( element.all(by.css('li[ng-repeat="user in users"]')).count() ).toBeGreaterThan(0);
	})

	it('followers page', function() {
		browser.get('http://localhost:1337/#/users/1/followers');
		expect( element.all(by.css('li[ng-repeat="user in users"]')).count() ).toBeGreaterThan(0);
	})
})
{% endhighlight %}

The test suite should now be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
{% endhighlight %}

### A working follow button

Now that our views are in order, it's time to get the follow/unfollow buttons working.

{% highlight bash %}
~/sample_app $ trainjs generate service Relationships create destroy
{% endhighlight %}

We'll check that attempts to access actions in the Relationships controller require a logged-in user (and thus get redirected to the login page), while also not changing the Relationship count

`public/test/e2e_test/controllers/relationships_controller_test.js`

{% highlight javascript %}
describe('relationshipsControllerTest', function() {
	it('create should require logged-in user', function(done) {
		browser.get('http://localhost:1337/#/login');

		var test = function() {
			browser.executeAsyncScript(function(callback) {
				var $injector = angular.injector([ 'relationshipsService' ]);
				var Relationships = $injector.get( 'Relationships' );
				Relationships.create({followed_id: 3}, function(relationships){
					callback(relationships);
				}, function(error){
					callback(error);
				});
			}).then(function (output) {
				expect( output.status ).toEqual(401);
				done();
			});
		};

		element.all(by.css('[ui-sref="login"]')).isDisplayed().then(function(result) {
			if ( result.length > 0 ) {
				test();
			} else {
				element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
				test();
			}
		});
	})

	it('destroy should require logged-in user', function(done) {
		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'relationshipsService' ]);
			var Relationships = $injector.get( 'Relationships' );
			Relationships.delete({id: 3}, function(relationships){
				callback(relationships);
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

We can get the tests to pass by adding the `logged_in_user` before filter

`app/controllers/relationships_controller.js`

{% highlight javascript %}
function RelationshipsController() {
	this.before_action = [
		{ action: 'logged_in_user' }
	];

	this.create = function(req, res, next) {
	};
	this.destroy = function(req, res, next) {
	};

}

module.exports = RelationshipsController;
{% endhighlight %}

To get the follow and unfollow buttons to work, all we need to do is find the user associated with the followed_id in the corresponding form, and then use the appropriate follow or unfollow method

`app/controllers/relationships_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function RelationshipsController() {
	this.before_action = [
		{ action: 'logged_in_user' }
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var user = ModelSync( User.findById(req.body.followed_id) );
		if (user) {
			res.end(JSON.stringify( ModelSync( current_user.follow(user) ) ));
		} else {
			res.end(JSON.stringify( {
				error: 'User not found'
			} ));
		}
	};
	this.destroy = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var user = ModelSync( User.findById(req.params.id) );
		if (user) {
			res.end(JSON.stringify( ModelSync( current_user.unfollow(user) ) ));
		} else {
			res.end(JSON.stringify( {
				error: 'User not found'
			} ));
		}
	};

}

module.exports = RelationshipsController;
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersDetailCtrl',
	['$scope', '$rootScope', 'user', '$state', '$stateParams', 'Relationships', 'flashHelper', function ($scope, $rootScope, user, $state, $stateParams, Relationships, flashHelper) {
		$rootScope.provide_title = user.name;
		$scope.user = user;
		$scope.totalItems = user.microposts.count;
		$scope.follow = function(id) {
			Relationships.create({followed_id: id}, function(relationships){
				if ( relationships.error ) {
					flashHelper.set({type: "danger", content: relationships.error});
				}
				$state.transitionTo($state.current, $stateParams, {
					reload: true, inherit: false, notify: true
				});
			});
		};
		$scope.unfollow = function(id) {
			Relationships.delete({id: id}, function(relationships){
				if ( relationships.error ) {
					flashHelper.set({type: "danger", content: relationships.error});
				}
				$state.transitionTo($state.current, $stateParams, {
					reload: true, inherit: false, notify: true
				});
			});
		};
	}]
);
...
{% endhighlight %}


### Following tests

Now that the follow buttons are working, we'll write some simple tests to prevent regressions. To follow a user, we post to the relationships path and verify that the number of followed users increases by 1

`public/test/e2e_test/integration/following_test.js`

{% highlight javascript %}
describe('FollowingTest', function() {
	...

	it('should unfollow a user', function() {
		browser.get('http://localhost:1337/#/users/2');
		expect( element(by.id('followers')).getText() ).toContain('1');
		element.all(by.css('#follow_form > [name="commit"]')).click();
		expect( element(by.id('followers')).getText() ).toContain('0');
	})

	it('should follow a user', function() {
		browser.get('http://localhost:1337/#/users/2');
		expect( element(by.id('followers')).getText() ).toContain('0');
		element.all(by.css('#follow_form > [name="commit"]')).click();
		expect( element(by.id('followers')).getText() ).toContain('1');
	})
})
{% endhighlight %}

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
{% endhighlight %}


