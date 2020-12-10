var {n, toHtml} = require('htm');
var {sitePath, ...siteUtils} = require('siteUtils');
var {Net, Node} = require('../bni_smile');

var measurePlugins = {
	do: {
		calculate(nets, roles, selectedStates) {
			return 0;
		}
	},
	ci: {
		calculate(nets, roles, selectedStates) {
			console.log("ci sel", selectedStates);
			let net = nets.interventionNet;
			let cause = roles && roles.cause && roles.cause.length && roles.cause[0];
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			console.log("HERE IS CAUSE EFFECT:", cause, effect);
			if (cause && effect) {
				console.log('XXX1');
				net.mi(net.node(effect));
				console.log('XXX2');
				net.mi(net.node(effect));
				let table2 = net.mi(net.node(effect));
				let table = net.mi(net.node(effect) , {
					targetState: ((selectedStates || {})[effect] || [null])[0],
					otherState: ((selectedStates || {})[cause] || [null])[0],
				});
				console.log('x', table);
				let value = table.find(row => row[0] == cause)[1];
				let effectValue = table2.find(row => row[0] == effect)[1];
				let percent = value/effectValue;
				return {value, percent, _effectValue: effectValue, title: 'Causal information'};
			}
			
			return null;
		}
	},
	mi: {
		calculate(nets, roles, selectedStates) {
			let net = nets.originalNet;
			let cause = roles && roles.cause && roles.cause.length && roles.cause[0];
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			if (cause && effect) {
				let table = net.mi(net.node(effect), {
					targetState: ((selectedStates || {})[effect] || [null])[0],
					otherState: ((selectedStates || {})[cause] || [null])[0],
				});
				let table2 = net.mi(net.node(effect));
				let value = table.find(row => row[0] == cause)[1];
				let effectValue = table2.find(row => row[0] == effect)[1];
				let percent = value/effectValue;
				return {value, percent, _effectValue: effectValue, title: 'Mutual information'};
			}
			
			return null;
		}
	},
	cheng: {
		calculate(nets, roles, selectedStates) {
			let net = nets.interventionNet;
			let cause = roles && roles.cause && roles.cause.length && roles.cause[0];
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			if (cause && effect) {
				selectedStates = selectedStates || {};
				let table2, value, effectValue, percent;
				if (selectedStates[cause] && selectedStates[effect]) {
					let c = net.node(cause).state(selectedStates[cause]).stateNum;
					let e = net.node(effect).state(selectedStates[effect]).stateNum;
					console.log(cause, effect, selectedStates, c, e);
					
					let origBeliefs = net.node(effect).beliefs();
					let savedCauseFinding = net.node(cause).finding();
					
					net.node(cause).finding(c);
					let cBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					net.node(cause).likelihoods(Array.from({length: cBeliefs.length}, (_,i) => i == c ? 0 : 1));
					let notCBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					if (savedCauseFinding) {
						console.log(savedCauseFinding);
						net.node(cause).finding(savedCauseFinding);
					}
					
					console.log(origBeliefs, cBeliefs, notCBeliefs);
					let deltaBelief = cBeliefs[e] - notCBeliefs[e];
					
					let causalPower = null;
					if (deltaBelief >= 0) {
						causalPower = deltaBelief/(1 - notCBeliefs[e]);
					}
					else {
						causalPower = -deltaBelief/notCBeliefs[e];
					}
					
					value = causalPower;
				}
				else {
					value = '-';
				}
				return {value, title: '(Modified) Cheng', tooltip: 'Modifications:\n- Arc cutting\n- n-ary cause nodes are treated as binary with respect to "focus" state\n- Paths through other parents are left as they are'};
			}
			
			return null;
		}
	},
};

class BnDetail {
	make(root) {
		this.root = root || n('div.bnDetail',
			n('script', {src: 'https://code.jquery.com/jquery-3.4.1.slim.min.js'}),
			n('script', {src: sitePath('/_/js/arrows.js')}),
			n('script', {src: sitePath('/_/js/bn.js')}),
			n('div.title'),
			n('div.bnView',
				n('div.infoWindows'),
			),
		);
		this.titleEl = this.root.querySelector('.title');
		this.bnView = this.root.querySelector('.bnView');
	}
	
	toHtml() { return this.root.outerHTML; }
	
	$handleUpdate(m) {
		let barMax = 100; //px
		if (m.title) {
			this.titleEl.textContent = m.title;
		}
		if (m.model) {
			
			this.bnView.querySelectorAll('.node').forEach(n => n.remove());
			let nodes = m.model.map(node => n('div.node',
				{dataName: node.name},
				{style: `left: ${node.pos[0]}px; top: ${node.pos[1]}px`},
				n('div.controls',
					n('a.menu', {href: 'javascript:void(0)'}, '\u22EF'),
				),
				n('h3', node.name),
				n('div.states',
					node.states.map((s,i) => n('div.state',
						{dataIndex: i},
						n('span.target', n('input', {type: 'checkbox'})),
						n('span.label', s),
						n('span.prob', (node.beliefs[i]*100).toFixed(1)),
						n('span.barParent', n('span.bar', {style: `width: ${node.beliefs[i]*barMax}%`}))),
					),
				),
			));
			this.bnView.append(...nodes);
			this.bnView.append(n('script', `
				bn.model = ${JSON.stringify(m.model)};
				bn.drawArcs();
			`));
		}
		if (m.nodeBeliefs) {
			for (let [nodeName,beliefs] of Object.entries(m.nodeBeliefs)) {
				let nodeEl = this.bnView.querySelector(`div.node[data-name=${nodeName}]`);
				nodeEl.querySelectorAll('.state').forEach((state,i) => {
					state.querySelector('.prob').textContent = (beliefs[i]*100).toFixed(1);
					state.querySelector('.bar').style.width = (beliefs[i]*barMax)+'%';
				});
			}
		}
	}
}

module.exports = {
	component: BnDetail,
	async prepareData(req,res,db,cache) {
		let net = null;
		let origNet = null;
		try {
			/// tbd
			let bn = await db.get('select name, url from bns where id = ?', req.query.id);
			console.time('netLoad');
			console.log('HI');
			let bnKey = `public/bns/${bn.url}`;
			let doClone = false;
			if (doClone) {
				if (!cache.bns)  cache.bns = {};
				if (!cache.bns[bnKey]) {
					let origNet = new Net(bnKey);
					// origNet.autoUpdate(false);
					origNet.compile();
					cache.bns[bnKey] = origNet;
					/// Delete oldest cache entry if > 20 BNs
					let bnKeys = Object.keys(cache.bns);
					if (bnKeys.length > 20) {
						cache.bns[bnKeys[0]].close();
						delete cache.bns[bnKeys[0]];
					}
				}
				else {
					console.log('Serving from cache...');
				}
				/// Create copy
				console.time('clone');
				net = cache.bns[bnKey].clone();
				console.timeEnd('clone');
			}
			else {
				net = new Net(bnKey);
				origNet = new Net(bnKey);
			}
			console.timeEnd('netLoad');
			
			let measures = ['ci','mi','cheng'];
			
			let backupCpts = {};
			let roles = null;
			if (req.query.roles) {
				roles = JSON.parse(req.query.roles);
				for (let [role,nodeNames] of Object.entries(roles)) {
					for (let nodeName of nodeNames) {
						if (role == 'cause') {
							let orig = net.node(nodeName).cpt1d().slice();
							console.log(orig);
							backupCpts[nodeName] = orig;
							let numStates = net.node(nodeName).states().length;
							net.node(nodeName).cpt1d(Array.from({length: orig.length}, _=> 1/numStates));
						}
					}
				}
			}
			
			if (req.query.evidence) {
				let evidence = JSON.parse(req.query.evidence);
				for (let [nodeName,stateI] of Object.entries(evidence)) {
					console.log(nodeName, stateI);
					net.node(nodeName).finding(Number(stateI));
				}
			}
			
			let selectedStates = null;
			if (req.query.selectedStates) {
				selectedStates = JSON.parse(req.query.selectedStates);
			}
			console.log({selectedStates});
			
			console.time('update');
			net.update();
			console.timeEnd('update');
			
			let measureResults = {};
			for (let measure of measures) {
				measureResults[measure] = measurePlugins[measure].calculate({
					interventionNet: net,
					originalNet: origNet,
				}, roles, selectedStates);
			}
			bn.measureResults = measureResults;
			
			if (req.query.returnType == 'beliefs') {
				bn.model = net.nodes().map(n => ({name: n.name(), beliefs: n.beliefs()}));
			}
			else if (req.query.returnType == 'ciTable') {
				let roles2 = {...roles};
				let allResults = []
				/// Reset specified cause to its original CPT
				if (roles2.cause && roles2.cause[0]) {
					let causeName = roles2.cause[0];
					net.node(causeName).cpt1d(origNet.node(causeName).cpt1d().slice());
				}
				for (let node of net.nodes()) {
					/** NOTE: IT MAY BE THE CASE that GeNIe doesn't like having its CPT changed from
					under it, when there's evidence already in the net. (But I'm not sure; it was producing funny,
					temperamental results that looked like it wasn't "seeing" the new CPT.) SO ALWAYS: retract findings,
					then set CPTs, then add back any findings. Alternatively, set/clear evidence on one node seems to
					be enough. **/
					//node = net.node('either');
					let findings = net.findings();
					net.retractFindings();
					let causeName = node.name();
					roles2.cause = [causeName];
					let cptLength = node.cpt1d().length;
					let numStates = node.states().length;
					console.log("CPT 1:", node.cpt1d());
					node.cpt1d(Array.from({length: cptLength}, _=> 1/numStates));
					//net.update(true);
					console.log("CPT 2:", node.cpt1d());
					net.findings(findings);
					
					allResults.push( {cause: causeName, ...measurePlugins.ci.calculate({interventionNet:net}, roles2, selectedStates)} );

					node.cpt1d(origNet.node(causeName).cpt1d().slice());
				}
				bn.ciTable = allResults;
			}
			else {
				console.log('HI2');
				net.nodes();
				console.log('Hi$');
				bn.model = 
					net.nodes().map(node => ({
						type: 'node',
						name: node.name(),
						pos: node.position(),
						parents: node.parents().map(p => p.name()),
						states: node.states().map(s => s.name()),
						beliefs: node.beliefs(),
						//beliefs: [],
					}));
				console.log('HI3');
			}

			for (let [nodeName,cpt] of Object.entries(backupCpts)) {
				console.log(cpt);
				net.node(nodeName).cpt1d(cpt);
			}
			
			/*bn.model = [
				{type: 'node', name: 'Visit to Asia', pos: [10,10]},
				{type: 'node', name: 'Tuberculosis', pos: [10,100], parents: ['Visit to Asia']},
			];*/
			
			return bn;
		}
		finally {
			if (net)  net.close();
			if (origNet)  origNet.close();
		}
	},
}