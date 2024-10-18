let currentNoteId = "";  // Store the current note ID for reference
let currentEncryptedNote = "";  // Store the encrypted note
let isEncrypted = false;  // Flag to track if the note is encrypted

// Function to create a new note
async function createNote() {
    let content = document.getElementById('noteContent').value;
    let response = await fetch('http://127.0.0.1:5000/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `content=${encodeURIComponent(content)}`
    });
    let result = await response.json();
    if (result.id) {
        document.getElementById('message').innerHTML = `New Note Created with ID: <b>${result.id}</b>`;
        document.getElementById('noteContent').value = '';  // Clear the textarea
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

// Function to search for a note using its ID
async function searchNote() {
    let searchId = document.getElementById('searchId').value;
    let response = await fetch(`http://127.0.0.1:5000/note/${searchId}`, {
        method: 'GET',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
    let result = await response.json();

    if (result.content) {
        // Note found: Display content and show relevant buttons
        currentNoteId = searchId;
        document.getElementById('noteContent').value = result.content;  // Display the note content
        document.getElementById('message').innerHTML = `Note ID: <b>${searchId}</b> loaded successfully.`;

        if (result.is_encrypted == 1) {
            // If the note is encrypted
            document.getElementById('panicButton').style.display = 'none';     // Hide Panic Button
            document.getElementById('saveButton').style.display = 'none';      // Hide Save Changes Button
            document.getElementById('deleteButton').style.display = 'none';    // Hide Delete Button
            document.getElementById('createButton').style.display = 'none';    // Hide Create Note Button
            document.getElementById('decryptButton').style.display = 'inline'; // Show Decrypt Button
        } else {
            // If the note is not encrypted
            document.getElementById('panicButton').style.display = 'inline';   // Show Panic Button
            document.getElementById('saveButton').style.display = 'inline';    // Show Save Changes Button
            document.getElementById('deleteButton').style.display = 'inline';  // Show Delete Button
            document.getElementById('decryptButton').style.display = 'none';   // Hide Decrypt Button
            document.getElementById('createButton').style.display = 'none';    // Hide Create Note Button
        }
    } else {
        // No note found: Show error message, clear the textbox, and reset buttons
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
        document.getElementById('noteContent').value = '';  // Clear the note content textbox
        resetButtons();  // Reset to default state if no note is found
    }
}






// Function to save changes to the current note
async function saveNote() {
    let content = document.getElementById('noteContent').value;
    if (currentNoteId === "") {
        document.getElementById('message').innerHTML = `<span style="color: red;">No note to save. Please search for a note first.</span>`;
        return;
    }
    let response = await fetch(`http://127.0.0.1:5000/note/${currentNoteId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `content=${encodeURIComponent(content)}`
    });
    let result = await response.json();
    if (result.message) {
        document.getElementById('message').innerHTML = `<span style="color: green;">${result.message}</span>`;
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

// Function to delete the current note
async function deleteNote() {
    if (currentNoteId === "") {
        document.getElementById('message').innerHTML = `<span style="color: red;">No note to delete. Please search for a note first.</span>`;
        return;
    }
    let response = await fetch(`http://127.0.0.1:5000/note/${currentNoteId}`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
    let result = await response.json();
    if (result.message) {
        document.getElementById('message').innerHTML = `<span style="color: green;">${result.message}</span>`;
        document.getElementById('noteContent').value = '';  // Clear the textarea
        document.getElementById('searchId').value = '';     // Clear the search bar
        currentNoteId = "";  // Reset the current note ID
        resetButtons();  // Revert button visibility to show 'Create Note'
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
    }
}

// Function to reset the buttons when no note is found or after deletion
function resetButtons() {
    document.getElementById('panicButton').style.display = 'none';  // Hide Panic Button
    document.getElementById('decryptButton').style.display = 'none';  // Hide Decrypt Button
    document.getElementById('saveButton').style.display = 'none';  // Hide Save Changes button
    document.getElementById('deleteButton').style.display = 'none';  // Hide Delete Note button
    document.getElementById('createButton').style.display = 'inline';  // Show Create Note button
}


// Function to encrypt the note using a public key
async function encryptNote() {
    let noteContent = document.getElementById('noteContent').value;
    let publicKey = prompt("Enter the public key:");

    let response = await fetch('http://127.0.0.1:5000/encrypt_note', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `note=${encodeURIComponent(noteContent)}&public_key=${encodeURIComponent(publicKey)}&note_id=${encodeURIComponent(currentNoteId)}`
    });

    let result = await response.json();
    if (result.encrypted_note) {
        document.getElementById('noteContent').value = result.encrypted_note;  // Display encrypted content

        // Hide all buttons except Decrypt Button when the note is encrypted
        document.getElementById('panicButton').style.display = 'none';     // Hide Panic Button
        document.getElementById('saveButton').style.display = 'none';      // Hide Save Changes Button
        document.getElementById('deleteButton').style.display = 'none';    // Hide Delete Button
        document.getElementById('createButton').style.display = 'none';    // Hide Create Note Button
        document.getElementById('decryptButton').style.display = 'inline'; // Show Decrypt Button
    } else {
        alert("Encryption failed: " + result.error);
    }
}




// Function to decrypt the note using a private key
async function decryptNote() {
    let privateKey = prompt("Enter your private key:");
    let encryptedNote = document.getElementById('noteContent').value;  // Encrypted note content in the textbox

    let response = await fetch('http://127.0.0.1:5000/decrypt_note', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `encrypted_note=${encodeURIComponent(encryptedNote)}&private_key=${encodeURIComponent(privateKey)}&note_id=${encodeURIComponent(currentNoteId)}`
    });

    let result = await response.json();
    if (result.decrypted_note) {
        document.getElementById('noteContent').value = result.decrypted_note;  // Display decrypted content

        // Show Panic Button, Save Changes, and Delete Note buttons when the note is decrypted
        document.getElementById('panicButton').style.display = 'inline';   // Show Panic Button
        document.getElementById('saveButton').style.display = 'inline';    // Show Save Changes Button
        document.getElementById('deleteButton').style.display = 'inline';  // Show Delete Button
        document.getElementById('decryptButton').style.display = 'none';   // Hide Decrypt Button
        document.getElementById('createButton').style.display = 'none';    // Hide Create Note Button
    } else {
        alert("Decryption failed: " + result.error);
    }
}

