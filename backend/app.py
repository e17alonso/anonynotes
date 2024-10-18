from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import uuid
import os

def decrypt_note_with_private_key(encrypted_note, private_key_pem):
    try:
        # Decode the base64-encoded encrypted note
        encrypted_data = base64.b64decode(encrypted_note)

        # Load the private key
        private_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None, backend=default_backend())

        # Decrypt the note using OAEP padding and SHA-256
        decrypted = private_key.decrypt(
            encrypted_data,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return decrypted.decode('utf-8')  # Return as decoded text
    except Exception as e:
        raise Exception(f"Decryption failed: {str(e)}")

# Function to generate RSA key pair
def generate_key_pair():
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    # Generate public key from the private key
    public_key = private_key.public_key()

    # Serialize the private key
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')

    # Serialize the public key
    public_key_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')

    return public_key_pem, private_key_pem

# Generate RSA keys when the app starts
public_key, private_key = generate_key_pair()

# Print the keys to the console (or logs)
print(f"Public Key:\n{public_key}")
print(f"Private Key:\n{private_key}")

app = Flask(__name__, static_folder='static')
CORS(app)
DATABASE = 'anonynotes.db'

# Connect to the SQLite database
def connect_db():
    return sqlite3.connect(DATABASE)

# Initialize the database and create the notes table
def init_db():
    with connect_db() as con:
        # Create table if it doesn't exist
        con.execute('''CREATE TABLE IF NOT EXISTS notes (
                        id TEXT PRIMARY KEY, 
                        content TEXT)''')
        
        # Check if 'is_encrypted' column exists
        cur = con.execute("PRAGMA table_info(notes);")
        columns = [row[1] for row in cur.fetchall()]

        # Add 'is_encrypted' column if it doesn't exist
        if 'is_encrypted' not in columns:
            con.execute("ALTER TABLE notes ADD COLUMN is_encrypted INTEGER DEFAULT 0")
            con.commit()
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
        cur = con.execute("SELECT content, is_encrypted FROM notes WHERE id = ?", (note_id,))
        row = cur.fetchone()

        if row:
            content, is_encrypted = row
            return jsonify({"content": content, "is_encrypted": is_encrypted})
        else:
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

# Function to encrypt a note using a public key
def encrypt_note_with_public_key(note_content, public_key_pem):
    try:
        # Parse the public key
        public_key = serialization.load_pem_public_key(public_key_pem.encode(), backend=default_backend())
        # Encrypt the note using the public key
        encrypted = public_key.encrypt(
            note_content.encode(),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return base64.b64encode(encrypted).decode()  # Return as base64 string
    except Exception as e:
        print(f"Encryption failed: {str(e)}")  # Log the error to debug
        raise

@app.route('/encrypt_note', methods=['POST'])
def encrypt_note():
    note_content = request.form.get('note')
    public_key_pem = request.form.get('public_key')
    note_id = request.form.get('note_id')  # Retrieve the note ID passed from the frontend

    if not note_content or not public_key_pem or not note_id:
        return jsonify({"error": "Note content, note ID, and public key are required"}), 400

    try:
        # Encrypt the note content with the public key
        encrypted_note = encrypt_note_with_public_key(note_content, public_key_pem)

        # Update the note in the database with the encrypted content and mark it as encrypted
        with connect_db() as con:
            cur = con.execute("UPDATE notes SET content = ?, is_encrypted = ? WHERE id = ?", 
                              (encrypted_note, 1, note_id))  # Set is_encrypted = 1
            con.commit()

        return jsonify({"encrypted_note": encrypted_note})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/decrypt_note', methods=['POST'])
def decrypt_note():
    encrypted_note = request.form.get('encrypted_note')
    private_key_pem = request.form.get('private_key')
    note_id = request.form.get('note_id')  # Retrieve the note ID

    if not encrypted_note or not private_key_pem or not note_id:
        return jsonify({"error": "Encrypted note, private key, and note ID are required"}), 400

    try:
        # Attempt to decrypt the note
        decrypted_note = decrypt_note_with_private_key(encrypted_note, private_key_pem)

        # Update the note in the database with the decrypted content and mark as not encrypted
        with connect_db() as con:
            con.execute("UPDATE notes SET content = ?, is_encrypted = ? WHERE id = ?", 
                        (decrypted_note, 0, note_id))
            con.commit()

        return jsonify({"decrypted_note": decrypted_note})
    except Exception as e:
        return jsonify({"error": f"Decryption failed: {str(e)}"}), 500

    
if __name__ == '__main__':
    init_db()
    app.run(debug=True)




