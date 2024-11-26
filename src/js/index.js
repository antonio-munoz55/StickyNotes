import { DatabaseManager } from "./indexedDB.js";

// Get the instance of the database manager
const dbManager = DatabaseManager.getInstance();

// Select DOM elements for interaction
const noteColorInput = document.querySelector("#noteColor");
const addInput = document.querySelector("#addButton");
const mainElement = document.querySelector("main");

// Initialize counters for ID and zIndex
let counterID = 0;
let zIndexValue = 1;

// Load existing data from the database and render it in the DOM
async function getAllData() {
  try {
    await dbManager.open(); // Open the database connection
    const notes = await dbManager.readAllData(); // Fetch all notes from the database

    // Render each note in the DOM
    notes.forEach((note) => {
      updateDOM(note, note.id);
    });

    // Update counters based on the last note's data
    if (notes.length > 0) {
      const lastNote = notes[notes.length - 1];
      counterID = lastNote.id + 1; // Set next ID for new notes
      zIndexValue = lastNote.zIndex + 1; // Set initial zIndex for new notes
    }
  } catch (error) {
    console.error("Error loading notes:", error);
  }
}

// Load all data when the script runs
getAllData();

// Event listener for creating a new note
addInput.addEventListener("click", () => {
  const noteData = {
    id: counterID, // Assign a ID
    color: noteColorInput.value, // Set the color chosen by the user
    content: "", // Initialize with empty content
    x: 0, // Default x position
    y: 0, // Default y position
    zIndex: zIndexValue++ // Assign a stacking order
  };

  addDataDB(noteData); // Save the note to the database
  counterID++;
});

// Save a new note to the database
async function addDataDB(data) {
  try {
    await dbManager.open(); // Open the database connection
    await dbManager.createData(data); // Add the note data
    updateDOM(data, data.id); // Render the new note in the DOM
  } catch (error) {
    console.error("Error saving a new note:", error);
  }
}

// Delete a note from the database
async function deleteDataDB(id) {
  try {
    await dbManager.open(); // Open the database connection
    await dbManager.deleteData(id); // Delete the note by ID
    console.log(`Note with ID ${id} deleted`);
  } catch (error) {
    console.error("Error deleting a note:", error);
  }
}

// Render a note in the DOM
function updateDOM(data, id) {
  // Create the main note container
  const newNote = document.createElement("div");
  newNote.classList = "note";
  newNote.id = `note-${id}`;

  // Create the note header (with delete button)
  const noteHeader = document.createElement("div");
  noteHeader.classList = "noteHeader";

  // Create and configure the delete button
  const deleteButton = document.createElement("button");
  deleteButton.classList.add("delete");
  deleteButton.textContent = "X";

  /// Add event listener for deleting the note
  deleteButton.addEventListener("click", () => {
    deleteDataDB(id); // Remove the note from the database
    newNote.remove(); // Remove the note from the DOM
  });

  // Append the delete button to the header
  noteHeader.appendChild(deleteButton);
  noteHeader.style.background = data.color; // Set the header background color
  newNote.appendChild(noteHeader);

  // Create the content area of the note
  const noteContent = document.createElement("div");
  noteContent.classList = "noteContent";

  // Create and configure the textarea for note content
  const textarea = document.createElement("textarea");
  textarea.name = "noteText";
  textarea.id = "noteText";
  textarea.value = data.content; // Load saved content
  textarea.addEventListener("input", () => {
    updateNoteContent(id, textarea.value); // Save updates to the database
  });

  // Append the textarea to the content area
  noteContent.appendChild(textarea);
  newNote.appendChild(noteContent);

  // Set the position and stacking order of the note
  newNote.style.left = `${data.x}px`;
  newNote.style.top = `${data.y}px`;
  newNote.style.zIndex = data.zIndex; // Use the saved zIndex
  newNote.style.position = "absolute";

  // Add the note to the main container
  mainElement.appendChild(newNote);
}

// Update the content of a note in the database
async function updateNoteContent(id, content) {
  try {
    await dbManager.open(); // Open the database connection
    await dbManager.updateData(id, { content }); // Update the content
  } catch (error) {
    console.error("Error al actualizar el contenido de la nota:", error);
  }
}

// Variables to track cursor and note position during drag-and-drop
let cursor = { x: null, y: null };
let note = { dom: null, x: null, y: null };

// Event listener for starting to drag a note
document.addEventListener("mousedown", (event) => {
  if (event.target.classList.contains("noteHeader")) {
    // Capture initial cursor position
    cursor = {
      x: event.clientX,
      y: event.clientY
    };

    // Identify the note being dragged
    const current = event.target.closest(".note");

    note = {
      dom: current,
      x: current.getBoundingClientRect().left,
      y: current.getBoundingClientRect().top
    };

    // Update zIndex to bring the dragged note to the front
    zIndexValue++;
    current.style.zIndex = zIndexValue;

    // Save the updated zIndex to the database
    const id = parseInt(current.id.split("-")[1], 10);
    dbManager.open()
      .then(() => dbManager.updateData(id, { zIndex: zIndexValue }))
      .catch((error) => console.error("Error al actualizar el zIndex:", error));

    current.style.cursor = "grabbing";
  }
});

// Event listener for dragging a note
document.addEventListener("mousemove", (event) => {
  if (!note.dom) return;

  // Calculate the distance moved by the cursor
  const currentCursor = {
    x: event.clientX,
    y: event.clientY
  };

  const distance = {
    x: currentCursor.x - cursor.x,
    y: currentCursor.y - cursor.y
  };

  // Update the note's position in the DOM
  note.dom.style.left = `${note.x + distance.x}px`;
  note.dom.style.top = `${note.y + distance.y}px`;
});

// Event listener for stopping the drag
document.addEventListener("mouseup", () => {
  if (!note.dom) return;

  // Save the updated position of the note
  const id = parseInt(note.dom.id.split("-")[1], 10);

  const updatedData = {
    x: parseInt(note.dom.style.left, 10),
    y: parseInt(note.dom.style.top, 10)
  };

  dbManager.open()
    .then(() => dbManager.updateData(id, updatedData))
    .catch((error) => console.error("Error al actualizar la posición:", error));

  note.dom.style.cursor = "grab"; // Reset cursor style
  note.dom = null; // Reset the dragged note
});