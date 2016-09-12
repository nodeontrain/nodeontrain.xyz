var cb = function () {
	var head_ele = document.getElementsByTagName('head')[0];

	var l1 = document.createElement('link');
	l1.rel = 'stylesheet';
	l1.href = 'https://fonts.googleapis.com/css?family=Lato:100,300,400,700,900,100italic,300italic,400italic,700italic,900italic';
	head_ele.appendChild(l1);

	var l2 = document.createElement('link');
	l2.rel = 'stylesheet';
	l2.href = 'https://fonts.googleapis.com/css?family=Arizonia';
	head_ele.appendChild(l2);
};
var raf = requestAnimationFrame || mozRequestAnimationFrame ||
	webkitRequestAnimationFrame || msRequestAnimationFrame;
if (raf) raf(cb);
else window.addEventListener('load', cb);
