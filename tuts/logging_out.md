---
layout: tuts
title: Logging out
prev_section: logging_in
next_section: remember_me
permalink: /tuts/logging_out/
---

Logging out involves undoing the effects of the log_in method, which involves deleting the user id from the session.

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	log_in: function(req, user) {
		req.session.user_id = user.id;
	},
	current_user: function(req) {
		return ModelSync( User.findById(req.session.user_id) );
	},
	log_out: function(req) {
		delete req.session.user_id;
	}
};
{% endhighlight %}

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	...
	this.destroy = function(req, res, next) {
		sessionHelper.log_out(req);
		res.end();
	};
	...
}

module.exports = SessionsController;
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	.state('logout', {
		url: '/logout',
		resolve: {
			logout: ['$state', 'Sessions', 'flashHelper', function($state, Sessions, flashHelper){
				Sessions.delete({}, function() {
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
				}, function(error) {
					flashHelper.set({type: "danger", content: error.statusText});
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
				});
			}]
		}
	})
	...
}]);
{% endhighlight %}

`public/partials/layouts/_header.html`

{% highlight html %}
<div class="container">
	<a href ui-sref="home" ui-sref-opts="{reload: true}" id="logo">sample app</a>
	<nav>
		<ul class="nav navbar-nav navbar-right">
			...
			<li ng-if="logged_in" class="dropdown">
				<a href class="dropdown-toggle" data-toggle="dropdown">
					Account <b class="caret"></b>
				</a>
				<ul class="dropdown-menu">
					....
					<li><a href ui-sref="logout" ui-sref-opts="{reload: true}">Log out</a></li>
				</ul>
			</li>
			<li ng-if="!logged_in"><a href ui-sref="login" ui-sref-opts="{reload: true}">Log in</a></li>
		</ul>
	</nav>
</div>
{% endhighlight %}

To test the logout machinery, we can add some steps to the user login test. After logging in, we use delete to issue a DELETE request to the logout path and verify that the user is logged out and redirected to the root URL.

`public/test/e2e_test/integration/users_login_test.js`

{% highlight javascript %}
describe('UsersLoginTest', function() {
	it('login with valid information followed by logout', function() {
		var current_url = 'http://localhost:1337/#/login';
		browser.get(current_url);
		element(by.css('[name="email"]')).clear('');
		element(by.css('[name="password"]')).clear('');
		element(by.css('[name="email"]')).sendKeys('user@example.com');
		element(by.css('[name="password"]')).sendKeys('password');
		element(by.css('[name="commit"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/users/');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
		expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(1);

		element(by.css('.dropdown')).click();
		element.all(by.css('[ui-sref="logout"]')).click();

		expect( browser.getCurrentUrl() ).toContain('#/home');
		expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(1);
		expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(0);

	});

	...
});
{% endhighlight %}

With the session destroy action thus defined and tested, the initial signup/login/logout triumvirate is complete, and the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
Using the selenium server at http://localhost:4444/wd/hub
[launcher] Running 1 instances of WebDriver
Started
...........

12 specs, 0 failures
{% endhighlight %}
