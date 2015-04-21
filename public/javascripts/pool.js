

function error() {
	console.error.apply(console, arguments);

	var errStr = 'There was an error.\n\n';
	for (var i = 0; i < arguments.length; i++) {
		errStr += JSON.stringify(arguments[i]) + '\n\n';
	}
	window.alert(errStr);
}



var statusPaths;

$.when(
	$.getJSON('/statusPaths'))
.then(function (v1) {
	statusPaths = v1;

	$(document).ready(function () {
		populateStatusSelects();
		bindFileOperations();
		initTableSorter();
		initResizableColumns();
		bindFiltersMenuToggle();
		bindRemove();
		bindUnremove();
		bindEditComments();
	});
});



function populateStatusSelects() {
	/* populate status select options */
	$.fn.populateStatusSelect = function () {
		
		var $this = this;
		var $curr = $this.children('option:selected');
		var currVal = $curr.val();

		$curr.text(statusPaths[currVal].text);

		if (! statusPaths[currVal].next) {
			$this.prop('disabled', true);
			return;
		}

		var optionsHTML = $curr.get(0).outerHTML;
		$.each(statusPaths[currVal].next, function () {
			optionsHTML += '<option value="' + this + '">'
					+ statusPaths[this].text + '</option>\n';
		});
		$this.html(optionsHTML);

		return this;
	};

	var $statusSelects = $('table select[name="status"]');
	$statusSelects.each(function () {
		$(this).populateStatusSelect();
	});

	$statusSelects.on('change', function (e) {
		var $this = $(this);

		$this.populateStatusSelect();

		// post update
		var url = $this.closest('form').prop('action') + '-status';
		var status = $this.children(':selected').val();
		$.post(url, { status: status })
		.done(function () {
			// now check if the new status is supposed to be filtered out.
			// if so then refresh the page.

			var selectedFilterVal = $('div#filtersMenu select option:selected').val();
			if (selectedFilterVal !== '' && selectedFilterVal !== status) {
				window.location.href = window.location.href;
			}
		})
		.fail(function (jqXHR, textStatus, err) {
			error(err);
		});

	});
}

function bindFileOperations() {
	$('a.file-import-link').on('click', function (e) {
		e.preventDefault();
		$(this).closest('td').find('input').click();
	});

	$('input[name="doc file input"]').on('change', function (e) {
		var $this = $(this);

		if ($this.val() == '') {
			// user hit "cancel"
			return;
		}

		$this.parent().siblings('.file-import, .file-view-reimport').hide();
		$this.parent().siblings('.file-uploading').show();
		var $td = $this.closest('td');
		$td.addClass('info');

		var data = new FormData();
		$.each(e.target.files, function (key, val) {
			
			data.append(key, val);
		});

		var url = $this.closest('form').prop('action') + '-file';
		$.ajax({
			url: url,
			type: 'POST',
			data: data,
			cache: false,
			dataType: 'json',
			processData: false,
			contentType: false
		})
		.done(function (data, textStatus, jqXHR) {
			$this.parent().siblings('.file-view-reimport').show();

			// update status to 'Received'
			var $status = $this.closest('tr').find('select[name="status"]');
			$status.html('<option value="R" selected></option>').change();
			
			var $tooltip = $this.parent().siblings('.file-view-reimport').children('.tooltip');
			$tooltip.attr('title', data.originalName);
		})
		.fail(function (jqXHR, textStatus, err) {
			error(err);

			$this.parent().siblings('.file-import').show();
		})
		.always(function () {
			$this.parent().siblings('.file-uploading').hide();
			$td.removeClass('info');
		});
	});
}

function initTableSorter() {
	var $subjectTable = $('table#subjectTable');

	if ($subjectTable.find('tbody tr').length > 0) {
		$subjectTable.tablesorter({
			sortList: [
				[3, 0], // Instructor
				[0, 0] // Name
			],
			headers: {
				2: { sorter: false }, // E-Mail
				6: { sorter: false }, // File
				9: { sorter: false } // [delete]
			},
			textExtraction: function (node) {
				var $node = $(node);

				if ($node.find('select[name="Status"]').length == 1) {
					var val = $node.find('option').filter(':selected').val();
					return statusPaths[val].sort;
				}
				else
					return $node.text();
			}
		});
	}
}

function initResizableColumns() {
	var $subjectTable = $('table#subjectTable');
	$subjectTable.resizableColumns({
		// uses store.js
		store: (store && store.enabled) ? store : undefined
	});
}

function bindFiltersMenuToggle() {
	var $filtersMenuToggle = $('a#filtersMenuToggle');
	var $filtersMenu = $('div#filtersMenu');
	$filtersMenuToggle.on('click', function (e) {

		e.preventDefault();
		var $this = $(this);
		var html = $this.html();
		if (html.indexOf('-') != -1) {
			// is open
			$this.html(html.replace(/-/, '+'));
			$filtersMenu.slideUp();
		}
		else {
			$this.html(html.replace(/\+/, '-'));
			$filtersMenu.slideDown();
		}

	});
}

function bindRemove() {
	$('a.remove-link').on('click', function(e) {
		e.preventDefault();
		var $this = $(this);
		var name = $this.attr('data-subject');
		var ok = window.confirm('Are you sure you want to remove subject ' + name + ', from the pool?');
		if (ok) {
			// background post to remove

			var url = $this.attr('href');
			$.post(url)
			.done(function () {
				var showRemoved = $this.closest('tbody').prop('data-show-removed');
				if (! showRemoved) {
					// just refresh and removed rows won't be included
					window.location.href = window.location.href;
				}
				else {
					$this.closest('tr').addClass('removed');
				}
			})
			.fail(function (jqXHR, textStatus, err) {
				error(err);
			});
		}
	});
}

function bindUnremove() {
	$('a.unremove-link').on('click', function (e) {
		e.preventDefault();
		var $this = $(this);
		var url = $this.attr('href');

		// background post to unremove
		$.post(url)
		.done(function () {
			$this.hide();
			$this.siblings('a.remove-link').show();
			$this.closest('tr').removeClass('removed');
		})
		.fail(function (jqXHR, textStatus, err) {
			error(err);
		})
	});
}

function bindEditComments() {
	$('a.comment-link').on('click', function (e) {
		e.preventDefault();

		var $this = $(this);
		var $td = $this.closest('td');
		var $nextTd = $td.next();
		var $outerDiv = $nextTd.find('div.comment-popover');
		var html = $this.html();
		var $input = $outerDiv.find('input');
		var $nameSpan = $td.find('span');
		var savedValue = $input.attr('data-saved-value');

		if ($outerDiv.is(':visible')) {
			if ($input.val() !== savedValue) {
				var ok = window.confirm('Are you sure you want to close the comments without saving?');
				if (! ok) {
					return;
				}
			}

			// close
			$outerDiv.hide();
			$input.val($input.attr('data-saved-value'));
			$this.html(html.replace(/-/g, '+'));
			$nameSpan.css('text-decoration', savedValue.length > 0 ? 'underline' : 'none');
			return;
		}

		// open
		var $tr = $td.closest('tr');
		$outerDiv.css({
			'height': ($tr.height() + 1) + 'px',
			'width': ($tr.outerWidth() - $td.outerWidth() + 1) + 'px',
			'left': $nextTd.position().left + 'px',
			'top': $td.position().top + 'px'
		});
		$outerDiv.show();
		$input.val($input.attr('data-saved-value'));
		$this.html(html.replace(/\+/g, '-'));
		$input.focus();
	});

	$('div.comment-popover').find('form').on('submit', function (e) {
		e.preventDefault();

		var $this = $(this);
		var url = $this.attr('action') + '-comments';
		var $input = $this.find('input');
		var comments = $input.val();
		$.post(url, { comments: comments })
		.done(function () {

			$input.attr('data-saved-value', comments);
			$this.closest('tr').find('a.comment-link').click(); // close comments box
		})
		.fail(function (jqXHR, textStatus, err) {
			error(err);
		});
	});
}