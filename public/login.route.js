var {n, toHtml} = require('htm');
var {sitePath} = require('siteUtils');
var bcrypt = require('bcrypt');

class Login {
	make(root, data) {
		if (data.step == 1) {
			this.root = n('div.userLogin',
				n('form.login.form.active', {method: 'post', action: '/login?step=2'},
					n('div.field',
						n('label', 'Username:'),
						n('span', n('input', {name: 'username'})),
					),
					n('div.field',
						n('label', 'Password:'),
						n('span', n('input', {name: 'password', type: 'password'})),
					),
					n('div.controls',
						n('button', {onclick: 'changeUserLogin("create", this)', type:'button'}, 'Create Account'),
						n('button.login', 'Login'),
					),
				),
				n('form.register.form', {method: 'post', action: '/login?step=2&register=1'},
					n('div.field',
						n('label', 'Username:'),
						n('span', n('input', {name: 'username'})),
					),
					n('div.field',
						n('label', 'Email:'),
						n('span', n('input', {name: 'email'})),
					),
					n('div.field',
						n('label', 'Password:'),
						n('span', n('input', {name: 'password', type: 'password'})),
					),
					n('div.field',
						n('label', 'Confirm password:'),
						n('span', n('input', {name: 'password2', type: 'password'})),
					),
					n('div.controls',
						n('button', {onclick: 'changeUserLogin("login", this)', type:'button'}, 'Back to Login'),
						n('button.register', 'Register'),
					),
				),
			);
		}
		else if (data.step == 2) {
			if (data.register) {
				this.root = n('div', 'User registered');
			}
		}
	}
};

module.exports = {
	noUserRequired: true,
	template: 'StandardPage',
	component: Login,
	async prepareData(req,res,db) {
		if (req.query.register) {
			if (req.query.step == 2) {
				let salt = await bcrypt.genSalt(10);
				let hashedPwd = await bcrypt.hash(req.body.password, salt);
				let details = {
					username: req.body.username,
					email: req.body.email,
					password: hashedPwd,
				};
				console.log(details);
				await db.run('insert into users (username, email, password) values (:username, :email, :password)', ...Object.values(details));
			}
		}
		else if (req.query.logout) {
			await db.run('delete from user_sessions where sessionId = ?', req.cookies.sessionId);
			res.redirect('/');
		}
		else {
			if (req.query.step == 2) {
				/// Check against DB
				let userInfo = await db.get('select id, password from users where username = ?', req.body.username);

				/// If OK, setup session + session cookie (also via DB)
				if (await bcrypt.compare(req.body.password, userInfo.password)) {
					await db.run('insert into user_sessions (sessionId, userId, lastModified) values (?,?,datetime())', req.cookies.sessionId, userInfo.id);
					res.redirect('/');
				}
				/// Otherwise, reject
				else {
					console.log('Login failed');
				}
			}
		}
		
		return {step: req.query.step || 1};
	}
}