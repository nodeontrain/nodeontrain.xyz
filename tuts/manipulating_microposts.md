---
layout: tuts
title: Manipulating microposts
prev_section: showing_microposts
next_section: micropost_images
permalink: /tuts/manipulating_microposts/
---

Having finished both the data modeling and display templates for microposts, we now turn our attention to the interface for creating them through the web.

There is one break with past convention worth noting: the interface to the Microposts resource will run principally through the Profile and Home pages, so we won't need actions like new or edit in the Microposts controller; we'll need only create and destroy.

{% highlight bash %}
~/sample_app $ trainjs generate service Micropost create destroy
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'microposts', only: ['create', 'destroy'] },
	{ put: '/password_resets/:id/valid', action: 'valid' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{ resources: 'users' },
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ resources: 'account_activations', only: ['update'] },
];
{% endhighlight %}

### Micropost access control

We begin our development of the Microposts resource with some access control in the Microposts controller. In particular, because we access microposts through their associated users, both the create and destroy actions must require users to be logged in.

`public/test/e2e_test/controllers/microposts_controller_test.js`

{% highlight javascript %}
describe('micropostsControllerTest', function() {
	it('should redirect create when not logged in', function(done) {
		browser.get('http://localhost:1337/#/users/1/edit');

		var create_micropost = function() {
			browser.executeAsyncScript(function(callback) {
				var $injector = angular.injector([ 'micropostService' ]);
				var Micropost = $injector.get( 'Micropost' );
				Micropost.create({content: 'Lorem ipsum', user_id: 1}, function(user){
					callback(micropost);
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
		        create_micropost();
		    } else {
		    	element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
		        create_micropost();
		    }
		});
	})

	it('should redirect destroy when not logged in', function(done) {
		var delete_micropost = function() {
			browser.executeAsyncScript(function(callback) {
				var $injector = angular.injector([ 'micropostService' ]);
				var Micropost = $injector.get( 'Micropost' );
				Micropost.delete({id: 1}, function(user){
					callback(micropost);
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
		        delete_micropost();
		    } else {
		    	element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
		        delete_micropost();
		    }
		});
	})
});
{% endhighlight %}

Writing the application code needed to get the tests to pass requires a little refactoring first. Recall from ["Requiring logged-in users Section"](https://nodeontrain.xyz/tuts/authorization/#requiring-logged-in-users) that we enforced the login requirement using a before filter that called the `logged_in_user` method. At the time, we needed that method only in the Users controller, but now we find that we need it in the Microposts controller as well, so we'll move it into the Application controller, which is the base class of all controllers

`app/controllers/application_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function ApplicationController() {
	var self = this;
	this.before = function(req, res, next) {
		next();
	};

	this.logged_in_user = function(req, res, next) {
		if (!sessionHelper.current_user(req)) {
			res.statusCode = 401;
			return res.end();
		}
	};
}

module.exports = ApplicationController;
{% endhighlight %}

To avoid code repetition, you should also remove `logged_in_user` from the Users controller at this time.

The `logged_in_user` method is now available in the Microposts controller, which means that we can add create and destroy actions and then restrict access to them using a before filter

`app/controllers/microposts_controller.js`

{% highlight javascript %}
function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
	];

	this.create = function(req, res, next) {
	};
	this.destroy = function(req, res, next) {
	};

}

module.exports = MicropostsController;
{% endhighlight %}

At this point, the tests should pass

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
31 specs, 0 failures
{% endhighlight %}

### Creating microposts

In ["Signup Chapter"](https://nodeontrain.xyz/tuts/showing_users/), we implemented user signup by making an HTML form that issued an HTTP POST request to the create action in the Users controller. The implementation of micropost creation is similar; the main difference is that, rather than using a separate page at /microposts/new, we will put the form on the Home page itself

We'll start with the create action for microposts, which is similar to its user analogue

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var micropost = ModelSync( current_user.createMicropost({content: req.body.content}) );
		res.end(JSON.stringify(micropost));
	};
	this.destroy = function(req, res, next) {
	};
}

module.exports = MicropostsController;
{% endhighlight %}

Adding microposts creation to the Home page

{% highlight bash %}
~/sample_app $ trainjs generate service StaticPages home
{% endhighlight %}

`public/services/static_pages.js`

{% highlight javascript %}
var staticPagesService = angular.module('staticPagesService', ['ngResource']);

staticPagesService.factory('StaticPages', ['$resource', function($resource){
	return $resource('static_pages/:id', {id:'@id'}, {
		'get':    {method: 'GET'},
	});
}]);
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ get: '/static_pages/home', action: 'home' },
	{ resources: 'microposts', only: ['create', 'destroy'] },
	{ put: '/password_resets/:id/valid', action: 'valid' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{ resources: 'users' },
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ resources: 'account_activations', only: ['update'] },
];
{% endhighlight %}

`app/controllers/static_pages_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function StaticPagesController() {
	this.home = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		if (current_user) {
			var microposts_count = ModelSync( Micropost.count({ where: { user_id: current_user.id } }) );
			res.end(JSON.stringify({
				microposts_count: microposts_count
			}));
		} else {
			res.end();
		}
		
	};
}

module.exports = StaticPagesController;
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('home', {
		url: '/home',
		templateUrl: 'partials/static_pages/home.html',
		controller: 'StaticPagesHomeCtrl',
		resolve: {
			home_data: ['$q', 'StaticPages', function($q, StaticPages){
				var deferred = $q.defer();
				StaticPages.get({id: 'home'}, function(data) {
					deferred.resolve(data);
				}, function(error) {
					deferred.reject();
				});
				return deferred.promise;
			}]
		},
		data: {
			title: 'Home'
		}
	})
    ...
}]);
...
{% endhighlight %}

`public/controllers/static_pages_controller.js`

{% highlight javascript %}
'use strict';

var staticPagesController = angular.module('staticPagesController', []);

staticPagesController.controller(
	'StaticPagesHomeCtrl',
	['$scope', '$rootScope', '$state', 'Micropost', 'flashHelper', 'home_data', function ($scope, $rootScope, $state, Micropost, flashHelper, home_data) {
		$scope.microposts_count = home_data.microposts_count ? pluralize('micropost', home_data.microposts_count, true) : '0 micropost';
		$scope._micropost = {content: ''};
		$scope.validation_rules = {
			content: {
				required: true,
				maxlength: 140
			}
		};
		$scope.createMicropost = function() {
			Micropost.create($scope._micropost, function(micropost){
				if ( micropost.errors ) {
					$scope.error_messages = micropost.errors;
				} else {
					flashHelper.set({type: "success", content: "Micropost created!"});
					$state.transitionTo($state.current, $stateParams, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
...
{% endhighlight %}

To build a form for creating microposts, we use the code below, which serves up different HTML based on whether the site visitor is logged in or not.

`public/partials/static_pages/home.html`

{% highlight html %}
<div ng-if="logged_in" class="row">
    <aside class="col-md-4">
        <section class="user_info" ng-include="'partials/shared/_user_info.html'"></section>
        <section class="micropost_form" ng-include="'partials/shared/_micropost_form.html'"></section>
    </aside>
</div>

<div ng-if="!logged_in" class="center jumbotron">
	<h1>Welcome to the Sample App</h1>
	<h2>
		This is the home page for the <a href="http://www.nodeontrain.xyz/">Node On Train Tutorial</a> sample application.
	</h2>
	<a class="btn btn-lg btn-primary" href ui-sref="signup">Sign up now!</a>
</div>

<a ng-if="!logged_in" href="http://www.nodeontrain.xyz/"><img alt="Trainjs logo" src="assets/images/trainjs.png"></a>
{% endhighlight %}

To get the page defined working, we need to create and fill in a couple of partials. The first is the new Home page sidebar

`public/partials/shared/_user_info.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: current_user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;img</span> <span class="na">class=</span><span class="s">"gravatar"</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; current_user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; current_user.name &#125;&#125;"</span> <span class="na">options-size=</span><span class="s">"50"</span> <span class="nt">/&gt;</span>
<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;h1&gt;</span>&#123;&#123; current_user.name &#125;&#125;<span class="nt">&lt;/h1&gt;</span>
<span class="nt">&lt;span&gt;</span>
	<span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: current_user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
		view my profile
	<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/span&gt;</span>
<span class="nt">&lt;span&gt;</span>&#123;&#123; microposts_count &#125;&#125;<span class="nt">&lt;/span&gt;</span></code></pre></figure>

We next define the form for creating microposts, which is similar to the signup form

`public/partials/shared/_micropost_form.html`

{% highlight html %}
<form form-for="_micropost" submit-with="createMicropost()" validation-rules="validation_rules">
	<div error-messages ng-if="error_messages" ng-model="error_messages" id="error_explanation"></div>
	<text-field attribute="content" label="Content" multiline placeholder="Compose new micropost..."></text-field>
	<input class="btn btn-primary" name="commit" type="submit" value="Post" />
</form>
{% endhighlight %}


### A proto-feed

Although the micropost form is actually now working, users can't immediately see the results of a successful submission because the current Home page doesn't display any microposts. If you like, you can verify that the form is working by submitting a valid entry and then navigating to the profile page to see the post, but that's rather cumbersome. It would be far better to have a feed of microposts that includes the user's own posts

Since each user should have a feed, we are led naturally to a feed method in the User model, which will initially just select all the microposts belonging to the current user. We'll accomplish this using the where method on the Micropost model

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}],
	instanceMethods: {
		...
		feed: function(page) {
			return Micropost.findAndCountAll({
				where: { user_id: this.id },
				include: [ { model: User } ],
				order: 'micropost.createdAt DESC',
				offset: page.offset,
				limit: page.limit
			});
		}
	},
	classMethods: {
		...
	}
});

...
{% endhighlight %}

Adding a feed instance variable to the home action.

`app/controllers/static_pages_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function StaticPagesController() {
	this.home = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		if (current_user) {
			var offset = (req.query.page - 1) * req.query.limit;
			var feed_items = ModelSync( current_user.feed({offset: offset, limit: req.query.limit}) );
			var microposts_count = ModelSync( Micropost.count({ where: { user_id: current_user.id } }) );
			res.end(JSON.stringify({
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

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('home', {
		url: '/home?page&limit',
		templateUrl: 'partials/static_pages/home.html',
		controller: 'StaticPagesHomeCtrl',
		resolve: {
			home_data: ['$q', '$stateParams', 'StaticPages', function($q, $stateParams, StaticPages){
				$stateParams.page = $stateParams.page ? $stateParams.page : 1;
				$stateParams.limit = $stateParams.limit ? $stateParams.limit : 30;
				var deferred = $q.defer();
				StaticPages.get({id: 'home', page: $stateParams.page, limit: $stateParams.limit}, function(data) {
					deferred.resolve(data);
				}, function(error) {
					deferred.reject();
				});
				return deferred.promise;
			}]
		},
		data: {
			title: 'Home'
		}
	})
    ...
}]);
...
{% endhighlight %}

The status feed partial.

`public/partials/shared/_feed.html`

<figure class="highlight"><pre><code class="language-javascript" data-lang="javascript"><span class="o">&lt;</span><span class="nx">ol</span> <span class="kr">class</span><span class="o">=</span><span class="s2">"microposts"</span><span class="o">&gt;</span>
	<span class="o">&lt;</span><span class="nx">li</span> <span class="nx">ng</span><span class="o">-</span><span class="nx">repeat</span><span class="o">=</span><span class="s2">"micropost in feed_items.rows"</span> <span class="nx">id</span><span class="o">=</span><span class="s2">"micropost-&#123;&#123; micropost.id &#125;&#125;"</span> <span class="nx">ng</span><span class="o">-</span><span class="nx">include</span><span class="o">=</span><span class="s2">"'partials/microposts/_micropost.html'"</span><span class="o">&gt;&lt;</span><span class="sr">/li</span><span class="err">&gt;
</span><span class="o">&lt;</span><span class="sr">/ol</span><span class="err">&gt;
</span><span class="o">&lt;</span><span class="nx">uib</span><span class="o">-</span><span class="nx">pagination</span> <span class="nx">total</span><span class="o">-</span><span class="nx">items</span><span class="o">=</span><span class="s2">"totalItems"</span> <span class="nx">ng</span><span class="o">-</span><span class="nx">model</span><span class="o">=</span><span class="s2">"currentPage"</span> <span class="nx">ng</span><span class="o">-</span><span class="nx">change</span><span class="o">=</span><span class="s2">"pageChanged()"</span> <span class="nx">max</span><span class="o">-</span><span class="nx">size</span><span class="o">=</span><span class="s2">"5"</span> <span class="kr">class</span><span class="o">=</span><span class="s2">"pagination-sm"</span> <span class="nx">boundary</span><span class="o">-</span><span class="nx">link</span><span class="o">-</span><span class="nx">numbers</span><span class="o">=</span><span class="s2">"true"</span> <span class="nx">rotate</span><span class="o">=</span><span class="s2">"false"</span> <span class="nx">items</span><span class="o">-</span><span class="nx">per</span><span class="o">-</span><span class="nx">page</span><span class="o">=</span><span class="s2">"itemsPerPage"</span><span class="o">&gt;&lt;</span><span class="sr">/uib-pagination&gt;</span></code></pre></figure>

Adding a status feed to the Home page.

`public/controllers/static_pages_controller.js`

{% highlight javascript %}
'use strict';

var staticPagesController = angular.module('staticPagesController', []);

staticPagesController.controller(
	'StaticPagesHomeCtrl',
	['$scope', '$rootScope', '$state', 'Micropost', 'flashHelper', 'home_data', '$stateParams', function ($scope, $rootScope, $state, Micropost, flashHelper, home_data, $stateParams) {
		$scope.microposts_count = home_data.microposts_count ? pluralize('micropost', home_data.microposts_count, true) : '0 micropost';
		$scope._micropost = {content: ''};
        $scope.feed_items = home_data.feed_items ? home_data.feed_items : [];
        
		$scope.validation_rules = {
			content: {
				required: true,
				maxlength: 140
			}
		};
		$scope.createMicropost = function() {
			Micropost.create($scope._micropost, function(micropost){
				if ( micropost.errors ) {
					$scope.error_messages = micropost.errors;
				} else {
					flashHelper.set({type: "success", content: "Micropost created!"});
					$state.transitionTo($state.current, $stateParams, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};

		$scope.totalItems = home_data.feed_items ? home_data.feed_items.count : 0;
	}]
);

...
{% endhighlight %}

`public/partials/static_pages/home.html`

{% highlight html %}
<div ng-if="logged_in" class="row">
	<aside class="col-md-4">
		<section class="user_info" ng-include="'partials/shared/_user_info.html'"></section>
		<section class="micropost_form" ng-include="'partials/shared/_micropost_form.html'"></section>
    </aside>
    <div class="col-md-8">
		<h3>Micropost Feed</h3>
		<div ng-include="'partials/shared/_feed.html'"></div>
	</div>
</div>
...
{% endhighlight %}


### Destroying microposts

The last piece of functionality to add to the Microposts resource is the ability to destroy posts. As with [user deletion](https://nodeontrain.xyz/tuts/deleting_users/#the-destroy-action), we accomplish this with "delete" links

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
	<span class="nt">&lt;a</span> <span class="na">ng-if=</span><span class="s">"current_user.id == micropost.user.id"</span> <span class="na">href</span> <span class="na">delete-micropost=</span><span class="s">"&#123;&#123; micropost.id &#125;&#125;"</span> <span class="na">data-confirm=</span><span class="s">"You sure?"</span><span class="nt">&gt;</span>delete<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/span&gt;</span></code></pre></figure>

`public/directives/delete_micropost.js`

{% highlight javascript %}
var deleteMicropostDirective = angular.module('deleteMicropostDirective', []);

deleteMicropostDirective.directive('deleteMicropost',['Micropost', 'flashHelper', '$state', '$stateParams', function(Micropost, flashHelper, $state, $stateParams) {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.bind('click', function(){
				if (window.confirm(attrs.confirm)) {
					Micropost.delete({id: attrs.deleteMicropost}, function() {
						flashHelper.set({type: "success", content: "Micropost deleted"});
						$state.transitionTo($state.current, $stateParams, {
							reload: true, inherit: false, notify: true
						});
					}, function(){
						$state.transitionTo($state.current, $stateParams, {
							reload: true, inherit: false, notify: true
						});
					});
				}
			});
		}
	};
}]);
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
var sampleApp = angular.module('sampleApp', [
	'deleteMicropostDirective',
    ...
]);
...
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="directives/time.js"></script>
<script src="directives/delete_micropost.js"></script>
...
{% endhighlight %}

The next step is to define a destroy action in the Microposts controller

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
		{ action: 'correct_user', only: ['destroy'] },
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var micropost = ModelSync( current_user.createMicropost({content: req.body.content}) );
		res.end(JSON.stringify(micropost));
	};
	
	this.destroy = function(req, res, next) {
		var micropost = ModelSync( Micropost.findById(req.params.id) );
		micropost.destroy();
		res.end(JSON.stringify({}));
	};

	this.correct_user = function(req, res, next) {
		var micropost = ModelSync( Micropost.findOne({
			where: { id: req.params.id },
			include: [ { model: User } ],
			order: 'micropost.createdAt DESC',
		}) );
		var current_user = sessionHelper.current_user(req);
		if (!micropost || micropost && micropost.user.id != current_user.id) {
			res.statusCode = 401;
			return res.end();
		}
	};
}

module.exports = MicropostsController;
{% endhighlight %}

### Micropost tests

All that's left is writing a short Microposts controller test to check authorization and a micropost integration test to tie it all together.

`public/test/e2e_test/controllers/microposts_controller_test.js`

{% highlight javascript %}
describe('micropostsControllerTest', function() {
	...
    
	it('should redirect destroy for wrong micropost', function(done) {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		browser.executeAsyncScript(function(callback) {
			var $injector = angular.injector([ 'micropostService' ]);
			var Micropost = $injector.get( 'Micropost' );
			Micropost.delete({id: 200}, function(user){
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

Finally, we'll write an integration test to log in, check the micropost pagination, make an invalid submission, make a valid submission, delete a post, and then visit a second user's page to make sure there are no "delete" links.

`public/test/e2e_test/integration/microposts_interface_test.js`

{% highlight javascript %}
describe('MicropostsInterfaceTest', function() {
	it('micropost interface', function(done) {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);

		var test = function() {
			current_url = 'http://localhost:1337/#/login';
			browser.get(current_url);
			element(by.css('[name="email"]')).sendKeys('user@example.com');
			element(by.css('[name="password"]')).sendKeys('password');
			element(by.css('[name="commit"]')).click();
			expect(browser.getCurrentUrl()).toContain('#/users');
			// Invalid submission
			current_url = 'http://localhost:1337/#/home';
			browser.get(current_url);
			expect(browser.getCurrentUrl()).toContain('#/home');
			//https://github.com/angular/protractor/blob/master/spec/basic/synchronize_spec.js#L87
			browser.wait(function () {
            	return element(by.css('.micropost_form [name="content"]')).isDisplayed();
        	});
			element(by.css('.micropost_form [name="content"]')).sendKeys('');
			element(by.css('.micropost_form [name="commit"]')).click();
			expect( element.all(by.css('.has-error')).count() ).toEqual(1);
			// Valid submission
			element(by.css('.micropost_form [name="content"]')).sendKeys('This micropost really ties the room together');
			element(by.css('.micropost_form [name="commit"]')).click();
			expect( element.all(by.css('.alert-success')).count() ).toEqual(1);
			// Delete a post.
			element.all( by.css('ol.microposts > li a[delete-micropost]') ).first().click();
			browser.switchTo().alert().accept();
			expect( element.all(by.css('.alert-success')).count() ).toEqual(1);
			// Visit a different user.
			current_url = 'http://localhost:1337/#/users/1';
			browser.get(current_url);
			expect( element.all(by.css('a[delete-micropost]')).count() ).toEqual(0);
			done();
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
	});
});
{% endhighlight %}

Because we wrote working application code first, the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
33 specs, 0 failures
{% endhighlight %}