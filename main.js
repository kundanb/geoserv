require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql');

/** @type {import('mysql').ConnectionConfig} */
const mysqlConnConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
};

const adminPass = process.env.ADMIN_PASS;

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.get('/', (_, res) => {
  res.send('Welcome to Geoserv API!');
});

app.post('/', (req, res) => {
  /** @type {{ pass: string, name: string, url: string }} */
  const { pass, name, url } = req.body;

  if (!pass || !name || !url) return res.sendStatus(400);
  if (pass !== adminPass) return res.sendStatus(401);

  const conn = mysql.createConnection(mysqlConnConfig);
  const query = 'INSERT INTO features (name, url) VALUES (?, ?)';
  const values = [name, url];

  conn.query(query, values, err => {
    if (err) return console.log(err), res.sendStatus(500);
    res.sendStatus(200);
  });

  conn.end();
});

app.get('/:id', (req, res) => {
  const id = +req.params.id;

  const conn = mysql.createConnection(mysqlConnConfig);
  const query = 'SELECT name, url FROM features WHERE id = ?';

  conn.query(query, id, (err, results) => {
    if (err) return console.log(err), res.sendStatus(500);
    if (!results.length) return res.sendStatus(404);
    res.send(results[0]);
  });

  conn.end();
});

app.get('/search/:q', (req, res) => {
  const { q } = req.params;
  const limit = +req.query.limit || 10;

  const conn = mysql.createConnection(mysqlConnConfig);
  const query = 'SELECT id, name FROM features WHERE name LIKE ? LIMIT ?';
  const likeParams = [q + '%', '% ' + q + '%', '%' + q + '%'];

  let searchResults = [];

  const search = (i = 0) => {
    if (searchResults.length >= limit || i == likeParams.length) {
      conn.end();
      return res.send(searchResults.slice(0, 10));
    }

    conn.query(query, [likeParams[i], limit], (err, results) => {
      if (err) {
        conn.end();
        console.log(err);
        return res.sendStatus(500);
      }

      results = results.filter(r => !searchResults.some(s => s.id === r.id));
      searchResults.push(...results);
      search(i + 1);
    });
  };

  search();
});

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  console.log(`Geoserv Server has started at port ${PORT}.`);
});
