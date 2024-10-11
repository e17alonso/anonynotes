from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import uuid
import os

app = Flask(__name__, static_folder='static')
CORS(app)
DATABASE = 'anonynotes.db'

# Connect to the SQLite database
def connect_db():
    return sqlite3.connect(DATABASE)

# Initialize the database and create the notes table
def init_db():
    with connect_db() as con:
        con.execute('''CREATE TABLE IF NOT EXISTS notes (
                        id TEXT PRIMARY KEY, 
                        content TEXT)''')

# Serve the main HTML file for the frontend
@app.route('/')
def home():
    return send_from_directory(app.static_folder, 'index.html')

# Serve JavaScript and CSS files
@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(app.static_folder, path)

@app.route('/create', methods=['POST'])
def create_note():
    content = request.form.get('content')
    if not content:
        return jsonify({"error": "Content is required"}), 400
    note_id = str(uuid.uuid4())
    with connect_db() as con:
        con.execute("INSERT INTO notes (id, content) VALUES (?, ?)", (note_id, content))
        con.commit()
    return jsonify({"id": note_id})

@app.route('/note/<note_id>', methods=['GET'])
def get_note(note_id):
    with connect_db() as con:
        cur = con.execute("SELECT content FROM notes WHERE id = ?", (note_id,))
        row = cur.fetchone()
    if row:
        return jsonify({"content": row[0]})
    return jsonify({"error": "Note not found"}), 404

@app.route('/note/<note_id>', methods=['PUT'])
def update_note(note_id):
    content = request.form.get('content')
    if not content:
        return jsonify({"error": "Content is required"}), 400
    with connect_db() as con:
        cur = con.execute("UPDATE notes SET content = ? WHERE id = ?", (content, note_id))
        con.commit()
    return jsonify({"message": "Note updated"}) if cur.rowcount else jsonify({"error": "Note not found"}), 404

@app.route('/note/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    with connect_db() as con:
        cur = con.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        con.commit()
    return jsonify({"message": "Note deleted"}) if cur.rowcount else jsonify({"error": "Note not found"}), 404

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
