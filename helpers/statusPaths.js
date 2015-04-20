module.exports = {
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