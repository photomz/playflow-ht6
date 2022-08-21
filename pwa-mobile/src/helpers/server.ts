// This is a function, idk why the strange import is required
import * as createKDTree from 'static-kdtree';

// TODO change
const API_ENDPOINT = 'http://localhost:5000';

function jsonPost(url: string, body: any, opts?: RequestInit) {
    const {headers, ...notHeaders} = opts ?? {};
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), ...notHeaders });
}

export type RawVecs = { [id: string]: number[] };

declare const tag: unique symbol;
export type KdTree = { readonly [tag]: 'kd' } & any;

let vectors: Vectors | null = null;

type VectorXToId = { [xCoord: number]: string };

export class Vectors {
    vecs: RawVecs;
    ids: string[];
    kdtree: KdTree;

    constructor(vecs: RawVecs, kdtree: KdTree, ids: string[]) {
        this.vecs = vecs;
        this.ids = ids;
        this.kdtree = kdtree;
    }

    static async make(songIds: string[]): Promise<Vectors> {
        // TODO localstorage
        if(vectors == null) {
            let rawvecs = (await jsonPost(API_ENDPOINT + '/getVectors', songIds).then(data => data.json())) as { id: string, vector: number[] }[];
            const tree = makeKdTree(rawvecs);
            let vecs = {}, ids: string[] = [];
            for(const v of rawvecs) {
                vecs[v.id] = v.vector;
                ids.push(v.id);
            }
            vectors = new Vectors(vecs, tree, ids);
        };
        return vectors;
    }

    closestSongs(songId: string): string[] {
        if(this.vecs[songId] == null) throw "you messed up";
        return this.kdtree.knn(this.vecs[songId], 100).map((idx: number) => this.ids[idx]);
    }
}

function makeKdTree(vectors: { id: string, vector: number[] }[]): KdTree  {
    let points: number[][] = vectors.map(v => v.vector);
    let tree = createKDTree(points);
    return tree;
}
