window.addEventListener('DOMContentLoaded', event => {
	document.querySelector('button.login')?.addEventListener?.('click', async event => {
		//window.location.href='/login'
		let dlg = ui.popupDialog([
			n('h2', 'Login'),
			n('div.form', 
				
			),
		]);
		let content = await fetch('/login?requestType=slice').then(r=>r.text());
		dlg.querySelector('.form').innerHTML = content;
		dlg.querySelector('.controls').append(n('button', 'Cancel', {type: 'button', on: {click: ui.dismissDialogs}}));
	});

	/** Drag and drop **/
	document.querySelectorAll('.upload.box, .upload.box *').forEach(el => el.addEventListener('dragenter', event => {
		event.target.closest('.upload.box').classList.add('dragover');
	}));
	document.querySelector('.upload.box')?.addEventListener?.('dragover', event => {
		event.preventDefault();
	});
	document.querySelector('.upload.box')?.addEventListener?.('dragleave', event => {
		event.target.classList.remove('dragover');
	});
	document.querySelector('.upload.box')?.addEventListener?.('drop', event => {
		event.target.classList.remove('dragover');
		event.preventDefault();
		q('[name=uploadCbn]').files = event.dataTransfer.files;
		q('[name=uploadCbn]').form.submit();
	}, false);
});

/// Hook fetch to show "loading"
var oldFetch = fetch;
fetch = (resource, init) => {
	let el = null;
	let t = setTimeout(_=> {
		el=n('div.message', 'Loading...');
		document.body.append(el);
	}, 100);
	return oldFetch(resource, init).then((res,rej) => {
		if (el)  el.remove();
		clearTimeout(t);
		return res;
	}).catch(err => console.log(err));
};

function changeUserLogin(type, el) {
	let userLogin = el.closest('.userLogin');
	if (type == 'create') {
		userLogin.querySelector('.login.form').classList.remove('active');
		userLogin.querySelector('.register.form').classList.add('active');
	}
	else {
		userLogin.querySelector('.login.form').classList.add('active');
		userLogin.querySelector('.register.form').classList.remove('active');
	}
}

function deleteBn(bnId) {
	let bnName = q(`[data-bn-id="${bnId}"]`).querySelector('h2').textContent;
	ui.popupDialog(n('div',
		`Do you wish to delete "${bnName}"?`
	), {buttons: [
		n('button', 'Delete', {on:{click: doDelete}}),
		n('button', 'Cancel', {on:{click: ui.dismissDialogs}}),
	]});
	async function doDelete() {
		ui.dismissDialogs();
		await fetch('/bn?requestType=data&'+new URLSearchParams({deleteBn:1,bnId}));
		q(`[data-bn-id="${bnId}"]`).remove();
	}
}

function userBox() {
	let username = q('.loginSection .username').raw;
	let c = q('.userBox').raw;
	c.style.display = 'block';
	c.style.position = 'fixed';
	let b = c.getBoundingClientRect();
	let userB = username.getBoundingClientRect();
	c.style.top = (userB.top+userB.height)+'px';
	c.style.left = (userB.left+userB.width-b.width)+'px';
	setTimeout(_=>{
		document.body.addEventListener('click', event => {
			c.style.display = 'none';
		}, {once:true, capture: true});
	}, 50);
}

var ui = {
	/** Dialogs **/
	popupDialog(content, opts) {
		opts = opts || {};
		opts.buttons = opts.buttons || [];
		opts.className = opts.className || "";

		let veil = n("div.veil", {style: 'opacity:1'});
		q('body').append(veil);

		/// Embed dialog into the veil
		/// $a could be a string, element or jquery element
		let dlg = n("div.dialog"+(opts.className ? '.'+opts.className : ''), content);
		veil.append(dlg);

		/// Add controls
		dlg.append(n('div.controls', opts.buttons));

		return dlg;
	},

	reportError(msg) {
		ui.popupDialog(msg+"<div class=controls><button type=button onclick=dismissDialogs()>OK</button></div>");
	},

	dismissDialog(dlg) {
		dlg.closest('.veil').style.opacity = 0;
		setTimeout(function() {
			dlg.closest('.veil').remove();
		}, 500);
	},

	dismissDialogs() {
		qa(".dialog").forEach(dlg => ui.dismissDialog(dlg));
	},
};