// src/useArticlesDB.js
// Gere a base de dados de artigos partilhada via Firebase Firestore
import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";

const COLLECTION = "artigos";

export function useArticlesDB() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ouvir alterações em tempo real
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Adicionar artigo
  const addItem = async (item) => {
    const { id, ...data } = item; // não guardar o id local
    await addDoc(collection(db, COLLECTION), data);
  };

  // Atualizar artigo
  const updateItem = async (id, data) => {
    const { id: _id, ...rest } = data;
    await updateDoc(doc(db, COLLECTION, id), rest);
  };

  // Apagar artigo
  const deleteItem = async (id) => {
    await deleteDoc(doc(db, COLLECTION, id));
  };

  // Importar vários artigos de uma vez (CSV)
  const importItems = async (newItems) => {
    const batch = writeBatch(db);
    newItems.forEach((item) => {
      const { id, ...data } = item;
      const ref = doc(collection(db, COLLECTION));
      batch.set(ref, data);
    });
    await batch.commit();
  };

  return { items, loading, error, addItem, updateItem, deleteItem, importItems };
}
