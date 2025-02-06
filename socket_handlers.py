from flask_socketio import SocketIO
from Notebook import db, Notebook
import json, base64

socketio = SocketIO()

def register_socket_events(app):
    socketio.init_app(app, async_mode='eventlet', cors_allowed_origins="*", logger=True, engineio_logger=True)

users = {
    1: {
        "username": "chug"
    },
    2: {
        "username": "darren"
    },
    3: {
        "username": "arfan"
    }
} 

current_user_id = 1
current_username = users.get(current_user_id).get("username")


@socketio.on('create_notebook')
def create_notebook(data):
    print(data)
    creator_id = current_user_id
    creator_username = users.get(current_user_id).get('username')
    title = data.get('title')
    topic = data.get('topic')
    cover = data.get('cover')
    favourites = 0
    downloads = 0
    notebook = Notebook(creator_id=creator_id ,creator_username=creator_username, title=title, topic=topic, cover=cover, favourites=favourites, downloads=downloads)
    db.session.add(notebook)
    db.session.commit()
    socketio.emit('notebook_created', {'notebook': notebook.to_dict(), 'restore': None})
    Notebook.count += 1
    socketio.emit('update_notebook_count', {'notebookCount': Notebook.count})

@socketio.on('edit_notebook')
def edit_notebook(data):
    id = data.get('id')
    old_title = data.get('old_title')
    new_title = data.get('new_title')
    new_topic = data.get('new_topic')
    new_cover = data.get('new_cover')
    notebook = Notebook.query.filter_by(_id=id).first()
    if notebook:
        notebook.title = new_title
        notebook.topic = new_topic
        notebook.cover = new_cover
        db.session.commit()
        socketio.emit('notebook_edited', notebook.to_dict())
        print(f'Notebook "{old_title}" renamed to "{new_title}".')
    else:
        print(f'Notebook with ID {id} not found.')

@socketio.on('delete_notebook')
def delete_notebook(data):
    id = data.get('id')
    title = data.get('title')
    notebook = Notebook.query.filter_by(_id=id).first()
    if notebook:
        notebook.trash = True
        db.session.commit()
        socketio.emit('notebook_deleted',notebook.to_dict())  
        print(f'Notebook "{title}" (ID: {id}) moved to trash.')
    else:
        print(f'Notebook with ID {id} not found.')
    Notebook.count -= 1
    socketio.emit('update_notebook_count', {'notebookCount': Notebook.count})

@socketio.on('delete_notebook_forever')
def delete_notebook_forever(data):
    title = data.get('title')
    id = data.get('id')
    notebook = Notebook.query.filter_by(_id=id, trash=True).first()
    if notebook:
        db.session.delete(notebook)
        db.session.commit()
        print(f'Notebook "{title}" (ID: {id}) permanently deleted.')
        socketio.emit('notebook_deleted_forever', {
            'title': title,
            'id': id
            })
    else:
        print(f'Notebook with ID {id} not found or not in trash.')

@socketio.on('delete_all_notebooks_forever')
def delete_all_notebooks():
    # Fetch all notebooks in the trash
    trash_notebooks = Notebook.query.filter_by(trash=True).all()
    
    # Delete all notebooks from the trash
    for notebook in trash_notebooks:
        db.session.delete(notebook)
    
    db.session.commit()
    
    # Emit a message to confirm deletion
    socketio.emit('all_notebooks_deleted_forever')
    print('All notebooks from trash permanently deleted.')

@socketio.on('restore_notebook')
def restore_notebook(data):
    id = data
    notebook = Notebook.query.filter_by(_id=id, trash=True).first()
    if notebook:
        notebook.trash = False
        db.session.commit()
        socketio.emit('notebook_created', {'notebook': notebook.to_dict(), 'restore': True})
        Notebook.count += 1
        socketio.emit('update_notebook_count', Notebook.count)
    else:
        print(f'Notebook with ID {id} not found.')

@socketio.on('update_favourites')
def update_favourites(data):
    id = data.get('id')
    creator_id = data.get('creatorId')
    update_type = data.get('updateType') 
    notebook = Notebook.query.filter_by(_id=id).first()
    if update_type == 'increase':
        if current_user_id == int(creator_id):
            notebook.favourited = True
        notebook.favourites += 1
    else:
        if current_user_id == int(creator_id):
            notebook.favourited = False
        notebook.favourites -= 1
    db.session.commit()
    socketio.emit('favourites_updated', {'notebook': notebook.to_dict(), 'updateType': update_type})

@socketio.on('save_notebook_contents')
def save_notebook_contents(data):
    id = data.get('id')
    contents = data.get('contents', '{"ops": []}')

    notebook = Notebook.query.filter_by(_id=id).first()
    if notebook:
        notebook.contents = json.dumps(contents)
        try:
            db.session.commit()
            socketio.emit('save_status', 'success')
        except Exception as e:
            db.session.rollback()
            socketio.emit('save_status', 'failure')

@socketio.on('update_last_saved')
def update_last_saved(data):
    id = data.get('id')
    lastSaved = data.get('lastSaved')

    notebook = Notebook.query.filter_by(_id=id).first()
    if notebook:
        notebook.last_edited = lastSaved
        db.session.commit()

@socketio.on('upload_json')
def handle_json_upload(data):
    try:
        # Extract file data from the event
        file_data = data.get('file')  # 'file' will be the base64-encoded file data
        file_name = data.get('file_name')  # Optional: you can include the filename if you want
        
        # Decode the base64 file data
        decoded_file = base64.b64decode(file_data)

        # Process the JSON (just as before)
        notebooks_data = json.loads(decoded_file.decode('utf-8'))
        
        if not isinstance(notebooks_data, list):
            socketio.emit('notebooks_upload_status', {'status': 'error', 'message': 'Invalid JSON format, expected a list'})
            return

        newly_added_notebooks = []

        for notebook_data in notebooks_data:
            required_fields = ["creator_id", "creator_username", "title", "topic", "contents"]
            if not all(field in notebook_data for field in required_fields):
                socketio.emit('notebooks_upload_status', {'status': 'error', 'message': f'Missing fields in notebook: {notebook_data}'})
                return

            favourited = notebook_data["creator_id"] == current_user_id and notebook_data.get("favourited", False)
                
            # Process and add notebook to the database
            new_notebook = Notebook(
                creator_id=current_user_id,
                creator_username=current_username,
                title=notebook_data["title"],
                topic=notebook_data["topic"],
                cover=notebook_data.get("cover", None),
                favourites=notebook_data.get("favourites", 0),
                favourited=favourited,
                downloads=notebook_data.get("downloads", 0),
                trash=False,
                contents=json.dumps(notebook_data["contents"]),
                last_edited=notebook_data.get("last_edited", None)
            )

            # Avoid duplicates
            existing_notebook = Notebook.query.filter_by(title=new_notebook.title, creator_id=new_notebook.creator_id).first()
            if existing_notebook:
                continue

            db.session.add(new_notebook)
            db.session.flush()  # Get the ID before commit
            newly_added_notebooks.append(new_notebook.to_dict()) 

        db.session.commit()

        socketio.emit('notebooks_upload_status', {
            'status': 'success', 
            'message': 'Upload successful!', 
            'notebooks_data': newly_added_notebooks
        })

    except Exception as e:
        socketio.emit('notebooks_upload_status', {'status': 'error', 'message': str(e)})