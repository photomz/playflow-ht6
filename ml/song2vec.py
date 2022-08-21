# Additional
from time import time
import multiprocessing
from os.path import abspath, join, dirname
import os
# Modeling
from gensim.models.callbacks import CallbackAny2Vec
from gensim.models.word2vec import PathLineSentences
from gensim.models.doc2vec import TaggedDocument
from gensim.models import Word2Vec
# Visualization
import logging
import matplotlib.pyplot as plt
import seaborn as sns
plt.style.use('seaborn')
sns.set_style("whitegrid")

def path(path):
    return abspath(join(dirname(__file__), *path.split('/')))

# Conform to unix timestamp
IMAGE_PATH = path(f"../assets/images/song2vec_loss-{int(time()*1000)}.png")
SONG2VEC_PATH = path("../assets/model/song2vec.model")
SONG2VEC_WV_PATH = path("../src/ml_api/dist/model/song2vec.kv")
CORPUS_PATH = path("../assets/sentences/")

RETRAIN = True
CONTINUE_TRAIN = False

logging.basicConfig(
    format="%(asctime)s : %(levelname)s : %(message)s", level=logging.INFO)


class Callback(CallbackAny2Vec):
    def __init__(self):
        self.epoch = 1
        self.training_loss = []

    def on_epoch_end(self, model):
        # TODO: Implement cover-word accuracy from original notebook - train test split
        loss = model.get_latest_training_loss()
        if self.epoch == 1:
            current_loss = loss
        else:
            current_loss = loss - self.loss_previous_step
        print(f"Loss after epoch {self.epoch}: {current_loss}")
        self.training_loss.append(current_loss)
        self.epoch += 1
        self.loss_previous_step = loss


class TaggedPathLineDocument:
    """
    Inexhaustible iterable that returns TaggedDocuments for each sentence for each file in path
    """
    sentences = None

    def __init__(self, path) -> None:
        self.sentences = PathLineSentences(path)

    def __iter__(self):
        for i, doc in enumerate(self.sentences):
            yield TaggedDocument(doc, [i])


model = None
if (os.path.isfile(SONG2VEC_PATH)) and (not RETRAIN or CONTINUE_TRAIN):
    model = Word2Vec.load(SONG2VEC_PATH)
else:
    # TODO: Lower window to 10: https://stackoverflow.com/a/30447723/10243889
    model = Word2Vec(
        vector_size=256,
        window=10,  # Most songs in good playlist should be similar so large window
        min_count=27,  # Don't consider "words" only below frequency: arbitrary to keep under 2G Boto3 S3 Get limit
        max_vocab_size=None,  # 70M unique songs at most 7G ram:  https://radimrehurek.com/gensim/models/Word2vec.html#gensim.models.Word2vec.LineSentence
        sg=0,
        # dm=0,
        # dm_concat=0,  # Do not concat vectors into matrix - MemoryOverflow
        # dm_mean=1,  # Use mean not sum
        # dbow_words=1,  # Train word vectors too
        negative=20,
        workers=multiprocessing.cpu_count()-1)

if (CONTINUE_TRAIN or RETRAIN):
    logging.disable(logging.NOTSET)  # enable logging
    assert os.path.isdir(CORPUS_PATH)
    # TaggedPathLineDocument(CORPUS_PATH)
    documents = PathLineSentences(CORPUS_PATH)
    t = time()
    model.build_vocab(corpus_iterable=documents, progress_per=1e5)
    print(f"Time to build vocab: {round((time() - t), 2)} seconds")

    logging.disable(logging.INFO)  # disable logging
    callback = Callback()  # instead, print out loss for each epoch
    t = time()

    model.train(corpus_iterable=documents,
                total_examples=model.corpus_count,
                epochs=50,  # 50 epochs overfits already; Google News Word2vec takes billions of examples but only ~20 epochs
                compute_loss=True,
                callbacks=[callback])

    print(f"Time to train the model: {round((time() - t), 2)} seconds")

    logging.disable(logging.INFO)  # disable logging
    model.save(SONG2VEC_PATH)
    # Force saving onto one file for correct S3 loading
    model.wv.save(SONG2VEC_WV_PATH, separately=[], sep_limit = 100*1024**3)

    # Loss evaluation - Loss (y) vs Epoch (x)
    plt.plot(range(1, model.epochs+1), callback.training_loss)
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.title("Training Loss", fontweight="bold")
    plt.savefig(IMAGE_PATH, bbox_inches='tight')
