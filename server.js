var express = require('express');
var Net = require('./bni_smile').Net;
var {n, toHtml} = require('htm');
var fs = require('fs');
var pth = require('path');
var chokidar = require('chokidar');
var sqlite3 = require('sqlite3');
var sqlite = require('sqlite');
var pages = require('./pages');
var fileUpload = require('express-fileupload');
var cookieParser = require('cookie-parser');

var app = express();
var port = 3000;

var db = null;
var componentStore = [];
var appCache = {};

(async function() {
	db = await sqlite.open({filename:'cat.sqlite', driver:sqlite3.Database});
})();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(cookieParser());

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.use('/public', (req,res,next) => {
	if (req.url.match(/\.route\.js$/)) {
		
	}
});
/// Make everything but .route.js static
var statics = express.static('public');
app.use((req,res,next) => {
	if (!req.path.match(/\.route\.js$/))  return statics(req,res,next);
	
	return next();
});

app.get('/test', (req,res) => {
	let net = new Net('bns/1-Asia.xdsl');
	
	let p = n('p', 'This!');
	
	res.send(`The beliefs ${p.outerHTML} for the lung node in the Asia model are: ${net.node('lung').beliefs().join(', ')}.`);
});

app.get('/_/js/components.js', (req,res) => {
	res.send(componentStore.map(c => c.toString()+'\n\n').join(''));
});

function loadRoute(app, path) {
	let result = {updated: false};
	
	//console.trace();
	//console.log("LOADING ROUTE ", path);
	let modulePath = pth.join(__dirname, path);
	let publicPath = '/' + path.replace(/\\/g, '/').replace(/^[^\/]*\//, '', path).replace(/\.route\.js$/, '');
	    publicPath = publicPath.replace(/(^|\/)index$/, '/');
	
	/// Drop module if present
	try {
		delete require.cache[require.resolve(modulePath)];
	} catch(e) {}
	
	let fileMod = require(modulePath);
	if (!fileMod.component) {
		return {failed: true};
	}
	
	/// Store the component
	let matchingComponentI = componentStore.findIndex(c => c.name == fileMod.component.name);
	if (matchingComponentI > -1) {
		componentStore[matchingComponentI] = fileMod.component;
	}
	else {
		componentStore.push(fileMod.component);
	}
	
	/// Uninstall route if present (simple paths only)
	//console.log(app._router.stack);
	let routerEntries = app._router.stack;
	for (let i=routerEntries.length-1; i>=0; i--) {
		let layer = routerEntries[i];
		if (layer.route && layer.route.path == publicPath) {
			app._router.stack.splice(i, 1);
			//break;
			/// Finding an existing route (and removing it) means we're updating
			result.updated = true;
		}
	}
	let loadActiveUser = async (sessionId) => {
		let userInfo = await db.get(`select * from users
			left join user_sessions on users.id = user_sessions.userId
			where sessionId = ?`, sessionId) ?? null;
		/// The row id of the session is not useful (and confusing)
		/// return the user id instead
		if (userInfo) {
			userInfo.id = userInfo.userId;
		}
		console.log('userInfo:', userInfo);
		return userInfo;
	};
	let accessOk = (res,req,db,user) => {
		if (fileMod.noUserRequired)  return true;
		
		if (user)  return true;
		
		return false;
	}
	//console.log(app._router.stack);
	let handler = async(req,res) => {
		/// Identify when a redirect has occurred
		let redirected = false;
		res.__redirect = res.redirect;
		res.redirect = (...args) => {
			res.__redirect(...args);
			redirected = true;
		}
		
		let user = null;
		let sessionId = null;
		if (!req.cookies.sessionId) {
			sessionId = Math.random().toString().slice(2);
			res.cookie('sessionId', sessionId);
		}
		else {
			sessionId = req.cookies.sessionId;
		}
		user = await loadActiveUser(sessionId);
		/// Attach user info to request
		req._user = user;
		console.log(user);
		if (!accessOk(req,res,db,user)) {
			res.send('Not logged in');
			return;
		}
		
		/// If there's no request type, it's a standard page request. Prepare the page,
		/// and attach to the request.
		if (!req.query.requestType) {
			/// First, make our page template.
			///   If string, lookup the 'pages' module.
			///   Otherwise, assume it's a page class.
			console.log('template:', fileMod.template);
			let template = fileMod.template ? fileMod.template : 'StandardPage';
			let page = typeof(template)=='string' ? new pages[template] : new template;
			page.make();
			/// Attach to request
			req._page = page;
		}
		
		if (req.query.requestType == 'component') {
			res.send(fileMod.component.toString());
			return;
		}
		if (fileMod.update) {
			let updateAndStop = await fileMod.update(req,res,db,appCache);
			if (updateAndStop) {
				return;
			}
		}
		
		// If need to redirect in prepareData, return {__redirect: "<location>"}
		let data = null;
		if (fileMod.prepareData) {
			data = await fileMod.prepareData(req,res,db,appCache);
		}
		if (!redirected) {
			if (req.query.requestType == 'data') {
				res.send(JSON.stringify(data));
			}
			else {


				/// Either get the module to make the component,
				/// or use the default method for making the component
				let cmpt = null;
				if (fileMod.makeComponent) {
					cmpt = fileMod.makeComponent(data);
				}
				else {
					cmpt = new fileMod.component;
					cmpt.make(null, data);
					if (cmpt.$handleUpdate)  cmpt.$handleUpdate(data);
				}
				let responseContent = null;
				if (req.query.requestType == 'slice') {
					responseContent = cmpt.root.outerHTML;
				}
				else {
					console.log('user:', user);
					req._page.$handleUpdate({body: cmpt.root, user});
					responseContent = req._page.toHtml();
				}
				if (!redirected)  res.send(responseContent);
			}
		}
	};
	let handlerWError = async(req,res) => {
		try {
			await handler(req,res);
		}
		catch (e) {
			console.error(e.stack);
		}
	};
	app.get(publicPath, handlerWError);
	app.post(publicPath, handlerWError);
	/*if (fileMod.post)  app.post(publicPath, async(req,res) => {
		if (req.params.requestType == 'data') {
			await fileMod.postData(req,res,db);
		}
		else {
			await fileMod.post(req,res,db);
		}
	});*/
	
	return result;
}

function handleFileReload(path) {
    fs.lstat(path, function(err, stat) {
        if (stat.isDirectory()) {
            // we have a directory: do a tree walk
            fs.readdir(path, function(err, files) {
                var f, l = files.length;
                for (var i = 0; i < l; i++) {
                    f = pth.join(path, files[i]);
                    handleFileReload(f);
                }
            });
        } else if (path.match(/\.route\.js$/)) {
			//console.log('path', path);
            // we have a file: load it
            let r = loadRoute(app, path);
			if (r.failed) {
				console.log(`No component for ${path}`);
			}
			else if (r.updated) {
				console.log(`Updated ${path}`);
			}
			else {
				console.log(`Loaded ${path}`);
			}
			//console.log(app._router.stack);
        }
		else {
			console.log(`File/dir changed: ${path}`);
		}
		/// We could potentially live update other file types (and send the update immediately to the browser), but probably unnecessary overhead
    });
}
var DIR = 'public';
handleFileReload(DIR);
chokidar.watch('public', {awaitWriteFinish: {stabilityThreshold: 500}}).on('change', (path, stats) => {
	if (path) {
		if (fs.existsSync(path)) {
            handleFileReload(path); //loadRoute(app, path);
		}
	}
});

//exports.module_holder = module_holder;
// the usual server stuff goes here

app.listen(port, () => console.log(`CAT is listening on ${port}...`));