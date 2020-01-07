"use strict";

/**
 * Cloud Computing Example Service
 * 
 * Intended to be deployed on OKD/OpenShift or Heroku PaaS platforms
 */

// Get default settings from environment variables
const SSL = process.env.SSL || "false";
const SERVER_PORT = process.env.EXAMPLE_SERVICE_PORT || process.env.PORT || 8080; // PORT environement variable provided by Heroku
const SERVER_PREFIX = process.env.EXAMPLE_SERVICE_PREFIX || "/snippets";
const DB_URL = process.env.EXAMPLE_DB_URL || process.env.DATABASE_URL || "postgres://example:keines@127.0.0.1:5432/example";

/** Postgres database access functions objects */
class PSQL_DB {

    /** Create a database connection
     * @constructs PSQL_DB, a PostgreSQL database connection
     * @param {string} url - complete database connection url
    */
    constructor(url) {
        const { Client } = require('pg');
    	console.log(`Using Database URL: ${url}`);
    	var use_ssl = (SSL == "true" || SSL == 1 ? true : false);
        this.connection = new Client({ 
            connectionString: url, 
            ssl: use_ssl 
        });

        // connect to the database
        this.connect();

        // if connection to DB has been closed unexpected
        this.connection.on('end', (error) => {
            console.log('Connection closed ', error);
            // try to re-connect
            this.connect();
        });
    }

    /** Connect to the database */
    connect() {
        console.log(`Connecting to database  ...`);
        this.connection.connect((error) => {
            if (error) {
                console.log(`Connection to database FAILED!`);
		console.log(error);
                process.exit(1);
            }
            else {
                console.log(`Connection to database established!`);
            }
        });
    }

    dbGetById(id) {
        return this.connection.query('SELECT * FROM example WHERE id = $1', [id]);
    }

    dbGetAll() {
        return this.connection.query('SELECT * FROM example');
    }

    dbAdd(name, description, author, language, code, tags) {
        return this.connection.query('INSERT INTO example (name, description, author, language, code, tags) VALUES ($1, $2, $3, $4, $5, $6);', [name, description, author, language, code, tags.toString()])
    }

    dbDelete(id) {
        return this.connection.query('DELETE FROM example WHERE id=$1;', [id])
    }

    dbUpdate(id, name, description, author, language, code, tags) {
        return this.connection.query('UPDATE example SET name=$1, description=$2, author=$3, language=$4, code=$5, tags=$6 WHERE id=$7;', [name, description, author, language, code, tags.toString(), id])
    }

    dbSearch(what) {
        return this.connection.query('SELECT * FROM example WHERE $1', what);
    }

    dbFindByName(name) {
        return this.connection.query('SELECT * FROM example WHERE name = $1', [name]);
    }
}

/** Class implementing the ReST Example API */
class ExampleAPI {

    addJsonTags(result) {
        let tags = result.rows[0].tags.split(',');
        result = result.rows[0];
        result.tags = JSON.stringify(tags);
        result.tags = JSON.parse(result.tags)

        return result;
    }

    async add(req, res) {
        let result = null;

        try {
            result = await db.dbAdd(req.body.name, req.body.description, req.body.author, req.body.language, req.body.code, req.body.tags)
            result = await db.dbFindByName(req.body.name);
            let tags = result.rows[0].tags.split(',');
            result = result.rows[0];
            result.tags = JSON.stringify(tags);
            //result.tags = result.tags.replace('/\\/g', '')
            result.tags = JSON.parse(result.tags)

            await res.json(result);
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database access error" });
        }
    }

    async search(req, res) {
        let result = null;

        try {
            result = await db.dbSearch(req.params.searchterm);
            if (result.rows[0] == undefined)
                await res.json({"error": "term not found"});
            else
                await res.json(result.rows);
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database error" });
        }
    }

    async delete(req, res) {
        let result = null;

        try {
            result = await db.dbDelete(req.params.id);
            if (result.rowCount > 0)
                await res.json(result.rows);
            else
                await res.status(400).json({"error": "id not found"});
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database error" });
        }
    }

    async update(req, res) {
        let result = null;

        try {
            result = await db.dbUpdate(req.params.id, req.body.name, req.body.description, req.body.author, req.body.language, req.body.code, req.body.tags);
            if (result.rowCount > 0)
                await res.json(result.rows);
            else
                await res.status(400).json({"error": "id not found"});
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database error" });
        }
    }

    async getById(req, res) {
        let result = null;

        try {
            result = await db.dbGetById(req.params.id);
            if (result.rows[0] == undefined) 
                await res.json({"error": "id not found"});
            else
                var tags = result.rows[0].tags.split(',');
                result = result.rows[0];
                result.tags = JSON.stringify(tags);
                result.tags = JSON.parse(result.tags)
                res.json(result);
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database error" });
        }
    }

    async getAll(req, res) {
        let result = null;

        try {
            result = await db.dbGetAll();
            if (result.rows[0] == undefined)
                await res.json({"error": "id not found"});
            else
                await res.json(result.rows);
        } catch (error) {
            console.log(JSON.stringify(error));
            res.status(500).json({ "error": "database access error" });
        }
    }

    /** Create an Example ReST API 
     * @param {number} port - port number to listen
     * @param {string} prefix - resource path prefix
     * @param {Object} db - database connection
    */
    constructor(port, prefix, db) {
        this.port = port;
        this.prefix = prefix;
        this.db = db;

        // Add Express for routing
        const express = require('express');
        const bodyParser = require('body-parser');

        // Define express app
        this.app = express();
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());

        // Select by id
        this.app.get(this.prefix + '/:id', this.getById);

        // Select all
        this.app.get(this.prefix + '', this.getAll);

        // Search
        this.app.get(this.prefix + '?', this.search);

        // Post
        this.app.post(this.prefix + '', this.add);

        // Delete
        this.app.delete(this.prefix + '/:id', this.delete);

        // Update
        this.app.put(this.prefix + '/:id', this.update);

        // Listen on given port for requests
        this.server = this.app.listen(this.port, () => {
            var host = this.server.address().address;
            var port = this.server.address().port;
            console.log("ExampleAPI listening at http://%s:%s%s", host, port, this.prefix);
        });
    }
};

// create database connection
var db = new PSQL_DB(DB_URL);

// create ReST Example API
const api = new ExampleAPI(SERVER_PORT, SERVER_PREFIX, db);
