var {n, toHtml} = require('htm');
var {sitePath, ...siteUtils} = require('siteUtils');
var {Net, Node} = require('../bni_smile');
var fs = require('fs');

function addJointChild(net, parentNames, tempNodeName = null) {
	let stateList = [];
	let stateIndexes = parentNames.map(_=>0);
	do {
		stateList.push('s'+stateIndexes.join('_'));
	} while (Net.nextCombination(stateIndexes, parentNames.map(c => net.node(c))));
	/// XXX: Add support to bni_smile for deterministic nodes
	tempNodeName = tempNodeName || ('s'+String(Math.random()).slice(2));
	//console.log('IDENTITY',stateList.map((_,i)=>stateList.map((_,j)=> i==j ? 1 : 0)));
	net
		.addNode(tempNodeName, null, stateList)
		.addParents(parentNames)
		/// Essentially, create an identity matrix for now (later, replace with det node)
		.cpt(stateList.map((_,i)=>stateList.map((_,j)=> i==j ? 1 : 0)));
	return tempNodeName;
}

function pick(obj, keys) {
	let newObj = {};
	for (let key of keys) {
		if (key in obj) {
			newObj[key] = obj[key];
		}
	}
	return newObj;
}

var measurePlugins = {
	do: {
		calculate(nets, roles, selectedStates) {
			return 0;
		}
	},
	ci: {
		calculate(nets, roles, selectedStates, opts = {}) {
			selectedStates = selectedStates || {};
			opts.jointCause = opts.jointCause || null;
			console.log("ci sel", selectedStates);
			let net = nets.interventionNet;
			let causes = roles && roles.cause && roles.cause.length && roles.cause;
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			console.log("HERE IS CAUSES EFFECT:", causes, effect);
			if (causes && effect) {
				console.time('CI');
				let tempNodeName = null;
				/// XXX: To implement
				/// If there is more than 1 cause, then add a temporary child node
				/// to all cause nodes, and then use that (plus the effect node) to compute the mutual
				/// information, with just 2 inferences (but 1 compile with a potentially huge node!) as per the current method
				let cause = causes[0];
				if (causes.length > 1) {
					/*let stateList = [];
					let stateIndexes = causes.map(_=>0);
					do {
						stateList.push('s'+stateIndexes.join('_'));
					} while (Net.nextCombination(stateIndexes, causes.map(c => net.node(c))));
					/// XXX: Add support to bni_smile for deterministic nodes
					tempNodeName = 's'+String(Math.random()).slice(2);
					console.log('IDENTITY',stateList.map((_,i)=>stateList.map((_,j)=> i==j ? 1 : 0)));
					net
						.addNode(tempNodeName, null, stateList)
						.addParents(causes)
						/// Essentially, create an identity matrix for now (later, replace with det node)
						.cpt(stateList.map((_,i)=>stateList.map((_,j)=> i==j ? 1 : 0)));
					cause = tempNodeName;*/
					cause = opts.jointCause;
				}
				//console.log('XXX1');
				console.time('MI');
				//net.mi(net.node(effect));
				console.timeLog('MI');
				//console.log('XXX2');
				//net.mi(net.node(effect));
				console.timeEnd('MI');
				//let table2 = net.mi(net.node(effect));
				let table = net.mi(net.node(effect) , {
					targetStates: selectedStates[effect],
					otherStates: {[cause]: selectedStates[cause]},
				});
				console.log('picked:', selectedStates[cause]);
				//console.log('node:',cause);
				//console.log('x', table, net.node(cause).beliefs());
				let value = table.find(row => row[0] == cause)[1];
				//let effectValue = table2.find(row => row[0] == effect)[1];
				/// 2 ways to compute %:
				/// - against the entropy of the effect in the cut network
				/// - against the maximum possible entropy of the effect
				let numStates = net.node(effect).numberStates();
				let unif = 1/numStates;
				// let effectValue = net.node(effect).entropy();
				let effectValue = -unif*Math.log2(unif)*numStates;
				let percent = value/effectValue;
				
				//if (tempNodeName)  net.node(tempNodeName).delete();
				
				console.timeEnd('CI');
				return {value, percent, _effectValue: effectValue, title: 'Causal information'};
			}
			
			return null;
		}
	},
	mi: {
		calculate(nets, roles, selectedStates, opts = {}) {
			opts.jointCause = opts.jointCause || null;
			let net = nets.originalNet;
			let causes = roles && roles.cause && roles.cause.length && roles.cause;
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			if (causes && effect) {
				let cause = causes.length == 1 ? causes[0] : opts.jointCause;
				let table = net.mi(net.node(effect), {
					targetStates: selectedStates[effect],
					otherStates: {[cause]: selectedStates[cause]},
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
	/* Modifications:\n- Arc cutting\n- n-ary cause nodes are treated as binary with respect to "focus" states\n- Paths through other parents are left as they are */
	cheng: {
		calculate(nets, roles, selectedStates, opts = {}) {
			console.log('CHENG')
			let net = nets.interventionNet;
			let causes = roles && roles.cause && roles.cause.length && roles.cause;
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			let preventative = false;
			if (causes && effect) {
				console.log('CHENG2');
				let cause = causes.length == 1 ? causes[0] : opts.jointCause;
				selectedStates = selectedStates || {};
				let table2, value, effectValue, percent;
				let causeNumStates = net.node(cause).numberStates();
				let effectNumStates = net.node(effect).numberStates();
				if (selectedStates[cause] && selectedStates[effect]
						&& selectedStates[cause].length != causeNumStates
						&& selectedStates[effect].length != effectNumStates) {
					/// Only singular states supported right now
					/// XXX: Extend to support multiple states, by treating as merged states
					let causeStateNums = selectedStates[cause].map(sel => net.node(cause).state(sel).stateNum);
					let effectStateNums = selectedStates[effect].map(sel => net.node(effect).state(sel).stateNum);
					//let e = net.node(effect).state(selectedStates[effect][0]).stateNum;
					console.log('cheng',cause, effect, selectedStates, causeStateNums, effectStateNums);
					
					let origBeliefs = net.node(effect).beliefs();
					let savedCauseFinding = net.node(cause).finding();
					
					/// Turn off everything other than the selectedStates
					let numStates = net.node(cause).states().length;
					let likelihoods = Array(numStates).fill(0);
					causeStateNums.forEach(i => likelihoods[i] = 1);
					//let likelihoods = Array.from({length: numStates}, (_,i) => Number(causeStateNums.includes(i)));
					net.node(cause).likelihoods(likelihoods);
					//net.node(cause).finding(c);
					let cBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					net.node(cause).likelihoods(likelihoods.map(v => 1-v));
					let notCBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					if (savedCauseFinding) {
						console.log(savedCauseFinding);
						net.node(cause).finding(savedCauseFinding);
					}
					
					console.log(origBeliefs, cBeliefs, notCBeliefs);
					let cBelief = effectStateNums.map(e => cBeliefs[e]).reduce((a,v)=>a+v);
					let notCBelief = effectStateNums.map(e => notCBeliefs[e]).reduce((a,v)=>a+v);
					
					let deltaBelief =  cBelief - notCBelief;
					
					let causalPower = null;
					if (deltaBelief >= 0) {
						/// Equation 8 from Cheng 1997
						causalPower = deltaBelief/(1 - notCBelief);
					}
					else {
						/// Equation 14 from Cheng 1997
						causalPower = -deltaBelief/notCBelief;
						preventative = true;
					}
					
					value = causalPower;
				}
				else {
					value = '-';
				}
				return {value, title: 'Cheng', tooltip: 'Cheng\'s causal power. See the CAT Explainer for a description.', extraInfo: preventative ? '(preventative)' : ''};
			}
			
			return null;
		}
	},
	/* Modifications:\n- Arc cutting\n- n-ary cause nodes are treated as binary with respect to "focus" states\n- Paths through other parents are left as they are*/
	far: {
		calculate(nets, roles, selectedStates, opts = {}) {
			console.log('FAR')
			let net = nets.interventionNet;
			let causes = roles && roles.cause && roles.cause.length && roles.cause;
			let effect = roles && roles.effect && roles.effect.length && roles.effect[0];
			let preventative = false;
			if (causes && effect) {
				console.log('FAR2');
				let cause = causes.length == 1 ? causes[0] : opts.jointCause;
				selectedStates = selectedStates || {};
				let table2, value, effectValue, percent;
				let causeNumStates = net.node(cause).numberStates();
				let effectNumStates = net.node(effect).numberStates();
				if (selectedStates[cause] && selectedStates[effect]
						&& selectedStates[cause].length != causeNumStates
						&& selectedStates[effect].length != effectNumStates) {
					/// Only singular states supported right now
					/// XXX: Extend to support multiple states, by treating as merged states
					let causeStateNums = selectedStates[cause].map(sel => net.node(cause).state(sel).stateNum);
					let effectStateNums = selectedStates[effect].map(sel => net.node(effect).state(sel).stateNum);
					//let e = net.node(effect).state(selectedStates[effect][0]).stateNum;
					console.log('FAR3',cause, effect, selectedStates, causeStateNums, effectStateNums);
					
					let origBeliefs = net.node(effect).beliefs();
					let savedCauseFinding = net.node(cause).finding();
					
					/// Turn off everything other than the selectedStates
					let numStates = net.node(cause).states().length;
					let likelihoods = Array(numStates).fill(0);
					causeStateNums.forEach(i => likelihoods[i] = 1);
					//let likelihoods = Array.from({length: numStates}, (_,i) => Number(causeStateNums.includes(i)));
					net.node(cause).likelihoods(likelihoods);
					//net.node(cause).finding(c);
					let cBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					net.node(cause).likelihoods(likelihoods.map(v => 1-v));
					let notCBeliefs = net.node(effect).beliefs();
					
					net.node(cause).retractFindings();
					if (savedCauseFinding) {
						console.log(savedCauseFinding);
						net.node(cause).finding(savedCauseFinding);
					}
					
					console.log(origBeliefs, cBeliefs, notCBeliefs);
					let cBelief = effectStateNums.map(e => cBeliefs[e]).reduce((a,v)=>a+v);
					let notCBelief = effectStateNums.map(e => notCBeliefs[e]).reduce((a,v)=>a+v);
					
					let far = 1 - notCBelief/cBelief;
					
					if (far < 0) {
						far = (1 - cBelief/notCBelief);
						preventative = true;
					}
					
					value = far;
				}
				else {
					value = '-';
				}
				return {value, title: 'FAR', tooltip: 'Fraction of Attributable Risk. See the CAT Explainer for a description.', extraInfo: preventative ? '(preventative)' : ''};
			}
			
			return null;
		},
	},
};

class BnDetail {
	make(root) {
		this.root = root || n('div.bnDetail',
			n('script', {src: 'https://code.jquery.com/jquery-3.4.1.slim.min.js'}),
			n('script', {src: sitePath('/_/js/arrows.js')}),
			n('script', {src: sitePath('/_/js/bn.js')}),
			n('div.controls',
				n('button.save', 'Save to My Library'),
				n('button.publish', 'Publish to Public Library'),
				n('span.gap'),
				n('span.scenarioControls',
					n('span', 'Scenario:'),
					this.scenarioBox = n('select.scenario',
						n('option.none', 'None'),
					),
					n('button.saveScenario', 'Save'),
					n('button.removeScenario', 'Remove'),
					n('button.renameScenario', 'Rename'),
				),
			),
			n('div.bnView',
			),
			n('div.infoWindows',
				n('div.help',
					n('h2', 'Help'),
					n('div.tip.infoContent',
						n('p', `Hover over a node and click 'E' to set an effect, which will display the causal information with all other nodes below.`),
						n('p', `To see the effect of a `, n('em', 'combined'), ` set of causes, click 'C' (Cause) on one or more other nodes, which will display an information window below.`),
						n('p', `To focus on the causal information for just specific states, click the checkbox next to the state name. To select multiple such states, hold down 'Shift'.`),
					),
				),
			),
		);
		this.titleEl = this.root.querySelector('.title');
		this.bnView = this.root.querySelector('.bnView');
	}
	
	toHtml() { return this.root.outerHTML; }
	
	$handleUpdate(m) {
		let barMax = 100; //px
		if (m.title) {
			/// XXX Hack: Find a way of getting the page component
			if (document.body) {
				q('h1 .text').innerHTML = m.title;
			}
			else {
				this.titleEl.textContent = m.title;
			}
		}
		if (m.model) {
			this.bnView.querySelectorAll('.node').forEach(n => n.remove());
			let nodes = m.model.map(node => n('div.node',
				{dataName: node.name},
				/* Use transform, so that alignment is the same as what GeNIe thinks it is (i.e. based on centre point) */
				{style: `left: ${node.pos[0]}px; top: ${node.pos[1]}px; transform:translate(-50%,-50%)`},
				n('div.controls',
					n('a.setCause', {href: 'javascript:void(0)'}, 'C'),
					n('a.setEffect', {href: 'javascript:void(0)'}, 'E'),
					//n('a.menu', {href: 'javascript:void(0)'}, '\u22EF'),
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
		/** != null is false only if value is null or undefined **/
		if (m.scenariosEnabled != null) {
			this.root.querySelector('.scenarioControls').style.display = m.scenariosEnabled ? 'inline' : 'none';
		}
		if (m.scenarios) {
			for (let scenario of m.scenarios) {
				this.scenarioBox.append(n('option', scenario.name, {value: scenario.id, dataScenario: JSON.stringify(scenario)}));
			}
		}
		if (m.temporary != null) {
			this.root.querySelector('button.publish').style.display = m.temporary ? 'none' : 'inline';
			if (!m.temporary) {
				this.root.querySelector('button.save').textContent = 'Save';
			}
		}
		if (m.visibility != null) {
			this.root.querySelector('button.publish').style.display = m.visibility == 'public' ? 'none' : 'inline';
		}
	}
}

module.exports = {
	template: 'BnPage',
	component: BnDetail,
	noUserRequired: true,
	async prepareData(req,res,db,cache) {
		// Probably don't need to get this as in server already
		let userInfo = await db.get('select userId from user_sessions where sessionId = ?', req.cookies.sessionId);
		console.log('x');
		if (req.query.updateScenario) {
			await db.run('insert into scenarios (userId, bnId, name, evidence, roles, selectedStates) values (?, ?, ?, ?, ?, ?)', userInfo.userId, req.query.id, req.body.name, JSON.stringify(req.body.evidence), JSON.stringify(req.body.roles), JSON.stringify(req.body.selectedStates));
			return {scenarioId: (await db.get('select last_insert_rowid() as id')).id};
		}
		else if (req.query.deleteScenario) {
			await db.run('delete from scenarios where userId = ? and id = ?', userInfo.userId, req.query.scenarioId);
		}
		else if (req.query.renameScenario) {
			await db.run('update scenarios set name = ? where userId = ? and id = ?', req.body.name, userInfo.userId, req.query.scenarioId);
		}
		else if (req.query.updateBn) {
			console.log('UPDATING');
			let updates = JSON.parse(req.body.updates);
			let updParams = {};
			for (let [k,v] of Object.entries(updates)) {
				updParams['$'+k] = v;
			}
			let ok = await db.get('select 1 from bns where userId = ? and id = ?', userInfo.userId, Number(updates.id));
			console.log(ok, userInfo.userId, updates.id);
			if (ok) {
				//updates
				/// XXX: Validate update entries
				db.run('update bns set visibility = $visibility where id = $id', updParams);
			}
		}
		else {
			let net = null;
			let origNet = null;
			try {
				console.log('prepareData');
				/// tbd
				let bnKey;
				let bn =  {};
				console.time('netLoad');
				console.log('HI');
				if (req.query.tempId) {
					let bnType = req.query.type || 'xdsl';
					bnKey = `public/bns/temp_${req.query.tempId}.${bnType}`;
					bn.temporary = true;
				}
				else {
					bn = await db.get('select name, url, visibility from bns where id = ?', req.query.id);
					bn.temporary = false;
					bnKey = `public/bns/${bn.url}`;
				}
				
				/// Make sure we use .xdsl, when available
				let bnKeyXdsl = bnKey.replace(/\.[^.]*$/, '.xdsl');
				if (fs.existsSync(bnKeyXdsl)) {
					bnKey = bnKeyXdsl;
				}
				
				console.log('bnKey:',bnKey);
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
				
				/// Set a page title (if we're linked to a page)
				if (req._page) {
					req._page.$handleUpdate({h1: (bn || {}).name || '(unsaved)'});
				}
				
				let measures = ['ci','mi','cheng','far'];
				let calculateOpts = {jointCause: null};
				
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
					if (roles.cause && roles.cause.length > 1) {
						calculateOpts.jointCause = addJointChild(net, roles.cause);
						addJointChild(origNet, roles.cause, calculateOpts.jointCause);
					}
				}
				
				if (req.query.evidence) {
					let evidence = JSON.parse(req.query.evidence);
					for (let [nodeName,stateI] of Object.entries(evidence)) {
						console.log(nodeName, stateI);
						net.node(nodeName).finding(Number(stateI));
						origNet.node(nodeName).finding(Number(stateI));
					}
				}
				
				let selectedStates = null;
				if (req.query.selectedStates) {
					selectedStates = JSON.parse(req.query.selectedStates);
				}
				console.log({selectedStates});
				
				/// Update selected states if there are joint causes
				console.log({roles});
				let hasSelStates = false;
				for (let k in selectedStates) { hasSelStates = true; break; }
				if (roles && roles.cause && roles.cause.length > 1 && hasSelStates) {
					let jointSelStates = ['s'];
					for (let cause of roles.cause) {
						let newJointSelStates = [];
						let selCauseStates = cause in selectedStates ? selectedStates[cause] : net.node(cause).states().map(s => s.stateNum);
						for (let selCauseState of selCauseStates) {
							for (let i=0; i<jointSelStates.length; i++) {
								let s = jointSelStates[i]=='s' ? '' : '_';
								newJointSelStates.push(jointSelStates[i] + s + selCauseState);
							}
						}
						jointSelStates = newJointSelStates;
					}
					//let newSelectedStates = {[calculateOpts.jointCause]: jointSelStates};
					//console.log({newSelectedStates});
					//selectedStates = newSelectedStates;
					selectedStates[calculateOpts.jointCause] = jointSelStates;
					/// Remove other selectedStates for causes, to avoid issues
					for (let cause of roles.cause) {
						delete selectedStates[cause];
					}
					console.log('states:', net.node(calculateOpts.jointCause).stateNames());
					console.log('selected of these states:', jointSelStates);
				}
				
				console.time('update');
				net.update();
				origNet.update();
				console.timeEnd('update');
				
				let measureResults = {};
				for (let measure of measures) {
					measureResults[measure] = measurePlugins[measure].calculate({
						interventionNet: net,
						originalNet: origNet,
					}, roles, selectedStates, calculateOpts);
				}
				bn.measureResults = measureResults;
				console.log('Done calculations');
				
				if (req.query.returnType == 'beliefs') {
					console.log('Getting beliefs');
					bn.model = net.nodes().map(n => ({name: n.name(), beliefs: n.beliefs()}));
					console.log('Done beliefs');
				}
				else if (req.query.returnType == 'ciTable') {
					console.log('Creating CI Table');
					let roles2 = {...roles};
					let allResults = []
					/// Reset specified cause to its original CPT
					/// Actually, the CI table will reflect what's entered into the graph now
					/*if (roles2.cause && roles2.cause[0]) {
						let causeName = roles2.cause[0];
						net.node(causeName).cpt1d(origNet.node(causeName).cpt1d().slice());
					}*/
					for (let node of net.nodes()) {
						/** NOTE: IT MAY BE THE CASE that GeNIe doesn't like having its CPT changed from
						under it, when there's evidence already in the net. (But I'm not sure; it was producing funny,
						temperamental results that looked like it wasn't "seeing" the new CPT.) SO ALWAYS: retract findings,
						then set CPTs, then add back any findings. Alternatively, set/clear evidence on one node seems to
						be enough. **/
						/// Skip the added node
						if (node.name() == calculateOpts.jointCause)  continue;
						//node = net.node('either');
						//onsole.time('findings');
						let findings = net.findings();
						//onsole.timeLog('findings');
						net.retractFindings();
						//onsole.timeLog('findings');
						let causeName = node.name();
						roles2.cause = [causeName];
						//onsole.timeLog('findings');
						let cptLength = node.cpt1d().length;
						let numStates = node.states().length;
						//onsole.timeLog('findings');
						////onsole.log("CPT 1:", node.cpt1d());
						let uniformCpt = new Array(cptLength);
						//onsole.timeLog('findings');
						uniformCpt.fill(1/numStates);
						//onsole.timeLog('findings');
						node.cpt1d(uniformCpt);
						//node.cpt1d(Array.from({length: cptLength}, _=> 1/numStates));
						//net.update(true);
						////onsole.log("CPT 2:", node.cpt1d());
						net.findings(findings);
						//onsole.log(node.name(), findings);
						//onsole.timeEnd('findings');
						
						allResults.push( {cause: causeName, ...measurePlugins.ci.calculate({interventionNet:net}, roles2, selectedStates)} );

						node.cpt1d(origNet.node(causeName).cpt1d().slice());
					}
					let effect = roles?.effect?.[0];
					let miTable = origNet.mi(origNet.node(effect), {
						targetStates: selectedStates[effect],
					});
					for (let row of miTable) {
						let matchingRow = allResults.find(row2 => row2.cause == row[0]);
						if (matchingRow)  matchingRow.mi = row[1];
					}
					bn.ciTable = allResults;
					console.log('Done CI Table');
				}
				else {
					console.log('Returning BN info');
					//console.log('HI2');
					net.nodes();
					//console.log('Hi$');
					let p = x => (console.log(x),x);
					bn.model = 
						net.nodes().map(node => ({
							type: 'node',
							name: p(node.name()),
							pos: node.position(),
							size: node.size(),
							parents: node.parents().map(p => p.name()),
							states: node.states().map(s => s.name()),
							beliefs: node.beliefs(),
							//beliefs: [],
						}));
					//console.log('HI3');
					console.log('Done BN info');
				}

				for (let [nodeName,cpt] of Object.entries(backupCpts)) {
					//console.log(cpt);
					net.node(nodeName).cpt1d(cpt);
				}
				
				/*bn.model = [
					{type: 'node', name: 'Visit to Asia', pos: [10,10]},
					{type: 'node', name: 'Tuberculosis', pos: [10,100], parents: ['Visit to Asia']},
				];*/
				
				bn.scenarios = [];
				if (userInfo) {
					/** Load the BN scenarios if available **/
					bn.scenarios = await db.all('select id, name, evidence, roles, selectedStates from scenarios where userId = ? and bnId = ?', userInfo.userId, req.query.id);
					/// Fix jsons
					for (let scenario of bn.scenarios) {
						scenario.evidence = JSON.parse(scenario.evidence);
						scenario.roles = JSON.parse(scenario.roles);
						scenario.selectedStates = JSON.parse(scenario.selectedStates);
					}
				}
				else {
					bn.scenariosEnabled = false;
				}
				
				return bn;
			}
			finally {
				if (net)  net.close();
				if (origNet)  origNet.close();
			}
		}
	},
}