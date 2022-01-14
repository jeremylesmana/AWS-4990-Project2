import React, { useEffect, useState } from 'react';
import './App.css';
import Amplify, { API, Storage, Predictions } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import styles from './customStyle.module.css'
//import awsconfig from './aws-exports';
//Amplify.configure(awsconfig);


const initialFormState = { name: '', description: '' }

function App() {
  const [response, setResponse] = useState("Ready to translate...");
  const [text, updateText] = useState("Write to translate...");
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function translate() {
    const data = await Predictions.convert({
      translateText: {source: {text}}
    })
    setResponse(data.text)
  }

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }
    
  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function clearTranslate() {
    setResponse("Ready to translate...");
  }
  window.onbeforeunload = function() {
    localStorage.clear();
  }

  return (
    <div className="App">
      <br/><img className={styles.bigLogo} src={require('./assets/notepad.png')} /><h1>My Notes App</h1>
      <h2>Create a new note</h2>
      <div className={styles.createNote}>
        <br />
        <input
          onChange={e => setFormData({ ...formData, 'name': e.target.value})}
          placeholder="Note Title"
          value={formData.name}
          style={{fontSize: '20px'}}
        /><br /><br/>
        <textarea
          onChange={e => {setFormData({ ...formData, 'description': e.target.value}); updateText(e.target.value)}}
          placeholder="Note description"
          value={formData.description}
          rows={10}
          cols={60}
          id='noteTextarea'
        /><br /><br />Add an image (optional)<br/>
        <input
          type="file"
          onChange={onChange}
        /><br /><br/>
        <button onClick={createNote} className={styles.greenButton}>Create Note</button>
        <button onClick={translate} className={styles.greenButton}>Translate<br/>Spanish to English</button>
        <br/><br/>
      </div>
      <div className={styles.translateBox}>
        <h3>Spanish translated to English</h3>
        <p id='finishTranslation'>{response}</p>
        <button onClick={clearTranslate} className={styles.redButton}>Clear</button><br /><br/>
      </div>     
      <div>
        <h2>Displaying your current notes</h2>
        {
            notes.map(note => (
             <div key={note.id || note.name} className={styles.noteDiv}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              {
                note.image && <img src={note.image} style={{width: 400}} />
            }
              <br />
              <button onClick={() => deleteNote(note)} className={styles.redButton}>Delete note</button>
              <br /><br />
            </div>
          ))
        }
      </div>
      
    </div>
  );
}

export default withAuthenticator(App);
