---
layout: tuts
title: Planning the application
prev_section: structure
next_section: users_resource
permalink: /tuts/planning_app/
---

In this section, we'll outline our plans for the toy application. As in ["Basic Usage" Section](https://nodeontrain.xyz/tuts/usage/), we'll start by generating the application skeleton using the `trainjs new` command.

{% highlight bash %}
~ $ trainjs new toy_app
~ $ cd toy_app
{% endhighlight %}

### Modeling demo users
Users of our demo app will have a unique integer identifier called `id`, a publicly
viewable `name` (of type `string`), and an `email` address (also a `string`) that will double as a username.

### Modeling demo microposts
Microposts has only an `id` and a `content` field for the micropost's text (of type `text`). There's an additional complication, though: we want to associate each micropost with a particular user;
we'll accomplish this by recording the `user_id` of the owner of the post.
