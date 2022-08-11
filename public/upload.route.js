var {n, toHtml, html} = require('htm');
var fs = require('fs').promises;
var cp = require('child_process');
var util = require('util');
var {sitePath} = require('siteUtils');
var {Net, Node} = require('../bni_smile');

class Upload {
	make(root, data) {
		if (data.step == 1) {
			this.root = n('form', {method:'post', action:'/upload?step=2'},
				n('div.field',
					n('label', 'Name:'),
					n('input', {type:'text', name:'name'}),
				),
				n('div.field',
					n('label', 'Description:'),
					n('textarea', {name: 'description'}),
				),
				n('input', {type:'hidden', name: 'key'}),
				n('button', {type:'submit'}, 'Next'),
			);
		}
		else if (data.step == 2) {
			this.root = n('p', 'Uploaded!');
		}
		else if (data.step == 'error') {
			this.root = n('div',
				n('h2', 'The BN upload encountered an error'),
				n('p', `It looks like our site can't (yet) handle the BN you tried to upload. At the moment, the site can only handle basic Bayesian networks, with no extensions.`),
				n('p.errorMessage', n('label','Our validation gave the following error: '), (data.msg ? data.msg : n('b', 'The validation process timed out.'))),
				n('p', `Here are some things you can try:`),
				n('ul',
					n('li', 'Keep the BN as simple as possible - include only discrete CPT nodes and nothing else'),
					n('li', 'Convert all continuous nodes to discrete'),
					n('li', 'Remove any constant nodes'),
					n('li', 'Remove utility nodes. Convert decision nodes to ordinary nodes'),
					n('li', 'Remove all comments or other floating text'),
					n('li', 'You may have better luck if the file is in GeNIe (.xdsl) format'),
				),
				n('p', n('a', {href:'/'}, html`&larr; Home`), ), 
			);
		}
	}
	
	$handleUpdate(data) {
		if (data.step == 1) {
			this.root.querySelector('[name=name]').setAttribute('value', data.name);
			this.root.querySelector('[name=description]').setAttribute('value', data.description);
			this.root.querySelector('[name=key]').setAttribute('value', data.key);
		}
	}
}

module.exports = {
	template: 'StandardPage',
	component: Upload,
	noUserRequired: true,
	async prepareData(req,res,db) {
		let key = null;
		let params = {};
		if (req && req.files && req.files.uploadCbn) {
			key = String(Math.random()).slice(2);
			let [,baseName,bnType] = req.files.uploadCbn.name.match(/(.*)\.(.*?)$/);
			let bnPath = 'public/bns/temp_'+key+'.'+bnType;
			await req.files.uploadCbn.mv(bnPath);
			/// GeNIe can't handle Windows line endings on Linux, so convert if present
			if (process.platform != 'win32') {
				let contents = await fs.readFile(bnPath);
				contents = contents.toString().replace(/\r\n/g, '\n');
				fs.writeFile(bnPath, contents);
			}
			
			/// Check that the BN is valid
			let error = null;
			try {
				console.log('testing');
				let child = await util.promisify(cp.execFile)('node', ['check_loadable.js', bnPath], {timeout: 5000});
				console.log('child output:', child.toString());
			}
			catch (err) {
				let fullLog = err.stdout.toString();
				error = {message: (fullLog.match(/^ERROR:\s*(.*)/m) || [])[1]};
				console.log('error', error);
				console.log('ERROR:', error.message);
				console.log('child output:', fullLog);
				//fs.unlink(bnPath);
			}
			
			if (error) {
				console.log('error');
				return {step: 'error', msg: error.message};
			}
			else {
				params = {name:req.files.uploadCbn.name.replace(/\.[^.]*$/, ''), type: bnType};
				
				/// Make an xdsl version (much faster loading in many cases)
				if (bnType != 'xdsl') {
					let xdslPath = bnPath.replace(/\.[^.]*$/, '.xdsl');
					new Net(bnPath).write(xdslPath);
				}
				
				res.redirect(`/bn?tempId=${key}&type=${bnType}`);
				return;
			}
		}
		else if (req.query.step == 2) {
			if (!['xdsl','dne'].includes(req.body.type))  return;
			console.log([req.body.name, req.body.description, req.body.type]);
			let {lastID:lastId} = await db.run('insert into bns (name, description, userId) values (?, ?, ?)', [req.body.name, req.body.description, req._user.id]);
			let ext = '.'+req.body.type;
			await db.run('update bns set url = ? where id = ?', [lastId+ext,lastId]);
			console.log(lastId+ext);
			fs.rename('public/bns/temp_'+req.body.key+ext, 'public/bns/'+lastId+ext);
			params = {id: lastId};
		}
		
		return {step: req.query.step || 1, key, ...params};
	},
}