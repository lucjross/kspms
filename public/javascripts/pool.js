

function error() {
	console.error.apply(console, arguments);

	var errStr = 'There was an error.\n\n';
	for (var i = 0; i < arguments.length; i++) {
		errStr += JSON.stringify(arguments[i]) + '\n\n';
	}
	window.alert(errStr);
}

// Subject status paths
var statusPaths = {
	'NE': {
		sort: 1,
		text: 'New',
		next: ['R']
	},
	'R': {
		sort: 5,
		text: 'Received',
		next: ['PA']
	},
	'PA': {
		sort: 10,
		text: 'Pending Assessment',
		next: ['RP', 'RC', 'RI', 'F']
	},
	'RP': {
		sort: 50,
		text: 'Resubmit - Plag.',
		next: ['R']
	},
	'RC': {
		sort: 50,
		text: 'Resubmit - Cheating',
		next: ['R']
	},
	'RI': {
		sort: 50,
		text: 'Resubmit - Inadequate',
		next: ['R']
	},
	'F': {
		sort: 100,
		text: 'Fulfilled',
		next: ['NO']
	},
	'NO': {
		sort: 200,
		text: 'Notified',
		next: null
	}
};

$(document).ready(function () {

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

	var $statusSelects = $('select[name="status"]');
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
		.fail(function (jqXHR, textStatus, err) {

			error(err);
		});

	});

	/* file upload operations */
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

	

	$subjectTable = $('table#subjectTable');

	$subjectTable.tablesorter({
		sortList: [
			[3, 0], // Name
			[0, 0] // Instructor
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



	$subjectTable.resizableColumns();

	/* */
});