import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cassandra from 'cassandra-driver';
import { Low, JSONFile } from 'lowdb';
import * as fs from 'fs';
import cors from 'cors';

dotenv.config();

async function gen2array<T>(gen: AsyncIterable<T>): Promise<T[]> {
    const out: T[] = [];
    for await(const x of gen) {
        out.push(x);
    }
    return out;
}

const auth = new cassandra.auth.PlainTextAuthProvider(process.env.KEYSPACE_USER!, process.env.KEYSPACE_PW!);
const client = new cassandra.Client({
    contactPoints: [process.env.ENDPOINT || 'localhost'],
    localDataCenter: 'datacenter1',
    authProvider: auth,
    protocolOptions: { port: 9042 },
});

const CQL_GET_VECTORS = 'SELECT id,vector FROM embedkeyspace.embed WHERE id IN ?';
async function getVectors(songIds: string[]) {
    const result = await client.execute(CQL_GET_VECTORS, [songIds], { prepare: true });
    return gen2array(result);
}

const app: Express = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const db = new Low(new JSONFile<Db>('./db.json'));
let data: Db;
if(!db.data) {
    db.data = {};
}
data = db.data;

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

app.post('/getVectors', async (req, res) => {
    let songIds = req.body;
    if(Array.isArray(songIds) && songIds.every(a => typeof a === 'string')) {
        let vectors;
        try {
            vectors = await getVectors(songIds);
        } catch(e) {
            res.status(500).send(e);
        }
        res.status(200).json(vectors);
    } else {
        res.status(400).send('bad request');
    }
});

type Db = {
    [id: string]: User;
};

type User = {
    playflows: Playflow[],
};

type Playflow = {
    name: string,
    coverImages: string[],
    vibes: Vibe[],
};

type Vibe = {
    name: string,
    playlistId: string,
    songs: { id: string, enabled: boolean }[],
};

// XXX there isn't any security here
app.get('/getUser', async (req, res) => {
    if(typeof req.query.id === 'string') {
        let id = req.query.id;
        let user = data[id];
        if(user) {
            res.status(200).json(user);
        } else {
            res.status(404).send('not found');
        }
    } else {
        res.status(400).send('bad request');
    }
});

app.post('/createUser', async (req, res) => {
    if(typeof req.query.id === 'string') {
        data[req.query.id] = { playflows: []};
        await db.write();
        res.status(200);
    } else {
        res.status(400);
    }
});

app.post('/editUser', async (req, res) => {
    if(typeof req.query.id === 'string') {
        data[req.query.id] = req.body;
        await db.write();
        res.status(200);
    } else {
        res.status(400);
    }
});

app.listen(port, () => console.log('listening'));
