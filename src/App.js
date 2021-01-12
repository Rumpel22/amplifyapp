import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import { v4 as uuidv4 } from 'uuid';

const initialFormState = { name: '', description: '' }

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const imageInput = useRef(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        note.imageURL = await Storage.get(note.image);
      }
      return note;
    }))
    setNotes(notesFromAPI);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    if (imageInput.current.files[0]) {
      const file = imageInput.current.files[0];
      const filename = uuidv4() + "." + file.name.split('.').pop();
      await Storage.put(filename, file)
        .then(result => formData.image = result.key);
    }
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    fetchNotes();
    setFormData(initialFormState);
    imageInput.current.value = '';
  }

  async function deleteNote({ id, image }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } } });
    await Storage.remove(image);
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value })}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value })}
        placeholder="Note description"
        value={formData.description}
      />
      <input type="file" ref={imageInput} />

      <button onClick={createNote}>Create Note</button>
      <div style={{ marginBottom: 30 }}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
              {
                note.image && <img src={note.imageURL} style={{ width: 400 }} alt="" />
              }
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);