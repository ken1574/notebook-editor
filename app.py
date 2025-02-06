from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from socket_handlers import socketio, register_socket_events, current_user_id, current_username
from Notebook import db, Notebook
from werkzeug.utils import secure_filename
import json, io, zipfile



app = Flask(__name__, template_folder='templates', static_folder="static", static_url_path='/')
app.secret_key = "icantputdownthecup"
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///notebooks.db'

db.init_app(app) 

register_socket_events(app)

@app.route("/", methods=["GET", "POST"])
def user_profile():
    current_user_notebooks = Notebook.query.filter_by(creator_id=current_user_id).all()

    dashboard_data = [notebook for notebook in current_user_notebooks if not notebook.trash]
    favourite_data = [notebook for notebook in current_user_notebooks if notebook.favourited and not notebook.trash]
    trash_data = [notebook for notebook in current_user_notebooks if notebook.trash]

    notebook_count = max(Notebook.count, 0)  

    def format_notebook_data(notebook, include_favourited=True):
        return {
            'id': notebook._id,
            'creator_id': notebook.creator_id,
            'creator_username': notebook.creator_username,
            'title': notebook.title,
            'topic': notebook.topic,
            'cover': notebook.cover if notebook.cover and notebook.cover != 'none' 
                      else "resources/images/covers/default/default_cover.jpg",
            'favourites': notebook.favourites,
            'downloads': notebook.downloads,
            'favouriteState': "resources/images/icons/heart_filled.png"
                              if include_favourited and notebook.creator_id == current_user_id and notebook.favourited
                              else "resources/images/icons/heart.png"
        }

    dashboard_notebooks = [format_notebook_data(notebook) for notebook in dashboard_data]
    favourite_notebooks = [format_notebook_data(notebook) for notebook in favourite_data]
    trash_notebooks = [format_notebook_data(notebook) for notebook in trash_data]

    return render_template(
        'user_profile.html',
        current_user_id=current_user_id,
        current_username=current_username,
        dashboard_notebooks=dashboard_notebooks,
        favourite_notebooks=favourite_notebooks,
        trash_notebooks=trash_notebooks,
        notebook_count=notebook_count
    )
    
@app.route('/editor/<int:notebook_id>')
def editor(notebook_id):
    notebook = Notebook.query.filter_by(_id=notebook_id).first()
    if notebook:
        # Convert notebook contents to a valid JSON string
        data_contents = json.dumps(notebook.contents) if notebook.contents else '{"ops": []}'
        
        return render_template('editor.html', notebook=notebook.to_dict(), data_contents=data_contents)
    else:
        # Handle the case when notebook is not found
        return "Notebook not found", 404

@app.route('/download_json_zip', methods=["GET"])
def download_json_zip():
    notebooks = Notebook.query.filter_by(creator_id=current_user_id).all()

    # Convert to a list of dictionaries
    notebooks_data = [notebook.to_dict() for notebook in notebooks]

    # Serialize to JSON
    json_data = json.dumps(notebooks_data, indent=4, default=str)

    # Create an in-memory ZIP file
    zip_buffer = io.BytesIO()   
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("notebooks_backup.json", json_data)  # Add JSON inside ZIP

    # Prepare response
    zip_buffer.seek(0)  # Move to the beginning of the buffer
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name="notebooks_backup.zip"
    )

@app.route("/community", methods=["GET", "POST"])
def community():
    return render_template('community.html')

if __name__ == '__main__':
    with app.app_context():
        # db.drop_all()
        db.create_all()

    socketio.run(app, debug=True, port=8000)

