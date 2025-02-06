import json
from Notebook import db, Notebook  # Ensure this matches your database config
from sqlalchemy.orm import sessionmaker
import os

output_dir = "backup_data"
os.makedirs(output_dir, exist_ok=True)
file_path = os.path.join(output_dir, "notebooks_backup.json")

# Fetch all notebooks
notebooks = db.session.query(Notebook).all()

# Convert to a list of dictionaries
notebooks_data = [notebook.to_dict() for notebook in notebooks]

# Serialize to JSON
with open(file_path, "w", encoding="utf-8") as file:
    json.dump(notebooks_data, file, indent=4, default=str)  # Convert datetime to string

print("Exported successfully to notebooks_backup.json.")
