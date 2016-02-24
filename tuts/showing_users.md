---
layout: tuts
title: Showing users
prev_section: secure_password
next_section: signup_form
permalink: /tuts/showing_users/
---

In this section, we’ll take the first steps toward the final profile by making a page to display a user’s name and profile photo

<div class="note info">
  <h5>trainjs</h5>
  <p>
	You should always update trainjs for this tutorial.
  </p>
</div>

### A Users resource

In order to make a user profile page, we need to have a user in the database. Happily, this problem has already been solved: in previous post, we created a User record by hand using the console

{% highlight javascript %}
> require('trainjs').initServer()
> User.count().then(function(data){ console.log(data) })
1
> User.findOne().then(function(data){ console.log(data) })
{ dataValues:
   { id: 1,
	 name: 'Dang Thanh',
	 email: 'thanh@example.com',
	 password_digest: '$2a$10$7gVwYayQoKFSEkJfobhAne4EjC52Djt7x1cl9cponFtAn.zVtfP0e',
	 createdAt: Fri Jan 29 2016 12:30:00 GMT+0700 (ICT),
	 updatedAt: Fri Jan 29 2016 12:30:00 GMT+0700 (ICT) },
	 ...
{% endhighlight %}

When following REST principles, resources are typically referenced using the resource name and a unique identifier. What this means in the context of users—which we’re now thinking of as a Users resource—is that we should view the user with id 1 by issuing a GET request to the URL /users/1.

We can get the routing for /users/1 to work by running a single command

{% highlight bash %}
~/sample_app $ trainjs generate service User show
	  create  app/controllers/users_controller.js
	  create  public/services
	  create  public/services/user.js
{% endhighlight %}

The result appears in `config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'users' }
];
{% endhighlight %}

We’ll use the standard [trainjs](https://nodeontrain.xyz) location for showing a user, which is `public/partials/users/show.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html">&#123;&#123; user.name &#125;&#125;, &#123;&#123; user.email &#125;&#125;</code></pre></figure>

`public/app.js`

{% highlight javascript %}
'use strict';

var sampleApp = angular.module('sampleApp', [
	'ui.router',
	'userService',
	'usersController',
	'staticPagesController',
	'bodyDirective',
	'headDirective'
]);

sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	...
	.state('user_detail', {
		url: '/users/:id',
		templateUrl: 'partials/users/show.html',
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
		controller: 'UsersDetailCtrl'
	})
}]);
...
{% endhighlight %}

In order to get the user show view to work, we need to define an `user` variable in the corresponding `show` action in the Users controller.

`app/controllers/users_controller.js`

{% highlight javascript %}
function UsersController() {
	this.show = function(req, res, next) {
		var user = ModelSync( User.findById(req.params.id) );
		res.end(JSON.stringify(user));
	};
};

module.exports = UsersController;
{% endhighlight %}

`public/controllers/users_controller.js`

{% highlight javascript %}
'use strict';

var usersController = angular.module('usersController', []);

usersController.controller(
	'UsersNewCtrl',
	['$scope', function ($scope) {
	}]
);

usersController.controller(
	'UsersDetailCtrl',
	['$scope', '$rootScope', 'user', function ($scope, $rootScope, user) {
		$rootScope.provide_title = user.name;
		$scope.user = user;
	}]
);
{% endhighlight %}

### A Gravatar image and a sidebar

Gravatar is a free service that allows users to upload images and associate them with email addresses they control. Our plan is to define a `gravatar_for` directive for a given user.

`public/partials/users/show.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;h1&gt;</span>
	<span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"user"</span> <span class="nt">/&gt;</span>
	&#123;&#123; user.name &#125;&#125;
<span class="nt">&lt;/h1&gt;</span></code></pre></figure>

`public/index.html`

{% highlight html %}
...
<script src="directives/body.js"></script>
<script src="directives/head.js"></script>
<script src="directives/gravatar_for.js"></script>
...
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
'use strict';

var sampleApp = angular.module('sampleApp', [
	'ui.router',
	'userService',
	'usersController',
	'staticPagesController',
	'bodyDirective',
	'headDirective',
	'gravatarForDirective'
]);
...
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
			var gravatar_url = "https://secure.gravatar.com/avatar/" + gravatar_id;
			elem.attr('src', gravatar_url);
			elem.attr('alt', user.name);
		}
	};
}]);
{% endhighlight %}

As noted in the Gravatar documentation, Gravatar URLs are based on an MD5 hash of the user’s email address. In the demo, the MD5 hashing algorithm is implemented using the `angular-md5` library

{% highlight bash %}
~/sample_app $ npm install angular-md5 --save
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="libs/angular.min.js"></script>
<script src="libs/angular-ui-router.min.js"></script>
<script src="libs/angular-resource.min.js"></script>
<script src="../node_modules/angular-md5/angular-md5.min.js"></script>
...
{% endhighlight %}

The profile page appears above, which shows the default Gravatar image, which appears because `thanh@example.com` isn’t a real email address.

<img src="/img/tuts/showing_users1.png" alt="showing users 1" width="100%" />

To get our application to display a custom Gravatar, we’ll use `update` to change the user’s email to something I control

{% highlight javascript %}
> require('trainjs').initServer()
> var user;
> User.findOne().then(function(data){ user = data })
> user.update({ name: "Example User", email: "example@railstutorial.org", password: "foobar", password_confirmation: "foobar" })
{% endhighlight %}

Here we’ve assigned the user the email address example@railstutorial.org, which I’ve associated with the Rails Tutorial logo

<img src="/img/tuts/showing_users2.png" alt="showing users 2" width="100%" />

We include `row` and `col-md-4` classes in the user show page
`public/partials/users/show.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;div</span> <span class="na">class=</span><span class="s">"row"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;aside</span> <span class="na">class=</span><span class="s">"col-md-4"</span><span class="nt">&gt;</span>
		<span class="nt">&lt;section</span> <span class="na">class=</span><span class="s">"user_info"</span><span class="nt">&gt;</span>
			<span class="nt">&lt;h1&gt;</span>
				<span class="nt">&lt;img</span> <span class="na">gravatar_for=</span><span class="s">"user"</span> <span class="nt">/&gt;</span>
				&#123;&#123; user.name &#125;&#125;
			<span class="nt">&lt;/h1&gt;</span>
		<span class="nt">&lt;/section&gt;</span>
	<span class="nt">&lt;/aside&gt;</span>
<span class="nt">&lt;/div&gt;</span></code></pre></figure>

`public/assets/stylesheets/custom.css`

{% highlight css %}
/* sidebar */
aside section.user_info {
  margin-top: 20px;
}

aside section {
  padding: 10px 0;
  margin-top: 20px;
}

aside section:first-child {
  border: 0;
  padding-top: 0;
}

aside section span {
  display: block;
  margin-bottom: 3px;
  line-height: 1;
}

aside section h1 {
  font-size: 1.4em;
  text-align: left;
  letter-spacing: -1px;
  margin-bottom: 3px;
  margin-top: 0px;
}

.gravatar {
  float: left;
  margin-right: 10px;
}

.gravatar_edit {
  margin-top: 15px;
}
{% endhighlight %}

<img src="/img/tuts/showing_users3.png" alt="showing users 3" width="100%" />
