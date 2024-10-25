let currentNoteId = "";
let currentEncryptedNote = "";
let isEncrypted = false;

async function createNote() {
    let content = document.getElementById('noteContent').value;
    let response = await fetch('http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: `content=${encodeURIComponent(content)}`
    });
    let result = await response.json();
    if (result.id) {
        document.getElementById('message').innerHTML = `New Note Created with ID: <b>${result.id}</b>`;
        document.getElementById('noteContent').value = '';
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

async function searchNote() {
    let searchId = document.getElementById('searchId').value;
    let response = await fetch(`http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/note/${searchId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    });
    let result = await response.json();

    if (result.content) {
        currentNoteId = searchId;
        document.getElementById('noteContent').value = result.content;
        document.getElementById('message').innerHTML = `Note ID: <b>${searchId}</b> loaded successfully.`;

        if (result.is_encrypted == 1) {
            document.getElementById('panicButton').style.display = 'none';
            document.getElementById('saveButton').style.display = 'none';
            document.getElementById('deleteButton').style.display = 'none';
            document.getElementById('createButton').style.display = 'none';
            document.getElementById('decryptButton').style.display = 'inline';
        } else {
            document.getElementById('panicButton').style.display = 'inline';
            document.getElementById('saveButton').style.display = 'inline';
            document.getElementById('deleteButton').style.display = 'inline';
            document.getElementById('decryptButton').style.display = 'none';
            document.getElementById('createButton').style.display = 'none';
        }
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
        document.getElementById('noteContent').value = '';
        resetButtons();
    }
}

async function saveNote() {
    let content = document.getElementById('noteContent').value;
    if (currentNoteId === "") {
        document.getElementById('message').innerHTML = `<span style="color: red;">No note to save. Please search for a note first.</span>`;
        return;
    }
    let response = await fetch(`http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/note/${currentNoteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: `content=${encodeURIComponent(content)}`
    });
    let result = await response.json();
    if (result.message) {
        document.getElementById('message').innerHTML = `<span style="color: green;">${result.message}</span>`;
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

async function deleteNote() {
    if (currentNoteId === "") {
        document.getElementById('message').innerHTML = `<span style="color: red;">No note to delete. Please search for a note first.</span>`;
        return;
    }
    let response = await fetch(`http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/note/${currentNoteId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        }
    });
    let result = await response.json();
    if (result.message) {
        document.getElementById('message').innerHTML = `<span style="color: green;">${result.message}</span>`;
        document.getElementById('noteContent').value = '';
        document.getElementById('searchId').value = '';
        currentNoteId = "";
        resetButtons();
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

function resetButtons() {
    document.getElementById('panicButton').style.display = 'none';
    document.getElementById('decryptButton').style.display = 'none';
    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('deleteButton').style.display = 'none';
    document.getElementById('createButton').style.display = 'inline';
}

async function encryptNote() {
    let noteContent = document.getElementById('noteContent').value;
    let publicKey = prompt("Enter the public key:");

    let response = await fetch('http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/encrypt_note', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: `note=${encodeURIComponent(noteContent)}&public_key=${encodeURIComponent(publicKey)}&note_id=${encodeURIComponent(currentNoteId)}`
    });

    let result = await response.json();
    if (result.encrypted_note) {
        document.getElementById('noteContent').value = result.encrypted_note;
        document.getElementById('panicButton').style.display = 'none';
        document.getElementById('saveButton').style.display = 'none';
        document.getElementById('deleteButton').style.display = 'none';
        document.getElementById('createButton').style.display = 'none';
        document.getElementById('decryptButton').style.display = 'inline';
    } else {
        alert("Encryption failed: " + result.error);
    }
}

async function decryptNote() {
    let privateKey = prompt("Enter your private key:");
    let encryptedNote = document.getElementById('noteContent').value;

    let response = await fetch('http://cmleehgzewgkbzws2nqtmqq52pmskx5cf5razypwawkirpg2bmmfm2ad.onion/decrypt_note', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: `encrypted_note=${encodeURIComponent(encryptedNote)}&private_key=${encodeURIComponent(privateKey)}&note_id=${encodeURIComponent(currentNoteId)}`
    });

    let result = await response.json();
    if (result.decrypted_note) {
        document.getElementById('noteContent').value = result.decrypted_note;
        document.getElementById('panicButton').style.display = 'inline';
        document.getElementById('saveButton').style.display = 'inline';
        document.getElementById('deleteButton').style.display = 'inline';
        document.getElementById('decryptButton').style.display = 'none';
        document.getElementById('createButton').style.display = 'none';
    } else {
        alert("Decryption failed: " + result.error);
    }
}