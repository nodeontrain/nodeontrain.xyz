---
layout: tuts
title: Micropost images
prev_section: manipulating_microposts
next_section: relationship_model
permalink: /tuts/micropost_images/
---

Now that we've added support for all relevant micropost actions, in this section we'll make it possible for microposts to include images as well as text.

Adding image upload involves two main visible elements: a form field for uploading an image and the micropost images themselves.

### Basic image upload

To handle an uploaded image and associate it with the Micropost model, we'll use the `multer` module.

{% highlight bash %}
~/sample_app $ npm install --save multer
{% endhighlight %}

To add the required picture attribute to the Micropost model, we generate a migration

{% highlight bash %}
~/sample_app $ sequelize migration:create --name add_picture_to_microposts
{% endhighlight %}

`db/migrate/[timestamp]-add_picture_to_microposts.js`

{% highlight javascript %}
'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addColumn(
      'micropost',
      'picture',
      Sequelize.STRING
    )
  },

  down: function (queryInterface, Sequelize) {

  }
};
{% endhighlight %}

and migrate the development database

{% highlight bash %}
~/sample_app $ sequelize db:migrate
{% endhighlight %}

`app/models/micropost.js`

{% highlight javascript %}
var Sequelize = require('sequelize');
var sequelize = CONFIG.database;

var Micropost = sequelize.define('micropost', {
	...
	picture: {
		type: Sequelize.STRING
	}
}, {
	...
});

module.exports = Micropost;
{% endhighlight %}

To include the uploader on the Home page, we need to include a file tag in the micropost form

`public/partials/shared/_micropost_form.html`

{% highlight html %}
<form form-for="_micropost" submit-with="createMicropost()" validation-rules="validation_rules" enctype="multipart/form-data">
	<div error-messages ng-if="error_messages" ng-model="error_messages" id="error_explanation"></div>
	<text-field attribute="content" label="Content" multiline placeholder="Compose new micropost..."></text-field>
	<input class="btn btn-primary" name="commit" type="submit" value="Post" />
	<span class="picture">
		<input type="file" file-model="_micropost.picture" />
	</span>
</form>
{% endhighlight %}

`public/directives/files.js`

{% highlight javascript %}
var fileDirective = angular.module('fileDirective', []);

fileDirective.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
{% endhighlight %}

`public/app.js`

{% highlight javascript %}
'use strict';

var sampleApp = angular.module('sampleApp', [
	...
	'fileDirective'
]);

...
{% endhighlight %}

`public/services/micropost.js`

{% highlight javascript %}
var micropostService = angular.module('micropostService', ['ngResource']);

micropostService.factory('Micropost', ['$resource', function($resource){
	return $resource('microposts/:id', {id:'@id'}, {
		'create': {
			method: 'POST',
			transformRequest: function(data) {
				if (data === undefined)
					return data;
		
				var fd = new FormData();
				angular.forEach(data, function(value, key) {
					if (value instanceof FileList) {
						if (value.length == 1) {
							fd.append(key, value[0]);
						} else {
							angular.forEach(value, function(file, index) {
								fd.append(key + '_' + index, file);
							});
						}
					} else {
						fd.append(key, value);
					}
				});
				return fd;
			},
        	headers: { 'Content-Type': undefined }
		},
		'delete': {method: 'DELETE'}
	});
}]);
{% endhighlight %}

`public/index.html`

{% highlight html %}
...
<script src="directives/delete_micropost.js"></script>
<script src="directives/files.js"></script>
...
{% endhighlight %}

Finally, we need to add picture to the list of attributes

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var multer = require('multer');

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
		{ action: 'correct_user', only: ['destroy'] },
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var upload = multer({
            storage: multer.diskStorage({
				destination: function (req, file, cb) {
					cb(null, 'uploads');
				},
				filename: function (req, file, cb) {
					cb(null, file.fieldname + '-' + Date.now());
				}
			})
        }).single('picture');
		upload(req, res, function (err) {
			if (err) {
				var message = 'An error occurred when uploading';
				if (err.message)
					message = err.message;
				res.end(JSON.stringify({errors: [{message: message}]}));
			} else {
                if (req.file && req.file.path) {
                    current_user.createMicropost({
                        content: req.body.content,
                        picture: req.file.path
                    }).then(function(data) {
                        res.end(JSON.stringify(data));
                    }).catch(function(errors) {
                        res.end(JSON.stringify(errors));
                    });
                } else {
                    current_user.createMicropost({
                        content: req.body.content
                    }).then(function(data) {
                        res.end(JSON.stringify(data));
                    }).catch(function(errors) {
                        res.end(JSON.stringify(errors));
                    });
                }
			}
		})
	};
    
	...
}

module.exports = MicropostsController;
{% endhighlight %}

Once the image has been uploaded, we can render it using the image tag in the micropost partial

`public/partials/microposts/_micropost.html`

<figure class="highlight"><pre><code class="language-html" data-lang="html"><span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: micropost.user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;img</span> <span class="na">class=</span><span class="s">"gravatar"</span> <span class="na">gravatar_for=</span><span class="s">"&#123;&#123; micropost.user.email &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"&#123;&#123; micropost.user.name &#125;&#125;"</span> <span class="na">options-size=</span><span class="s">"50"</span> <span class="nt">/&gt;</span>
<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;span</span> <span class="na">class=</span><span class="s">"user"</span><span class="nt">&gt;</span>
	<span class="nt">&lt;a</span> <span class="na">href</span> <span class="na">ui-sref=</span><span class="s">"user_detail({id: micropost.user.id})"</span> <span class="na">ui-sref-opts=</span><span class="s">"{reload: true}"</span><span class="nt">&gt;</span>
		&#123;&#123; micropost.user.name &#125;&#125;
	<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/span&gt;</span>
<span class="nt">&lt;span</span> <span class="na">class=</span><span class="s">"content"</span><span class="nt">&gt;</span>
	&#123;&#123; micropost.content &#125;&#125;
	<span class="nt">&lt;img</span> <span class="na">ng-src=</span><span class="s">"&#123;&#123; micropost.picture &#125;&#125;"</span> <span class="na">alt=</span><span class="s">"micropost image"</span> <span class="na">ng-if=</span><span class="s">"micropost.picture"</span><span class="nt">&gt;</span>
<span class="nt">&lt;/span&gt;</span>
<span class="nt">&lt;span</span> <span class="na">time-ago</span> <span class="na">class=</span><span class="s">"timestamp"</span><span class="nt">&gt;</span>
	Posted &#123;&#123; time_ago_in_words(micropost.createdAt) &#125;&#125;.
	<span class="nt">&lt;a</span> <span class="na">ng-if=</span><span class="s">"current_user.id == micropost.user.id"</span> <span class="na">href</span> <span class="na">delete-micropost=</span><span class="s">"&#123;&#123; micropost.id &#125;&#125;"</span> <span class="na">data-confirm=</span><span class="s">"You sure?"</span><span class="nt">&gt;</span>delete<span class="nt">&lt;/a&gt;</span>
<span class="nt">&lt;/span&gt;</span></code></pre></figure>


### Image validation

The uploader is a good start, but it has significant limitations. In particular, it doesn't enforce any constraints on the uploaded file, which can cause problems if users try to upload large files of invalid file types. To remedy this defect, we'll add validations for the image size and format, both on the server and on the client.

The first image validation, which restricts uploads to valid image types.

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var multer = require('multer');

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
		{ action: 'correct_user', only: ['destroy'] },
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var upload = multer({
			storage: multer.diskStorage({
				destination: function (req, file, cb) {
					cb(null, 'uploads');
				},
				filename: function (req, file, cb) {
					cb(null, file.fieldname + '-' + Date.now());
				}
			}),
			fileFilter: function(req, file, cb) {
				var extension_white_list = ['image/jpg', 'image/jpeg', 'image/gif', 'image/png'];				
				if (extension_white_list.indexOf(file.mimetype) > -1) {
					cb(null, true);
				} else {
					cb(new Error('File type does not match'));
				}
			}
		}).single('picture');

		...
	};
	
	...
}

module.exports = MicropostsController;
{% endhighlight %}

The second validation, which controls the size of the image

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var multer = require('multer');

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
		{ action: 'correct_user', only: ['destroy'] },
	];

	this.create = function(req, res, next) {
		var current_user = sessionHelper.current_user(req);
		var upload = multer({
			storage: multer.diskStorage({
				destination: function (req, file, cb) {
					cb(null, 'uploads');
				},
				filename: function (req, file, cb) {
					cb(null, file.fieldname + '-' + Date.now());
				}
			}),
			fileFilter: function(req, file, cb) {
				var extension_white_list = ['image/jpg', 'image/jpeg', 'image/gif', 'image/png'];				
				if (extension_white_list.indexOf(file.mimetype) > -1) {
					cb(null, true);
				} else {
					cb(new Error('File type does not match'));
				}
			},
			limits: {
				fileSize: 5 * 1024 * 1024
			}
		}).single('picture');

		...
	};
	
	...
}

module.exports = MicropostsController;
{% endhighlight %}

To go along with the validations, we'll add two client-side checks on the uploaded image. We'll first mirror the format validation by using the `accept` parameter in the file input tag.

`public/partials/shared/_micropost_form.html`

{% highlight html %}
<form form-for="_micropost" submit-with="createMicropost()" validation-rules="validation_rules" enctype="multipart/form-data">
	<div error-messages ng-if="error_messages" ng-model="error_messages" id="error_explanation"></div>
	<text-field attribute="content" label="Content" multiline placeholder="Compose new micropost..."></text-field>
	<input class="btn btn-primary" name="commit" type="submit" value="Post" />
	<span class="picture">
		<input type="file" file-model="_micropost.picture" accept="image/jpeg,image/gif,image/png" />
	</span>
</form>
{% endhighlight %}

Next, we'll include a little JavaScript to issue an alert if a user tries to upload an image that's too big (which prevents accidental time-consuming uploads and lightens the load on the server).

`public/directives/files.js`

{% highlight javascript %}
var fileDirective = angular.module('fileDirective', []);

fileDirective.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                var size_in_megabytes = element[0].files[0].size/1024/1024;
                if (size_in_megabytes > 5) {
                    alert('Maximum file size is 5MB. Please choose a smaller file.');
                }
                
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
{% endhighlight %}


### Image resizing

The image size validations are a good start, but they still allow the uploading of images large enough to break our site's layout. Thus, while it's convenient to allow users to select fairly large images from their local disk, it's also a good idea to resize the images before displaying them.

We'll be resizing images using the image manipulation program ImageMagick, which we need to install on the development environment.

{% highlight bash %}
$ sudo apt-get update
$ sudo apt-get install imagemagick --fix-missing
{% endhighlight %}

Next, we need to user `gm` module for ImageMagick

{% highlight bash %}
~/sample_app $ npm install --save gm
{% endhighlight %}

`app/controllers/microposts_controller.js`

{% highlight javascript %}
var sessionHelper = require('../helpers/sessions_helper.js');
var multer = require('multer');
var gm = require('gm').subClass({imageMagick: true});

function MicropostsController() {
	this.before_action = [
		{ action: 'logged_in_user', only: ['create', 'destroy'] },
		{ action: 'correct_user', only: ['destroy'] },
	];

	this.create = function(req, res, next) {
		...

		upload(req, res, function (err) {
			if (err) {
				var message = 'An error occurred when uploading';
				if (err.message)
					message = err.message;
				res.end(JSON.stringify({errors: [{message: message}]}));
			} else {
				if (req.file && req.file.path) {
					gm(req.file.path).resize(400, 400).write(req.file.path, function (err) {
						if (err) {
							var message = 'An error occurred when uploading';
							if (err.message)
								message = err.message;
							res.end(JSON.stringify({errors: [{message: message}]}));
						} else {
							current_user.createMicropost({
								content: req.body.content,
								picture: req.file.path
							}).then(function(data) {
							    res.end(JSON.stringify(data));
							}).catch(function(errors) {
								res.end(JSON.stringify(errors));
							});
						}
					});
				} else {
					current_user.createMicropost({
						content: req.body.content
					}).then(function(data) {
					    res.end(JSON.stringify(data));
					}).catch(function(errors) {
						res.end(JSON.stringify(errors));
					});
				}
			}
		})
	};
	
	...
}

module.exports = MicropostsController;
{% endhighlight %}
