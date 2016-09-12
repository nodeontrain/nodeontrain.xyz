---
layout: tuts
title: Showing microposts
prev_section: micropost_model
next_section: manipulating_microposts
permalink: /tuts/showing_microposts/
---

Although we don't yet have a way to create microposts through the web - that comes in ["Manipulating microposts Section"](https://nodeontrain.xyz/tuts/manipulating_microposts/) - this won't stop us from displaying them (and testing that display).

### Rendering microposts

Our plan is to display the microposts for each user on their respective profile page, together with a running count of how many microposts they've made. As we'll see, many of the ideas are similar to our work in ["Showing all users Section"](https://nodeontrain.xyz/tuts/showing_all_users/) on showing all users.

`public/partials/microposts/_micropost.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: micropost.user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;img</span> <span class="na">class=</span><span class="s">"gravatar"</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; micropost.user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; micropost.user.name &#125;&#125;"</span> <span class="na">options-size=</span><span class="s">"50"</span> <span class="nt">/&gt;</span>
<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;span</span> <span class="na">class=</span><span class="s">"user"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: micropost.user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
		&#123;&#123; micropost.user.name &#125;&#125;
	<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/span&gt;</span>
<span class="nt">&lt;span</span> <span class="na">class=</span><span class="s">"content"</span><span class="nt">&gt;</span>&#123;&#123; micropost.content &#125;&#125;<span class="nt">&lt;/span&gt;</span>
<span class="nt">&lt;span</span> <span class="na">time-ago</span> <span class="na">class=</span><span class="s">"timestamp"</span><span class="nt">&gt;</span>
	Posted &#123;&#123; time_ago_in_words(micropost.createdAt) &#125;&#125;.
<span class="nt">&lt;/span&gt;</span></code></pre></figure>

This uses the `timeAgo` module, whose meaning is probably clear and whose effect we will see in the next section.

{% highlight bash %}
~/sample_app $ npm install time-ago --save
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="../node_modules/pluralize/pluralize.js"></script>
<script src="../node_modules/time-ago/timeago.js"></script>
...
<script src="directives/message.js"></script>
<script src="directives/time.js"></script>
...
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
'use strict';

var sampleApp = angular.module('sampleApp', [
	'timeDirective',
    ...
]);
...
{% endhighlight %}

`public/directives/time.js`

{% highlight javascript %}
var timeDirective = angular.module('timeDirective', []);

timeDirective.directive('timeAgo', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			scope.time_ago_in_words = function(input) {
				return timeago().ago(input);
			};
		}
	};
});
{% endhighlight %}

Adding an microposts instance variable to the user show

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	...
    
	this.show = function(req, res, next) {
		var offset = (req.query.page - 1) * req.query.limit;
		var user = ModelSync( User.findById(req.params.id) );
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
			microposts: microposts
		}));
	};
    
	...
}

module.exports = UsersController;
{% endhighlight %}

Adding microposts to the user show page.

`public/app.js`

{% highlight javascript %}
...

sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('user_detail', {
		url: '/users/:id?page&limit',
		templateUrl: 'partials/users/show.html',
		resolve: {
			current_user: current_user,
			user: ['$q', '$stateParams', 'User', function($q, $stateParams, User){
				$stateParams.page = $stateParams.page ? $stateParams.page : 1;
				$stateParams.limit = $stateParams.limit ? $stateParams.limit : 30;
				var deferred = $q.defer();
				User.get({id: $stateParams.id, page: $stateParams.page, limit: $stateParams.limit}, function(user) {
					deferred.resolve(user);
				}, function(error) {
					deferred.reject();
				});
				return deferred.promise;
			}]
		},
		controller: 'UsersDetailCtrl'
	})
	...
}]);
...
{% endhighlight %}

`public/partials/users/show.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"row"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;aside</span> <span class="na">class=</span><span class="s">"col-md-4"</span><span class="nt">&gt;</span>
		<span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"user_info"</span><span class="nt">&gt;</span>
			<span class="nt">&lt;h1&gt;</span>
				<span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; user.name &#125;&#125;"</span> <span class="nt">/&gt;</span>
				&#123;&#123; user.name &#125;&#125;
			<span class="nt">&lt;/h1&gt;</span>
		<span class="nt">&lt;/section&gt;</span>
	<span class="nt">&lt;/aside&gt;</span>
	<span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"col-md-8"</span> <span class="na">ng-if=</span><span class="s">"user.microposts.count"</span><span class="nt">&gt;</span>
		<span class="nt">&lt;h3&gt;</span>Microposts (&#123;&#123; user.microposts.count &#125;&#125;)<span class="nt">&lt;/h3&gt;</span>
		<span class="nt">&lt;ol</span> <span class="na">class=</span><span class="s">"microposts"</span><span class="nt">&gt;</span>
			<span class="nt">&lt;li</span> <span class="na">ng-repeat=</span><span class="s">"micropost in user.microposts.rows"</span> <span class="na">id=</span><span class="s">"micropost-"</span> <span class="na">ng-include=</span><span class="s">"'partials/microposts/_micropost.html'"</span><span class="nt">&gt;&lt;/li&gt;</span>
		<span class="nt">&lt;/ol&gt;</span>
		<span class="nt">&lt;uib-pagination</span> <span class="na">total-items=</span><span class="s">"totalItems"</span> <span class="na">ng-model=</span><span class="s">"currentPage"</span> <span class="na">ng-change=</span><span class="s">"pageChanged()"</span> <span class="na">max-size=</span><span class="s">"5"</span> <span class="na">class=</span><span class="s">"pagination-sm"</span> <span class="na">boundary-link-numbers=</span><span class="s">"true"</span> <span class="na">rotate=</span><span class="s">"false"</span> <span class="na">items-per-page=</span><span class="s">"itemsPerPage"</span><span class="nt">&gt;&lt;/uib-pagination&gt;</span>
	<span class="nt">&lt;/div&gt;</span>
<span class="nt">&lt;/div&gt;</span></code></pre></figure>

`public/controllers/users_controller.js`

{% highlight javascript %}
...
usersController.controller(
	'UsersDetailCtrl',
	['$scope', '$rootScope', 'user', '$state', '$stateParams', function ($scope, $rootScope, user, $state, $stateParams) {
		$rootScope.provide_title = user.name;
		$scope.user = user;

		$scope.totalItems = user.microposts.count;
	}]
);
...
{% endhighlight %}

### Sample microposts

Adding sample microposts for all the users actually takes a rather long time, so first we'll select just the first six users

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

At this point, we can reseed the development database as usual

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

The CSS for microposts

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* microposts */

.microposts {
  list-style: none;
  padding: 0;
}
.microposts li {
  padding: 10px 0;
  border-top: 1px solid #e8e8e8;
}
.microposts .user {
  margin-top: 5em;
  padding-top: 0;
}
.microposts .content {
  display: block;
  margin-left: 60px;
}
.microposts .content img {
  display: block;
  padding: 5px 0;
}
.microposts .timestamp {
  color: #999;
  display: block;
  margin-left: 60px;
}
.microposts .gravatar {
  float: left;
  margin-right: 10px;
  margin-top: 5px;
}

aside textarea {
  height: 100px;
  margin-bottom: 5px;
}

span.picture {
  margin-top: 10px;
}
span.picture input {
  border: 0;
}
{% endhighlight %}


### Profile micropost tests

Because newly activated users get redirected to their profile pages, we already have a test that the profile page renders correctly. In this section, we'll write a short integration test for some of the other elements on the profile page, including the work from this section.

`public/test/e2e_test/integration/users_profile_test.js`

{% highlight javascript %}
describe('UsersProfileTest', function() {
	it('profile display', function(done) {
		browser.get('http://localhost:1337/#/login');

		var profile = function() {
			browser.get('http://localhost:1337/#/login');
			element(by.css('[name="email"]')).clear('');
			element(by.css('[name="password"]')).clear('');
			element(by.css('[name="email"]')).sendKeys('user@example.com');
			element(by.css('[name="password"]')).sendKeys('password');	
			element(by.css('[name="commit"]')).click();

			expect(browser.getTitle()).toEqual('Example User | Node On Train Tutorial Sample App');
			expect( element(by.css('.user_info > h1')).getText() ).toEqual('Example User');
			expect( element(by.css('.user_info > h1 > img[gravatar_for]')).isDisplayed() ).toBeTruthy();
			expect( element(by.css('[ng-if="user.microposts.count"] > h3')).getText() ).toContain('50');
			expect( element.all(by.css('.pagination-page')).count() ).toBeGreaterThan(0);
			done();
		};

		element.all(by.css('[ui-sref="login"]')).isDisplayed().then(function(result) {
		    if ( result.length > 0 ) {
		        profile();
		    } else {
		    	element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
		        profile();
		    }
		});
	})
})
{% endhighlight %}

Because the application code was working, the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
29 specs, 0 failures
{% endhighlight %}