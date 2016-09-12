---
layout: tuts
title: The status feed
prev_section: web_interface
next_section: history
permalink: /tuts/status_feed/
---

We come now to the pinnacle of our sample application: the status feed of microposts. Appropriately, this section contains some of the most advanced material in the entire tutorial. The full status feed builds on the proto-feed from ["Manipulating microposts Section"](https://nodeontrain.xyz/tuts/manipulating_microposts/#a-proto-feed) by assembling an array of the microposts from the users being followed by the current user, along with the current user's own microposts. Throughout this section, we'll proceed through a series of feed implementations of increasing sophistication.

### Motivation and strategy

The basic idea behind the feed is simple. The purpose of a feed is to pull out the microposts whose user ids correspond to the users being followed by the current user (and the current user itself)

Although we don't yet know how to implement the feed, the tests are relatively straightforward, so we'll write them first. The key is to check all three requirements for the feed: microposts for both followed users and the user itself should be included in the feed, but a post from an unfollowed user should not be included.

`test/models/user_test.js`

{% highlight javascript %}
require('trainjs').initServer();
var assert = require('assert');

describe('UserTest', function () {
	...

	it('feed should have the right posts', function(done) {
		var Fiber = require('fibers');
		Fiber(function() {
			var user1 = ModelSync( User.findOne({where: {id: 1}}) );
			var user2 = ModelSync( User.findOne({where: {id: 2}}) );
			var feed1 = ModelSync( user1.feed({offset: 0}) ).rows;
			var feed2 = ModelSync( user2.feed({offset: 0}) ).rows;

			Micropost.findAll({
				where: { user_id: 1 },
			}).then(function(microposts1){
				Micropost.findAll({
					where: { user_id: 2 }
				}).then(function(microposts2){
					// Posts from followed user
					var exist = false;
					for (var k in microposts2) {
						var micropost = microposts2[k];
						if (feed1.filter(function(m){if (m.id == micropost.id) return m.id; }).length > 0) {
							exist = true;
							break;
						}
					}
					assert.equal(exist, true);
					// Posts from self
					exist = false;
					for (var k in microposts2) {
						var micropost = microposts2[k];
						if (feed2.filter(function(m){if (m.id == micropost.id) return m.id; }).length > 0) {
							exist = true;
							break;
						}
					}
					assert.equal(exist, true);
					// Posts from unfollowed user
					exist = false;
					for (var k in microposts1) {
						var micropost = microposts1[k];
						if (feed2.filter(function(m){if (m.id == micropost.id) return m.id; }).length > 0) {
							exist = true;
							break;
						}
					}
					assert.equal(exist, false);

					done();
				})
			})

		}).run();
	});

});
{% endhighlight %}

Of course, the current implementation is just a proto-feed, so the new test is failing

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  21 passing (4s)
   1 failing
{% endhighlight %}


### A first feed implementation

With the status feed design requirements captured in the test, we're ready to start writing the feed. Since the final feed implementation is rather intricate, we'll build up to it by introducing one piece at a time. The first step is to think of the kind of query we'll need. We need to select all the microposts from the microposts table with ids corresponding to the users being followed by a given user (or the user itself).

`app/models/user.js`

{% highlight javascript %}
...

var User = sequelize.define('user', {
	...
}, {
	...
	instanceMethods: {
		...
		feed: function(page) {
			var ids = ModelSync( this.getFollowing({attributes: ['id'], raw: true}) );
			var following_ids = ids.map(function(obj){ return obj.id });
			return Micropost.findAndCountAll({
				where: {
					user_id: {
						$or: {
							$in: following_ids,
							$eq: this.id
						}
					}
				},
				include: [ { model: User } ],
				order: 'micropost.createdAt DESC',
				offset: page.offset,
				limit: page.limit
			});
		},
	},
	...
});

...
{% endhighlight %}

The test suite should be successful

{% highlight bash %}
~/sample_app $ mocha test/models/user_test.js
  21 passing (2s)
{% endhighlight %}


### Conclusion

With the addition of the status feed, we've finished the sample application for the Node On Train Tutorial.