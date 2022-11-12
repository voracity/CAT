var refs = {};

var bn = {
	guiEnabled: true,
	nodes: {},
	evidence: {},
	/// For now, only 1 node can be in a given role, and only 1 state of the node be selected
	roles: {},
	selectedStates: {},
	beliefs: {},
	ciTableEnabled: false,
	drawArcs() {
		let bnView = document.querySelector('.bnView');
		for (let node of bn.model) {
			for (let parentName of node.parents) {
				let from = document.querySelector(`.node[data-name=${parentName}]`);
				let to = document.querySelector(`.node[data-name=${node.name}]`);
				//debugger;
				draw.drawArrowBetweenEls(bnView, from, to, {parent: parentName, child: node.name});
			}
		}
	},
	/// XXX: Fix: Return null, rather than create new if not present?
	getNode(nodeName) {
		if (!(nodeName in this.nodes)) {
			this.nodes[nodeName] = new Node(this, nodeName);
		}

		return this.nodes[nodeName];
	},
	gui(method, ...args) {
		if (this.guiEnabled) {
			this['gui'+method](...args);
		}
	},
	
	
	async update(evidence = {}) {
		console.log(evidence);
		for (let [k,v] of Object.entries(evidence)) {
			if (v === null) {
				delete this.evidence[k];
			}
			else {
				this.evidence[k] = v;
			}
		}
		/// We can run this in parallel
		/// er, not quite yet...
		await (async _=>{
			let reqData = await (await fetch(window.location.href + '&requestType=data&returnType=beliefs&evidence='+JSON.stringify(this.evidence)+'&roles='+JSON.stringify(this.roles)+'&selectedStates='+JSON.stringify(this.selectedStates))).json();
			//let nodeBeliefs = {};
			for (let node of reqData.model) {
				this.beliefs[node.name] = node.beliefs;
			}
			for (let [k,v] of Object.entries(reqData)) {
				if (!(k in this)) {
					this[k] = v;
				}
			}
			/*this.measureResults = reqData.measureResults;
			/// Where is the evidence located, relative to cause/effect
			this.evLocation = reqData.evLocation;*/
			this.gui('Update');
		})();
		this.guiUpdateInfoWindows();
	},
	
	async guiUpdate() {
		bnDetail.$handleUpdate({nodeBeliefs: this.beliefs});
	},

	guiUpdateInfoWindows() {
		q('div.infoWindow')?.remove();
		this.ciTableEnabled = !!this.roles?.effect?.length;
		if (!this.ciTableEnabled)  q('div.ciTableWindow')?.remove();

		console.log(this.roles?.cause?.length, this.roles?.effect?.length);
		if (this.roles?.cause?.length && this.roles?.effect?.length) {
			let causes = this.roles.cause;
			let causeStates = causes.map(cause => this.selectedStates[cause] && this.getNode(cause).model.states[this.selectedStates[cause]]);
			let effect = this.roles.effect[0];
			let effectState = this.selectedStates[effect] && this.getNode(effect).model.states[this.selectedStates[effect]];
			q('.infoWindows .tip').after(n('div.infoWindow',
				n('h2', 'Measures'),
				n('div.info.infoContent',
					n('div.field',
						n('label', `Cause${causes.length>1 ? 's' : ''}:`),
						n('span.causes',
							causes.map((cause,i) => n('span.cause', cause, causeStates[i] ? `=${causeStates[i]}` : '')),
						),
					),
					n('div.field',
						n('label', 'Effect:'),
						n('span.effect', effect, effectState ? `=${effectState}` : ''),
					),
					Object.values(this.measureResults).map(measure => n('div.field', {title: measure.tooltip},
						n('label', measure.title+':'),
						n('span.value', isNaN(measure.value) ? measure.value : Math.round(measure.value*10000)/10000,
							measure.percent ? n('span.percent', ' (', Math.round(measure.percent*1000)/10, '%)') : '',
							measure.extraInfo ? n('span.extraInfo', measure.extraInfo) : ''),
					)),
				),
			));
		}
		else {
			
		}
		
		q('.infoWindows .warning')?.remove();
		if (this.evLocation?.bothEv && Object.keys(this.evLocation.bothEv).length) {
			q('.infoWindows .tip')?.after?.(n('div.warning',
				n('h2', 'Warning'),
				n('div.infoContent.text',
					`You are conditioning on evidence downstream of both cause and effect.
					This will bias the estimates of causal effect (as a selection bias).`
				),
			));
		}

		if (this.roles?.effect?.length && !q('.ciTableWindow')) {
			q('.infoWindows').append(
				n('div.ciTableWindow',
					/*n('div.showTable',
						n('button.showCiTable', 'Show CI Table', {on: {click: event => {
							if (event.target.textContent == 'Show CI Table') {
								this.ciTableEnabled = true;
								this.showCiTable();
								event.target.textContent = 'Hide CI Table';
							}
							else {
								this.ciTableEnabled = false;
								this.hideCiTable();
								event.target.textContent = 'Show CI Table';
							}
						}}}),
					),*/
					n('h2', 'Causal Information Table'),
					n('div.ciTable.infoContent'),
				)
			);
		}
		
		if (this.ciTableEnabled) {
			this.showCiTable();
		}
		else {
			this.hideCiTable();
		}
	},
	
	async showCiTable() {
		q('.ciTable').append(n('div.loadingTable', 'Loading table...'));
		let reqData = await (await fetch(window.location.href + '&requestType=data&returnType=ciTable&evidence='+JSON.stringify(this.evidence)+'&roles='+JSON.stringify(this.roles)+'&selectedStates='+JSON.stringify(this.selectedStates))).json();
		q('.ciTable table')?.remove();
		q('.ciTable .loadingTable')?.remove();
		let table = n('table', n('tr', ['Variable', 'MI', 'CI', '%'].map(s => n('th', s))));
		for (let row of reqData.ciTable) {
			let nodeEl = q(`.node[data-name="${row.cause}"]`);
			/// Joint causes not handled yet (won't have corresponding node)
			if (!nodeEl)  continue;
			let rowClass = (this.roles?.cause ?? []).includes(row.cause) ? 'cause' :
				row.cause == this.roles?.effect ? 'effect': '';
			let roundedPercent = Math.round(row.percent*1000)/10;
			table.append(n('tr', {class: rowClass},
				n('td', bn.getNode(row.cause).model?.title ?? row.cause),
				n('td', Math.round(row.mi*10000)/10000),
				n('td', Math.round(row.value*10000)/10000),
				n('td.percentBar', {style: `--percent-bar: ${row.percent*100}%`}, roundedPercent),
			));
			nodeEl.style.setProperty('--strength', ((100 - row.percent*100)/2 + 50) + '%');
			nodeEl.classList.add('filled');
			nodeEl.querySelector('div.strength')?.remove();
			nodeEl.append(n('div.strength', roundedPercent+'%'));
		}
		q('.ciTable').append(table);
	},
	
	hideCiTable() {
		qa('.filled').forEach(n => {
			n.classList.remove('filled');
			n.querySelector('div.strength')?.remove();
		});
		q('div.ciTable table')?.remove();
	},
};

/// Get node from el
refs.Node = function(el) {
	let nodeName = el.closest('.node').dataset.name;
	return bn.getNode(nodeName);
}

class Node {
	constructor(bn, nodeName) {
		this.bn = bn;
		this.nodeName = nodeName;
		this.role = null;
		this.guiEnabled = true;
		this.model = bn.model.find(n => n.name == nodeName);
	}
	
	el() {
		return q(`.node[data-name="${this.nodeName}"]`).raw;
	}
	gui(method, ...args) {
		if (this.guiEnabled) {
			this['gui'+method](...args);
		}
	}
	
	setRole(role) {
		if (role == this.role)  return;
		
		/// Make sure any other node with this role is cleared, and their selected states cleared
		/// Just for effects now. Causes can conjoin.
		if (role != 'cause' && this.bn.roles[role]) {
			this.bn.roles[role].forEach(nodeName => this.bn.nodes[nodeName].setRole(null));
		}
		
		/// Delete current role if present
		if (this.role) {
			let i = this.bn.roles[this.role].indexOf(this.nodeName);
			if (i > -1)  this.bn.roles[this.role].splice(i, 1);
			delete this.bn.selectedStates[this.nodeName];
		}
		
		this.role = role;
		if (role) {
			if (!this.bn.roles[role])  this.bn.roles[role] = [];
			this.bn.roles[role].push(this.nodeName);
		}
		this.gui('SetRole');
	}
	guiSetRole() {
		let removedCause = this.el().dataset.role == 'cause' && this.role != 'cause';
		if (this.role) {
			this.el().dataset.role = this.role;
		}
		else {
			//onsole.log(this.el().dataset.role);
			delete this.el().dataset.role;
		}
		/// Update selected states
		let selStates = this.bn.selectedStates[this.nodeName] || [];
		this.el().querySelectorAll('.target input').forEach((inp,i) => inp.checked = selStates.includes(i));
		//this.bn.gui('UpdateInfoWindows');
		/// Update view
		this.el().querySelectorAll('.setCause, .setEffect').forEach(e => e.classList.remove('on'));
		if (this.role) {
			this.el().querySelector(`.set${this.role.replace(/./, s=>s.toUpperCase())}`).classList.toggle('on');
		}
		
		if (this.role == 'cause' || removedCause) {
			/// Since arcs track from/to els, run through arcs to find incoming arcs
			let myEl = this.el();
			let matchedArcs = [];
			$(this.el().closest('.bnView')).find('path[data-can-redraw]').each(function() {
				var {outputEl, fromEl, toEl} = $(this).data('redraw');
				if (toEl == myEl) {
					matchedArcs.push(this);
				}
			});
			for (let arc of matchedArcs) {
				$(arc).data('opts').isBlocked = !removedCause;
			}
			/// Update with something more efficient
			draw.updateArrows(document.querySelector('.bnView'));
		}
	}
	
	setEvidence(stateIndex, o = {}) {
		let nodeName = this.nodeName;
		let evidence = {};
		if (nodeName in bn.evidence && bn.evidence[nodeName] == stateIndex) {
			//delete bn.evidence[nodeName];
			evidence[nodeName] = null;
			this.el().classList.remove('hasEvidence');
		}
		else {
			//bn.evidence[nodeName] = state.dataset.index;
			evidence[nodeName] = stateIndex;
			this.el().classList.add('hasEvidence');
		}
		if (o.update)  bn.update(evidence);
	}
	
	clearEvidence(o = {}) {
		delete bn.evidence[this.nodeName];
		this.el().classList.remove('hasEvidence');
		if (o.update)  bn.update(bn.evidence);
	}
	
	/*guiSetRole already does this
	guiSelectedStates() {
		
	}*/
	
	guiPopupMenu() {
		let menu = new Menu({type:"contextMenu", items: [
			new MenuAction('Make Cause', _=>{this.setRole('cause'); this.bn.update(); menu.dismiss()}),
			new MenuAction('Make Effect', _=>{this.setRole('effect'); this.bn.update(); menu.dismiss()}),
			new MenuAction('Clear Role', _=>{this.setRole(null); this.bn.update({[this.nodeName]:null}); menu.dismiss()}),
		]});
		let {left,bottom} = this.el().querySelector('a.menu').getBoundingClientRect();
		menu.popup({left,top:bottom});
	}
	
	static guiSetupEvents() {
		q('.bnView').addEventListener('click', event => {
			event.stopPropagation();
			let menuButton = event.target.closest('a.menu');
			if (menuButton) {
				refs.Node(event.target).guiPopupMenu();
			}
			menuButton = event.target.closest('a.setCause, a.setEffect');
			if (menuButton) {
				let node = refs.Node(event.target);
				if (menuButton.matches('.on')) {
					node.setRole(null);
					/// Not sure why I was clearing evidence on this node?
					//node.bn.update({[node.nodeName]: null});
					node.bn.update();
				}
				else if (menuButton.matches('.setCause')) {
					node.setRole('cause');
					node.bn.update();
				}
				else if (menuButton.matches('.setEffect')) {
					node.setRole('effect');
					node.bn.update();
				}
				/// Arrows need updating, and since there's an animation,
				/// least visually ugly thing to do is sync it with the animation
				let arrowDraw;
				node.el().addEventListener('transitionend', _=>{
					cancelAnimationFrame(arrowDraw);
				}, {once:true});
				let nextFrame = _=> {
					draw.updateArrows(document.querySelector('.bnView'));
					arrowDraw = requestAnimationFrame(nextFrame);
				};
				nextFrame();
			}
		});
		q('.bnView').addEventListener('mousedown', event => {
			let target = event.target.closest('.node h3');
			console.log(target);
			if (target) {
				let targetNode = target.closest('.node');
				event.stopPropagation();
				event.preventDefault();
				console.log('in');
				targetNode.classList.add('moving');
				targetNode.closest('.bnView').classList.add('hasMoving');
				let origX = event.clientX, origY = event.clientY;
				let origLeft = parseFloat(targetNode.style.left), origTop = parseFloat(targetNode.style.top);
				let mm, mu;
				document.addEventListener('mousemove', mm = event => {
					//onsole.log('x');
					let deltaX = event.clientX - origX, deltaY = event.clientY - origY;
					//onsole.log(origLeft, deltaX);
					targetNode.style.left = (origLeft + deltaX)+'px';
					targetNode.style.top = (origTop + deltaY)+'px';
					/// Update with something more efficient
					draw.updateArrows(document.querySelector('.bnView'));
				});
				document.addEventListener('mouseup', mu = event => {
					targetNode.classList.remove('moving');
					target.closest('.bnView').classList.remove('hasMoving');
					/// Update with something more efficient
					draw.updateArrows(document.querySelector('.bnView'));
					document.removeEventListener('mousemove', mm);
					document.removeEventListener('mouseup', mu);
				});
			}
		});
	}
}

function setupScenarioEvents() {
	let scenarioBox = q('.scenario');
	let saveScenario = q('.saveScenario');
	let removeScenario = q('.removeScenario');
	let renameScenario = q('.renameScenario');
	
	scenarioBox.addEventListener('input', async event => {
		let opt = scenarioBox.options[scenarioBox.selectedIndex];
		if (opt.matches('.none')) {
			/// Clear scenario (evidence only? or roles as well?)
			//bn.update({});
			for (let node of bn.model) {
				let n = bn.getNode(node.name);
				n.clearEvidence();
				n.setRole(null);
			}
			bn.update(bn.evidence);
		}
		else {
			/// Load scenario
			let scenario = JSON.parse(opt.dataset.scenario);
			console.log(scenario);
			for (let node of bn.model) {
				let n = bn.getNode(node.name);
				n.clearEvidence();
				n.setRole(null);
				if (scenario.evidence[node.name]) {
					bn.getNode(node.name).setEvidence(scenario.evidence[node.name]);
				}
			}
			if (scenario.selectedStates) {
				bn.selectedStates = scenario.selectedStates;
			}
			if (scenario.roles)  for (let [role,nodeNames] of Object.entries(scenario.roles)) {
				for (let nodeName of nodeNames) {
					bn.getNode(nodeName).setRole(role);
				}
			}
			bn.update(scenario.evidence);
		}
	});
	saveScenario.addEventListener('click', async event => {
		let name = '';
		let sep = '';
		for (let [k,v] of Object.entries(bn.evidence)) {
			name += sep + `${k}=${bn.getNode(k).model.states[v]}`;
			sep = ', ';
		}
		if (bn?.roles?.cause)  for (let c of bn.roles.cause) {
			name += sep + `C:${c}`;
			sep = ', ';
		}
		if (bn?.roles?.effect)  for (let e of bn.roles.effect) {
			name += sep + `E:${e}`;
			sep = ', ';
		}
		if (!name) { name = '(No evidence)'; }
		let upd = {evidence:bn.evidence, roles:bn.roles, selectedStates: bn.selectedStates, name};
		let qs = getQs();
		let res = await fetch('/bn?updateScenario=1&requestType=data&id='+qs.id, {method:'POST', body: JSON.stringify(upd), headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		}}).then(r => r.json());
		scenarioBox.append(n('option', upd.name, {value: res.scenarioId, dataScenario: JSON.stringify(upd)}));
		scenarioBox.value = res.scenarioId;
	});
	removeScenario.addEventListener('click', event => {
		let scenarioId = event.target.closest('.controls').querySelector('.scenario').value;
		let qs = getQs();
		fetch('/bn?deleteScenario=1&requestType=data&id='+qs.id+'&scenarioId='+scenarioId, {method:'POST', headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		}});
		scenarioBox.querySelector(`[value="${scenarioId}"]`).remove();
	});
	renameScenario.addEventListener('click', event => {
		let scenarioId = event.target.closest('.controls').querySelector('.scenario').value;
		let qs = getQs();
		let opt = scenarioBox.querySelector(`[value="${scenarioId}"]`);
		let newName = prompt('New scenario name:', opt.text);
		if (newName) {
			let upd = {name: newName};
			fetch('/bn?renameScenario=1&requestType=data&id='+qs.id+'&scenarioId='+scenarioId, {method:'POST', body: JSON.stringify(upd), headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
			}});
			opt.text = newName;
		}
	});
}

document.addEventListener('DOMContentLoaded', event => {
	window.bnDetail = new BnDetail;
	bnDetail.make(document.querySelector('.bnDetail'));
	/// XXX: At the moment, this is needed to get a first pass of things like description.
	/// Need to fix this.
	bn.update();
	document.querySelector('.bnView').addEventListener('click', async event => {
		let target = event.target.closest('.target');
		if (target) {
			let stateI = Number(target.closest('.state').dataset.index);
			let nodeName = target.closest('.node').dataset.name;
			let thisInput = target.querySelector('input');
			let node = target.closest('.node');
			
			/// If shift key held, then allow multi-select; otherwise, clear old selects
			if (!event.shiftKey) {
				node.querySelectorAll('.target input').forEach(i => i != thisInput && (i.checked = false));
			}
			
			let states = [...node.querySelectorAll('.target input:checked')].map(el => Number(el.closest('.state').dataset.index));
			
			if (!states.length) {
				delete bn.selectedStates[nodeName];
			}
			else {
				bn.selectedStates[nodeName] = states;
			}
			
			bn.update(bn.evidence);
			
			return;
		}
		let state = event.target.closest('.state');
		if (state) {
			refs.Node(state).setEvidence(state.dataset.index, {update:true});
			/*let nodeName = state.closest('.node').dataset.name;
			let evidence = {};
			if (nodeName in bn.evidence && bn.evidence[nodeName] == state.dataset.index) {
				//delete bn.evidence[nodeName];
				evidence[nodeName] = null;
				state.closest('.node').classList.remove('hasEvidence');
			}
			else {
				//bn.evidence[nodeName] = state.dataset.index;
				evidence[nodeName] = state.dataset.index;
				state.closest('.node').classList.add('hasEvidence');
			}
			bn.update(evidence);*/
		}
	});

	setupScenarioEvents();
	
	Node.guiSetupEvents();
	
	q('h1 .text').setAttribute('contenteditable', 'true');
	q('h1 .text').setAttribute('spellcheck', 'false');
	q('button.save').addEventListener('click', event => {
		let doSave = async _=> {
			let qs = new URLSearchParams(location.search);
			let bnName = dlg.querySelector('[name=bnName]').value;
			let bnDescription = dlg.querySelector('[name=description]').value;
			bnDetail.$handleUpdate({title: bnName, temporary: false});
			if (qs.get('tempId')) {
				let fd = new FormData();
				fd.append('name', bnName);
				fd.append('description', bnDescription);
				fd.append('key', qs.get('tempId'));
				fd.append('type', qs.get('type'));
				let res = await fetch('/upload?step=2&requestType=data', {method:'POST', body: fd}).then(r => r.json());
				let usp = new URLSearchParams({id: res.id});
				history.replaceState(null, '', '?'+usp.toString());
			}
			else if (qs.get('id')) {
				let fd = new FormData();
				fd.append('updates', JSON.stringify({id:qs.get('id'),name:bnName, description:bnDescription}));
				let res = await fetch('/bn?requestType=data&updateBn=1', {method:'POST', body: fd});
			}
			bn.description = bnDescription;
			ui.dismissDialogs();
		};
		let dlg = ui.popupDialog([
			n('h2', 'Save BN'),
			n('div.form.saveBn',
				n('div.field',
					n('label', 'Name:'),
					n('input', {type: 'text', name: 'bnName', value: q('h1 .text').textContent}),
				),
				n('div.field',
					n('textarea', {name:'description', placeholder: 'Description'}, bn.description),
				),
			),
		], {buttons: [
			n('button.save', 'Save', {on: {click: doSave}}),
			n('button.cancel', 'Cancel', {on:{click:ui.dismissDialogs}}),
		]});
		q(dlg).querySelector('[name=bnName]').select().focus();
	});
	q('button.publish').addEventListener('click', event => {
		let doPublish = async _=> {
			let qs = new URLSearchParams(location.search);
			let res = await fetch('/bn?requestType=data&updateBn=1', {method:'POST',
				body: q(new FormData).append('updates', JSON.stringify({visibility:'public',id: qs.get('id')})).unchain()
			});
			bnDetail.$handleUpdate({visibility:'public'});
			ui.dismissDialogs();
		};
		let dlg = ui.popupDialog([
			n('h2', 'Publish BN'),
		], {buttons: [
			n('button.doPublish', 'Publish', {on: {click: doPublish}}),
			n('button.cancel', 'Cancel', {on: {click:ui.dismissDialogs}}),
		]});
	});
});