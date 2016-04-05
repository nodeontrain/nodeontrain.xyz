---
layout: tuts
title: Account activation
prev_section: deleting_users
next_section: password_reset
permalink: /tuts/account_activation/
---

At present, newly registered users immediately have full access to [their accounts](https://nodeontrain.xyz/tuts/successful_signups). In this section, we’ll implement an account activation step to verify that the user controls the email address they used to sign up. This will involve associating an activation token and digest with a user, sending the user an email with a link including the token, and activating the user upon clicking the link.

Our strategy for handling account activation parallels [user login](https://nodeontrain.xyz/tuts/logging_in/) and especially [remembering users](https://nodeontrain.xyz/tuts/logging_in/). The basic sequence appears as follows:

	1. Start users in an “unactivated” state.
	2. When a user signs up, generate an activation token and corresponding activation digest.
	3. Save the activation digest to the database, and then send an email to the user with a link containing the activation token and user’s email address.
	4. When the user clicks the link, find the user by email address, and then authenticate the token by comparing with the activation digest.
	5. If the user is authenticated, change the status from "unactivated" to "activated".

### Account activations resource

As with [sessions](https://nodeontrain.xyz/tuts/sessions/), we’ll model account activations as a resource even though they won’t be associated with an model. Instead, we’ll include the relevant data in the User model. Nevertheless, we’ll interact with account activations via a standard REST URL; because the activation link will be modifying the user’s activation status, we’ll plan to use the update action.

{% highlight bash %}
~/sample_app $ trainjs generate service AccountActivations update
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'users' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{ resources: 'account_activations', only: ['update'] }
];
{% endhighlight %}

Although we won’t use it in this tutorial, we’ll record the time and date of the activation in case we want it for future reference.

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_activation_to_users
{% endhighlight %}

`db/migrate/[timestamp]-add_activation_to_users.js`

{% highlight javascript %}
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
	queryInterface.addColumn(
		'user',
		'activation_digest',
		Sequelize.STRING
	);
	queryInterface.addColumn(
		'user',
		'activated',
		{
			type: Sequelize.BOOLEAN,
			defaultValue: false
		}
	);
	queryInterface.addColumn(
		'user',
		'activated_at',
		Sequelize.DATE
	);
  },

  down: function (queryInterface, Sequelize) {
  }
};
{% endhighlight %}

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
	activation_token: {
		type: Sequelize.VIRTUAL
	},
	activation_digest: {
		type: Sequelize.STRING
	},
	activated: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	activated_at: {
		type: Sequelize.DATE
	}
}, {
	...
});

...
{% endhighlight %}

We then apply the migration as usual

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

Because every newly signed-up user will require activation, we should assign an activation token and digest to each user object before it’s created. We saw a similar idea in ["User validations" Section](https://nodeontrain.xyz/tuts/user_validations/#uniqueness-validation), where we needed to convert an email address to lower-case before saving a user to the database.

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
		create_activation_digest: function() {
			this.activation_token  = User.new_token();
			this.activation_digest = User.digest(this.activation_token);
		}
	},
	classMethods: {
		digest: function(string){
			return bcrypt.hashSync(string, 10);
		},
		new_token: function(){
			var buf = secureRandom.randomBuffer(16);
			return URLSafeBase64.encode(buf);
		}
	}
});

var hasSecurePassword = function(user, options, callback) {
	if (user.password != user.password_confirmation) {
		throw new Error("Password confirmation doesn't match Password");
	}
	bcrypt.hash(user.get('password'), 10, function(err, hash) {
		if (err) return callback(err);
		user.set('password_digest', hash);
		return callback(null, options);
	});
};

User.beforeCreate(function(user, options, callback) {
	user.email = user.email.toLowerCase();
	user.create_activation_digest();
	if (user.password)
		hasSecurePassword(user, options, callback);
	else
		return callback(null, options);
})
...
{% endhighlight %}

Before moving on, we should also update our seed data

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
	}).then(function() {
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
	admin: true,
	activated: true,
	activated_at: new Date().getTime()
}).then(function() {
	User.create({
		name:  "Example User",
		email: "user@example.com",
		password: "password",
		password_confirmation: "password",
		activated: true,
		activated_at: new Date().getTime()
	}).then(function() {
		createUser();
	});
});
{% endhighlight %}

To apply the changes, reset the database to reseed the data as usual

{% highlight bash %}
~/sample_app $ rm -f db/development.sqlite3
~/sample_app $ sequelize db:migrate
~/sample_app $ node db/seeds.js
{% endhighlight %}

### Account activation mailer method

With the data modeling complete, we’re now ready to add the code needed to send an account activation email. To send email, we’ll use Mailjet

{% highlight bash %}
~/sample_app $ npm install node-mailjet --save
{% endhighlight %}

`app/helpers/mailer_helper.js`

{% highlight javascript %}
var Mailjet = require('node-mailjet').connect('API_KEY', 'API_SECRET');
var sendEmail = Mailjet.post('send');
var fs = require('fs');
var emailData = {
	'FromEmail': 'admin@nodeontrain.xyz',
	'FromName': 'Node On Train',
	'MJ-TemplateLanguage': 'true',
};
var host = 'https://sample.nodeontrain.xyz';

module.exports = {
	account_activation: function(user) {
		emailData['Subject'] = 'Account activation';
		emailData['Text-part'] = fs.readFileSync(ROOT_APP + '/app/views/user_mailer/account_activation.text').toString();
		emailData['Html-part'] = fs.readFileSync(ROOT_APP + '/app/views/user_mailer/account_activation.html').toString();
		emailData['Recipients'] = [{
			'Email': user.email,
			'Vars': {
				'name': user.name,
				'email': user.email,
				'activation_token': user.activation_token,
				'host': host
			}
		}]

		sendEmail.request(emailData).on('success', function (response, body) {
			console.log(body);
		}).on('error', function (err, response) {
			console.log(err);
		});
	}
};
{% endhighlight %}

The account activation text view.

`app/views/user_mailer/account_activation.text`

<figure class="highlight"><pre><code class="language-text" data-lang="text">Hi &#123;&#123;var:name:""&#125;&#125;,

Welcome to the Sample App! Click on the link below to activate your account:

&#123;&#123;var:host:""&#125;&#125;/#/account_activations/&#123;&#123;var:activation_token:""&#125;&#125;/update?email=&#123;&#123;var:email:""&#125;&#125;</code></pre></figure>


`app/views/user_mailer/account_activation.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;html&gt;</span>
	<span class="nt">&lt;body&gt;</span>
		<span class="nt">&lt;h1&gt;</span>Sample App<span class="nt">&lt;/h1&gt;</span>

		<span class="nt">&lt;p&gt;</span>Hi &#123;&#123;var:name:""&#125;&#125;,<span class="nt">&lt;/p&gt;</span>

		<span class="nt">&lt;p&gt;</span>
			Welcome to the Sample App! Click on the link below to activate your account:
		<span class="nt">&lt;/p&gt;</span>

		<span class="nt">&lt;a</span> <span class="na">href=</span><span class="s">"&#123;&#123;var:host:""&#125;&#125;/#/account_activations/&#123;&#123;var:activation_token:""&#125;&#125;/update?email=&#123;&#123;var:email:""&#125;&#125;"</span><span class="nt">&gt;</span>Activate<span class="nt">&lt;/a&gt;</span>
	<span class="nt">&lt;/body&gt;</span>
<span class="nt">&lt;/html&gt;</span></code></pre></figure>

To use the mailer in our application, we just need to add a couple of lines to the create action used to sign users up

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var mailerHelper = require('../helpers/mailer_helper.js');

function UsersController() {
	...
	this.create = function(req, res, next) {
		var user = ModelSync( User.create(req.body) );
		if (user && !user.errors)
			mailerHelper.account_activation(user);
		res.end(JSON.stringify(user));
	};
	...
}

module.exports = UsersController;
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
					flashHelper.set({type: "info", content: "Please check your email to activate your account."});
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
				}
			});
		};
	}]
);
...
{% endhighlight %}

Because redirects to the root URL instead of to the profile page and doesn’t log the user in as before, the test suite is currently failing, even though the application is working as designed. We’ll fix this by editing the test suite.

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
		expect(browser.getCurrentUrl()).toContain('#/home');
	});
});
{% endhighlight %}

With the code as above, the test should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
27 specs, 0 failures
{% endhighlight %}

### Activating the account

Now that we have a correctly generated email, we need to write an `update` action in the Account Activations controller to activate the user. Following the [model of passwords](https://nodeontrain.xyz/tuts/logging_in/#the-login-method) and [remember tokens](https://nodeontrain.xyz/tuts/remember_me/#login-with-remembering), we plan to find and authenticate the user with code something like this

{% highlight javascript %}
var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
if (user && !user.errors && user.authenticated('activation', req.params.id))
{% endhighlight %}

The above code uses the `authenticated` method to test if the account activation digest matches the given token, but at present this won’t work because that method is specialized to the remember token. We can generalize the method by adding a function argument with the name of the digest, and then use string interpolation

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		...
		authenticated: function(attribute, token) {
			if (this[attribute + '_digest'])
				return bcrypt.compareSync(token, this[attribute + '_digest']);
			else
				return false;
		},
		...
	},
	...
});

...
{% endhighlight %}

At this point, the tests should be failing. The reason for the failure is that the `current_user` method and the test for null digests both use the old version of `authenticated`, which expects one argument instead of two. To fix this, we simply update the two cases to use the generalized method

`app/helpers/sessions_helper.js`

{% highlight javascript %}
module.exports = {
	...
	current_user: function(req) {
		if (req.session.user_id) {
			return ModelSync( User.findById(req.session.user_id) );
		} else if (req.cookies.get("user_id")) {
			var user = ModelSync( User.findById(req.cookies.get("user_id")) );
			if (user && !user.errors && user.authenticated('remember', req.cookies.get("remember_token"))) {
				this.log_in(req, user);
				return user;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},
	...
};
{% endhighlight %}

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	...
	it('authenticated should return false for a user with null digest', function() {
		assert.equal(user.authenticated('remember', ''), false);
	});

});
{% endhighlight %}

At this point, the tests should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  19 passing (400ms)
{% endhighlight %}

With the `authenticated` method, we’re now ready to write an `update` action that authenticates the user corresponding to the email address in the params hash

`app/controllers/account_activations_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function AccountActivationsController() {
	this.update = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && !user.activated && user.authenticated('activation', req.params.id)) {
			ModelSync( user.update({
				activated: true,
				activated_at: new Date().getTime()
			}) );
			sessionHelper.log_in(req, user);
			res.end(JSON.stringify(user));
		} else {
			res.end(JSON.stringify({
				error: 'Invalid activation link'
			}));
		}
	};
}

module.exports = AccountActivationsController;
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	.state('account_activations_update', {
		url: '/account_activations/:activation_id/update?email',
		resolve: {
			activation: ['$state', 'AccountActivations', 'flashHelper', '$stateParams', '$rootScope', function($state, AccountActivations, flashHelper, $stateParams, $rootScope){
				AccountActivations.update({id: $stateParams.activation_id, email: $stateParams.email}, function(user) {
					if ( user.error ) {
						flashHelper.set({type: "danger", content: user.error});
						$state.transitionTo('home', {}, {
							reload: true, inherit: false, notify: true
						});
					} else {
						$rootScope.logged_in = true;
						$rootScope.current_user = user;
						flashHelper.set({type: "success", content: "Account activated!"});
						$state.transitionTo('user_detail', {id: user.id}, {
							reload: true, inherit: false, notify: true
						});
					}
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
...
{% endhighlight %}

<img src="/img/tuts/account_activation1.png" alt="account_activation1" width="100%" />

You should now be able to click in the URL from the email to activate the relevant user.

<img src="/img/tuts/account_activation2.png" alt="account_activation2" width="100%" />

Of course, currently user activation doesn’t actually do anything, because we haven’t changed how users log in. In order to have account activation mean something, we need to allow users to log in only if they are activated.

`app/controllers/sessions_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
function SessionsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && user.authenticate(req.body.password)) {
			if (user.activated) {
				sessionHelper.log_in(req, user);
				req.body.remember_me == 1 ? sessionHelper.remember(req, user) : sessionHelper.forget(req, user)
				res.end(JSON.stringify(user));
			} else {
				res.end(JSON.stringify({
					warning: 'Account not activated. Check your email for the activation link.'
				}));
			}
		} else {
			res.end(JSON.stringify({
				error: 'Invalid email/password combination'
			}));
		}
	};
	...
}

module.exports = SessionsController;
{% endhighlight %}

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
				} else if ( user.warning ) {
					flashHelper.set({type: "warning", content: user.warning});
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
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

### Activation test and refactoring

In this section, we’ll add an integration test for account activation.

`public/test/e2e_test/integration/users_signup_test.js`

{% highlight javascript %}
describe('UsersSignupTest', function() {
	...

	it('valid signup information with account activation', function(done) {
		var signup = function() {
			browser.executeAsyncScript(function(callback) {
				var $injector = angular.injector([ 'userService' ]);
				var User = $injector.get( 'User' );
				var user_number = new Date().getTime();
				User.create({name: 'Example User', email: 'user-'+user_number+'@example.com', password: 'password', password_confirmation: 'password'}, function(user){
					callback(user);
				}, function(error){
					callback(error);
				});
			}).then(function (output) {
				// Try to log in before activation.
				var current_url = 'http://localhost:1337/#/login';
				browser.get(current_url);
				element(by.css('[name="email"]')).sendKeys(output.email);
				element(by.css('[name="password"]')).sendKeys(output.password);
				element(by.css('[name="commit"]')).click();
				expect( element.all(by.css('.alert-warning')).count() ).toEqual(1);
				// Invalid activation token
				current_url = 'http://localhost:1337/#/account_activations/invalid_token/update?email=' + output.email;
				browser.get(current_url);
				expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
				expect( element.all(by.css('[ui-sref="logout"]')).count() ).toEqual(0);
				// Valid token, wrong email
				current_url = 'http://localhost:1337/#/account_activations/'+output.activation_token+'/update?email=wrong-email@example.net';
				browser.get(current_url);
				expect( element.all(by.css('.alert-danger')).count() ).toEqual(1);
				expect( element.all(by.css('[ui-sref="logout"]')).count() ).toEqual(0);
				// Valid activation token
				current_url = 'http://localhost:1337/#/account_activations/'+output.activation_token+'/update?email=' + output.email;
				browser.get(current_url);
				expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
				expect( element.all(by.css('[ui-sref="user_detail({id: current_user.id})"]')).count() ).toEqual(1);
				done();
			});
		}

		element.all(by.css('[ui-sref="login"]')).isDisplayed().then(function(result) {
			if ( result.length > 0 ) {
				signup();
			} else {
				element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
				signup();
			}
		});
	});
});
{% endhighlight %}

At this point, the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
27 specs, 0 failures
{% endhighlight %}

With the test, we’re ready to refactor a little by moving some of the user manipulation out of the controller and into the model. In particular, we’ll make an `activate` method to update the user’s activation attributes and a `send_activation_email` to send the activation email.

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		...
		activate: function() {
			ModelSync( this.update({
				activated: true,
				activated_at: new Date().getTime()
			}) );
		},
		send_activation_email: function() {
			mailerHelper.account_activation(this);
		}
	},
	...
});

...
{% endhighlight %}

`app/controllers/account_activations_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function AccountActivationsController() {
	this.update = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors && !user.activated && user.authenticated('activation', req.params.id)) {
			user.activate();
			sessionHelper.log_in(req, user);
			res.end(JSON.stringify(user));
		} else {
			res.end(JSON.stringify({
				error: 'Invalid activation link'
			}));
		}
	};
}

module.exports = AccountActivationsController;
{% endhighlight %}

`app/controllers/users_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function UsersController() {
	...
	this.create = function(req, res, next) {
		var user = ModelSync( User.create(req.body) );
		if (user && !user.errors)
			user.send_activation_email();
		res.end(JSON.stringify(user));
	};
	...
}

module.exports = UsersController;
{% endhighlight %}

These are exactly the kinds of details that are easy to miss during even a simple refactoring but will be caught by a good test suite. Speaking of which, the test suite should still be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
27 specs, 0 failures
{% endhighlight %}
