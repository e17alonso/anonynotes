from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import uuid
import os

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept", "Origin", "Authorization"],
        "supports_credentials": True,
        "expose_headers": ["Access-Control-Allow-Origin"],
        "max_age": 600
    }
})

DATABASE = '/opt/homebrew/var/www/backend/anonynotes.db'

def decrypt_note_with_private_key(encrypted_note, private_key_pem):
    try:
        encrypted_data = base64.b64decode(encrypted_note)
        private_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None, backend=default_backend())
        decrypted = private_key.decrypt(
            encrypted_data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return decrypted.decode('utf-8')
    except Exception as e:
        raise Exception(f"Decryption failed: {str(e)}")

def generate_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return public_key_pem, private_key_pem

public_key, private_key = generate_key_pair()
print(f"Public Key:\n{public_key}")
print(f"Private Key:\n{private_key}")

def connect_db():
    return sqlite3.connect(DATABASE)

def init_db():
    with connect_db() as con:
        con.execute('''CREATE TABLE IF NOT EXISTS notes (
                        id TEXT PRIMARY KEY, 
                        content TEXT)''')
        cur = con.execute("PRAGMA table_info(notes);")
        columns = [row[1] for row in cur.fetchall()]
        if 'is_encrypted' not in columns:
            con.execute("ALTER TABLE notes ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            con.commit()

@app.route('/', methods=['GET', 'OPTIONS'])
def hello_world():
    if request.method == 'OPTIONS':
        return handle_options_request()
    response = jsonify('Hello, World!')
    return add_cors_headers(response)

@app.route('/create', methods=['POST', 'OPTIONS'])
def create_note():
    if request.method == 'OPTIONS':
        return handle_options_request()
    
    content = request.form.get('content')
    if not content:
        return add_cors_headers(jsonify({"error": "Content is required"})), 400
    note_id = str(uuid.uuid4())
    with connect_db() as con:
        con.execute("INSERT INTO notes (id, content) VALUES (?, ?)", (note_id, content))
        con.commit()
    return add_cors_headers(jsonify({"id": note_id}))

@app.route('/note/<note_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
def handle_note(note_id):
    if request.method == 'OPTIONS':
        return handle_options_request()
    
    if request.method == 'GET':
        with connect_db() as con:
            cur = con.execute("SELECT content, is_encrypted FROM notes WHERE id = ?", (note_id,))
            row = cur.fetchone()
            if row:
                content, is_encrypted = row
                return add_cors_headers(jsonify({"content": content, "is_encrypted": is_encrypted}))
            return add_cors_headers(jsonify({"error": "Note not found"})), 404

    elif request.method == 'PUT':
        content = request.form.get('content')
        if not content:
            return add_cors_headers(jsonify({"error": "Content is required"})), 400
        with connect_db() as con:
            cur = con.execute("UPDATE notes SET content = ? WHERE id = ?", (content, note_id))
            con.commit()
            if cur.rowcount:
                return add_cors_headers(jsonify({"message": "Note updated"}))
            return add_cors_headers(jsonify({"error": "Note not found"})), 404

    elif request.method == 'DELETE':
        with connect_db() as con:
            cur = con.execute("DELETE FROM notes WHERE id = ?", (note_id,))
            con.commit()
            if cur.rowcount:
                return add_cors_headers(jsonify({"message": "Note deleted"}))
            return add_cors_headers(jsonify({"error": "Note not found"})), 404

def encrypt_note_with_public_key(note_content, public_key_pem):
    try:
        public_key = serialization.load_pem_public_key(public_key_pem.encode(), backend=default_backend())
        encrypted = public_key.encrypt(
            note_content.encode(),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return base64.b64encode(encrypted).decode()
    except Exception as e:
        print(f"Encryption failed: {str(e)}")
        raise

@app.route('/encrypt_note', methods=['POST', 'OPTIONS'])
def encrypt_note():
    if request.method == 'OPTIONS':
        return handle_options_request()
    
    note_content = request.form.get('note')
    public_key_pem = request.form.get('public_key')
    note_id = request.form.get('note_id')

    if not note_content or not public_key_pem or not note_id:
        return add_cors_headers(jsonify({"error": "Note content, note ID, and public key are required"})), 400

    try:
        encrypted_note = encrypt_note_with_public_key(note_content, public_key_pem)
        with connect_db() as con:
            cur = con.execute("UPDATE notes SET content = ?, is_encrypted = ? WHERE id = ?", 
                            (encrypted_note, 1, note_id))
            con.commit()
        return add_cors_headers(jsonify({"encrypted_note": encrypted_note}))
    except Exception as e:
        return add_cors_headers(jsonify({"error": str(e)})), 500

@app.route('/decrypt_note', methods=['POST', 'OPTIONS'])
def decrypt_note():
    if request.method == 'OPTIONS':
        return handle_options_request()
    
    encrypted_note = request.form.get('encrypted_note')
    private_key_pem = request.form.get('private_key')
    note_id = request.form.get('note_id')

    if not encrypted_note or not private_key_pem or not note_id:
        return add_cors_headers(jsonify({"error": "Encrypted note, private key, and note ID are required"})), 400

    try:
        decrypted_note = decrypt_note_with_private_key(encrypted_note, private_key_pem)
        with connect_db() as con:
            con.execute("UPDATE notes SET content = ?, is_encrypted = ? WHERE id = ?", 
                        (decrypted_note, 0, note_id))
            con.commit()
        return add_cors_headers(jsonify({"decrypted_note": decrypted_note}))
    except Exception as e:
        return add_cors_headers(jsonify({"error": f"Decryption failed: {str(e)}"})), 500

def handle_options_request():
    response = jsonify({'message': 'OK'})
    return add_cors_headers(response)

def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    init_db()
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False
    )