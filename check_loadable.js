var fs = require('fs');
var bni_smile = require('./bni_smile.js');

function testNet(netFn) {
	console.log(`Loading: ${netFn}`);
	
	if (!fs.existsSync(netFn)) {
		console.log(`File not found: ${netFn}`);
		return 1;
	}
	
	let net = new bni_smile.Net(netFn);
	console.log('Load: OK');
	
	console.log(`Nodes found: ${net.nodes().length}`);
	if (!net.nodes().length) {
		console.log('ERROR: Could not find any nodes in the network');
		return 1;
	}
	
	for (let node of net.nodes()) {
		console.log(`Checking: ${node.name()}`);
		let x = {
			type: 'node',
			name: node.name(),
			pos: node.position(),
			parents: node.parents().map(p => p.name()),
			states: node.states().map(s => s.name()),
			beliefs: node.beliefs(),
			//beliefs: [],
		};
	}
	
	console.log('Check: Done');
	return 0;
}

process.exit(testNet(process.argv[2]));