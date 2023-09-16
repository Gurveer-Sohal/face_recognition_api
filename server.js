const bodyParser = require('body-parser');
const express = require('express');
const cors = require('cors');
const knex = require('knex');
const app = express();
const bcrypt = require('bcrypt-nodejs');

const db = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'database',
        database: 'smart-brain'
    }
})

app.use(bodyParser.json());
app.use(cors());

// Homepage returns database list for production use 
// Remove in deployment 
app.get('/', (req, res)=> {
    res.send(database.users);
})

// SIGN IN 
app.post('/signin', (req, res) => {
    db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(data => {
        const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
        if (isValid) {
            return db.select('*').from('users').where('email', '=', req.body.email)
            .then(user => {
                res.json(user[0])
            })
            .catch(err => res.status(400).json("Unable to get user."))
        }
         
    })
    .catch(err => res.status(400).json("Wrong credentials"));
})

// REGISTER
app.post('/register', (req, res) => {
    const { email, name, password } = req.body; 
    const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
        trx.insert({
            hash: hash,
            email: email,
        })
        .into('login')
        .returning('email')
        .then(loginEmail => {
            return trx('users')
            .returning('*')
            .insert({
                email: loginEmail[0].email,
                name: name,
                joined: new Date()
                })
                .then(user => {res.json(user[0]);})
        })
        .then(trx.commit)
        .catch(trx.rollback)
    })    
    .catch(err => res.status(400).json("Unable to register."))        
})

// Get Profile of user 
app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    db.select('*').from('users').where({id: id}).then(user => {
        if(user.length) {
            res.json(user[0]);
        } else {
            res.status(400).json('Error getting user')
        }     
    })
})

// Image Counter
app.put('/images', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0].entries);
    })
    .catch(err => res.status(400).json("Unable to get entries."));
})


app.listen(3000, ()=> {
    console.log('app is running on port 3000');
})