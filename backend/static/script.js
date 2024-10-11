let currentNoteId = "";  // Store the current note ID for reference

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
        // Note found: Display content and update button visibility
        currentNoteId = searchId;
        document.getElementById('noteContent').value = result.content;  // Display the note content
        document.getElementById('message').innerHTML = `Note ID: <b>${searchId}</b> loaded successfully.`;
        
        // Hide the 'Create Note' button and show 'Save Changes' and 'Delete Note' buttons
        document.getElementById('createButton').style.display = 'none';
        document.getElementById('saveButton').style.display = 'inline';
        document.getElementById('deleteButton').style.display = 'inline';
    } else {
        document.getElementById('message').innerHTML = `<span style="color: red;">Error: ${result.error}</span>`;
        resetButtons();  // Reset to show the 'Create Note' button if search fails
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

// Function to reset the buttons to the default state
function resetButtons() {
    document.getElementById('createButton').style.display = 'inline';
    document.getElementById('saveButton').style.display = 'none';
    document.getElementById('deleteButton').style.display = 'none';
}
