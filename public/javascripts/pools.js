

$(document).ready(function () {

	$('a.remove-link').click(function (e) {

		var ok = window.confirm('You sure you wanna delete that? ' +
				'All associated subjects will be deleted as well.');
		return ok;
	});
});