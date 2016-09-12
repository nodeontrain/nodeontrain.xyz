---
layout: tuts
title: Password reset
prev_section: account_activation
next_section: micropost_model
permalink: /tuts/password_reset/
---

Having completed account activation (and thereby verified the user's email address), we're now in a good position to handle the common case of users forgetting their passwords.

In analogy with account activations, our general plan is to make a Password Resets resource, with each password reset consisting of a reset token and corresponding reset digest. The primary sequence goes like this

	1. When a user requests a password reset, find the user by the submitted email address.
	2. If the email address exists in the database, generate a reset token and corresponding reset digest.
	3. Save the reset digest to the database, and then send an email to the user with a link containing the reset token and user's email address.
	4. When the user clicks the link, find the user by email address, and then authenticate the token by comparing to the reset digest.
	5. If authenticated, present the user with the form for changing the password.


### Password resets resource

Our first step is to generate a controller for our new resource

{% highlight bash %}
~/sample_app $ trainjs generate controller PasswordResets new edit --no-test-framework
~/sample_app $ trainjs generate service PasswordResets create update
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ resources: 'users' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{ resources: 'account_activations', only: ['update'] }
];
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	.state('password_resets_edit', {
		url: '/password_resets/:reset_token/edit?email',
		templateUrl: 'partials/password_resets/edit.html',
		controller: 'PasswordResetsEditCtrl',
		data: {
			title: 'Reset password'
		}
	})
	.state('password_resets_new', {
		url: '/password_resets/new',
		templateUrl: 'partials/password_resets/new.html',
		controller: 'PasswordResetsNewCtrl',
		data: {
			title: 'Forgot password'
		}
	})
	...
	.state('user_detail', {
		url: '/users/:id',
		templateUrl: 'partials/users/show.html',
		resolve: {
			current_user: current_user,
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
...
{% endhighlight %}

Adding a link to password resets.

`public/partials/sessions/new.html`

{% highlight html %}
<h1>Log in</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="user" submit-with="login()" validation-rules="validation_rules">
			<field-label label="Email"></field-label>
			<text-field attribute="email" type="email"></text-field>
			<field-label label="Password"></field-label>
			<a ui-sref="password_resets_new">(forgot password)</a>
			<text-field attribute="password" type="password"></text-field>
			<checkbox-field attribute="remember_me" label-class="checkbox inline" label="Remember me on this computer" uid="session_remember_me"></checkbox-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Log in" />
		</form>
		<p>New user? <a href ui-sref="signup">Sign up now!</a></p>
	</div>
</div>
{% endhighlight %}

The data model for password resets is similar to the one used for [account activation](https://nodeontrain.xyz/tuts/account_activation/#account-activations-resource). Following the pattern set by [remember tokens](https://nodeontrain.xyz/tuts/remember_me/) and [account activation tokens](https://nodeontrain.xyz/tuts/account_activation/), password resets will pair a virtual reset token for use in the reset email with a corresponding reset digest for retrieving the user. If we instead stored an unhashed token, an attacker with access to the database could send a reset request to the user's email address and then use the token and email to visit the corresponding password reset link, thereby gaining control of the account. Using a digest for password resets is thus essential. As an additional security precaution, we'll also plan to expire the reset link after a couple of hours, which requires recording the time when the reset gets sent.

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_reset_to_users
{% endhighlight %}

`db/migrate/[timestamp]-add_reset_to_users.js`

{% highlight javascript %}
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
	queryInterface.addColumn(
	  'user',
	  'reset_digest',
	  Sequelize.STRING
	);
	queryInterface.addColumn(
	  'user',
	  'reset_sent_at',
	  Sequelize.DATE
	);
  },

  down: function (queryInterface, Sequelize) {
	/*
	  Add reverting commands here.
	  Return a promise to correctly handle asynchronicity.

	  Example:
	  return queryInterface.dropTable('users');
	*/
  }
};
{% endhighlight %}

We then migrate as usual

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

### Password resets controller and form

A new password reset view.

`public/partials/password_resets/new.html`

{% highlight html %}
<h1>Forgot password</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="password_reset" submit-with="forgotPassword()" validation-rules="validation_rules">
			<div error-messages ng-if="error_messages" ng-model="error_messages" id="error_explanation"></div>
			<field-label label="Email"></field-label>
			<text-field attribute="email" type="email"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Submit" />
		</form>
	</div>
</div>
{% endhighlight %}

Upon submitting the form, we need to find the user by email address and update its attributes with the password reset token and sent-at timestamp. We then redirect to the root URL with an informative flash message.

`public/controllers/password_resets_controller.js`

{% highlight javascript %}
'use strict';

var passwordResetsController = angular.module('passwordResetsController', []);

passwordResetsController.controller(
	'PasswordResetsNewCtrl',
	['$scope', '$state', 'PasswordResets', 'flashHelper', function ($scope, $state, PasswordResets, flashHelper) {
		$scope.password_reset = {email: ''};
		$scope.validation_rules = {
			email: {
				required: true,
				maxlength: 255
			}
		};
		$scope.forgotPassword = function() {
			PasswordResets.create($scope.password_reset, function(password_reset){
				if ( password_reset.errors ) {
					$scope.error_messages = password_reset.errors;
				} else {
					flashHelper.set({type: "info", content: "Email sent with password reset instructions"});
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

`app/controllers/password_resets_controller.js`

{% highlight javascript %}
function PasswordResetsController() {
	this.create = function(req, res, next) {
		var user = ModelSync( User.findOne({ where: {email: req.body.email.toLowerCase()} }) );
		if (user && !user.errors) {
			user.create_reset_digest();
			user.send_password_reset_email();
			res.end(JSON.stringify({
				errors: user.errors ? user.errors : null
			}));
		} else {
			res.end(JSON.stringify({
				errors: [{message: 'Email address not found'}]
			}));
		}
	};
	this.update = function(req, res, next) {
	};

}

module.exports = PasswordResetsController;
{% endhighlight %}

Adding password reset methods to the User model.

`app/models/user.js`

{% highlight javascript %}
...
var User = sequelize.define('user', {
	...
	reset_token: {
		type: Sequelize.VIRTUAL
	},
	reset_digest: {
		type: Sequelize.STRING
	},
	reset_sent_at: {
		type: Sequelize.DATE
	}
}, {
	freezeTableName: true,
	indexes: [{unique: true, fields: ['email']}],
	instanceMethods: {
		...
		create_reset_digest: function() {
			this.reset_token  = User.new_token();
			ModelSync( this.update({
				reset_digest: User.digest(this.reset_token),
				reset_sent_at: new Date().getTime()
			}) );
		},
		send_password_reset_email: function() {
			mailerHelper.password_reset(this);
		}
	},
	...
});
...
{% endhighlight %}

### Password reset mailer method

The password reset mailer method needed to get this working is nearly identical to the mailer for [account activation](https://nodeontrain.xyz/tuts/account_activation/#account-activation-mailer-method). We first create a password_reset method in the user mailer, and then define view templates for plain-text email and HTML email

`app/helpers/mailer_helper.js`

{% highlight javascript %}
...

module.exports = {
	account_activation: function(user) {
		this.mail('account_activation', 'activation_token', user, 'Account activation');
	},
	password_reset: function(user) {
		this.mail('password_reset', 'reset_token', user, 'Password reset');
	},
	mail: function(template_name, token_name, user, subject) {
		emailData['Subject'] = subject;
		emailData['Text-part'] = fs.readFileSync(ROOT_APP + '/app/views/user_mailer/' + template_name + '.text').toString();
		emailData['Html-part'] = fs.readFileSync(ROOT_APP + '/app/views/user_mailer/' + template_name + '.html').toString();
		emailData['Recipients'] = [{
			'Email': user.email,
			'Vars': {
				'name': user.name,
				'email': user.email,
				'host': host
			}
		}];
		emailData['Recipients'][0]['Vars'][token_name] = user[token_name];

		sendEmail.request(emailData).on('success', function (response, body) {
			console.log(body);
		}).on('error', function (err, response) {
			console.log(err);
		});
	}
};
{% endhighlight %}


`app/views/user_mailer/password_reset.text`

<figure class="highlight"><pre><code class="language-text" data-lang="text">To reset your password click the link below:

&#123;&#123;var:host:""&#125;&#125;/#/password_resets/&#123;&#123;var:reset_token:""&#125;&#125;/edit?email=&#123;&#123;var:email:""&#125;&#125;

This link will expire in two hours.

If you did not request your password to be reset, please ignore this email and
your password will stay as it is.</code></pre></figure>


`app/views/user_mailer/password_reset.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;h1&gt;</span>Password reset<span class="nt">&lt;/h1&gt;</span>

<span class="nt">&lt;p&gt;</span>To reset your password click the link below:<span class="nt">&lt;/p&gt;</span>

<span class="nt">&lt;a</span> <span class="na">href=</span><span class="s">"&#123;&#123;var:host:""&#125;&#125;/#/password_resets/&#123;&#123;var:reset_token:""&#125;&#125;/edit?email=&#123;&#123;var:email:""&#125;&#125;"</span><span class="nt">&gt;</span>Reset password<span class="nt">&lt;/a&gt;</span>

<span class="nt">&lt;p&gt;</span>This link will expire in two hours.<span class="nt">&lt;/p&gt;</span>

<span class="nt">&lt;p&gt;</span>
If you did not request your password to be reset, please ignore this email and
your password will stay as it is.
<span class="nt">&lt;/p&gt;</span></code></pre></figure>

`public/test/e2e_test/integration/password_resets_test.js`

{% highlight javascript %}
describe('PasswordResetsTest', function() {
	it('password resets', function(done) {
		var current_url = 'http://localhost:1337/#/password_resets/new';
		browser.get(current_url);

		var forgotPassword = function() {
            current_url = 'http://localhost:1337/#/password_resets/new';
			browser.get(current_url);
			element(by.css('[name="email"]')).sendKeys('user@example.com');
			element(by.css('[name="commit"]')).click();
			expect(browser.getCurrentUrl()).toContain('#/home');
			expect( element.all(by.css('.alert-info')).count() ).toEqual(1);
			done();
		}

		element.all(by.css('[ui-sref="login"]')).isDisplayed().then(function(result) {
			if ( result.length > 0 ) {
				forgotPassword();
			} else {
				element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
				forgotPassword();
			}
		});
	});
});
{% endhighlight %}

At this point, the test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
28 specs, 0 failures
{% endhighlight %}

### Resetting the password

To get links of the reset form to work, we need a form for resetting passwords. The task is similar to updating users via the user edit view, but in this case with only password and confirmation fields. There's an additional complication, though: we expect to find the user by email address, which means we need its value in both the edit and update actions. The email will automatically be available in the edit action because of its presence in the link above, but after we submit the form its value will be lost. The solution is to use a hidden field to place (but not display) the email on the page, and then submit it along with the rest of the form's information.

`public/partials/password_resets/edit.html`

{% highlight html %}
<h1>Reset password</h1>

<div class="row">
	<div class="col-md-6 col-md-offset-3">
		<form form-for="password_reset" submit-with="resetPassword()" validation-rules="validation_rules">
			<div error-messages ng-if="error_messages" ng-model="error_messages" id="error_explanation"></div>
			<text-field attribute="email" type="hidden"></text-field>
			<text-field attribute="password" label="Password" type="password"></text-field>
			<text-field attribute="password_confirmation" label="Password Confirmation" type="password"></text-field>
			<input class="btn btn-primary" name="commit" type="submit" value="Update Password" />
		</form>
	</div>
</div>
{% endhighlight %}

To get the form to render, we need to define an `password_reset` variable in the Password Resets controller's edit action.

`public/controllers/password_resets_controller.js`

{% highlight javascript %}
'use strict';

var passwordResetsController = angular.module('passwordResetsController', []);
...
passwordResetsController.controller(
	'PasswordResetsEditCtrl',
	['$scope', '$stateParams', '$q', 'PasswordResets', 'flashHelper', '$state', function ($scope, $stateParams, $q, PasswordResets, flashHelper, $state) {
		$scope.password_reset = {id: $stateParams.reset_token, email: $stateParams.email, password: '', password_confirmation: ''};
		$scope.validation_rules = {
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
		$scope.resetPassword = function() {
			PasswordResets.update($scope.password_reset, function(password_reset){
				if ( password_reset.error ) {
					flashHelper.set({type: "danger", content: password_reset.error}, true);
				} else {
					if ( password_reset.errors ) {
						$scope.error_messages = password_reset.errors;
					} else {
						flashHelper.set({type: "success", content: "Password has been reset."});
						$state.transitionTo('user_detail', {id: password_reset.id}, {
							reload: true, inherit: false, notify: true
						});
					}
				}
			});
		};
	}]
);
{% endhighlight %}

To define the update action corresponding to the edit action, we need to consider four cases: an expired password reset, a successful update, a failed update (due to an invalid password), and a failed update (which initially looks "successful") due to a blank password and confirmation.

`app/controllers/password_resets_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');

function PasswordResetsController() {
	this.create = function(req, res, next) {
		var user = this.get_user(req, res, next);
		if (user && !user.errors) {
			user.create_reset_digest();
			user.send_password_reset_email();
			res.end(JSON.stringify({
				errors: user.errors ? user.errors : null
			}));
		} else {
			res.end(JSON.stringify({
				errors: [{message: 'Email address not found'}]
			}));
		}
	};
	this.update = function(req, res, next) {
		var user = this.valid(req, res, next, true);
		if (user) {
			ModelSync(user.update({
				password: req.body.password,
				password_confirmation: req.body.password_confirmation
			}));
			if (!user.errors)
				sessionHelper.log_in(req, user);
			res.end(JSON.stringify(user));
		}
	};
	this.get_user = function(req, res, next) {
		var email = req.body.email ? req.body.email.toLowerCase() : '';
		return ModelSync( User.findOne({ where: {email: email} }) );
	};
	this.valid = function(req, res, next, is_response) {
		var user = this.get_user(req, res, next);
		if (user && !user.errors && user.activated && user.authenticated('reset', req.params.id)) {
			if (user.password_reset_expired()) {
				res.end(JSON.stringify({
					error: 'Password reset has expired.'
				}));
				return null;
			} else {
				if (is_response)
					return user;
				else
					res.end(JSON.stringify({
						email: req.body.email
					}));
			}
		} else {
			res.end(JSON.stringify({
				error: 'Invalid User'
			}));
			return null;
		}
	};
}

module.exports = PasswordResetsController;
{% endhighlight %}

`config/routes.js`

{% highlight javascript %}
module.exports = [
	{ resources: 'password_resets', only: ['create', 'update'] },
	{ put: '/password_resets/:id/valid', action: 'valid' },
	{ resources: 'users' },
	{ post: '/sessions' },
	{ delete: '/sessions', action: 'destroy' },
	{ get: '/sessions', action: 'current_user' },
	{ resources: 'account_activations', only: ['update'] }
];
{% endhighlight %}

`public/services/password_reset.js`

{% highlight javascript %}
var passwordResetsService = angular.module('passwordResetsService', ['ngResource']);

passwordResetsService.factory('PasswordResets', ['$resource', function($resource){
	return $resource('password_resets/:id', {id:'@id'}, {
		'create': {method: 'POST'},
		'update': {method: 'PUT'},
		'valid': {method: 'PUT'},
	});
}]);
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
...
sampleApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise('/home');
	$stateProvider
	.state('password_resets_edit', {
		url: '/password_resets/:reset_token/edit?email',
		templateUrl: 'partials/password_resets/edit.html',
		controller: 'PasswordResetsEditCtrl',
		resolve: {
			password_reset: ['$state', 'PasswordResets', 'flashHelper', '$stateParams', '$q', function($state, PasswordResets, flashHelper, $stateParams, $q){
				var deferred = $q.defer();
				PasswordResets.valid({id: $stateParams.reset_token, email: $stateParams.email}, function(password_reset) {
					if ( password_reset.error ) {
						if (password_reset.error.toLowerCase() == 'invalid user') {
							$state.transitionTo('home', {}, {
								reload: true, inherit: false, notify: true
							});
						} else {
							flashHelper.set({type: "danger", content: password_reset.error});
							$state.transitionTo('password_resets_new', {}, {
								reload: true, inherit: false, notify: true
							});
						}
					} else {
						deferred.resolve();
					}
				}, function(error) {
					flashHelper.set({type: "danger", content: error.statusText});
					$state.transitionTo('home', {}, {
						reload: true, inherit: false, notify: true
					});
				});
				return deferred.promise;
			}]
		},
		data: {
			title: 'Reset password'
		}
	})
	...
...
{% endhighlight %}

The implementation delegates the boolean test for password reset expiration to the User model

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
		password_reset_expired: function() {
			return new Date(this.reset_sent_at).getTime() < new Date().getTime() - 2 * 60 * 60 * 1000;
		}
	},
	...
});
...
{% endhighlight %}

<img src="/img/tuts/password_reset1.png" alt="password_reset1" width="100%" />
<img src="/img/tuts/password_reset2.png" alt="password_reset2" width="100%" />
<img src="/img/tuts/password_reset3.png" alt="password_reset3" width="100%" />

### Password reset test

The steps to test password resets broadly parallel the test for [account activation](https://nodeontrain.xyz/tuts/account_activation/#activation-test-and-refactoring), though there is a difference at the outset: we first visit the “forgot password” form and submit invalid and then valid email addresses, the latter of which creates a password reset token and sends the reset email. We then visit the link from the email and again submit invalid and valid information, verifying the correct behavior in each case.

`public/test/e2e_test/integration/password_resets_test.js`

{% highlight javascript %}
require('trainjs').initServer();

describe('PasswordResetsTest', function() {
	var user = null;

	beforeEach(function(done){
		var user_number = new Date().getTime();
		User.create({name: 'Example User', email: 'user-'+user_number+'@example.com', password: 'password', password_confirmation: 'password'}).then(function(new_user){
			new_user.reset_token = User.new_token();
			new_user.update({
				reset_digest: User.digest(new_user.reset_token),
				reset_sent_at: new Date().getTime()
			}).then(function(){
				user = new_user;
				done();
			});
		});
	});

	it('password resets', function(done) {
		var current_url = 'http://localhost:1337/#/password_resets/new';
		browser.get(current_url);

		var forgotPassword = function() {
            current_url = 'http://localhost:1337/#/password_resets/new';
			browser.get(current_url);
			// Invalid email
			element(by.css('[name="email"]')).sendKeys('');
			element(by.css('[name="commit"]')).click();
			expect( element.all(by.css('.has-error')).count() ).toEqual(1);

			// Inactive user
			current_url = 'http://localhost:1337/#/password_resets/' + user.reset_token + '/edit?email=' + user.email;
			browser.get(current_url);
			expect(browser.getCurrentUrl()).toContain('#/home');

			// Active user and logout
			current_url = 'http://localhost:1337/#/account_activations/'+user.activation_token+'/update?email=' + user.email;
			browser.get(current_url);
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
			element(by.css('.dropdown')).click();
			element(by.css('[ui-sref="logout"]')).click();
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(1);
			// Wrong email
			current_url = 'http://localhost:1337/#/password_resets/' + user.reset_token + '/edit?email=';
			browser.get(current_url);
			expect(browser.getCurrentUrl()).toContain('#/home');
			// Right email, wrong token
			current_url = 'http://localhost:1337/#/password_resets/wrong_token/edit?email=' + user.email;
			browser.get(current_url);
			expect(browser.getCurrentUrl()).toContain('#/home');
			// Right email, right token
			current_url = 'http://localhost:1337/#/password_resets/' + user.reset_token + '/edit?email=' + user.email;
			browser.get(current_url);
			expect( element.all(by.css('input[name="email"][type="hidden"]')).count() ).toEqual(1);
			// Invalid password & confirmation
			element(by.css('[name="password"]')).sendKeys('foobaz');
			element(by.css('[name="password_confirmation"]')).sendKeys('barquux');
			element(by.css('[name="commit"]')).click();
			expect( element.all(by.css('.has-error')).count() ).toEqual(1);
			// Empty password
			element(by.css('[name="password"]')).clear('');
			element(by.css('[name="password_confirmation"]')).clear('');
			element(by.css('[name="commit"]')).click();
			expect( element.all(by.css('.has-error')).count() ).toEqual(1);
			// Valid password & confirmation
			element(by.css('[name="password"]')).sendKeys('foobaz');
			element(by.css('[name="password_confirmation"]')).sendKeys('foobaz');
			element(by.css('[name="commit"]')).click();
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);

			// Logout and relogin
			element(by.css('.dropdown')).click();
			element(by.css('[ui-sref="logout"]')).click();
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(1);
			current_url = 'http://localhost:1337/#/login';
			browser.get(current_url);
			element(by.css('[name="email"]')).sendKeys(user.email);
			element(by.css('[name="password"]')).sendKeys('foobaz');
			element(by.css('[name="commit"]')).click();
			expect( element.all(by.css('[ui-sref="login"]')).count() ).toEqual(0);
			done();
		};

		element.all(by.css('[ui-sref="login"]')).isDisplayed().then(function(result) {
			if ( result.length > 0 ) {
				forgotPassword();
			} else {
				element(by.css('.dropdown')).click();
				element(by.css('[ui-sref="logout"]')).click();
				forgotPassword();
			}
		});
	});
});
{% endhighlight %}

Our test suite should be successful

{% highlight bash %}
~/sample_app $ protractor protractor.conf.js
28 specs, 0 failures
{% endhighlight %}
