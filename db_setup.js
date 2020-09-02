var sqlite = require('sqlite');
var passwordHash = require('password-hash');

class DbVersioning {
	constructor(dbPath) {
		this.dbPath = dbPath;
		this.db = null;
	}
	async init() {
		if (!this.db) {
			this.db = await sqlite.open(this.dbPath);
		}
	}
	async runStatements(statements) {
		await this.init();
		
		let running = false;
		let bumpVersion = false;
		let prevVersion = null;
		let newVersion = null;
		let totalRun = 0;
		
		for (let statement of statements) {
			let params = null;
			if (Array.isArray(statement)) {
				params = statement.slice(1);
				statement = statement[0];
			}
		
			let addedStatement = statement.match(/^\s*ADDED\s+(.*)/);
			/// START/STOP is for manually controlling statement execution. Best
			/// to use ADDED <date-version>, unless in mid-development.
			if (statement == "START") {
				running = true;
			}
			else if (statement == "STOP") {
				running = false;
			}
			else if (addedStatement) {
				/// This is for versioning. Suggest putting ISO-ish date, but any string
				/// higher than the previous string will do.
				let newVersion = addedStatement[1];
				let row = null;
				try {
					row = await this.db.get("select version from dbversion");
				}
				catch (e) {
					/// Table not defined, create it. (Well, maybe some other
					/// error, but if there is, this will throw that error too.)
					await this.db.exec("create table dbversion (version text)");
					await this.db.exec("insert into dbversion (version) values ('')");
					row = await this.db.get("select version from dbversion");
				}
			
				if (!row || row.version < newVersion) {
					if (prevVersion !== null) {
						console.log("prevVersion:", prevVersion);
						await this.db.exec("update dbversion set version = ?", prevVersion);
					}
					console.log("Updating to", newVersion);
					running = true;
					bumpVersion = true;
				}
				else {
					running = false;
				}
				prevVersion = newVersion;
			}
			else if (running) {
				if (params) {
					console.log(statement, params);
					await this.db.exec(statement, ...params);
				}
				else {
					console.log(statement);
					await this.db.exec(statement);
				}
				totalRun++;
			}
		}
				
		if (bumpVersion) {
			await this.db.exec("update dbversion set version = ?", newVersion);
		}
		
		return totalRun;
	}
}

class CatVersioning extends DbVersioning {
	constructor() {
		super();
		this.dbPath = 'cat.sqlite';
	}
	async run() {
		let totalRun = await this.runStatements([
			"ADDED 2020-01-21",
			/// I usually always add a users table. May not be needed here.
			"create table users (id integer primary key not null, username text, password text, email text, activated boolean)",
			/// Roles are kept as strings because they almost always have to be hardcoded anyway
			"create table user_roles (id integer primary key not null, userId integer, role string)",
			
			/// Default to one admin user
			["insert into users (id, username, password, activated) values (1, 'testadmin', ?, 1)", passwordHash.generate('testPass')],
			"insert into user_roles (userId, role) values (1, 'admin')",
			
			/// Logs
			"create table logs (id integer primary key not null, user text, accessType text, accessTime datetime, sessionId text, ipAddress text, url text)",
			
			/// Causal BNs (taken from ABNMS BN repository so that it's roughly similar)
			"create table bns (id integer primary key not null, url text, name text, description text, \
				author text, authorEmail text, copyright text, uploader text)",
			"alter table bns add column email text",
			"alter table bns add column approved boolean default 0",
			"create table licenses (id integer primary key not null, license text, link text, description text)",
			/// (For licenses that aren't one of the standard ones available)
			"alter table bns add column copyrightLink text",
			"alter table bns add column copyrightText text",
			"alter table bns add column origBnId integer",
			"alter table bns add column date timestamp",
			"alter table bns add column keywords text",
			"alter table bns add column citation text",
			"CREATE TABLE categories (id INTEGER PRIMARY KEY NOT NULL, name TEXT, parent INTEGER, level INTEGER)",
			"alter table bns add column category integer",
			"alter table bns add column suggestedCategory text",
			"alter table bns add column screenshots text",
			"alter table bns add column citationLink text",
			"START",
		]);
		
		console.log(`Done. ${totalRun} statements run`);
	}
}

new CatVersioning().run();