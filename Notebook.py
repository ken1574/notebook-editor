from datetime import datetime
from pytz import timezone
from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()

class Notebook(db.Model):
    count = 0
    _id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer)
    creator_username = db.Column(db.String(100))
    title = db.Column(db.String(100), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    cover = db.Column(db.String())
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone('Asia/Singapore')))
    favourites = db.Column(db.Integer)
    favourited = db.Column(db.Boolean, default=False)
    downloads = db.Column(db.Integer)
    trash = db.Column(db.Boolean, default=False)
    contents = db.Column(db.Text, default='{"ops": []}')
    last_edited = db.Column(db.String())

    def to_dict(self):
        return {
            'id': self._id,
            'creator_id': self.creator_id,
            'creator_username': self.creator_username,
            'title': self.title,
            'topic': self.topic,
            'cover': self.cover if self.cover and self.cover != 'none' else "resources/images/covers/default/default_cover.jpg",
            'favourites': self.favourites,
            'favourited': self.favourited,
            'downloads': self.downloads,
            'contents': json.loads(self.contents) if self.contents else {"ops": []},
            'last_edited': self.last_edited
        }