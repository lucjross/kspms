

$(document).ready(function () {

	$('a.remove-link').click(function (e) {

		var ok = window.confirm('Are you sure you want to delete that? ' +
				'All subjects in the pool will be deleted as well.');
		return ok;
	});
});