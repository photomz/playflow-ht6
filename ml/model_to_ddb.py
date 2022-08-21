import boto3
import pickle
from gensim.models import KeyedVectors # Requested during vectors pickle file import

SONG2VEC_KV_PATH = ('songworm', 'src/ml_api/dist/model/song2vec.kv')
# Do not use smart_open: https://github.com/RaRe-Technologies/smart_open/issues/457
# Vectors saved in single binary pickle file - KeyedVectors.load() not flexible for S3 and too slow
s3 = boto3.resource('s3')
ddb = boto3.client('dynamodb')
keyed_vectors = pickle.loads(s3.Object(*SONG2VEC_KV_PATH).get()['Body'].read(), fix_imports=True)
keyed_vectors

b62_ids = keyed_vectors.index_to_key
vectors = keyed_vectors[b62_ids].tolist()

import csv
from tqdm import tqdm
with open('./id_vector_map.txt', "w+") as f:
	f.write(f"Id Vector\n")
	for i,vector in enumerate(tqdm(vectors)):
		f.write(f"{b62_ids[i]} {' '.join([str(d) for d in vector])}\n")