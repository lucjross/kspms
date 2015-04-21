module.exports = {
	'NE': {
		sort: 1,
		text: 'New',
		next: ['R', 'EX']
	},
	'R': {
		sort: 5,
		text: 'Received',
		next: ['PA', 'EX']
	},
	'PA': {
		sort: 10,
		text: 'Pending Assessment',
		next: ['RP', 'RC', 'RI', 'F', 'EX']
	},
	'RP': {
		sort: 50,
		text: 'Resubmit - Plag.',
		next: ['R', 'EX']
	},
	'RC': {
		sort: 50,
		text: 'Resubmit - Cheating',
		next: ['R', 'EX']
	},
	'RI': {
		sort: 50,
		text: 'Resubmit - Inadequate',
		next: ['R', 'EX']
	},
	'F': {
		sort: 100,
		text: 'Fulfilled',
		next: ['NO']
	},
	'NO': {
		sort: 200,
		text: 'Notified',
		next: ['NE']
	},
	'EX': {
		sort: 300,
		text: 'Excused',
		next: ['NE']
	}
};